# Perangkat Lunak Firmware

Firmware ada di [main.cpp](../../device/src/main.cpp). Cara memasang dan menjalankan ada di [device/README.md](../../device/README.md); cara mengujinya ada di [testing.md](testing.md).

## Modul

Satu file dibagi menjadi bagian-bagian berikut (urut dari atas):

| Modul              | Fungsi                                                                                                                                                               | Alasan dipisah                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Pin dan konstanta  | Menyimpan nomor pin, polaritas relay, batas suhu, dan interval waktu.                                                                                                | Semua nilai yang mungkin diubah ada di satu tempat; mengganti pin atau ambang tidak perlu mencari di banyak fungsi. |
| Data bersama       | Menyimpan RemoteConfig (pengaturan dari dashboard) dan DeviceStatus (suhu dan status nyata). Akses lewat getConfig(), getStatus(), set…() dengan portENTER_CRITICAL. | Core 0 dan core 1 saling berbagi data. Hanya tipe sederhana, sehingga aman disalin di dalam critical section.       |
| Relay              | initRelay() memastikan relay OFF sebelum pin menjadi output; switchRelay() menyalakan atau mematikan.                                                                | Dipakai heater dan lampu; polaritas aktif-LOW hanya diatur di satu tempat.                                          |
| Alarm              | setAlarm() menyimpan alasan alarm; updateAlarm() membunyikan buzzer 150 ms tiap 1 detik tanpa menahan program.                                                       | Memisahkan keputusan alarm dari cara membunyikannya.                                                                |
| Jam lokal          | Menyetel zona waktu dari dashboard, mengambil waktu dari NTP, dan mencatat saat NTP sinkron.                                                                         | Sumber waktu dan zona waktu dibutuhkan lampu saja; dipisah agar sumber waktu mudah diganti (misalnya RTC).          |
| Heater             | Membaca DS18B20 secara berkala (non-blocking) dan memutuskan heater: hysteresis, mode manual, pengaman 36 °C.                                                        | Semua yang berhubungan dengan suhu ada di satu modul.                                                               |
| Lampu              | Memeriksa jadwal tiap 1 detik dan menyalakan relay lampu (mode otomatis/manual).                                                                                     | Jadwal bisa melewati tengah malam; logikanya (inSchedule) terpisah sehingga mudah diuji.                            |
| Jaringan           | connectWiFi(), fetchConfig() (GET), sendTelemetry() (POST), networkTask() sebagai siklusnya.                                                                         | Berjalan di core 0 agar Wi-Fi/HTTP yang lambat tidak menahan kontrol heater dan buzzer di core 1.                   |
| Penyimpanan config | saveConfig() dan loadSavedConfig() memakai Preferences (flash).                                                                                                      | Config terakhir tetap ada setelah mati listrik; flash ditulis hanya saat ada perubahan.                             |
| setup() dan loop() | setup() menginisialisasi semua modul dan menjalankan task jaringan; loop() menjalankan config baru dan memanggil update…() berulang.                                 | Titik awal program; berisi pemanggilan saja, tanpa logika.                                                          |

Alasan pembagian:

1. Satu modul untuk satu perangkat keras (sensor, relay, buzzer, jam, Wi-Fi). Mengganti satu komponen hanya mengubah satu modul.
2. Keputusan dipisah dari pelaksanaan: applyHeater()/applyLamp() memutuskan, setHeater()/setLamp()/switchRelay() melaksanakan.
3. Pekerjaan lambat (Wi-Fi, HTTP) dipisah ke core 0; kontrol suhu, lampu, dan alarm di core 1 tidak pernah menunggu jaringan.
4. Data antar-core dibatasi pada dua struct sederhana yang diakses lewat fungsi, sehingga mudah dijaga.
5. Semua pin dan ambang ada di bagian konstanta paling atas.
6. Kode masih satu file (src/main.cpp, kurang dari 700 baris) dengan pembatas bagian. Jika pemberi pakan ditambahkan, tiap modul bisa dipecah menjadi file .h/.cpp sendiri.

