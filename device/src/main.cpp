/*
  Firmware ESP32 Smart Aquarium: heater dan lampu, terhubung ke REST API backend.
  Tanpa RTC: jam hanya dari NTP. Pemberi pakan belum ada, jadi feederStatus selalu "Idle".

  Dua task jaringan di core 0 dan satu loop() di core 1:
    - configTask: GET /api/hardware/{aquariumId}/config dengan long polling. Backend menahan permintaan sampai
      config di dashboard berubah (atau CONFIG_WAIT_S detik), jadi perubahan langsung "didorong" ke perangkat
    - loop() (core 1): menjalankan config baru ke heater dan lampu
    - networkTask: POST /api/hardware/{aquariumId}/telemetry, hanya jika sudah systemConfig.pollFrequency detik
      sejak telemetry terakhir, atau status heater/lampu/alarm berubah. Tidak dikirim selagi config baru
      belum dijalankan. Setiap pembacaan membawa waktu pengukuran dari NTP (measuredAt). Pembacaan yang gagal
      terkirim (Wi-Fi atau backend mati) disimpan di antrean RAM dan dikirim ulang lewat /telemetry/backlog

  Watchdog: loop() (heater, lampu, alarm) didaftarkan ke Task Watchdog Timer. Jika loop() macet, ESP32 restart
  dan relay mati lagi saat boot. Task jaringan yang macet lama juga memicu restart (lihat checkNetworkTasks).

  Heater dan lampu manual tetap dikontrol walau Wi-Fi atau backend mati, memakai config terakhir (disimpan di flash).
  Jadwal lampu otomatis butuh jam NTP; selama belum sinkron, lampu mati.
*/

#include <Arduino.h>
#include <ArduinoJson.h>
#include <DallasTemperature.h>
#include <HTTPClient.h>
#include <esp_system.h>
#include <esp_task_wdt.h>
#include <OneWire.h>
#include <Preferences.h>
#include <WiFi.h>
#include <time.h>
#include "secrets.h" // Wi-Fi, alamat backend, DEVICE_KEY (salin dari secrets.example.h)

// ============================================================
// Pin dan konstanta
// ============================================================

constexpr uint8_t PIN_ONE_WIRE = 4;      // DS18B20 DAT
constexpr uint8_t PIN_RELAY_HEATER = 18; // Relay heater IN
constexpr uint8_t PIN_RELAY_LAMP = 19;   // Relay lampu IN
constexpr uint8_t PIN_BUZZER = 5;        // Buzzer aktif

// Modul relay umumnya active LOW. Jika relay bekerja terbalik, tukar nilainya
constexpr uint8_t RELAY_ON = LOW;
constexpr uint8_t RELAY_OFF = HIGH;

constexpr float HYSTERESIS_C = 0.5;              // Selisih nyala/mati di sekitar suhu target
constexpr float HEATER_CUTOFF_C = 36.0;          // Heater dipaksa mati di semua mode
constexpr uint32_t TEMP_READ_INTERVAL_MS = 5000;
constexpr uint32_t TEMP_CONVERSION_MS = 800;     // Waktu konversi DS18B20 (12 bit)
constexpr uint32_t LAMP_CHECK_INTERVAL_MS = 1000;
constexpr uint32_t COMMAND_POLL_MS = 3000;       // Jeda sebelum GET /config diulang jika gagal atau dibalas langsung
constexpr uint32_t TELEMETRY_CHECK_MS = 500;     // Seberapa sering status lokal dicek untuk dikirim (tanpa jaringan)
constexpr uint32_t TELEMETRY_RETRY_MS = 3000;    // Jeda sebelum telemetry yang belum terkirim dicoba lagi
constexpr size_t BACKLOG_CAPACITY = 120;         // Antrean pembacaan offline: sekitar 2 jam pada 1 pembacaan per menit
constexpr uint32_t BACKLOG_MIN_GAP_S = 60;       // Jarak minimal antar pembacaan antrean, kecuali status berubah
constexpr size_t BACKLOG_CHUNK = 20;             // Jumlah pembacaan per permintaan /telemetry/backlog
constexpr uint32_t CONFIG_WAIT_S = 20;           // Lama backend boleh menahan GET /config (maks. 25 di backend)
constexpr uint32_t CONFIG_TIMEOUT_MS = (CONFIG_WAIT_S + 5) * 1000; // Harus lebih lama dari CONFIG_WAIT_S
constexpr uint32_t HTTP_TIMEOUT_MS = 5000;
constexpr uint32_t NETWORK_STALL_MS = 120000;   // Task jaringan tanpa tanda hidup selama ini dianggap macet. Harus jauh di
                                                 // atas satu putaran terpanjang (long polling CONFIG_TIMEOUT_MS + jeda)
