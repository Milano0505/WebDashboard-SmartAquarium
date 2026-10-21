# Firmware ESP32

Firmware PlatformIO untuk heater dan lampu akuarium. Perangkat membaca pengaturan dari REST API backend, menjalankannya, lalu mengirim suhu dan status nyata. Aturan siklus dan format datanya ada di [docs/web/architecture.md](../docs/web/architecture.md#kontrak-dengan-perangkat) dan [docs/web/api.md](../docs/web/api.md#endpoint-perangkat).

Pemberi pakan belum ada di perangkat keras, jadi `feederStatus` selalu `Idle`.

## Pemasangan

Tabel pin, jalur daya, dan skema lengkap (resistor, kapasitor, transistor) ada di [docs/hardware/schematic.md](../docs/hardware/schematic.md); daftar komponen ada di [docs/hardware/components.md](../docs/hardware/components.md).

Pin dan polaritas relay diatur di bagian atas [src/main.cpp](src/main.cpp) (`RELAY_ON` / `RELAY_OFF`; modul relay umumnya _active LOW_).

## Cara menjalankan

1. Salin `include/secrets.example.h` menjadi `include/secrets.h` (file ini ada di `.gitignore`), lalu isi nilainya (lihat tabel di bawah).
2. Jalankan backend, lalu **Upload** dari PlatformIO.
3. Buka Serial Monitor (115200). Pastikan muncul `[WIFI] ... connected`, `[API] Config: ...`, dan `[API] Telemetry sent: ...`.

## Menghubungkan ke backend

ESP32 hanya berbicara dengan **backend** (bukan Firestore atau frontend). Kedua endpoint memakai header `x-device-key`.

| Konstanta di `secrets.h` | Isi                                    | Harus sama dengan                    |
| ------------------------ | -------------------------------------- | ------------------------------------ |
| `WIFI_SSID`              | Nama Wi-Fi **2,4 GHz**                 | –                                    |
| `WIFI_PASSWORD`          | Password Wi-Fi                         | –                                    |
| `API_BASE_URL`           | `http://<IP laptop>:<PORT>`, tanpa `/` | IP laptop dan `PORT` backend         |
| `AQUARIUM_ID`            | ID akuarium                            | `SHARED_AQUARIUM_ID` di backend      |
| `DEVICE_KEY`             | Kunci perangkat                        | `HARDWARE_API_KEY` di `backend/.env` |

Persiapan di sisi backend:

1. **Isi `HARDWARE_API_KEY`** di `backend/.env` dengan string acak panjang, lalu jalankan ulang backend:

    ```powershell
    node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
    ```

2. **Cari IP laptop** dengan `ipconfig` (IPv4 Address adaptor Wi-Fi, misalnya `192.168.1.10`). ESP32 tidak bisa memakai `localhost`, karena itu berarti ESP32 sendiri.
3. **Samakan jaringan**: ESP32 dan laptop harus di Wi-Fi yang sama.
4. **Buka port backend** di Windows Firewall (PowerShell sebagai Administrator):

    ```powershell
    New-NetFirewallRule -DisplayName "Smart Aquarium API" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow -Profile Private
    ```

5. **Uji dari perangkat lain**: buka `http://192.168.1.10:5000/api/health` di browser smartphone pada Wi-Fi yang sama. Jika muncul `{"status":"ok"}`, ESP32 juga bisa menjangkau backend.

## Struktur kode

Semua kode ada di satu file, [src/main.cpp](src/main.cpp), dengan bagian berikut (urut dari atas). Penjelasan modul, diagram, dan driver ada di [docs/hardware/software.md](../docs/hardware/software.md).

| Bagian              | Isi                                                             |
| ------------------- | --------------------------------------------------------------- |
| Pin dan konstanta   | Pin, polaritas relay, batas suhu, interval                      |
| Data bersama        | Config dan status antar-core; config terakhir disimpan di flash |
| Relay dan Alarm     | Helper relay dan buzzer                                         |
| Jam lokal           | Jam dari NTP (zona waktu dashboard), tanpa RTC                  |
| Heater              | Sensor suhu dan relay heater                                    |
| Lampu               | Relay lampu dan jadwal                                          |
| Jaringan            | Wi-Fi, `GET /config`, `POST /telemetry`, siklus di core 0       |
| `setup()`, `loop()` | Inisialisasi dan menjalankan config                             |

Jaringan berjalan di core 0 agar Wi-Fi/HTTP yang lambat tidak menahan kontrol heater dan buzzer di core 1. Urutan siklusnya: **baca config → `loop()` menjalankannya → kirim telemetry**.

## Perilaku

- **Heater `MANUAL`** mengikuti tombol di dashboard. **`AUTOMATIC`** menyala di bawah `targetTemp - 0.5` dan mati di atas `targetTemp + 0.5`.
- **Lampu `MANUAL`** mengikuti tombol. **`AUTOMATIC`** menyala di antara jam mulai dan selesai jika jadwal aktif (boleh melewati tengah malam). Jam hanya dari NTP (butuh Wi-Fi dan internet); jika belum sinkron, lampu otomatis mati. Lampu manual tidak butuh jam.
- **Pengaman heater** (semua mode): heater mati jika sensor gagal dibaca atau suhu mencapai `HEATER_CUTOFF_C` (36 °C).
- **Alarm buzzer** berbunyi jika sensor gagal, atau suhu di luar batas min/maks dari dashboard. Alasan suhu di luar batas dikirim sebagai `event` telemetry; alasan sensor gagal hanya tampil di log dan buzzer.
- **Tanpa Wi-Fi atau backend**, heater dan lampu tetap berjalan dengan config terakhir. Setelah ESP32 mati lalu menyala lagi, config terakhir dipulihkan dari flash. Sebelum config pertama pernah diterima, semua keluaran mati.
- **Sensor gagal belum dilaporkan ke dashboard.** Telemetry dilewati jika suhu belum pernah terbaca atau di luar -10..60 °C, sehingga dashboard menandai perangkat offline. Heater dimatikan dan buzzer berbunyi.
- **Zona waktu** dibaca dari dashboard dan disimpan di flash, sehingga NTP langsung berjalan saat Wi-Fi tersambung. Zona yang tidak ada di daftar `src/main.cpp` membuat jam tidak diketahui (lampu otomatis mati). Setelah ESP32 menyala ulang, jam harus sinkron NTP lagi karena tidak ada RTC.

Pengujian tiap modul perangkat ada di [docs/hardware/testing.md](../docs/hardware/testing.md).

## Menguji koneksi

1. Jalankan backend dan frontend ([README.md](../README.md#menjalankan)), lalu register satu akun agar dokumen akuarium ada.
2. Upload firmware dan buka Serial Monitor (115200).
3. Di dashboard, badge di samping judul berubah menjadi **Device online** dan suhu tampil di Overview.
4. Ubah suhu target atau mode di dashboard. Pada siklus berikutnya, baris `[API] Config: ...` menampilkan nilai baru dan relay mengikuti.
5. Di Firebase Console, dokumen baru muncul di `telemetry_history` setiap siklus ([docs/web/database.md](../docs/web/database.md#membuka-database)).

## Masalah umum

| Yang terlihat di Serial Monitor                               | Penyebab                                                   | Solusi                                                                                             |
| ------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `[WIFI] Connecting ... failed`                                | Nama/password salah, atau Wi-Fi 5 GHz                      | Periksa `secrets.h`; pakai jaringan 2,4 GHz                                                        |
| `(HTTP -1)` connection refused                                | Backend tidak berjalan, IP salah, atau diblokir firewall   | Ulangi langkah 2–5 di [Menghubungkan ke backend](#menghubungkan-ke-backend)                        |
| `(HTTP -11)` read timeout                                     | Jaringan lambat atau backend tidak menjawab                | Cek `/api/health` dari browser smartphone di Wi-Fi yang sama                                       |
| `(HTTP 401)` `A valid device key is required.`                | `DEVICE_KEY` berbeda dengan `HARDWARE_API_KEY`             | Samakan nilainya, lalu upload ulang                                                                |
| `(HTTP 503)` `Hardware API authentication is not configured.` | `HARDWARE_API_KEY` kosong di backend                       | Isi di `backend/.env` dan jalankan ulang backend                                                   |
| `(HTTP 404)` `Aquarium was not found.`                        | `AQUARIUM_ID` salah, atau belum ada akun yang register     | Samakan dengan `SHARED_AQUARIUM_ID`; register satu akun dulu                                       |
| `(HTTP 400)` pesan validasi                                   | Isi telemetry tidak valid                                  | Baca pesannya; nilai yang diterima ada di [docs/web/api.md](../docs/web/api.md#endpoint-perangkat) |
| `[TEMP] Sensor read failed.` lalu `[API] Telemetry skipped`   | Sensor DS18B20 putus atau salah pasang                     | Periksa kabel data (D4) dan resistor pull-up                                                       |
| Lampu otomatis tidak menyala, tidak ada `[TIME] NTP synced`   | NTP belum sinkron (tanpa internet) atau zona tidak dikenal | Cek internet di Wi-Fi yang sama; pakai zona yang ada di daftar `src/main.cpp`                      |

## Keamanan

- Firmware memakai **HTTP biasa** di jaringan lokal, sehingga kunci perangkat terkirim tanpa enkripsi. Jika backend dipasang di internet, pakai HTTPS (`WiFiClientSecure` dan sertifikat CA server).
- Jangan commit `secrets.h`. Jika kunci bocor, ganti `HARDWARE_API_KEY` di backend lalu upload ulang firmware dengan kunci baru.