## Library yang Dipakai

| Library                 | Yang dipakai                                                          | Kegunaan                                  |
| ----------------------- | --------------------------------------------------------------------- | ----------------------------------------- |
| Arduino.h               | pinMode, digitalWrite, millis, delay, Serial (log 115200 baud)        | Dasar akses pin dan waktu                 |
| OneWire                 | Protokol 1-Wire pada GPIO4 (reset, kirim dan terima bit)              | Dipakai DallasTemperature                 |
| DallasTemperature       | requestTemperatures(), getTempCByIndex(), setWaitForConversion(false) | Mengubah data DS18B20 menjadi °C          |
| WiFi                    | WiFi.begin(), status(), localIP()                                     | Koneksi Wi-Fi mode station                |
| HTTPClient              | GET dan POST, header, timeout                                         | Klien REST API                            |
| ArduinoJson (v7)        | deserializeJson(), serializeJson()                                    | Membaca config dan membuat body telemetry |
| Preferences             | putBytes(), getBytes() pada penyimpanan NVS                           | Config tetap ada setelah mati listrik     |
| time.h (SNTP)           | configTzTime(), time(), localtime_r()                                 | Waktu dari NTP dan zona waktu             |
| FreeRTOS (bawaan ESP32) | xTaskCreatePinnedToCore(), vTaskDelay(), portMUX                      | Task di core 0 dan critical section       |

## Diagram

### Lapisan

Lapis atas memanggil lapis di bawahnya.

| Lapis              | Isi                                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 5. Aplikasi        | `setup()`, `loop()` (core 1), `networkTask()` (core 0)                                                                             |
| 4. Modul fitur     | Heater, Lampu, Alarm, Jam, Jaringan                                                                                                |
| 3. Layanan bersama | Data bersama (`getConfig`, `getStatus`, `set…`), Relay (`initRelay`, `switchRelay`), Penyimpanan (`saveConfig`, `loadSavedConfig`) |
| 2. Library         | DallasTemperature + OneWire, WiFi + HTTPClient, ArduinoJson, Preferences, time.h (SNTP), Arduino core + FreeRTOS                   |
| 1. Perangkat keras | DS18B20 (D4), radio Wi-Fi, RAM 520 KB, flash (NVS), GPIO + timer (D18, D19, D5)                                                    |

### Siapa Memanggil Siapa

```text
setup()
├── initHeater()          → initRelay(D18), sensor.begin()
├── initLamp()            → initRelay(D19)
├── initAlarm()           → pinMode(D5, OUTPUT)
├── loadSavedConfig()     → Preferences.getBytes()
├── setTimezone()         → configTzTime() (NTP mulai sinkron)
└── startNetworkTask()    → xTaskCreatePinnedToCore (core 0)

loop()   (core 1)
├── applyHeater(), applyLamp()   hanya jika configPending
├── updateHeater()        → requestTemperatures(), getTempCByIndex()
│                           → applyHeater() → setHeater() → switchRelay(), setAlarm()
├── updateLamp()          → applyLamp() → minuteOfDay(), inSchedule(), setLamp() → switchRelay()
├── updateClock()         → catat sekali saat NTP sinkron
└── updateAlarm()         → digitalWrite(D5), beep 150 ms tiap 1 detik

networkTask()   (core 0)
├── connectWiFi()         → WiFi.begin(), maks. 15 detik
├── fetchConfig()         → HTTPClient GET, deserializeJson(), parseClockTime(),
│                           storeConfig() → saveConfig(), setTimezone()
├── sendTelemetry()       → getStatus(), serializeJson(), HTTPClient POST
└── vTaskDelay(pollFrequency)
```

## Driver per Modul

Bagian ini menjelaskan apa yang dilakukan tiap modul dan bagaimana ESP32 berkomunikasi dengannya, walau memakai library.