constexpr uint32_t BOOT_REPORT_NO_NTP_MS = 60000; // Laporan restart dikirim tanpa bootedAt jika NTP belum sinkron selama ini
constexpr uint32_t APPLY_TIMEOUT_MS = 4000;      // Batas menunggu loop() menjalankan config sebelum telemetry

// ============================================================
// Data bersama (loop() di core 1, task jaringan di core 0)
// ============================================================

// Pengaturan dari dashboard (isi respons GET /config)
struct RemoteConfig {
    bool heaterAuto;       // tempConfig.mode == AUTOMATIC
    bool heaterManualOn;   // tempConfig.manualControlState
    float targetTemp;      // C
    float minTemp;         // C, di bawah ini alarm berbunyi
    float maxTemp;         // C, di atas ini alarm berbunyi
    bool lampAuto;         // lightingConfig.mode == AUTOMATIC
    bool lampManualOn;     // lightingConfig.manualControlState
    bool lampScheduleOn;   // lightingConfig.schedule.isActive
    int16_t lampStartMin;  // Menit sejak 00:00, -1 jika belum diatur
    int16_t lampEndMin; 
    uint8_t pollFrequency; // Detik, 1-60
    char timezone[40];     // Nama IANA, contoh "Asia/Jakarta"
};

// Status nyata perangkat (isi body POST /telemetry)
struct DeviceStatus {
    float temperature; // C, NAN = belum ada pembacaan valid
    bool heaterOn;
    bool lampOn;
    char event[40]; // Alasan alarm, kosong jika normal
};

static portMUX_TYPE lock = portMUX_INITIALIZER_UNLOCKED;
static volatile bool configPending = false; // true = loop() harus menjalankan config baru dulu

// Tanda hidup task jaringan (millis() terakhir tiap putaran). Diperiksa loop() untuk mendeteksi task yang macet
static volatile uint32_t networkBeatAt = 0;
static volatile uint32_t configBeatAt = 0;

// Restart abnormal yang belum dilaporkan ke backend (teksnya harus sama dengan daftar di backend/routes/hardware.js).
// bootReason nullptr = menyala normal. Dikirim satu kali pada telemetry pertama yang berhasil
static const char* bootReason = nullptr;
static volatile bool bootReportPending = false;
static uint32_t bootedAt = 0; // Waktu menyala (detik sejak 1970), dihitung sekali setelah NTP sinkron; dipakai backend agar laporan tidak ganda

// Isi RTC tidak hilang saat restart software. Diisi sebelum restart karena task macet agar bisa dibedakan dari restart biasa
constexpr uint32_t STALL_RESTART_MAGIC = 0xA5C3A5C3;
static RTC_NOINIT_ATTR uint32_t stallRestartMagic;

// Sebelum config dari backend diterima semua aktuator mati
static RemoteConfig config = {false, false, 24.0, 20.0, 30.0, false, false, false, -1, -1, 5, "Asia/Jakarta"};
static DeviceStatus status = {NAN, false, false, ""};

// Jalankan f di dalam critical section (data dipakai bersama dua core)
template <typename F> void locked(F f) {
    portENTER_CRITICAL(&lock);
    f();
    portEXIT_CRITICAL(&lock);
}

RemoteConfig getConfig() {
    RemoteConfig copy;
    locked([&] { copy = config; });
    return copy;
}

DeviceStatus getStatus() {
    DeviceStatus copy;
    locked([&] { copy = status; });
    return copy;
}

// Pakai config baru dari backend; flash hanya ditulis saat isinya berubah
// Hasil true jika isi config berubah
bool storeConfig(const RemoteConfig& next) {
    bool changed = memcmp(&config, &next, sizeof(next)) != 0; // Aman: struct dibuat dari memset(0)
    locked([&] { config = next; });
    configPending = true;
    if (!changed) return false;
    Preferences prefs;
    prefs.begin("aquarium", false);
    prefs.putBytes("config", &next, sizeof(next));
    prefs.end();
    return true;
}

// Pulihkan config terakhir dari flash saat ESP32 menyala
void loadSavedConfig() {
    Preferences prefs;
    prefs.begin("aquarium", false);
    RemoteConfig saved;
    bool found = prefs.getBytesLength("config") == sizeof(saved) && prefs.getBytes("config", &saved, sizeof(saved));
    prefs.end();

    // Data rusak atau dari versi firmware lain diabaikan
    saved.timezone[sizeof(saved.timezone) - 1] = '\0';
    if (!found || saved.pollFrequency < 1 || saved.pollFrequency > 60) {
        Serial.println("[CFG] No saved config, all outputs stay OFF until the backend answers.");
        return;
    }
    config = saved;
    Serial.println("[CFG] Restored the last config from flash.");
}

// ============================================================
// Relay dan alarm
// ============================================================

