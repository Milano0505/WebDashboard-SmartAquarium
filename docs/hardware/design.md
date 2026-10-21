# Rancangan Sistem Embedded

Dokumen ini menjelaskan fungsi yang dibutuhkan perangkat, mana yang dikerjakan **hardware** dan mana yang dikerjakan **software**, beserta alasannya. Masalah yang mendorong sistem ada di [background.md](../web/background.md); aturan siklus dan format data ke backend ada di [architecture.md](../web/architecture.md#kontrak-dengan-perangkat).

## Blok Sistem

| Blok                     | Peran                                                                                | Terhubung ke     | Cara terhubung                        |
| ------------------------ | ------------------------------------------------------------------------------------ | ---------------- | ------------------------------------- |
| Browser (React)          | Dashboard pengguna                                                                   | Backend          | HTTP + JWT                            |
| Backend (Express)        | Validasi, aturan sistem, riwayat                                                     | Firestore; ESP32 | Admin SDK; HTTP + header x-device-key |
| Firestore                | Database cloud                                                                       | Backend          | Admin SDK                             |
| ESP32 (firmware, 2 core) | Membaca config, mengontrol heater dan lampu, membaca suhu, alarm, mengirim telemetry | Backend          | GET /config dan POST /telemetry       |
| DS18B20                  | Sensor suhu air                                                                      | ESP32 (masukan)  | 1-Wire, pin D4                        |
| Relay 2 kanal            | Heater (IN1) dan lampu (IN2)                                                         | ESP32 (keluaran) | GPIO D18 dan D19                      |
| Buzzer aktif             | Alarm suhu atau sensor                                                               | ESP32 (keluaran) | GPIO D5 lewat transistor Q1           |

Perangkat (ESP32) hanya berbicara dengan backend. Gambar blok sistem ada di [presentasi-uts-embedded.docx](presentasi-uts-embedded.docx) (Gambar 1). Hardware di bawah ESP32 dibahas di [components.md](components.md) dan [schematic.md](schematic.md); software-nya di [software.md](software.md).

## Pembagian Hardware dan Software

| Fungsi                               | Dikerjakan oleh                    | Cara kerja                                                                                                                                 | Alasan teknis                                                                                                                                                            |
| ------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mengukur suhu air                    | Hardware + firmware                | DS18B20 mengubah suhu menjadi data digital 12 bit di dalam sensor. Firmware hanya memicu konversi, membaca, dan memeriksa nilai -127 / 85. | ADC bawaan ESP32 nonlinier dan berisik; sensor digital tidak butuh kalibrasi tambahan.                                                                                   |
| Memutus dan menyambung listrik 220 V | Hardware                           | Relay dengan optocoupler memisahkan sisi AC dari ESP32.                                                                                    | Pin ESP32 hanya 3,3 V dengan arus puluhan mA, dan tidak boleh tersambung ke listrik AC.                                                                                  |
| Memutuskan heater nyala/mati         | Firmware                           | Hysteresis: nyala di bawah target − 0,5 °C, mati di atas target + 0,5 °C.                                                                  | Aturan sederhana, harus tetap jalan walau internet mati, jadi tidak diserahkan ke server.                                                                                |
| Pengaman suhu                        | Firmware                           | Heater dipaksa mati jika sensor gagal atau suhu ≥ 36 °C, di semua mode.                                                                    | Berlaku juga untuk mode manual dari jauh. Batas ini berada di atas suhu target maks. dashboard (35 °C).                                                                  |
| Jadwal lampu                         | Firmware                           | Firmware membandingkan menit dalam sehari dengan jadwal. Jam dari NTP lewat Wi-Fi; sebelum NTP sinkron lampu otomatis mati.                | Wi-Fi sudah dipakai untuk REST API, jadi NTP tidak butuh komponen tambahan. Kelemahan: setelah reboot tanpa internet jadwal belum jalan; lampu manual tidak terpengaruh. |
| Alarm                                | Firmware + hardware                | Firmware memutuskan kapan alarm; buzzer aktif hanya perlu level HIGH/LOW lewat transistor Q1.                                              | Buzzer aktif punya osilator sendiri, tidak perlu PWM; transistor menjaga pin ESP32 dari arus buzzer.                                                                     |
| Koneksi ke backend                   | Hardware + firmware                | Radio Wi-Fi ESP32 dan klien HTTP/JSON (HTTPClient, ArduinoJson).                                                                           | Wi-Fi sudah ada di chip, jadi tidak perlu modul tambahan.                                                                                                                |
| Menyimpan config terakhir            | Firmware                           | Preferences menulis config ke flash hanya saat isinya berubah.                                                                             | Perangkat tetap bekerja setelah mati listrik; penulisan flash dibatasi agar umur flash terjaga.                                                                          |
| Menyimpan riwayat, akun, tampilan    | Server (backend, Firestore, React) | Bukan tugas perangkat.                                                                                                                     | RAM ESP32 hanya 520 KB dan tidak cocok untuk database atau banyak pengguna.                                                                                              |
| Memberi pakan                        | Belum dipasang                     | Jadwal dan Feed Now sudah ada di backend; telemetry sudah punya field feederStatus.                                                        | Rencana: motor servo/stepper dengan driver sendiri.                                                                                                                      |

Prinsip pembagiannya:

1. **Hardware untuk hal fisik:** mengukur besaran, menyambung listrik AC, dan menghasilkan bunyi.
2. **Firmware untuk keputusan yang harus tetap jalan saat internet mati:** heater, lampu, alarm, dan pengaman.
3. **Server untuk hal yang butuh banyak memori atau banyak pengguna:** riwayat, akun, dan tampilan.

## Ambang dan Kemampuan Hardware

Setiap angka di firmware ([main.cpp](../../device/src/main.cpp), bagian Pin dan konstanta) dipilih berdasarkan kemampuan komponen.

| Parameter                        | Nilai                       | Hubungan dengan hardware                                                                                                                    |
| -------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Suhu target dashboard            | 10–35 °C                    | Jauh di dalam rentang sensor (−55 hingga +125 °C).                                                                                          |
| Hysteresis heater                | ±0,5 °C                     | Sama dengan akurasi DS18B20 (±0,5 °C). Lebih kecil dari ini membuat relay hidup-mati terus karena noise dan memperpendek umur kontak relay. |
| Pemutus heater (HEATER_CUTOFF_C) | 36 °C                       | Di atas target maks. 35 °C, jauh di bawah batas sensor 125 °C.                                                                              |
| Telemetry yang diterima server   | −10 hingga 60 °C            | Di dalam rentang akurat DS18B20 (−10 hingga +85 °C); di luar itu dianggap salah baca.                                                       |
| Nilai khusus sensor              | -127 dan 85                 | -127 = sensor terputus (DEVICE_DISCONNECTED_C). 85 = nilai awal sensor sebelum konversi selesai (datasheet).                                |
| Konversi sensor                  | 800 ms                      | Konversi 12 bit membutuhkan maks. 750 ms; ditambah jeda aman 50 ms.                                                                         |
| Jarak baca sensor                | 5 detik                     | Massa air besar sehingga suhu berubah lambat; tidak perlu lebih sering.                                                                     |
| Pemeriksaan jadwal lampu         | 1 detik                     | Jadwal dalam satuan menit, 1 detik sudah lebih dari cukup.                                                                                  |
| Validasi jam NTP                 | detik epoch > 1 700 000 000 | ESP32 mulai dari tahun 1970; nilai di bawah batas (tahun 2023) berarti NTP belum sinkron, sehingga jadwal lampu dianggap tidak ada.         |
| Poll frequency                   | 1–60 detik (awal 5)         | Tiap siklus 2 request HTTP; interval pendek memperbanyak trafik Wi-Fi dan tulisan Firestore.                                                |
| Batas waktu jaringan             | HTTP 5 s, tunggu config 4 s | Cukup untuk jaringan rumah, dan jaringan lambat tidak menahan kontrol (core berbeda).                                                       |
| Arus pin ESP32                   | Puluhan mA                  | Buzzer (±30 mA) lewat transistor; relay lewat optocoupler pada modulnya.                                                                    |
| Kontak relay                     | 10 A / 250 VAC              | Heater akuarium biasa (puluhan hingga ratusan watt) hanya menarik sekitar 0,2–1,5 A di 220 V.                                               |

## Siklus Kerja

1. **Core 0 (task jaringan):** jika Wi-Fi tersambung → `GET /config` → simpan config dan set `configPending = true`. Jika belum tersambung, hanya mencatat log.
2. **Core 1 (`loop()`):** melihat `configPending`, menjalankan `applyHeater()` dan `applyLamp()`, lalu `configPending = false`.
3. **Core 0:** menunggu `configPending` menjadi `false` (maks. 4 detik), lalu `POST /telemetry`, lalu jeda `pollFrequency` (1–60 detik).
4. **Core 1 (berulang, tanpa menunggu):** `updateHeater()` tiap 5 detik, pemeriksaan jadwal lampu (`applyLamp()`) tiap 1 detik, dan `updateAlarm()` (beep 150 ms tiap 1 detik jika alarm aktif).
5. Data antar-core (`RemoteConfig` dan `DeviceStatus`) dilindungi `portENTER_CRITICAL`.

Task jaringan (core 0) dan `loop()` (core 1) berjalan bersamaan. Urutan **baca config → jalankan → kirim telemetry** dijaga lewat flag `configPending`.

## Status Pengerjaan

| Bagian                | Status         | Keterangan                                                                                           |
| --------------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| Sensor suhu DS18B20   | Selesai        | Dibaca tanpa menahan program; saat gagal heater dimatikan, alarm berbunyi, dan dashboard diberi tahu |
| Heater (relay IN1)    | Selesai        | Mode otomatis dan manual, pengaman 36 °C                                                             |
| Lampu (relay IN2)     | Selesai        | Mode otomatis dan manual, jadwal boleh melewati tengah malam                                         |
| Jam lokal (NTP)       | Selesai        | Zona waktu dari dashboard; jadwal lampu otomatis menunggu NTP sinkron                                |
| Buzzer alarm          | Selesai        | Berbunyi saat sensor gagal atau suhu di luar batas                                                   |
| Komunikasi ke backend | Selesai        | GET /config dan POST /telemetry                                                                      |
| RTC DS3231            | Tidak dipasang | Versi ini hanya memakai NTP; RTC bisa ditambahkan sebagai pengembangan                               |
| Pemberi pakan         | Belum          | Baru ada di dashboard dan backend; perangkat kerasnya belum dipasang                                 |

## Keterbatasan yang Diketahui

- Pengaman heater (sensor gagal dan 36 °C) berupa software. Jika ESP32 berhenti bekerja saat heater menyala, relay tetap menyala. Pengembangan: watchdog dan pengaman hardware seperti termostat atau thermal fuse.
- Pemberi pakan belum ada di perangkat keras.
