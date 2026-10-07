/*
  Firmware ESP32 Smart Aquarium: heater dan lampu, terhubung ke REST API backend.
  Pemberi pakan belum ada di perangkat keras, jadi feederStatus selalu "Idle".

  Siklus setiap systemConfig.pollFrequency detik (urutan ini wajib, lihat docs/integrations.md):
    1. GET  /api/hardware/{aquariumId}/config     (task jaringan, core 0)
    2. Menjalankan config: heater dan lampu       (loop(), core 1)
    3. POST /api/hardware/{aquariumId}/telemetry  (task jaringan, core 0)

  Heater dan lampu tetap dikontrol walau Wi-Fi atau backend mati, memakai config terakhir (disimpan di flash).

  Isi file (urut dari atas):
    Pin dan konstanta -> Data bersama -> Alarm -> Jam -> Heater -> Lampu -> Jaringan -> setup() dan loop()
*/

#include <Arduino.h>
#include <ArduinoJson.h>
#include <DallasTemperature.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <Preferences.h>
#include <RTClib.h>
#include <WiFi.h>
#include <Wire.h>
#include <time.h>
#include "secrets.h" // Wi-Fi, alamat backend, DEVICE_KEY (salin dari secrets.example.h)

// ============================================================
// Pin dan konstanta
// ============================================================

// ---------- Pin (sesuai diagram wiring) ----------

constexpr uint8_t PIN_ONE_WIRE = 4;      // DS18B20 DAT
constexpr uint8_t PIN_RELAY_HEATER = 18; // Relay IN1
constexpr uint8_t PIN_RELAY_LAMP = 19;   // Relay IN2
constexpr uint8_t PIN_BUZZER = 5;        // Buzzer aktif
constexpr uint8_t PIN_SDA = 21;          // RTC DS3231
constexpr uint8_t PIN_SCL = 22;

// Modul relay umumnya active LOW. Jika relay bekerja terbalik, tukar nilainya
constexpr uint8_t RELAY_ON = LOW;
constexpr uint8_t RELAY_OFF = HIGH;

// ---------- Heater ----------

constexpr float HYSTERESIS_C = 0.5;              // Selisih nyala/mati di sekitar suhu target
constexpr float HEATER_CUTOFF_C = 36.0;          // Heater dipaksa mati; di atas suhu target maks. dashboard (35 C)
constexpr uint32_t TEMP_READ_INTERVAL_MS = 5000; // Jarak antar pembacaan sensor
constexpr uint32_t TEMP_CONVERSION_MS = 800;     // Waktu konversi DS18B20 (12 bit)

// ---------- Lampu ----------

constexpr uint32_t LAMP_CHECK_INTERVAL_MS = 1000; // Jarak pemeriksaan jadwal

// ---------- Jaringan dan jam ----------

constexpr uint32_t WIFI_TIMEOUT_MS = 15000;
constexpr uint32_t HTTP_TIMEOUT_MS = 5000;
constexpr uint32_t APPLY_TIMEOUT_MS = 4000;                  // Batas menunggu loop() menjalankan config sebelum telemetry
constexpr uint32_t RTC_SYNC_INTERVAL_MS = 6UL * 3600 * 1000; // Jarak penyetelan ulang RTC dari NTP

// ============================================================
// Data bersama (loop() di core 1, task jaringan di core 0)
// Hanya tipe sederhana agar aman disalin di dalam critical section.
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

// Sebelum config dari backend diterima semua aktuator mati (sama dengan nilai awal backend)
static RemoteConfig config = {false, false, 24.0, 20.0, 30.0, false, false, false, -1, -1, 5, "Asia/Jakarta"};
static DeviceStatus status = {NAN, false, false, ""};

// ---------- Config ----------

// Salinan config saat ini (aman dipanggil dari core mana pun)
RemoteConfig getConfig() {
    portENTER_CRITICAL(&lock);
    RemoteConfig copy = config;
    portEXIT_CRITICAL(&lock);
    return copy;
}

// Simpan config ke flash agar tetap ada setelah ESP32 mati
void saveConfig(const RemoteConfig& value) {
    Preferences prefs;
    prefs.begin("aquarium", false);
    prefs.putBytes("config", &value, sizeof(value));
    prefs.end();
}