// Relay dipastikan OFF sebelum pin menjadi output, agar tidak berkedip saat ESP32 menyala
void initRelay(uint8_t pin) {
    digitalWrite(pin, RELAY_OFF);
    pinMode(pin, OUTPUT);
    digitalWrite(pin, RELAY_OFF);
}

static bool alarmActive = false;

// Teks tidak kosong = alarm aktif, "" = alarm mati. Alasan dikirim ke dashboard sebagai "event"
void setAlarm(const char* reason) {
    bool active = reason[0] != '\0';
    if (active != alarmActive) Serial.printf("[ALARM] %s\n", active ? reason : "Back to normal.");
    alarmActive = active;
    locked([&] { strlcpy(status.event, reason, sizeof(status.event)); });
}

// Beep 150 ms setiap 1 detik tanpa menahan program
void updateAlarm() {
    digitalWrite(PIN_BUZZER, alarmActive && (millis() % 1000) < 150 ? HIGH : LOW);
}

// ============================================================
// Jam lokal (hanya NTP, tanpa RTC)
// ============================================================

static char appliedZone[40] = "";
static bool timeSynced = false;

// Nama IANA (pilihan di dashboard) -> format POSIX untuk configTzTime()
static const char* const ZONES[][2] = {
    {"Asia/Manila", "PST-8"},
    {"Asia/Jakarta", "WIB-7"},
    {"Asia/Makassar", "WITA-8"},
    {"Asia/Jayapura", "WIT-9"},
    {"Asia/Singapore", "<+08>-8"},
    {"Asia/Bangkok", "<+07>-7"},
    {"Asia/Kuala_Lumpur", "<+08>-8"},
    {"Asia/Ho_Chi_Minh", "<+07>-7"},
    {"Asia/Tokyo", "JST-9"},
    {"Asia/Shanghai", "CST-8"},
    {"Asia/Seoul", "KST-9"},
    {"Asia/Kolkata", "IST-5:30"},
    {"Asia/Dhaka", "<+06>-6"},
    {"Asia/Dubai", "<+04>-4"},
    {"Asia/Riyadh", "<+03>-3"},
    {"Europe/London", "GMT0BST,M3.5.0/1,M10.5.0"},
    {"Europe/Paris", "CET-1CEST,M3.5.0,M10.5.0/3"},
    {"Europe/Berlin", "CET-1CEST,M3.5.0,M10.5.0/3"},
    {"America/New_York", "EST5EDT,M3.2.0,M11.1.0"},
    {"America/Chicago", "CST6CDT,M3.2.0,M11.1.0"},
    {"America/Los_Angeles", "PST8PDT,M3.2.0,M11.1.0"},
    {"America/Sao_Paulo", "<-03>3"},
    {"UTC", "UTC0"},
    {"Pacific/Auckland", "NZST-12NZDT,M9.5.0,M4.1.0/3"},
    {"Australia/Sydney", "AEST-10AEDT,M10.1.0,M4.1.0/3"},
};

// Atur zona waktu dan mulai sinkronisasi NTP. Hanya bekerja saat zona berubah
void setTimezone(const char* name) {
    if (strcmp(name, appliedZone) == 0) return;
    strlcpy(appliedZone, name, sizeof(appliedZone)); // Dicatat agar peringatan tidak diulang

    for (auto& zone : ZONES) {
        if (strcmp(zone[0], name) != 0) continue;
        configTzTime(zone[1], "pool.ntp.org", "time.google.com");
        Serial.printf("[TIME] Timezone %s, syncing with NTP.\n", name);
        return;
    }
    Serial.printf("[TIME] Timezone %s is not in the firmware list, time is unknown.\n", name);
}

// Menit sejak 00:00 waktu lokal, -1 jika NTP belum sinkron (waktu sistem belum lewat 2023)
int minuteOfDay() {
    time_t now = time(nullptr);
    if (now < 1700000000) return -1;
    tm local;
    localtime_r(&now, &local);
    if (!timeSynced) Serial.printf("[TIME] NTP synced: %02d:%02d\n", local.tm_hour, local.tm_min);
    timeSynced = true;
    return local.tm_hour * 60 + local.tm_min;
}

// Detik sejak 1970 (UTC) dari NTP, 0 jika belum sinkron (waktu sistem belum lewat 2023)
uint32_t epochNow() {
    time_t now = time(nullptr);
    return now < 1700000000 ? 0 : (uint32_t)now;
}

// ============================================================
// Heater (sensor suhu + relay)
// ============================================================

static OneWire oneWire(PIN_ONE_WIRE);
static DallasTemperature sensor(&oneWire);

static bool heaterOn = false;
static bool converting = false; // true = sensor sedang konversi, hasil belum siap
static bool hasReading = false; // Sudah pernah mencoba membaca sensor
static uint32_t nextReadAt = 0;
static uint32_t convertingSince = 0;

