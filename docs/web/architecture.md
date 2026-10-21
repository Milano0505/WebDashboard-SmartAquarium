# Arsitektur

Dokumen ini menjelaskan bagian-bagian sistem, aturan desainnya, dan bagaimana data mengalir. Alasan sistem dibuat ada di [background.md](background.md).

## Blok Sistem

```text
┌─────────────┐   HTTP + JWT    ┌─────────────┐   Admin SDK   ┌───────────┐
│  Frontend   │ ──────────────▶ │   Backend   │ ────────────▶ │ Firestore │
│ React (SPA) │                 │ Express API │               └───────────┘
└─────────────┘                 │             │
                                │             │ ◀── HTTP + x-device-key ── ┌───────┐
                                └─────────────┘                            │ ESP32 │
                                                                           └───────┘
```

| Blok      | Folder      | Tugas                                                                             |
| --------- | ----------- | --------------------------------------------------------------------------------- |
| Frontend  | `frontend/` | Menampilkan halaman, mengirim request ke backend, memuat ulang data berkala       |
| Backend   | `backend/`  | Memeriksa login dan input, menjalankan aturan sistem, membaca/menulis database    |
| Database  | –           | Firebase Cloud Firestore: akun, pengaturan, status perangkat, riwayat, notifikasi |
| Perangkat | `device/`   | ESP32: membaca pengaturan, mengontrol heater dan lampu, mengirim suhu dan status  |

Cara terhubung:

| Koneksi             | Protokol           | Identitas                                  |
| ------------------- | ------------------ | ------------------------------------------ |
| Frontend → Backend  | HTTP + JSON        | JWT di header `Authorization: Bearer …`    |
| Perangkat → Backend | HTTP + JSON        | Header `x-device-key` = `HARDWARE_API_KEY` |
| Backend → Database  | Firebase Admin SDK | Service account                            |

## Aturan Desain

1. **Semua lewat backend.** Frontend dan perangkat tidak pernah mengakses Firestore langsung, sehingga validasi dan hak akses diatur di satu tempat.
2. **Satu akuarium bersama.** Semua akun memakai `aquariums/{SHARED_AQUARIUM_ID}` (default `aquarium-001`). ID lain dibalas `404`.
3. **Perintah dan status dipisah.** Tombol di dashboard hanya menyimpan _perintah_ di pengaturan (`tempConfig`, `lightingConfig`, `feederConfig`). `realtimeState` adalah _status nyata_ dan hanya ditulis oleh telemetry perangkat.
4. **Suhu disimpan dalam Celsius.** Fahrenheit hanya untuk tampilan (`tempConfig.unit`).
5. **Nilai turunan dihitung server:** `schedule.durationHours`, `avgHoursOn/Off`, dan `feederConfig.lastTriggeredAt`.
6. **Tanpa email/SMS.** Peringatan hanya lewat halaman Alerts dan browser notification.

## Alur Data

### Pengguna mengubah pengaturan

Contoh: mengubah suhu target menjadi 26.

1. Pengguna menggeser slider di tab Temperature lalu menekan **Save**.
2. Frontend memanggil `updateTemperatureConfig()`, yang mengirim `PATCH /api/aquariums/aquarium-001/temperature-config` dengan JWT.
3. Backend memeriksa token dan nilainya (10–35), lalu dalam satu batch menyimpan `tempConfig.targetTemp` dan membuat notifikasi "Temperature settings updated".
4. Frontend menampilkan toast, memuat ulang dashboard, dan memperbarui badge Alerts.
5. Pada siklus berikutnya, perangkat membaca suhu target baru dan menyesuaikan heater.

### Perangkat mengirim data

1. Perangkat memanggil `POST /api/hardware/aquarium-001/telemetry` dengan suhu dan status nyata.
2. Backend menulis `realtimeState`, menambah dokumen `telemetry_history`, memperbarui statistik lampu, dan membuat notifikasi jika perlu (suhu di luar batas, sensor rusak, perangkat kembali online).
3. Dashboard menampilkan data baru pada pembaruan berikutnya.

### Feed Now

1. Pengguna menekan **Feed Now** (hanya mode `MANUAL`; selain itu `409`).
2. Backend mengisi `feederConfig.lastTriggeredAt` dan membuat notifikasi. `realtimeState` tidak diubah.
3. Dashboard menampilkan "Waiting for the device…" sampai ada telemetry yang lebih baru dari `lastTriggeredAt`.