// Pakai config baru dari backend dan tandai "belum dijalankan"
void storeConfig(const RemoteConfig& next) {
    // Struct dibuat dari memset(0) sehingga memcmp aman dipakai untuk membandingkan isi
    bool changed = memcmp(&config, &next, sizeof(RemoteConfig)) != 0;

    portENTER_CRITICAL(&lock);
    config = next;
    portEXIT_CRITICAL(&lock);
    configPending = true;

    // Flash hanya ditulis saat ada perubahan, bukan di setiap siklus
    if (changed) saveConfig(next);
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

// ---------- Status ----------

// Salinan status saat ini (aman dipanggil dari core mana pun)
DeviceStatus getStatus() {
    portENTER_CRITICAL(&lock);
    DeviceStatus copy = status;
    portEXIT_CRITICAL(&lock);
    return copy;
}

void setTemperature(float value) {
    portENTER_CRITICAL(&lock);
    status.temperature = value;
    portEXIT_CRITICAL(&lock);
}

void setHeaterOn(bool on) {
    portENTER_CRITICAL(&lock);
    status.heaterOn = on;
    portEXIT_CRITICAL(&lock);
}

void setLampOn(bool on) {
    portENTER_CRITICAL(&lock);
    status.lampOn = on;
    portEXIT_CRITICAL(&lock);
}

void setEvent(const char* text) {
    portENTER_CRITICAL(&lock);
    strlcpy(status.event, text, sizeof(status.event));
    portEXIT_CRITICAL(&lock);
}

// ============================================================
// Relay (dipakai heater dan lampu)
// ============================================================

// Relay dipastikan OFF sebelum pin menjadi output, agar tidak berkedip saat ESP32 menyala
void initRelay(uint8_t pin) {
    digitalWrite(pin, RELAY_OFF);
    pinMode(pin, OUTPUT);
    digitalWrite(pin, RELAY_OFF);
}

void switchRelay(uint8_t pin, bool on) {
    digitalWrite(pin, on ? RELAY_ON : RELAY_OFF);
}

// ============================================================
// Alarm (buzzer)
// ============================================================

static bool alarmActive = false;

void initAlarm() {
    pinMode(PIN_BUZZER, OUTPUT);
    digitalWrite(PIN_BUZZER, LOW);
}

// Teks tidak kosong = alarm aktif, "" = alarm mati.
// Alasan alarm juga dikirim ke dashboard sebagai "event" telemetry
void setAlarm(const char* reason) {
    bool shouldBeActive = reason[0] != '\0';
    if (shouldBeActive && !alarmActive) {
        Serial.printf("[ALARM] %s\n", reason);
    } else if (!shouldBeActive && alarmActive) {
        Serial.println("[ALARM] Back to normal.");
    }
    alarmActive = shouldBeActive;
    setEvent(reason);
}

// Beep 150 ms setiap 1 detik tanpa menahan program. Dipanggil terus dari loop()
void updateAlarm() {
    bool beep = alarmActive && (millis() % 1000) < 150;
    digitalWrite(PIN_BUZZER, beep ? HIGH : LOW);
}

// ============================================================
// Jam lokal
// Dibaca dari NTP jika sudah sinkron, jika belum dari RTC DS3231 (tetap jalan tanpa internet).
// RTC selalu menyimpan waktu lokal sesuai timezone dashboard.
// ============================================================

static RTC_DS3231 rtc;
static bool rtcReady = false;

static char appliedZone[40] = "";      // Timezone yang sudah diproses
static volatile bool rtcSyncDue = false; // true = RTC perlu disetel ulang dari NTP
static uint32_t lastRtcSync = 0;

// ---------- Daftar zona waktu ----------

// Nama IANA (pilihan di dashboard) -> format POSIX untuk configTzTime()
struct ZoneRule {
    const char* iana;
    const char* posix;
};

static const ZoneRule ZONES[] = {
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
void setTimezone(const char* ianaName) {
    if (strcmp(ianaName, appliedZone) == 0) return;

    // Dicatat agar peringatan tidak diulang di setiap siklus
    strlcpy(appliedZone, ianaName, sizeof(appliedZone));

    for (const ZoneRule& zone : ZONES) {
        if (strcmp(zone.iana, ianaName) != 0) continue;
        configTzTime(zone.posix, "pool.ntp.org", "time.google.com");
        rtcSyncDue = true;
        Serial.printf("[TIME] Timezone %s, syncing with NTP.\n", ianaName);
        return;
    }
    Serial.printf("[TIME] Timezone %s is not in the firmware list, using the RTC time as is.\n", ianaName);
}

// ---------- Baca waktu ----------

// Waktu sistem (dari NTP) dianggap valid jika sudah lewat tahun 2023
bool readSystemTime(tm* out) {
    time_t now = time(nullptr);
    if (now < 1700000000) return false;
    localtime_r(&now, out);
    return true;
}

// Menit sejak 00:00 waktu lokal, -1 jika jam belum diketahui
int minuteOfDay() {
    tm local;
    if (readSystemTime(&local)) return local.tm_hour * 60 + local.tm_min;
    if (rtcReady) {
        DateTime now = rtc.now();
        return now.hour() * 60 + now.minute();
    }
    return -1;
}

// ---------- RTC ----------

void initClock() {
    Wire.begin(PIN_SDA, PIN_SCL);
    rtcReady = rtc.begin();
    if (!rtcReady) {
        Serial.println("[RTC] Not found, check SDA/SCL. The lamp schedule needs NTP time.");
        return;
    }
    if (rtc.lostPower()) {
        Serial.println("[RTC] Lost power, set from build time until NTP syncs.");
        rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    }
}

// Menyetel RTC dari NTP secara berkala.
// Semua akses RTC (I2C) dilakukan dari loop() agar tidak bentrok antar-core
void updateClock() {
    tm local;
    if (!rtcReady || !readSystemTime(&local)) return;

    bool due = rtcSyncDue || lastRtcSync == 0 || millis() - lastRtcSync >= RTC_SYNC_INTERVAL_MS;
    if (!due) return;

    rtc.adjust(DateTime(local.tm_year + 1900, local.tm_mon + 1, local.tm_mday, local.tm_hour, local.tm_min,
                        local.tm_sec));
    rtcSyncDue = false;
    lastRtcSync = millis() | 1; // Tidak boleh 0 karena 0 berarti belum pernah sinkron
    Serial.println("[RTC] Set from NTP.");
}

// ============================================================
// Heater (sensor suhu + relay)
// ============================================================

static OneWire oneWire(PIN_ONE_WIRE);
static DallasTemperature sensor(&oneWire);

static bool heaterOn = false;
static bool converting = false;     // true = sensor sedang konversi, hasil belum siap
static bool hasReading = false;     // Sudah pernah mencoba membaca sensor
static uint32_t nextReadAt = 0;
static uint32_t convertingSince = 0;

void initHeater() {
    initRelay(PIN_RELAY_HEATER);
    sensor.begin();
    sensor.setWaitForConversion(false); // Konversi ~750 ms ditunggu tanpa menahan loop()
    Serial.printf("[TEMP] DS18B20 sensors found: %d\n", sensor.getDeviceCount());
}

// Nyalakan atau matikan relay heater (hanya bertindak jika statusnya berubah)
void setHeater(bool on) {
    if (on == heaterOn) return;
    switchRelay(PIN_RELAY_HEATER, on);
    heaterOn = on;
    setHeaterOn(on);
    Serial.printf("[HEATER] %s\n", on ? "ON" : "OFF");
}

// Jalankan config terbaru memakai suhu terakhir, tanpa menunggu pembacaan baru
void applyHeater() {
    if (!hasReading) return;

    RemoteConfig cfg = getConfig();
    float temp = getStatus().temperature;

    // Fail-safe: sensor putus atau tidak terbaca -> heater mati, apa pun mode dashboard
    if (isnan(temp)) {
        setHeater(false);
        setAlarm("Sensor error");
        return;
    }

    // Batas keras perangkat: berlaku juga untuk mode manual
    if (temp >= HEATER_CUTOFF_C) {
        setHeater(false);
        setAlarm("Temperature too high");
        return;
    }

    if (!cfg.heaterAuto) {
        setHeater(cfg.heaterManualOn); // MANUAL: ikuti tombol dashboard
    } else if (temp < cfg.targetTemp - HYSTERESIS_C) {
        setHeater(true); // AUTOMATIC: terlalu dingin
    } else if (temp >= cfg.targetTemp + HYSTERESIS_C) {
        setHeater(false); // AUTOMATIC: cukup hangat
    }

    // Alarm mengikuti batas suhu dari dashboard
    if (temp > cfg.maxTemp) setAlarm("Temperature too high");
    else if (temp < cfg.minTemp) setAlarm("Temperature too low");
    else setAlarm("");
}

// Baca sensor secara berkala tanpa menahan program: minta konversi -> tunggu -> baca -> atur heater
void updateHeater() {
    uint32_t now = millis();

    if (!converting) {
        if ((int32_t)(now - nextReadAt) < 0) return; // Belum waktunya membaca
        sensor.requestTemperatures();
        converting = true;
        convertingSince = now;
        return;
    }
    if (now - convertingSince < TEMP_CONVERSION_MS) return; // Konversi belum selesai

    converting = false;
    nextReadAt = now + TEMP_READ_INTERVAL_MS;
    hasReading = true;

    // -127 = sensor terputus, 85 = nilai awal saat sensor baru menyala (belum ada hasil)
    float temp = sensor.getTempCByIndex(0);
    if (temp == DEVICE_DISCONNECTED_C || temp == 85.0) {
        Serial.println("[TEMP] Sensor read failed.");
        setTemperature(NAN);
    } else {
        Serial.printf("[TEMP] %.2f C\n", temp);
        setTemperature(temp);
    }
    applyHeater();
}

// ============================================================
// Lampu (relay + jadwal)
// ============================================================

static bool lampOn = false;
static uint32_t nextLampCheckAt = 0;

void initLamp() {
    initRelay(PIN_RELAY_LAMP);
}

// Nyalakan atau matikan relay lampu (hanya bertindak jika statusnya berubah)
void setLamp(bool on) {
    if (on == lampOn) return;
    switchRelay(PIN_RELAY_LAMP, on);
    lampOn = on;
    setLampOn(on);
    Serial.printf("[LAMP] %s\n", on ? "ON" : "OFF");
}

// Apakah menit sekarang ada di dalam jadwal? Jadwal boleh melewati tengah malam (misalnya 18:00 sampai 06:00)
bool inSchedule(int now, int start, int end) {
    if (start < 0 || end < 0 || start == end) return false;
    if (start < end) return now >= start && now < end;
    return now >= start || now < end;
}

// Jalankan config terbaru sekarang juga
void applyLamp() {
    RemoteConfig cfg = getConfig();

    if (!cfg.lampAuto) {
        setLamp(cfg.lampManualOn); // MANUAL: ikuti tombol dashboard
        return;
    }

    // AUTOMATIC: jadwal nonaktif atau jam belum diketahui -> lampu mati
    int now = minuteOfDay();
    bool scheduled = cfg.lampScheduleOn && now >= 0 && inSchedule(now, cfg.lampStartMin, cfg.lampEndMin);
    setLamp(scheduled);
}

// Periksa jadwal lampu setiap LAMP_CHECK_INTERVAL_MS
void updateLamp() {
    uint32_t now = millis();
    if ((int32_t)(now - nextLampCheckAt) < 0) return;
    nextLampCheckAt = now + LAMP_CHECK_INTERVAL_MS;
    applyLamp();
}

// ============================================================
// Jaringan (task di core 0)
// ============================================================

// ---------- Wi-Fi ----------

// Sambung ke Wi-Fi jika belum tersambung (menunggu maksimal WIFI_TIMEOUT_MS)
void connectWiFi() {
    if (WiFi.status() == WL_CONNECTED) return;

    Serial.printf("[WIFI] Connecting to \"%s\"", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    uint32_t startedAt = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startedAt < WIFI_TIMEOUT_MS) {
        vTaskDelay(pdMS_TO_TICKS(500));
        Serial.print(".");
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf(" connected, IP %s\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println(" failed");
    }
}

// ---------- Fungsi bantu HTTP ----------

// URL lengkap endpoint perangkat, contoh: http://192.168.1.10:5000/api/hardware/aquarium-001/config
String endpoint(const char* path) {
    return String(API_BASE_URL) + "/api/hardware/" + AQUARIUM_ID + path;
}

// Status negatif = gagal terhubung (bukan respons server); selain itu body berisi { "message": "..." }
void logRequestError(const char* action, int status, const String& body) {
    String detail = status < 0 ? HTTPClient::errorToString(status) : body;
    Serial.printf("[API] %s failed (HTTP %d): %s\n", action, status, detail.c_str());
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

// ---------- GET /api/hardware/{aquariumId}/config ----------

// Ambil pengaturan dari dashboard lalu simpan ke config. Jika gagal, config lama tetap dipakai
bool fetchConfig() {
    HTTPClient http;
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.begin(endpoint("/config"));
    http.addHeader("x-device-key", DEVICE_KEY);

    int code = http.GET();
    String body = code > 0 ? http.getString() : "";
    http.end();

    if (code != 200) {
        logRequestError("Read config", code, body);
        return false;
    }

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, body);
    if (error) {
        Serial.printf("[API] Config JSON is invalid: %s\n", error.c_str());
        return false;
    }

    // memset agar byte kosong selalu 0 (dipakai untuk membandingkan config). Nilai setelah `|`
    // dipakai jika field kosong (null) atau tidak ada
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

    next.pollFrequency = constrain((int)(doc["systemConfig"]["pollFrequency"] | 5), 1, 60);
    strlcpy(next.timezone, doc["systemConfig"]["timezone"] | "Asia/Jakarta", sizeof(next.timezone));

    storeConfig(next);
    setTimezone(next.timezone);

    Serial.printf("[API] Config: heater %s/%s target %.1f C, lamp %s/%s schedule %s, poll %us\n",
                  next.heaterAuto ? "AUTO" : "MANUAL", next.heaterManualOn ? "ON" : "OFF", next.targetTemp,
                  next.lampAuto ? "AUTO" : "MANUAL", next.lampManualOn ? "ON" : "OFF",
                  next.lampScheduleOn ? "on" : "off", next.pollFrequency);
    return true;
}

// ---------- POST /api/hardware/{aquariumId}/telemetry ----------

// Kirim suhu dan status nyata heater/lampu ke dashboard
bool sendTelemetry() {
    DeviceStatus device = getStatus();

    // Server menolak suhu di luar -10..60 C, misalnya saat sensor terputus
    if (isnan(device.temperature) || device.temperature < -10 || device.temperature > 60) {
        Serial.println("[API] Telemetry skipped: no valid temperature reading.");
        return false;
    }

    JsonDocument doc;
    doc["currentTemp"] = device.temperature;
    doc["heaterStatus"] = device.heaterOn ? "ON" : "OFF";
    doc["ledStatus"] = device.lampOn ? "ON" : "OFF";
    doc["feederStatus"] = "Idle"; // Pemberi pakan belum dipasang di perangkat keras
    if (device.event[0] != '\0') doc["event"] = device.event;

    String body;
    serializeJson(doc, body);

    HTTPClient http;
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.begin(endpoint("/telemetry"));
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-device-key", DEVICE_KEY);

    int code = http.POST(body);
    String response = code > 0 ? http.getString() : "";
    http.end();

    if (code != 201) {
        logRequestError("Send telemetry", code, response);
        return false;
    }
    Serial.printf("[API] Telemetry sent: %.1f C, heater %s, lamp %s\n", device.temperature,
                  device.heaterOn ? "ON" : "OFF", device.lampOn ? "ON" : "OFF");
    return true;
}

// ---------- Siklus jaringan ----------

// Urutan wajib: baca config -> loop() menjalankannya -> kirim telemetry.
// Dashboard menganggap Feed Now selesai saat telemetry pertama setelah perintah diterima
void networkTask(void*) {
    for (;;) {
        connectWiFi();

        if (WiFi.status() == WL_CONNECTED) {
            if (fetchConfig()) {
                // Tunggu loop() menjalankan config baru sebelum mengirim telemetry
                uint32_t startedAt = millis();
                while (configPending && millis() - startedAt < APPLY_TIMEOUT_MS) {
                    vTaskDelay(pdMS_TO_TICKS(50));
                }
            }
            sendTelemetry();
        }

        // Interval diatur dari dashboard (Configuration -> System -> Poll frequency)
        vTaskDelay(pdMS_TO_TICKS(getConfig().pollFrequency * 1000UL));
    }
}

// Jalankan task jaringan di core 0 agar Wi-Fi/HTTP yang lambat tidak menahan kontrol heater dan buzzer
void startNetworkTask() {
    xTaskCreatePinnedToCore(networkTask, "network", 12288, nullptr, 1, nullptr, 0);
}

// ============================================================
// setup() dan loop()
// ============================================================

void setup() {
    Serial.begin(115200);

    // Relay dan buzzer lebih dulu agar keluaran pasti mati saat menyala
    initHeater();
    initLamp();
    initAlarm();
    initClock();

    loadSavedConfig();
    startNetworkTask();

    Serial.println("=== SMART AQUARIUM READY ===");
}

void loop() {
    // Config baru langsung dijalankan, lalu task jaringan boleh mengirim telemetry
    if (configPending) {
        applyHeater();
        applyLamp();
        configPending = false;
    }

    updateHeater();
    updateLamp();
    updateClock();
    updateAlarm();
    delay(10);
}