void setHeater(bool on) {
    if (on == heaterOn) return;
    digitalWrite(PIN_RELAY_HEATER, on ? RELAY_ON : RELAY_OFF);
    heaterOn = on;
    locked([&] { status.heaterOn = on; });
    Serial.printf("[HEATER] %s\n", on ? "ON" : "OFF");
}

// Jalankan config terbaru memakai suhu terakhir, tanpa menunggu pembacaan baru
void applyHeater() {
    if (!hasReading) return;

    RemoteConfig cfg = getConfig();
    float temp = getStatus().temperature;

    // Fail-safe: sensor putus atau terlalu panas -> heater mati, apa pun mode dashboard
    if (isnan(temp) || temp >= HEATER_CUTOFF_C) {
        setHeater(false);
        setAlarm(isnan(temp) ? "Sensor error" : "Temperature too high");
        return;
    }

    // MANUAL: ikuti tombol dashboard. AUTOMATIC: di antara kedua batas, status terakhir dipertahankan
    if (!cfg.heaterAuto) setHeater(cfg.heaterManualOn);
    else if (temp < cfg.targetTemp - HYSTERESIS_C) setHeater(true);
    else if (temp >= cfg.targetTemp + HYSTERESIS_C) setHeater(false);

    // Alarm mengikuti batas suhu dari dashboard
    setAlarm(temp > cfg.maxTemp ? "Temperature too high" : temp < cfg.minTemp ? "Temperature too low" : "");
}

// Baca sensor secara berkala tanpa menahan program: minta konversi -> tunggu -> baca -> atur heater
void updateHeater() {
    uint32_t now = millis();

    if (!converting) {
        if ((int32_t)(now - nextReadAt) < 0) return;
        sensor.requestTemperatures();
        converting = true;
        convertingSince = now;
        return;
    }
    if (now - convertingSince < TEMP_CONVERSION_MS) return;

    converting = false;
    nextReadAt = now + TEMP_READ_INTERVAL_MS;
    hasReading = true;

    // -127 = sensor terputus, 85 = nilai awal saat sensor baru menyala (belum ada hasil)
    float temp = sensor.getTempCByIndex(0);
    if (temp == DEVICE_DISCONNECTED_C || temp == 85.0) temp = NAN;
    if (isnan(temp)) Serial.println("[TEMP] Sensor read failed.");
    else Serial.printf("[TEMP] %.2f C\n", temp);
    locked([&] { status.temperature = temp; });
    applyHeater();
}

// ============================================================
// Lampu (relay + jadwal)
// ============================================================

static bool lampOn = false;
static uint32_t nextLampCheckAt = 0;

void setLamp(bool on) {
    if (on == lampOn) return;
    digitalWrite(PIN_RELAY_LAMP, on ? RELAY_ON : RELAY_OFF);
    lampOn = on;
    locked([&] { status.lampOn = on; });
    Serial.printf("[LAMP] %s\n", on ? "ON" : "OFF");
}

// Apakah menit sekarang ada di dalam jadwal? Jadwal boleh melewati tengah malam (misalnya 18:00 sampai 06:00)
bool inSchedule(int now, int start, int end) {
    if (now < 0 || start < 0 || end < 0 || start == end) return false;
    if (start < end) return now >= start && now < end;
    return now >= start || now < end;
}

// MANUAL: ikuti tombol (tidak butuh jam). AUTO: ikuti jadwal; jam belum sinkron -> lampu mati
void applyLamp() {
    RemoteConfig cfg = getConfig();
    setLamp(cfg.lampAuto ? cfg.lampScheduleOn && inSchedule(minuteOfDay(), cfg.lampStartMin, cfg.lampEndMin)
                         : cfg.lampManualOn);
}

// ============================================================
// Jaringan (task di core 0)
// ============================================================

// URL lengkap endpoint perangkat, contoh: http://192.168.1.10:5000/api/hardware/aquarium-001/config
String endpoint(const char* path) {
    return String(API_BASE_URL) + "/api/hardware/" + AQUARIUM_ID + path;
}

// Kirim request ke backend. body kosong = GET, selain itu POST JSON. Hasil: kode HTTP, isi respons di response
int request(const char* path, const String& body, String& response, uint32_t timeoutMs = HTTP_TIMEOUT_MS) {
    HTTPClient http;
    http.setTimeout(timeoutMs);
    http.begin(endpoint(path));
    http.addHeader("x-device-key", DEVICE_KEY);
    if (body.length()) http.addHeader("Content-Type", "application/json");
    int code = body.length() ? http.POST(body) : http.GET();
    response = code > 0 ? http.getString() : HTTPClient::errorToString(code);
    http.end();
    // IP ESP32 dan URL yang dituju: untuk membedakan beda subnet/VLAN dari firmware yang belum di-upload ulang
    if (code <= 0) Serial.printf("[API] %s from %s -> %s\n", path, WiFi.localIP().toString().c_str(), endpoint(path).c_str());
    return code;
}