### Sensor suhu DS18B20

**Fungsi:** Mengukur suhu air dan menjadikannya angka °C yang dipakai heater dan dikirim ke dashboard.

**Cara berkomunikasi:**

1. Protokol 1-Wire: satu kabel data (GPIO4) yang ditarik ke 3,3 V oleh R1 4,7 kΩ. ESP32 dan sensor bergantian menarik jalur ke LOW.
2. Urutan: reset dan presence pulse → perintah Skip ROM (0xCC) → Convert T (0x44) → tunggu konversi → baca scratchpad (0xBE, 9 byte, diperiksa CRC8).
3. Hasilnya bilangan bertanda 16 bit; 1 bit = 1/16 °C (resolusi 0,0625 °C pada 12 bit). Pustaka mengubahnya menjadi float °C.
4. Jika sensor tidak menjawab atau CRC salah, pustaka mengembalikan -127 (DEVICE_DISCONNECTED_C).

**Pengembangan driver:**

1. Dasar: contoh pustaka (DS18x20_Temperature pada OneWire; DallasTemperature) yang memakai delay menunggu konversi.
2. Modifikasi 1: setWaitForConversion(false) dan mesin keadaan IDLE → CONVERTING → BACA, sehingga loop() tidak berhenti selama ±800 ms.
3. Modifikasi 2: nilai -127 dan 85 dianggap gagal; hasilnya NAN, heater dipaksa mati, alarm "Sensor error".
4. Modifikasi 3: saat gagal, telemetry dilewati (server menolak suhu di luar rentang), sehingga dashboard menandai perangkat offline. Pelaporan khusus "Sensor Error" belum ada di versi ini.

### Jam lokal (NTP)

**Fungsi:** Memberi jam lokal untuk jadwal lampu otomatis, tanpa komponen tambahan.

**Cara berkomunikasi:**

1. Memakai Wi-Fi yang sama dengan REST API. configTzTime() menjalankan klien SNTP (protokol waktu lewat UDP) ke pool.ntp.org dan time.google.com.
2. Sistem mengisi jam internal ESP32 di latar belakang; time(nullptr) membaca detik sejak 1970. Nilai di bawah 1 700 000 000 berarti belum sinkron.
3. Zona waktu dari dashboard (nama IANA, misalnya Asia/Jakarta) dicocokkan dengan tabel ZONES menjadi format POSIX (misalnya WIB-7); localtime_r() memakainya untuk menghitung jam lokal.
4. minuteOfDay() mengembalikan menit sejak 00:00, atau -1 jika jam belum diketahui; lampu otomatis mati pada kondisi -1.

**Pengembangan driver:**

1. Dasar: contoh pewaktuan ESP32 Arduino (configTime dan getLocalTime) dengan satu zona tetap.
2. Modifikasi 1: tabel IANA → POSIX untuk 25 zona yang ada di dashboard; zona di luar tabel dicatat di log dan jam dianggap tidak diketahui.
3. Modifikasi 2: zona terakhir dibaca dari flash saat boot, sehingga NTP langsung berjalan begitu Wi-Fi tersambung, walau backend belum menjawab.
4. Modifikasi 3: updateClock() mencatat sekali "[TIME] NTP synced" agar sinkronisasi terlihat saat demo.

### Modul relay 2 kanal (heater dan lampu)

**Fungsi:** Menyambung atau memutus listrik AC ke heater dan lampu sesuai perintah firmware.

**Cara berkomunikasi:**

1. Keluaran digital GPIO18 (IN1) dan GPIO19 (IN2). Modul bersifat aktif LOW: LOW menyalakan LED optocoupler, transistor, lalu koil; kontak COM-NO menutup.
2. ESP32 hanya memberi level logika 3,3 V; arus koil dan listrik AC tidak melewati ESP32.
3. Konstanta RELAY_ON = LOW dan RELAY_OFF = HIGH; jika modul bekerja terbalik cukup menukar nilainya.