> **Catatan:** firmware saat ini belum mengontrol pemberi pakan (`feederStatus` selalu `Idle`). Status "Waiting" tetap hilang pada telemetry berikutnya, tetapi pakan tidak benar-benar diberikan. Ini batasan yang sudah diketahui, bukan bug dashboard.

## Kontrak dengan Perangkat

Setiap `systemConfig.pollFrequency` detik, perangkat menjalankan siklus ini **dengan urutan ini**:

1. **Baca pengaturan:** `GET /api/hardware/{aquariumId}/config`.
2. **Jalankan pengaturan:** heater, lampu, dan pemberi pakan.
3. **Kirim data:** `POST /api/hardware/{aquariumId}/telemetry`.

Urutan ini penting: dashboard menganggap Feed Now selesai saat menerima telemetry pertama setelah perintah dikirim. Jika telemetry dikirim sebelum perintah dijalankan, status "Waiting" hilang terlalu cepat.

Perilaku yang diharapkan dari perangkat:

| Bagian | Aturan                                                                                                                                                                                                                                                                |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Heater | `MANUAL` mengikuti `manualControlState`. `AUTOMATIC` menyala di bawah `targetTemp − 0,5` dan mati di atas `targetTemp + 0,5`.                                                                                                                                         |
| Lampu  | `MANUAL` mengikuti `manualControlState`. `AUTOMATIC` menyala di antara `startTime` dan `endTime` (zona waktu akuarium) jika `isActive`.                                                                                                                               |
| Pakan  | `AUTOMATIC` memberi pakan pada jam di `schedules` yang aktif. `MANUAL` memberi pakan sekali setiap `lastTriggeredAt` berubah. Belum ada di firmware saat ini.                                                                                                         |
| Sensor | Perangkat boleh melaporkan sensor rusak lewat telemetry **tanpa `currentTemp`** dengan `event`; backend lalu membuat notifikasi **Sensor Error** sekali. **Firmware saat ini belum melakukannya:** telemetry dilewati, sehingga dashboard menandai perangkat offline. |

Aturan yang dipakai bersama backend dan frontend:

| Aturan            | Definisi                                                                   | Dipakai di                                                                         |
| ----------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Perangkat offline | Tidak ada telemetry lebih dari maks(120 detik, 3 × `pollFrequency`)        | `utils/device-status.js`, `routes/hardware.js`, `Dashboard.jsx` (`isDeviceOnline`) |
| Feed Now menunggu | `feederConfig.lastTriggeredAt` lebih baru dari `realtimeState.lastUpdated` | `Dashboard.jsx` (`isFeedPending`)                                                  |
| Format jam jadwal | `hh:mm AM/PM`, contoh `08:00 AM`                                           | Backend, frontend, dan firmware                                                    |

Detail request dan response ada di [api.md](api.md#endpoint-perangkat); cara memasang firmware ada di [device/README.md](../../device/README.md).

## Pengaturan yang Harus Cocok

| Sisi A                                  | Sisi B                         | Jika tidak cocok                          |
| --------------------------------------- | ------------------------------ | ----------------------------------------- |
| `VITE_API_URL` (frontend)               | Alamat dan `PORT` backend      | "Unable to connect to the API."           |
| `VITE_AQUARIUM_ID` (frontend)           | `SHARED_AQUARIUM_ID` (backend) | Semua request akuarium dibalas `404`      |
| `AQUARIUM_ID` (firmware)                | `SHARED_AQUARIUM_ID` (backend) | Request perangkat dibalas `404`           |
| `DEVICE_KEY` (firmware)                 | `HARDWARE_API_KEY` (backend)   | `401` (atau `503` jika kosong di backend) |
| `FRONTEND_ORIGIN` (backend, production) | Alamat frontend dibuka         | Browser memblokir request (CORS)          |

## Teknologi

| Bagian    | Teknologi                                                                           |
| --------- | ----------------------------------------------------------------------------------- |
| Frontend  | React 19, React Router 7, Vite 8, Tailwind CSS 4 (JavaScript/JSX, tanpa TypeScript) |
| Backend   | Node.js 22, Express 5 (ES modules), Firebase Admin SDK, JWT, bcrypt                 |
| Database  | Firebase Cloud Firestore                                                            |
| Perangkat | ESP32 (Arduino), PlatformIO, sensor DS18B20, relay, buzzer                          |
| Alat      | npm (backend), pnpm 10 (frontend), Prettier                                         |

Grafik suhu dan ikon dibuat sendiri dengan SVG, tanpa library tambahan.