// "hh:mm AM/PM" -> menit sejak 00:00, -1 jika kosong atau tidak valid
int parseClockTime(const char* text) {
    int hour, minute;
    char period[3] = {0};
    if (sscanf(text, "%d:%d %2s", &hour, &minute, period) != 3) return -1;
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return -1;

    char letter = toupper(period[0]);
    if (letter != 'A' && letter != 'P') return -1;
    return (hour % 12 + (letter == 'P' ? 12 : 0)) * 60 + minute;
}

// Versi config terakhir yang diterima (field configVersion di respons). Hanya dipakai configTask.
// Kosong = belum pernah menerima, jadi GET pertama dibalas langsung tanpa ditahan
static String configVersion;

// GET /config: ambil pengaturan dashboard. Jika sudah punya versi, backend menahan permintaan sampai config
// berubah (long polling). Jika gagal, config lama tetap dipakai
bool fetchConfig() {
    String path = "/config";
    if (configVersion.length()) path += "?wait=" + String(CONFIG_WAIT_S) + "&v=" + configVersion;

    String body;
    int code = request(path.c_str(), "", body, CONFIG_TIMEOUT_MS);
    if (code != 200) {
        Serial.printf("[API] Read config failed (HTTP %d): %s\n", code, body.c_str());
        return false;
    }

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, body);
    if (error) {
        Serial.printf("[API] Config JSON is invalid: %s\n", error.c_str());
        return false;
    }

    configVersion = (const char*)(doc["configVersion"] | "");

    // memset agar byte kosong selalu 0 (dipakai memcmp). Nilai setelah `|` dipakai jika field null/tidak ada
    RemoteConfig next;
    memset(&next, 0, sizeof(next));

    JsonObject temp = doc["tempConfig"];
    next.heaterAuto = strcmp(temp["mode"] | "MANUAL", "AUTOMATIC") == 0;
    next.heaterManualOn = strcmp(temp["manualControlState"] | "OFF", "ON") == 0;
    next.targetTemp = temp["targetTemp"] | 24.0f;
    next.minTemp = temp["minTempThreshold"] | 20.0f;
    next.maxTemp = temp["maxTempThreshold"] | 30.0f;

    JsonObject lighting = doc["lightingConfig"];
    next.lampAuto = strcmp(lighting["mode"] | "MANUAL", "AUTOMATIC") == 0;
    next.lampManualOn = strcmp(lighting["manualControlState"] | "OFF", "ON") == 0;
    next.lampScheduleOn = lighting["schedule"]["isActive"] | false;
    next.lampStartMin = parseClockTime(lighting["schedule"]["startTime"] | "");
    next.lampEndMin = parseClockTime(lighting["schedule"]["endTime"] | "");

    next.pollFrequency = constrain((int)(doc["systemConfig"]["pollFrequency"] | 30), 1, 60);
    strlcpy(next.timezone, doc["systemConfig"]["timezone"] | "Asia/Jakarta", sizeof(next.timezone));

    bool changed = storeConfig(next);
    setTimezone(next.timezone);

    // Respons datang berkali-kali (tiap config berubah atau CONFIG_WAIT_S habis), jadi hanya dicatat saat isinya berubah
    if (changed) {
        Serial.printf("[API] Config: heater %s/%s target %.1f C, lamp %s/%s schedule %s, poll %us\n",
                      next.heaterAuto ? "AUTO" : "MANUAL", next.heaterManualOn ? "ON" : "OFF", next.targetTemp,
                      next.lampAuto ? "AUTO" : "MANUAL", next.lampManualOn ? "ON" : "OFF",
                      next.lampScheduleOn ? "on" : "off", next.pollFrequency);
    }
    return true;
}

