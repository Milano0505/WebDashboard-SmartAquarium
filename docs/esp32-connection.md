# Koneksi ESP32

Dokumen ini menjelaskan cara menghubungkan ESP32 di akuarium dengan sistem web, beserta contoh kode firmware untuk koneksinya.

Contoh kode **hanya berisi bagian penghubung**: koneksi Wi-Fi, membaca pengaturan dari API, dan mengirim data ke API. Kode untuk membaca sensor dan menyalakan heater, lampu, atau pemberi pakan tidak termasuk dan ditulis oleh tim firmware.

Dokumen terkait:

- [api.md](api.md#detail-endpoint-perangkat): isi request dan respons endpoint perangkat, serta nilai yang diterima.
- [integrations.md](integrations.md#kontrak-dengan-perangkat): apa yang harus dilakukan perangkat dengan setiap pengaturan, dan urutan siklusnya.

## Gambaran koneksi

ESP32 hanya berbicara dengan **backend**. ESP32 tidak mengakses Firestore atau frontend secara langsung.

| Langkah | ESP32 melakukan                                   | Endpoint                                    | Hasil                                                   |
| ------- | ------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------- |
| 1       | Meminta pengaturan terbaru                        | `GET /api/hardware/{aquariumId}/config`     | Mode, suhu target, jadwal, perintah Feed Now, interval  |
| 2       | Menjalankan pengaturan (kode firmware lain)       | –                                           | Heater, lampu, dan pemberi pakan bekerja                |
| 3       | Mengirim suhu dan status nyata                    | `POST /api/hardware/{aquariumId}/telemetry` | Dashboard menampilkan data baru; riwayat bertambah      |
| 4       | Menunggu `pollFrequency` detik, lalu kembali ke 1 | –                                           | Interval diatur dari dashboard (Configuration → System) |

Kedua endpoint wajib memakai header `x-device-key` yang nilainya sama dengan `HARDWARE_API_KEY` di backend.

## Persiapan di sisi web

1. **Isi kunci perangkat.** Buat string acak panjang, lalu isi `HARDWARE_API_KEY` di `backend/.env`. Contoh cara membuatnya:

    ```powershell
    node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
    ```

    Jalankan ulang backend setelah mengubah `.env`.

2. **Cari alamat IP laptop yang menjalankan backend.** ESP32 tidak bisa memakai `localhost`, karena `localhost` di ESP32 berarti ESP32 itu sendiri. Jalankan `ipconfig` dan catat **IPv4 Address** dari adaptor Wi-Fi, misalnya `192.168.1.10`. URL API menjadi `http://192.168.1.10:5000`.
3. **Pastikan ESP32 dan laptop berada di jaringan Wi-Fi yang sama.** ESP32 hanya mendukung Wi-Fi **2,4 GHz**.
4. **Izinkan port backend di Windows Firewall.** Jalankan PowerShell sebagai Administrator:

    ```powershell
    New-NetFirewallRule -DisplayName "Smart Aquarium API" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow -Profile Private
    ```

5. **Uji dari perangkat lain.** Buka `http://192.168.1.10:5000/api/health` dari browser smartphone yang tersambung ke Wi-Fi yang sama. Jika muncul `{"status":"ok"}`, ESP32 juga bisa menjangkau backend.

CORS tidak berpengaruh pada ESP32, karena CORS hanya diterapkan oleh browser.

## Persiapan di sisi ESP32

| Kebutuhan          | Keterangan                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| Arduino IDE        | Dengan board package **esp32** dari Espressif Systems (Boards Manager)                           |
| `WiFi.h`           | Bawaan board package ESP32                                                                       |
| `HTTPClient.h`     | Bawaan board package ESP32                                                                       |
| ArduinoJson **v7** | Pasang lewat Library Manager (penulis: Benoit Blanchon). Dipakai untuk membaca dan membuat JSON. |

Nilai yang perlu diisi di bagian atas kode:

| Konstanta       | Isi                                             | Harus sama dengan                    |
| --------------- | ----------------------------------------------- | ------------------------------------ |
| `WIFI_SSID`     | Nama Wi-Fi                                      | –                                    |
| `WIFI_PASSWORD` | Password Wi-Fi                                  | –                                    |
| `API_BASE_URL`  | `http://<IP laptop>:<PORT>`, tanpa `/` di akhir | IP dari langkah 2 dan `PORT` backend |
| `AQUARIUM_ID`   | ID akuarium                                     | `SHARED_AQUARIUM_ID` di backend      |
| `DEVICE_KEY`    | Kunci perangkat                                 | `HARDWARE_API_KEY` di `backend/.env` |

## Contoh kode

```cpp
// Kode penghubung ESP32 dengan REST API Smart Aquarium:
// koneksi Wi-Fi, membaca pengaturan, dan mengirim telemetry.
// Membaca sensor dan menggerakkan heater, lampu, dan pemberi pakan tidak termasuk.

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>

// ---------- Pengaturan koneksi ----------

const char* WIFI_SSID = "NAMA_WIFI";
const char* WIFI_PASSWORD = "PASSWORD_WIFI";
const char* API_BASE_URL = "http://192.168.1.10:5000"; // IP laptop yang menjalankan backend, bukan localhost
const char* AQUARIUM_ID = "aquarium-001";              // Sama dengan SHARED_AQUARIUM_ID
const char* DEVICE_KEY = "ISI_HARDWARE_API_KEY";       // Sama dengan HARDWARE_API_KEY di backend/.env

const uint32_t HTTP_TIMEOUT_MS = 5000;
const uint32_t WIFI_TIMEOUT_MS = 15000;
const uint8_t MAX_FEEDING_SCHEDULES = 12; // Batas dari API

// ---------- Data dari dan ke API ----------

struct FeedingSchedule {
    String time; // "hh:mm AM/PM"
    bool isActive;
};

// Isi respons GET /config
struct AquariumConfig {
    // tempConfig
    String heaterMode;        // "AUTOMATIC" / "MANUAL"
    String heaterManualState; // "ON" / "OFF"
    float targetTemp;         // °C
    float minTempThreshold;   // °C
    float maxTempThreshold;   // °C
    // lightingConfig
    String lightMode;         // "AUTOMATIC" / "MANUAL"
    String lightManualState;  // "ON" / "OFF"
    String lightStartTime;    // "hh:mm AM/PM", kosong jika belum diatur
    String lightEndTime;
    bool lightScheduleActive;
    // feederConfig
    String feederMode;        // "AUTOMATIC" / "MANUAL"
    FeedingSchedule feedingSchedules[MAX_FEEDING_SCHEDULES];
    uint8_t feedingScheduleCount;
    String lastTriggeredAt;   // Waktu Feed Now terakhir (ISO), kosong jika belum pernah
    // systemConfig
    uint16_t pollFrequency;   // Detik, 1-60
    String timezone;          // Nama IANA, contoh "Asia/Jakarta"
};

// Isi body POST /telemetry: status nyata perangkat
struct DeviceStatus {
    float currentTemp; // °C, harus -10 sampai 60
    bool heaterOn;
    bool ledOn;
    bool feederActive;
    String event;      // Opsional, maks. 160 karakter
};

AquariumConfig config;
bool hasConfig = false;

// Diperbarui oleh kode sensor dan aktuator. Suhu NAN = belum ada pembacaan, telemetry tidak dikirim
DeviceStatus deviceStatus = {NAN, false, false, false, ""};

String lastSeenTrigger;
bool hasSeenTrigger = false;

// ---------- Wi-Fi ----------

void connectWiFi() {
    if (WiFi.status() == WL_CONNECTED) return;

    Serial.printf("Connecting to Wi-Fi \"%s\"", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    uint32_t startedAt = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startedAt < WIFI_TIMEOUT_MS) {
        delay(500);
        Serial.print(".");
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf(" connected, IP %s\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println(" failed");
    }
}

// ---------- Fungsi bantu HTTP ----------

String endpoint(const char* path) {
    return String(API_BASE_URL) + "/api/hardware/" + AQUARIUM_ID + path;
}

// Status negatif = gagal terhubung (bukan respons server); selain itu body berisi { "message": "..." }
void logRequestError(const char* action, int status, const String& body) {
    String detail = status < 0 ? HTTPClient::errorToString(status) : body;
    Serial.printf("%s failed (HTTP %d): %s\n", action, status, detail.c_str());
}

// ---------- GET /api/hardware/{aquariumId}/config ----------

bool fetchConfig() {
    HTTPClient http;
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.begin(endpoint("/config"));
    http.addHeader("x-device-key", DEVICE_KEY);

    int status = http.GET();
    String body = status > 0 ? http.getString() : "";
    http.end();

    if (status != 200) {
        logRequestError("Read config", status, body);
        return false;
    }

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, body);
    if (error) {
        Serial.printf("Config JSON is invalid: %s\n", error.c_str());
        return false;
    }

    // Nilai setelah `|` dipakai jika field kosong (null) atau tidak ada
    JsonObject temp = doc["tempConfig"];
    config.heaterMode = temp["mode"] | "MANUAL";
    config.heaterManualState = temp["manualControlState"] | "OFF";
    config.targetTemp = temp["targetTemp"] | 24.0f;
    config.minTempThreshold = temp["minTempThreshold"] | 20.0f;
    config.maxTempThreshold = temp["maxTempThreshold"] | 30.0f;

    JsonObject lighting = doc["lightingConfig"];
    config.lightMode = lighting["mode"] | "MANUAL";
    config.lightManualState = lighting["manualControlState"] | "OFF";
    config.lightStartTime = lighting["schedule"]["startTime"] | "";
    config.lightEndTime = lighting["schedule"]["endTime"] | "";
    config.lightScheduleActive = lighting["schedule"]["isActive"] | false;

    JsonObject feeder = doc["feederConfig"];
    config.feederMode = feeder["mode"] | "MANUAL";
    config.lastTriggeredAt = feeder["lastTriggeredAt"] | "";
    config.feedingScheduleCount = 0;
    for (JsonObject item : feeder["schedules"].as<JsonArray>()) {
        if (config.feedingScheduleCount >= MAX_FEEDING_SCHEDULES) break;
        FeedingSchedule& schedule = config.feedingSchedules[config.feedingScheduleCount++];
        schedule.time = item["time"] | "";
        schedule.isActive = item["isActive"] | false;
    }

    JsonObject systemConfig = doc["systemConfig"];
    config.pollFrequency = systemConfig["pollFrequency"] | 5;
    config.timezone = systemConfig["timezone"] | "Asia/Jakarta";

    Serial.printf("Config: heater %s/%s, target %.1f C, light %s/%s, feeder %s, poll %us\n",
                  config.heaterMode.c_str(), config.heaterManualState.c_str(), config.targetTemp,
                  config.lightMode.c_str(), config.lightManualState.c_str(), config.feederMode.c_str(),
                  config.pollFrequency);
    return true;
}

// Feed Now: true satu kali setiap lastTriggeredAt berubah pada mode MANUAL.
// Nilai pertama setelah ESP32 menyala hanya dicatat, agar restart tidak memberi pakan ulang
bool consumeFeedCommand() {
    if (!hasSeenTrigger) {
        lastSeenTrigger = config.lastTriggeredAt;
        hasSeenTrigger = true;
        return false;
    }
    if (config.lastTriggeredAt.isEmpty() || config.lastTriggeredAt == lastSeenTrigger) return false;

    lastSeenTrigger = config.lastTriggeredAt;
    return config.feederMode == "MANUAL";
}

// ---------- POST /api/hardware/{aquariumId}/telemetry ----------

bool sendTelemetry(const DeviceStatus& status) {
    // Server menolak suhu di luar -10..60 °C, misalnya -127 saat sensor terputus
    if (isnan(status.currentTemp) || status.currentTemp < -10 || status.currentTemp > 60) {
        Serial.println("Telemetry skipped: no valid temperature reading.");
        return false;
    }

    JsonDocument doc;
    doc["currentTemp"] = status.currentTemp;
    doc["heaterStatus"] = status.heaterOn ? "ON" : "OFF";
    doc["ledStatus"] = status.ledOn ? "ON" : "OFF";
    doc["feederStatus"] = status.feederActive ? "Active" : "Idle";
    if (status.event.length() > 0) doc["event"] = status.event.substring(0, 160);

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
    Serial.printf("Telemetry sent: %.1f C\n", status.currentTemp);
    return true;
}

// ---------- Siklus utama ----------

void setup() {
    Serial.begin(115200);
    connectWiFi();
}

void loop() {
    connectWiFi();

    if (WiFi.status() == WL_CONNECTED) {
        // 1. Baca pengaturan terbaru; jika gagal, pengaturan terakhir tetap dipakai
        if (fetchConfig()) hasConfig = true;

        // 2. Jalankan pengaturan di sini (kode sensor dan aktuator, tidak termasuk contoh ini):
        //    pakai nilai di `config`, panggil consumeFeedCommand() untuk Feed Now,
        //    lalu perbarui `deviceStatus` dengan status nyata

        // 3. Kirim status nyata setelah perintah dijalankan, agar status "menunggu" di dashboard benar
        sendTelemetry(deviceStatus);
    }

    // Interval diatur dari dashboard (Configuration → System → Poll frequency)
    delay((hasConfig ? config.pollFrequency : 5) * 1000UL);
}
```

## Cara kerja kode

| Fungsi                 | Tugas                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `connectWiFi()`        | Menyambung ke Wi-Fi, dan menyambung ulang di setiap siklus jika koneksi putus.                         |
| `fetchConfig()`        | Memanggil `GET …/config`, lalu menyalin isinya ke `config`. Jika gagal, `config` lama tetap dipakai.   |
| `consumeFeedCommand()` | Mengembalikan `true` satu kali setiap ada perintah Feed Now baru. Dipanggil oleh kode pemberi pakan.   |
| `sendTelemetry()`      | Mengubah `deviceStatus` menjadi JSON dan memanggil `POST …/telemetry`. Dilewati jika suhu belum valid. |
| `loop()`               | Menjalankan siklus **baca pengaturan → jalankan → kirim data** setiap `pollFrequency` detik.           |

Kode firmware lain cukup:

- **Membaca** pengaturan dari variabel `config` (misalnya `config.targetTemp`, `config.lightStartTime`).
- **Memanggil** `consumeFeedCommand()` untuk mengetahui apakah harus memberi pakan sekarang.
- **Mengisi** `deviceStatus` dengan suhu dan status nyata heater, lampu, dan pemberi pakan.

Catatan:

- `delay()` menghentikan program selama menunggu. Jika firmware perlu tetap berjalan di antara siklus (misalnya membaca tombol), ganti dengan pengecekan `millis()`.
- `systemConfig.timezone` berupa nama IANA (`Asia/Jakarta`). Jika jam ESP32 diatur lewat `configTzTime()`, ubah dulu ke format POSIX, misalnya `Asia/Jakarta` → `WIB-7`.
- Perintah Feed Now yang dikirim saat ESP32 mati tidak dijalankan setelah ESP32 menyala, agar restart tidak memberi pakan dua kali.

## Menguji koneksi

Tanpa kode sensor, `deviceStatus.currentTemp` bernilai `NAN` sehingga telemetry tidak dikirim. Untuk menguji koneksi saja, ganti sementara nilai awalnya, misalnya `{25.0, false, false, false, "Connection test"}`.

1. Jalankan backend dan frontend (lihat [README.md](../README.md)).
2. Upload kode ke ESP32, lalu buka **Serial Monitor** dengan baud rate `115200`.
3. Pastikan muncul `connected, IP …`, `Config: …`, dan `Telemetry sent: 25.0 C`.
4. Buka dashboard. Badge di samping judul berubah menjadi **Device online** dan suhu 25.0 °C tampil di Overview.
5. Ubah suhu target atau mode heater di dashboard. Pada siklus berikutnya, baris `Config: …` di Serial Monitor menampilkan nilai baru.
6. Di Firebase Console, dokumen baru muncul di `aquariums/aquarium-001/telemetry_history` setiap siklus (lihat [database.md](database.md#membuka-database)).

Kembalikan nilai awal `deviceStatus` ke `NAN` setelah pengujian selesai.

## Masalah umum

| Yang terlihat di Serial Monitor                                            | Penyebab                                                                                   | Solusi                                                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `Connecting to Wi-Fi …… failed`                                            | Nama/password salah, atau Wi-Fi 5 GHz                                                      | Periksa `WIFI_SSID` dan `WIFI_PASSWORD`; pakai jaringan 2,4 GHz                      |
| `(HTTP -1): connection refused`                                            | Backend tidak berjalan, IP salah, atau diblokir firewall                                   | Ulangi langkah 2–5 di [Persiapan di sisi web](#persiapan-di-sisi-web)                |
| `(HTTP -11): read Timeout`                                                 | Jaringan lambat atau backend tidak menjawab                                                | Cek `/api/health` dari browser smartphone di Wi-Fi yang sama                         |
| `(HTTP 401): {"message":"A valid device key is required."}`                | `DEVICE_KEY` berbeda dengan `HARDWARE_API_KEY`                                             | Samakan nilainya, lalu upload ulang                                                  |
| `(HTTP 503): {"message":"Hardware API authentication is not configured."}` | `HARDWARE_API_KEY` kosong di backend                                                       | Isi di `backend/.env` dan jalankan ulang backend                                     |
| `(HTTP 404): {"message":"Aquarium was not found."}`                        | `AQUARIUM_ID` salah, atau belum ada akun yang register                                     | Samakan dengan `SHARED_AQUARIUM_ID`; register satu akun di dashboard dulu            |
| `(HTTP 400): {"message":"…"}`                                              | Isi telemetry tidak valid                                                                  | Baca pesannya; nilai yang diterima ada di [api.md](api.md#detail-endpoint-perangkat) |
| Dashboard tetap "Waiting for the device…" setelah Feed Now                 | `consumeFeedCommand()` tidak dipanggil, atau telemetry dikirim sebelum perintah dijalankan | Ikuti urutan di `loop()`                                                             |

## Keamanan

- Contoh ini memakai **HTTP biasa** di jaringan lokal, sehingga kunci perangkat terkirim tanpa enkripsi. Jika backend dipasang di internet, pakai HTTPS dengan `WiFiClientSecure` dan sertifikat CA server.
- Jangan commit `DEVICE_KEY` dan password Wi-Fi asli ke repository. Simpan di file terpisah (misalnya `secrets.h`) yang dimasukkan ke `.gitignore`.
- Jika kunci bocor, ganti `HARDWARE_API_KEY` di backend lalu upload ulang firmware dengan kunci baru.