**Pengembangan driver:**

1. Dasar: digitalWrite() sederhana pada satu pin.
2. Modifikasi 1: initRelay() menulis HIGH sebelum pinMode(OUTPUT), agar relay tidak berkedip saat ESP32 menyala.
3. Modifikasi 2: setHeater() dan setLamp() hanya bertindak jika status berubah, sehingga kontak tidak dipicu berulang dan log tidak penuh.
4. Modifikasi 3: status nyata (heaterOn, lampOn) dikirim ke dashboard sebagai heaterStatus dan ledStatus.

### Buzzer aktif (alarm)

**Fungsi:** Memberi tahu pemilik di lokasi saat sensor gagal atau suhu di luar batas.

**Cara berkomunikasi:**

1. Keluaran digital GPIO5 → R2 1 kΩ → basis Q1. HIGH membuat Q1 menghantar sehingga buzzer berbunyi (aktif HIGH).
2. Buzzer aktif memiliki osilator sendiri, jadi cukup level HIGH/LOW, tanpa PWM.

**Pengembangan driver:**

1. Dasar: digitalWrite(HIGH) menyalakan buzzer terus-menerus.
2. Modifikasi 1: pola bunyi 150 ms setiap 1 detik dengan (millis() % 1000) < 150, tanpa delay().
3. Modifikasi 2: alasan alarm disimpan. "Temperature too high" dan "Temperature too low" dikirim sebagai event telemetry; "Sensor error" hanya tampil di log dan buzzer karena telemetry dilewati.

### Wi-Fi dan klien REST API

**Fungsi:** Mengambil pengaturan dari dashboard dan mengirim suhu serta status nyata.

**Cara berkomunikasi:**

1. Wi-Fi mode station 2,4 GHz (WiFi.begin). HTTP biasa ke backend dengan header x-device-key.
2. GET /api/hardware/{id}/config dijawab 200 dengan JSON; POST /telemetry dijawab 201. Status negatif berarti gagal terhubung.
3. JSON dibaca dan dibuat dengan ArduinoJson; nilai default dipakai jika field kosong.

**Pengembangan driver:**

1. Dasar: contoh HTTPClient (GET sederhana).
2. Modifikasi 1: dijalankan sebagai task terpisah di core 0 dengan urutan wajib baca config → loop() menjalankan → kirim telemetry.
3. Modifikasi 2: bila Wi-Fi atau backend gagal, config lama tetap dipakai; config baru disimpan di flash hanya jika berubah.
4. Modifikasi 3: telemetry dilewati jika suhu belum pernah terbaca atau di luar −10..60 °C; field event hanya dikirim bila ada alasan alarm.

### Logika Heater

**Keputusan heater (mode `AUTOMATIC`):**

1. Heater menyala jika suhu < target − 0,5 °C.
2. Heater mati jika suhu ≥ target + 0,5 °C.
3. Di antara keduanya status tidak berubah. Contoh target 26 °C: nyala di bawah 25,5 °C, mati di 26,5 °C atau lebih.

**Pengaman (semua mode, prioritas tertinggi):** sensor gagal terbaca, atau suhu ≥ 36 °C (`HEATER_CUTOFF_C`) → heater dipaksa mati dan alarm menyala. Mode `MANUAL` hanya mengikuti tombol dashboard di bawah pengaman ini.

**Pembacaan DS18B20 tanpa menahan program (tiga keadaan):**

1. **IDLE:** menunggu sampai `nextReadAt` (tiap 5 detik).
2. **CONVERTING:** `requestTemperatures()`, lalu menunggu ≥ 800 ms.
3. **BACA:** `getTempCByIndex(0)`. Nilai -127 (terputus) atau 85 (belum siap) berarti gagal: suhu = `NAN`, heater OFF, alarm "Sensor error". Selain itu `setTemperature()` lalu `applyHeater()`. Kembali ke IDLE.