// POST /telemetry: kirim suhu dan status nyata heater/lampu ke dashboard.
// Hasil false = belum terkirim (belum ada suhu valid, tidak bisa tersambung, atau backend error) dan perlu dicoba lagi
bool sendTelemetry(const DeviceStatus& device, uint32_t measuredAt) {
    // Sensor gagal dengan alasan (event): kirim laporan tanpa currentTemp agar dashboard menampilkan "Sensor Error"
    bool sensorFault = isnan(device.temperature) && device.event[0] != '\0';

    // Server menolak suhu di luar -10..60 C, dan tanpa event tidak ada yang bisa dilaporkan
    if (!sensorFault && (isnan(device.temperature) || device.temperature < -10 || device.temperature > 60)) {
        Serial.println("[API] Telemetry skipped: no valid temperature reading.");
        return false;
    }

    JsonDocument doc;
    if (measuredAt) doc["measuredAt"] = measuredAt; // Tanpa NTP dihilangkan; backend memakai waktu terima

    // Laporan restart abnormal ikut pada telemetry sampai backend menerimanya (201)
    bool includesBootReport = bootReportPending && (bootedAt != 0 || millis() > BOOT_REPORT_NO_NTP_MS);
    if (includesBootReport) {
        doc["bootReason"] = bootReason;
        if (bootedAt) doc["bootedAt"] = bootedAt;
    }
    if (!sensorFault) doc["currentTemp"] = device.temperature;
    doc["heaterStatus"] = device.heaterOn ? "ON" : "OFF";
    doc["ledStatus"] = device.lampOn ? "ON" : "OFF";
    doc["feederStatus"] = "Idle"; // Pemberi pakan belum dipasang di perangkat keras
    if (device.event[0] != '\0') doc["event"] = device.event;

    String body, response;
    serializeJson(doc, body);
    int code = request("/telemetry", body, response);
    if (code != 201) Serial.printf("[API] Send telemetry failed (HTTP %d): %s\n", code, response.c_str());
    else Serial.printf("[API] Telemetry sent: %s\n", body.c_str());
    if (code == 201 && includesBootReport) bootReportPending = false;
    // Gagal tersambung (code <= 0) atau backend error (5xx): false agar dicoba lagi. Penolakan 4xx (mis. kunci salah)
    // tidak akan berhasil dengan mengulang, jadi dianggap selesai dan menunggu jadwal berikutnya
    return code > 0 && code < 500;
}

// ---------- Antrean pembacaan yang belum terkirim ----------

// Satu pembacaan yang menunggu dikirim ulang
struct Reading {
    uint32_t measuredAt; // Detik sejak 1970 (UTC)
    float temperature;
    bool heaterOn;
    bool lampOn;
    char event[40];
};

// Antrean melingkar di RAM, hanya dipakai networkTask (tanpa lock). Hilang jika ESP32 restart. Penuh = yang terlama dibuang
static Reading backlog[BACKLOG_CAPACITY];
static size_t backlogHead = 0;  // Indeks pembacaan tertua
static size_t backlogCount = 0;

bool hasValidTemperature(const DeviceStatus& device) {
    return !isnan(device.temperature) && device.temperature >= -10 && device.temperature <= 60;
}

// Simpan pembacaan yang gagal terkirim. Tanpa jam NTP waktunya tidak bisa dicatat, jadi dilewati. Pembacaan
// dengan status yang sama dijarangkan (1 per BACKLOG_MIN_GAP_S) karena pengiriman gagal diulang tiap beberapa detik
void bufferReading(const DeviceStatus& device, uint32_t measuredAt) {
    if (measuredAt == 0 || !hasValidTemperature(device)) return;

    if (backlogCount > 0) {
        const Reading& last = backlog[(backlogHead + backlogCount - 1) % BACKLOG_CAPACITY];
        bool sameStatus = last.heaterOn == device.heaterOn && last.lampOn == device.lampOn &&
                          strcmp(last.event, device.event) == 0;
        if (sameStatus && measuredAt - last.measuredAt < BACKLOG_MIN_GAP_S) return;
    }
    if (backlogCount == BACKLOG_CAPACITY) {
        backlogHead = (backlogHead + 1) % BACKLOG_CAPACITY;
        backlogCount--;
    }

    Reading& slot = backlog[(backlogHead + backlogCount) % BACKLOG_CAPACITY];
    slot.measuredAt = measuredAt;
    slot.temperature = device.temperature;
    slot.heaterOn = device.heaterOn;
    slot.lampOn = device.lampOn;
    strlcpy(slot.event, device.event, sizeof(slot.event));
    backlogCount++;
}

// POST /telemetry/backlog: kirim pembacaan lama, paling tua dulu, BACKLOG_CHUNK per permintaan.
// 201 = paket dihapus dari antrean. 400 = backend menolak bentuk datanya, paket dibuang agar antrean tidak macet.
// Selain itu (tidak tersambung, 5xx, kunci salah) antrean dipertahankan dan hasilnya false
bool sendBacklog() {
    size_t count = backlogCount < BACKLOG_CHUNK ? backlogCount : BACKLOG_CHUNK;

    JsonDocument doc;
    JsonArray readings = doc["readings"].to<JsonArray>();
    for (size_t i = 0; i < count; i++) {
        const Reading& reading = backlog[(backlogHead + i) % BACKLOG_CAPACITY];
        JsonObject item = readings.add<JsonObject>();
        item["measuredAt"] = reading.measuredAt;
        item["currentTemp"] = reading.temperature;
        item["heaterStatus"] = reading.heaterOn ? "ON" : "OFF";
        item["ledStatus"] = reading.lampOn ? "ON" : "OFF";
        item["feederStatus"] = "Idle";
        if (reading.event[0] != '\0') item["event"] = reading.event;
    }

    String body, response;
    serializeJson(doc, body);
    int code = request("/telemetry/backlog", body, response);
    if (code != 201 && code != 400) {
        Serial.printf("[API] Send backlog failed (HTTP %d): %s\n", code, response.c_str());
        return false;
    }

    if (code == 400) Serial.printf("[API] Backlog rejected, %u readings dropped: %s\n", (unsigned)count, response.c_str());
    else Serial.printf("[API] Backlog sent: %u readings, %u left\n", (unsigned)count, (unsigned)(backlogCount - count));
    backlogHead = (backlogHead + count) % BACKLOG_CAPACITY;
    backlogCount -= count;
    return true;
}

