# Firmware ESP32

Firmware PlatformIO untuk heater dan lampu akuarium. Perangkat membaca pengaturan dari REST API backend dan mengirim suhu serta status nyata. Kontrak API-nya ada di [docs/esp32-connection.md](../docs/esp32-connection.md) dan [docs/integrations.md](../docs/integrations.md#kontrak-dengan-perangkat).

Pemberi pakan belum ada di perangkat keras, jadi `feederStatus` selalu `Idle`.

## Pemasangan

| Komponen           | Pin              |
| ------------------ | ---------------- |
| DS18B20 (data)     | D4               |
| RTC DS3231         | SDA D21, SCL D22 |
| Relay IN1 (heater) | D18              |
| Relay IN2 (lampu)  | D19              |
| Buzzer aktif       | D5               |

Pin dan polaritas relay diatur di [src/config.h](src/config.h).

## Cara menjalankan

1. Salin `include/secrets.example.h` menjadi `include/secrets.h`, lalu isi Wi-Fi (2,4 GHz), alamat backend, dan `DEVICE_KEY` (sama dengan `HARDWARE_API_KEY` di `backend/.env`).
2. Jalankan backend, lalu **Upload** dari PlatformIO.
3. Buka Serial Monitor (115200). Pastikan muncul `[WIFI] ... connected`, `[API] Config: ...`, dan `[API] Telemetry sent: ...`.

## Struktur kode

Semua kode ada di satu file, [src/main.cpp](src/main.cpp), dengan bagian berikut (urut dari atas):

| Bagian              | Isi                                                             |
| ------------------- | --------------------------------------------------------------- |
| Pin dan konstanta   | Pin, polaritas relay, batas suhu, interval                      |
| Data bersama        | Config dan status antar-core; config terakhir disimpan di flash |
| Relay dan Alarm     | Helper relay dan buzzer                                         |
| Jam lokal           | Jam dari NTP (zona waktu dashboard), cadangan RTC               |
| Heater              | Sensor suhu dan relay heater                                    |
| Lampu               | Relay lampu dan jadwal                                          |
| Jaringan            | Wi-Fi, `GET /config`, `POST /telemetry`, siklus di core 0       |
| `setup()`, `loop()` | Inisialisasi dan menjalankan config                             |

## Perilaku

- **Heater `MANUAL`** mengikuti tombol di dashboard. **`AUTOMATIC`** menyala di bawah `targetTemp - 0.5` dan mati di atas `targetTemp + 0.5`.
- **Lampu `MANUAL`** mengikuti tombol. **`AUTOMATIC`** menyala di antara jam mulai dan selesai jika jadwal aktif (boleh melewati tengah malam). Jika jam belum diketahui, lampu mati.
- **Pengaman heater** (berlaku di semua mode): heater mati jika sensor gagal dibaca atau suhu mencapai `HEATER_CUTOFF_C` (36 °C).
- **Alarm buzzer** berbunyi jika sensor gagal, atau suhu di luar batas min/maks dari dashboard. Alasannya dikirim sebagai `event` telemetry.
- **Tanpa Wi-Fi atau backend**, heater dan lampu tetap berjalan dengan config terakhir. Jika ESP32 mati lalu menyala lagi, config terakhir dipulihkan dari flash. Sebelum config pertama pernah diterima, semua keluaran mati.
- **Telemetry tidak dikirim** saat suhu belum valid; dashboard akan menandai perangkat offline.
- **Zona waktu** dibaca dari dashboard. Jam diambil dari NTP lalu disalin ke RTC. Zona yang tidak ada di daftar `src/main.cpp` memakai jam RTC apa adanya.