// Config: GET /config ditahan backend sampai dashboard mengubah sesuatu (long polling), lalu langsung diterapkan.
// Task terpisah dari telemetry agar permintaan yang ditahan tidak menunda pengiriman telemetry
void configTask(void*) {
    for (;;) {
        configBeatAt = millis();
        uint32_t startedAt = millis();
        bool ok = false;
        if (WiFi.status() == WL_CONNECTED) {
            ok = fetchConfig();
            if (ok) {
                // loop() menjalankan config baru; telemetry berikutnya sudah mencerminkan hasilnya
                uint32_t applyStartedAt = millis();
                while (configPending && millis() - applyStartedAt < APPLY_TIMEOUT_MS) vTaskDelay(pdMS_TO_TICKS(50));
            }
        }
        // Gagal, atau dibalas langsung (pertama kali, versi basi, atau backend lama yang tidak menahan permintaan):
        // beri jeda agar tidak memanggil backend tanpa henti
        if (!ok || millis() - startedAt < 1000) vTaskDelay(pdMS_TO_TICKS(COMMAND_POLL_MS));
    }
}

// Telemetry dikirim tiap pollFrequency (diatur dari dashboard: Configuration -> System -> Poll frequency), atau
// segera saat status heater/lampu atau alarm berubah supaya hasil perintah cepat terlihat.
// Tidak dikirim selagi config baru belum dijalankan loop() (urutan: terima config -> jalankan -> laporkan).
// Dashboard menganggap Feed Now selesai saat telemetry pertama setelah perintah diterima
void networkTask(void*) {
    DeviceStatus reported = {NAN, false, false, ""}; // Status pada telemetry terakhir yang dikirim
    uint32_t nextTelemetryAt = 0;
    uint32_t nextAttemptAt = 0; // Jeda coba ulang setelah gagal, agar backend yang mati tidak dihujani permintaan
    bool online = false;        // true setelah pengiriman terakhir berhasil; antrean lama hanya dikirim saat online
    for (;;) {
        // shortcut: Wi-Fi memakai auto-reconnect bawaan ESP32; tambahkan WiFi.reconnect() jika di lapangan sering tidak tersambung lagi
        networkBeatAt = millis();
        if (bootReportPending && bootedAt == 0) {
            uint32_t epoch = epochNow();
            if (epoch) bootedAt = epoch - millis() / 1000; // Ditetapkan sekali, sama untuk semua percobaan kirim
        }
        bool connected = WiFi.status() == WL_CONNECTED;
        bool retryWait = (int32_t)(millis() - nextAttemptAt) < 0;

        if (!configPending && !retryWait) {
            DeviceStatus device = getStatus();
            bool changed = device.heaterOn != reported.heaterOn || device.lampOn != reported.lampOn ||
                           strcmp(device.event, reported.event) != 0;
            bool due = (int32_t)(millis() - nextTelemetryAt) >= 0;

            if (changed || due) {
                // Waktu pengukuran ditetapkan sekali agar pembacaan yang diantrekan dan dikirim ulang punya cap waktu sama
                uint32_t measuredAt = epochNow();
                if (connected && sendTelemetry(device, measuredAt)) {
                    reported = device;
                    nextTelemetryAt = millis() + getConfig().pollFrequency * 1000UL;
                    online = true;
                } else {
                    if (!connected) Serial.println("[WIFI] Not connected, waiting for auto-reconnect.");
                    bufferReading(device, measuredAt);
                    online = false;
                    nextAttemptAt = millis() + TELEMETRY_RETRY_MS;
                }
            } else if (online && connected && backlogCount > 0) {
                // Kirim antrean satu paket per siklus, setelah telemetry terbaru sudah sampai
                if (!sendBacklog()) {
                    online = false;
                    nextAttemptAt = millis() + TELEMETRY_RETRY_MS;
                }
            }
        }
        vTaskDelay(pdMS_TO_TICKS(TELEMETRY_CHECK_MS));
    }
}

// ============================================================
// Watchdog
// ============================================================

// Penyebab restart terakhir, agar restart oleh watchdog terlihat di serial monitor
const char* resetReasonName(esp_reset_reason_t reason) {
    switch (reason) {
        case ESP_RST_POWERON: return "power on";
        case ESP_RST_SW: return "software restart";
        case ESP_RST_PANIC: return "crash (panic)";
        case ESP_RST_INT_WDT: return "interrupt watchdog";
        case ESP_RST_TASK_WDT: return "task watchdog";
        case ESP_RST_WDT: return "other watchdog";
        case ESP_RST_BROWNOUT: return "brownout (power dip)";
        default: return "other";
    }
}

// Alasan restart yang perlu dilaporkan ke dashboard, nullptr jika restart biasa (power on atau sengaja)
const char* abnormalBootReason(esp_reset_reason_t reason) {
    switch (reason) {
        case ESP_RST_INT_WDT: return "interrupt watchdog";
        case ESP_RST_TASK_WDT: return "task watchdog";
        case ESP_RST_WDT: return "other watchdog";
        case ESP_RST_PANIC: return "crash (panic)";
        case ESP_RST_BROWNOUT: return "brownout (power dip)";
        case ESP_RST_SW: return stallRestartMagic == STALL_RESTART_MAGIC ? "network task stalled" : nullptr;
        default: return nullptr;
    }
}

// Task jaringan yang macet (Wi-Fi atau HTTP tersangkut) tidak mengganggu heater karena kontrolnya di loop(),
// tetapi dashboard jadi buta dan perintah tidak sampai. Restart aman: relay dimatikan saat boot dan config
// terakhir dipulihkan dari flash. Relay dimatikan dulu supaya tidak menyala selama proses restart
void checkNetworkTasks() {
    uint32_t now = millis();
    if (now - networkBeatAt <= NETWORK_STALL_MS && now - configBeatAt <= NETWORK_STALL_MS) return;

    Serial.println("[WDT] Network task stalled, restarting.");
    Serial.flush();
    stallRestartMagic = STALL_RESTART_MAGIC;
    digitalWrite(PIN_RELAY_HEATER, RELAY_OFF);
    digitalWrite(PIN_RELAY_LAMP, RELAY_OFF);
    ESP.restart();
}

// ============================================================
// setup() dan loop()
// ============================================================

void setup() {
    Serial.begin(115200);
    esp_reset_reason_t resetReason = esp_reset_reason();
    bootReason = abnormalBootReason(resetReason);
    bootReportPending = bootReason != nullptr;
    stallRestartMagic = 0; // Sudah dibaca; dipakai sekali
    Serial.printf("[BOOT] Last reset: %s\n", bootReason ? bootReason : resetReasonName(resetReason));

    // Relay dan buzzer lebih dulu agar keluaran pasti mati saat menyala
    initRelay(PIN_RELAY_HEATER);
    initRelay(PIN_RELAY_LAMP);
    pinMode(PIN_BUZZER, OUTPUT);
    digitalWrite(PIN_BUZZER, LOW);

    sensor.begin();
    sensor.setWaitForConversion(false); // Konversi ~750 ms ditunggu tanpa menahan loop()
    Serial.printf("[TEMP] DS18B20 sensors found: %d\n", sensor.getDeviceCount());

    loadSavedConfig();
    setTimezone(getConfig().timezone); // NTP langsung jalan begitu Wi-Fi tersambung, walau backend belum menjawab

    Serial.printf("[WIFI] Connecting to \"%s\"\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    // Task jaringan di core 0 agar Wi-Fi/HTTP yang lambat tidak menahan kontrol heater dan buzzer
    networkBeatAt = configBeatAt = millis(); // Dasar penghitungan macet; dipasang sebelum kedua task berjalan
    xTaskCreatePinnedToCore(networkTask, "network", 12288, nullptr, 1, nullptr, 0);
    xTaskCreatePinnedToCore(configTask, "config", 12288, nullptr, 1, nullptr, 0);

    // Task watchdog (timeout bawaan 5 detik): loop() otomatis melapor tiap putaran. Jika macet, ESP32 restart.
    // Dipasang paling akhir agar setup() yang lama tidak memicunya
    enableLoopWDT();
    // Konfirmasi di serial: tanpa ini kegagalan mendaftarkan watchdog tidak terlihat sama sekali
    Serial.printf("[WDT] Loop watchdog %s
", esp_task_wdt_status(nullptr) == ESP_OK ? "enabled" : "NOT ENABLED");
    Serial.println("=== SMART AQUARIUM READY (tanpa RTC) ===");
}

void loop() {
    checkNetworkTasks();

    // Config baru langsung dijalankan, lalu task jaringan boleh mengirim telemetry
    if (configPending) {
        applyHeater();
        applyLamp();
        configPending = false;
    }

    updateHeater();
    if ((int32_t)(millis() - nextLampCheckAt) >= 0) {
        nextLampCheckAt = millis() + LAMP_CHECK_INTERVAL_MS;
        applyLamp();
    }
    updateAlarm();
    delay(10);
}