# System Documentation

Dokumen ini menjelaskan implementasi di repository: arsitektur, modul kode, database, notifikasi, API, dan integrasi ESP32. Untuk cara menjalankan aplikasi lihat [README.md](README.md).

## Arsitektur

```text
Browser (React)  ──JWT──▶  REST API (Express)  ◀──device key──  ESP32
                                   │
                                   ▼
                       Firebase Cloud Firestore
```

- Frontend dan ESP32 tidak pernah mengakses Firestore secara langsung; semua lewat REST API.
- Semua akun berbagi **satu akuarium** dengan ID `SHARED_AQUARIUM_ID` (default `aquarium-001`). Endpoint menolak ID lain dengan 404.
- Suhu selalu disimpan dalam Celsius. Pilihan Fahrenheit hanya memengaruhi tampilan.

## Struktur Repository

```text
backend/
  index.js                Express server, CORS, routing, error handler
  config/
    aquarium.js           AQUARIUM_ID, aquariumRef(), findAquarium()
    defaults.js           Dokumen awal akuarium
    firebase.js           Inisialisasi Firebase Admin / Firestore
    security.js           JWT_SECRET
  middleware/auth.js      requireAuth (JWT) dan requireDeviceKey (ESP32)
  routes/
    auth.js               Register, login, ganti password
    users.js              Baca/ubah profil sendiri
    aquariums.js          Config, feeder trigger, telemetry, notifications
    hardware.js           Telemetry dan config untuk ESP32
  utils/
    config-validation.js  Aturan validasi PATCH config
    errors.js             badRequest() → HTTP 400
    firestore.js          Serialisasi Timestamp → ISO string
    notifications.js      Pembuat dokumen notifikasi bersama/privat
    profile-photo.js      Validasi photoUrl
frontend/src/
  App.jsx                 Routing dan route yang butuh login
  api/service.js          Client REST API
  components/             Layout, ui (komponen dasar), AreaChart, Icons
  context/AuthContext.jsx Sesi login dan profil pengguna
  hooks/                  useUnreadCount, useBrowserNotifications
  pages/                  Login, Register, Dashboard, DataHistory, Notifications, Configuration
  utils/                  format (suhu, waktu, inisial), profilePhoto (kompresi foto)
```

## Frontend

| File                               | Tanggung jawab                                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| `App.jsx`                          | Routing, proteksi halaman, toast sukses, menghubungkan hook notifikasi ke Layout dan Configuration. |
| `api/service.js`                   | Semua request HTTP. Menambahkan token JWT dan memicu logout otomatis saat respons 401.              |
| `context/AuthContext.jsx`          | Menyimpan user di localStorage dan memvalidasi ulang sesi ke API saat aplikasi dibuka.              |
| `hooks/useUnreadCount.js`          | Jumlah notifikasi belum dibaca untuk badge Alerts (refresh tiap 10 detik dan setelah aksi).         |
| `hooks/useBrowserNotifications.js` | Izin dan preferensi browser notification, polling notifikasi baru tiap 15 detik.                    |
| `pages/Dashboard.jsx`              | Tab Overview, Temperature, Lighting (editor jadwal), Feeder (jadwal dan Feed Now).                  |
| `pages/DataHistory.jsx`            | Tab Table (pencarian, filter, pagination, ekspor CSV) dan Calendar.                                 |
| `pages/Notifications.jsx`          | Daftar notifikasi, tandai dibaca, tandai semua dibaca, hapus.                                       |
| `pages/Configuration.jsx`          | Tab Profile, System, Alerts (threshold dan browser notification), About (fitur dan teknologi).      |
| `components/ui.jsx`                | Card, InputField, RangeSlider, ModeSelector, Toggle, StatusBadge, LiveClock, dan lainnya.           |
| `utils/format.js`                  | `formatTemp`, `formatTempValue`, `tempUnitSymbol`, `initialsOf`, `relativeTime`.                    |

### Status perangkat di Dashboard

- **Sumber status**: `aquarium.realtimeState`, yang **hanya** diisi oleh telemetry ESP32. Tombol di dashboard (termasuk Feed Now) hanya menyimpan perintah di config; status baru berubah setelah ESP32 menjalankannya dan mengirim telemetry.
- **Auto-refresh**: dashboard memuat ulang data setiap `pollFrequency` detik (min. 5 detik), dijeda saat tab browser tidak aktif, dan langsung setelah setiap aksi.
- **Device online/offline**: badge di samping judul. Perangkat dianggap offline jika tidak ada telemetry lebih dari maks(120 detik, 3 × `pollFrequency`); jika belum pernah ada telemetry, badge menampilkan "No device data".
- **Menunggu perangkat**: di Manual Control muncul pesan "Waiting for the device…" (atau peringatan offline) jika:
    - Heater/LED: `manualControlState` berbeda dengan status aktual (`heaterStatus` / `ledStatus`).
    - Feeder: `feederConfig.lastTriggeredAt` lebih baru dari `realtimeState.lastUpdated`. Selama menunggu, tombol Feed Now dinonaktifkan agar tidak terpicu dua kali.

## Backend

| Fungsi                                                             | Lokasi                       | Keterangan                                                                             |
| ------------------------------------------------------------------ | ---------------------------- | -------------------------------------------------------------------------------------- |
| `findAquarium`                                                     | `config/aquarium.js`         | Mengembalikan `{ reference, data }` akuarium bersama, atau `null` untuk ID lain.       |
| `requireAuth`, `requireDeviceKey`                                  | `middleware/auth.js`         | Validasi Bearer JWT dan header `x-device-key` (perbandingan constant-time).            |
| `prepareSharedAquarium`, `joinSharedAquarium`                      | `routes/auth.js`             | Membuat akuarium saat pertama dipakai dan membersihkan field dari versi lama.          |
| `migratePrivateNotifications`                                      | `routes/auth.js`             | Memindahkan notifikasi lama `users/{id}/notifications` ke subkoleksi akuarium.         |
| `patchConfig`                                                      | `routes/aquariums.js`        | Validasi, simpan hanya field yang berubah, lalu buat notifikasi bersama.               |
| `telemetryRecords`, `csvCell`                                      | `routes/aquariums.js`        | Query riwayat dengan filter tanggal dan output CSV yang aman dari formula spreadsheet. |
| `isVisibleTo`, `isReadBy`                                          | `routes/aquariums.js`        | Aturan visibilitas dan status dibaca per pengguna.                                     |
| `lightingUsageUpdate`                                              | `routes/hardware.js`         | Statistik LED harian dan perhitungan `avgHoursOn` / `avgHoursOff`.                     |
| `configRules`, `validateTemperatureRange`, `scheduleDurationHours` | `utils/config-validation.js` | Aturan validasi tiap field config dan durasi jadwal lampu.                             |
| `sharedNotification`, `privateNotification`                        | `utils/notifications.js`     | Membentuk dokumen notifikasi dengan struktur yang konsisten.                           |

Error yang dilempar dengan `status` (misalnya dari `badRequest`) dikembalikan sebagai pesan JSON dengan status tersebut. Error lain menjadi 500 dengan pesan umum.

## Database

Database: **Firebase Cloud Firestore**.

| Koleksi / Subkoleksi | Path                                       | Document ID           |
| -------------------- | ------------------------------------------ | --------------------- |
| `users`              | `users/{userId}`                           | UUID                  |
| `aquariums`          | `aquariums/{aquariumId}`                   | Tetap: `aquarium-001` |
| `telemetry_history`  | `aquariums/{aquariumId}/telemetry_history` | Auto ID               |
| `notifications`      | `aquariums/{aquariumId}/notifications`     | Auto ID               |

### `users/{userId}`

| Field                    | Tipe          | Catatan                                                    |
| ------------------------ | ------------- | ---------------------------------------------------------- |
| `fullName`               | string        | 1–120 karakter                                             |
| `email`                  | string        | Unik, huruf kecil, dipakai untuk login, tidak dapat diubah |
| `password`               | string        | Hash bcrypt (12 rounds), bukan password asli               |
| `photoUrl`               | string / null | URL HTTP(S) atau data URL JPEG maksimal 180 KB             |
| `createdAt`, `updatedAt` | timestamp     | Waktu dibuat / terakhir diubah                             |

### `aquariums/{aquariumId}`

| Field            | Tipe      | Catatan                                                                                                                                       |
| ---------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `userId`         | string    | Pengguna yang pertama membuat dokumen                                                                                                         |
| `hardwareInfo`   | object    | `microcontroller`, `tempSensor`, `lighting`, `feeder`, `firmwareVersion`                                                                      |
| `realtimeState`  | object    | `currentTemp` (°C), `heaterStatus` (`ON`/`OFF`), `ledStatus` (`ON`/`OFF`), `feederStatus` (`Idle`/`Active`), `lastUpdated`                    |
| `tempConfig`     | object    | `unit` (`Celsius`/`Fahrenheit`), `targetTemp` (10–35), `minTempThreshold`, `maxTempThreshold` (0–40, min < max), `mode`, `manualControlState` |
| `lightingConfig` | object    | `mode`, `manualControlState`, `schedule` (`startTime`, `endTime`, `durationHours`, `isActive`), `avgHoursOn`, `avgHoursOff`                   |
| `feederConfig`   | object    | `mode`, `schedules` (maks. 12 `{ time, isActive }` dengan jam unik), `lastTriggeredAt`                                                        |
| `systemConfig`   | object    | `pollFrequency` (bilangan bulat 1–60 detik), `timezone` (nama IANA)                                                                           |
| `lightingUsage`  | map       | `{ "YYYY-MM-DD": { onSeconds, offSeconds } }` untuk 7 hari terakhir                                                                           |
| `updatedAt`      | timestamp | Terakhir kali config diubah dari dashboard                                                                                                    |

`mode` bernilai `AUTOMATIC` atau `MANUAL`; `manualControlState` bernilai `ON` atau `OFF`. Format jam jadwal adalah `hh:mm AM/PM`, contoh `08:00 AM`.

**Field yang dihitung server** (tidak bisa diubah lewat API):

- `lightingConfig.schedule.durationHours`: selisih `endTime` dan `startTime`. Jadwal boleh melewati tengah malam (10:00 PM–06:30 AM = 8.5 jam).
- `lightingConfig.avgHoursOn` / `avgHoursOff`: setiap telemetry menambahkan waktu sejak telemetry sebelumnya ke status LED sebelumnya di `lightingUsage` (tanggal mengikuti `systemConfig.timezone`). Jeda lebih dari maks(120 detik, 3 × `pollFrequency`) dianggap perangkat offline dan tidak dihitung. `avgHoursOn` = 24 × ON ÷ (ON + OFF) selama 7 hari; `avgHoursOff` = 24 − `avgHoursOn`.
- `feederConfig.lastTriggeredAt`: diisi oleh `POST /feeder/trigger`.

Field lama `systemConfig.unit`, `systemConfig.emailAlerts`, dan `systemConfig.smsAlerts` dihapus otomatis saat system config disimpan.

### `aquariums/{aquariumId}/telemetry_history/{autoId}`

| Field                                    | Tipe      | Catatan                                        |
| ---------------------------------------- | --------- | ---------------------------------------------- |
| `aquariumId`                             | string    | Akuarium asal data                             |
| `userId`                                 | null      | Selalu `null` karena dikirim perangkat         |
| `timestamp`                              | timestamp | Waktu server saat data diterima                |
| `temp`                                   | number    | Suhu (°C)                                      |
| `heaterState`, `ledState`, `feederState` | string    | Status saat dicatat                            |
| `event`                                  | string    | Maks. 160 karakter, default `Telemetry update` |

### `aquariums/{aquariumId}/notifications/{autoId}`

| Field                   | Tipe            | Catatan                                                     |
| ----------------------- | --------------- | ----------------------------------------------------------- |
| `userid`                | string / null   | Penerima notifikasi privat; `null` untuk notifikasi bersama |
| `userId`                | string / null   | Pengguna pemicu; `null` jika dipicu perangkat               |
| `aquariumId`            | string          | Akuarium terkait                                            |
| `actorName`             | string          | Nama pemicu (hanya notifikasi bersama)                      |
| `scope`                 | string          | `aquarium` (bersama) atau `user` (privat)                   |
| `title`, `message`      | string          | Judul dan isi                                               |
| `type`                  | string          | `alert`, `info`, atau `success`                             |
| `isRead`                | boolean         | Status dibaca untuk notifikasi privat                       |
| `readBy`, `dismissedBy` | array of string | Pengguna yang sudah membaca / menghapus notifikasi bersama  |
| `timestamp`             | timestamp       | Waktu dibuat                                                |

## Notifikasi

Sistem **tidak mengirim email atau SMS**. Peringatan sampai ke pengguna lewat:

1. **Halaman Alerts**: daftar notifikasi dengan filter jenis, Read, Delete, dan Mark all read. Badge di menu menampilkan jumlah yang belum dibaca.
2. **Browser notification**: saat diaktifkan di Config → Alerts, dashboard memeriksa notifikasi baru setiap 15 detik dan menampilkannya lewat Notification API browser. Butuh izin browser dan hanya bekerja selama dashboard terbuka. Preferensinya disimpan per pengguna di localStorage, bukan di Firestore.

| Kejadian                                                  | Judul                                                 | Type    | Cakupan |
| --------------------------------------------------------- | ----------------------------------------------------- | ------- | ------- |
| Suhu keluar dari batas min/max (sekali saat mulai keluar) | `Temperature Alert`                                   | `alert` | Bersama |
| Config suhu/lampu/pakan/sistem diubah                     | `Temperature/Lighting/Feeder/System settings updated` | `info`  | Bersama |
| Perintah pakan manual dikirim                             | `Feed Command Sent`                                   | `info`  | Bersama |
| Profil diubah                                             | `Profile updated`                                     | `info`  | Privat  |
| Password diubah                                           | `Password updated`                                    | `info`  | Privat  |

Notifikasi bersama terlihat oleh semua pengguna; status dibaca dan dihapus dicatat per pengguna di `readBy` dan `dismissedBy`. Menghapus notifikasi privat menghapus dokumennya.

## API

Base URL default `http://localhost:5000`. Body request dan response berformat JSON, kecuali ekspor CSV.

- **Publik**: tanpa autentikasi.
- **JWT**: header `Authorization: Bearer <token>` dari login/register, berlaku 12 jam.
- **Device**: header `x-device-key: <HARDWARE_API_KEY>`.

| Akses  | Method   | Endpoint                                              | Input                                                                                      | Output                                                              |
| ------ | -------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Publik | `GET`    | `/api/health`                                         | –                                                                                          | `status`                                                            |
| Publik | `POST`   | `/api/auth/register`                                  | `fullName`, `email`, `password` (min. 6), `photoUrl` opsional                              | `userId`, `token`, `userProfile`                                    |
| Publik | `POST`   | `/api/auth/login`                                     | `email`, `password`                                                                        | `userId`, `token`, `userProfile`                                    |
| JWT    | `POST`   | `/api/auth/change-password`                           | `currentPassword`, `newPassword` (min. 6)                                                  | `message`                                                           |
| JWT    | `GET`    | `/api/users/{userId}`                                 | – (hanya profil sendiri)                                                                   | `userId`, `fullName`, `email`, `photoUrl`, `createdAt`, `updatedAt` |
| JWT    | `PUT`    | `/api/users/{userId}`                                 | `fullName`, `photoUrl`                                                                     | `updatedAt`, `message`                                              |
| JWT    | `GET`    | `/api/aquariums/{aquariumId}`                         | –                                                                                          | Seluruh dokumen akuarium                                            |
| JWT    | `PATCH`  | `/api/aquariums/{aquariumId}/temperature-config`      | `mode`, `targetTemp`, `minTempThreshold`, `maxTempThreshold`, `manualControlState`, `unit` | `updatedAt`, `message`                                              |
| JWT    | `PATCH`  | `/api/aquariums/{aquariumId}/lighting-config`         | `mode`, `manualControlState`, `schedule {startTime, endTime, isActive}`                    | `updatedAt`, `message`                                              |
| JWT    | `PATCH`  | `/api/aquariums/{aquariumId}/feeder-config`           | `mode`, `schedules [{time, isActive}]`                                                     | `updatedAt`, `message`                                              |
| JWT    | `PATCH`  | `/api/aquariums/{aquariumId}/system-config`           | `unit`, `pollFrequency`, `timezone`                                                        | `updatedAt`, `message`                                              |
| JWT    | `POST`   | `/api/aquariums/{aquariumId}/feeder/trigger`          | – (hanya mode `MANUAL`, selain itu 409)                                                    | `status`, `message`                                                 |
| JWT    | `GET`    | `/api/aquariums/{aquariumId}/telemetry`               | `startDate`, `endDate`, `limit` (default 40, maks. 500)                                    | `telemetryRecords`, `total`                                         |
| JWT    | `GET`    | `/api/aquariums/{aquariumId}/telemetry/export`        | `startDate`, `endDate`, `format=csv`                                                       | File CSV                                                            |
| JWT    | `GET`    | `/api/aquariums/{aquariumId}/notifications`           | `limit` (default 100, maks. 500), `readStatus` (`read`/`unread`)                           | `notificationRecords`                                               |
| JWT    | `PATCH`  | `/api/aquariums/{aquariumId}/notifications/read-all`  | –                                                                                          | `message`                                                           |
| JWT    | `PATCH`  | `/api/aquariums/{aquariumId}/notifications/{id}/read` | –                                                                                          | `message`                                                           |
| JWT    | `DELETE` | `/api/aquariums/{aquariumId}/notifications/{id}`      | –                                                                                          | `message`                                                           |
| Device | `POST`   | `/api/hardware/{aquariumId}/telemetry`                | `currentTemp` (−10–60 °C), `heaterStatus`, `ledStatus`, `feederStatus`, `event` opsional   | `status`, `timestamp`                                               |
| Device | `GET`    | `/api/hardware/{aquariumId}/config`                   | –                                                                                          | `tempConfig`, `lightingConfig`, `feederConfig`, `systemConfig`      |

Semua PATCH config hanya menerima field yang tercantum (minimal satu). Nilai tidak valid ditolak dengan **400** dan pesan yang menyebut field-nya. Hanya field yang benar-benar berubah yang disimpan dan dicatat sebagai notifikasi.

| Kode      | Arti                                                              |
| --------- | ----------------------------------------------------------------- |
| 200 / 201 | Berhasil (201 untuk register dan penerimaan telemetry)            |
| 400       | Input tidak valid                                                 |
| 401       | Token/device key tidak ada atau tidak valid; email/password salah |
| 403       | Mengakses profil pengguna lain                                    |
| 404       | Akuarium, profil, notifikasi, atau endpoint tidak ditemukan       |
| 409       | Email sudah terdaftar, atau pakan dipicu saat mode bukan `MANUAL` |
| 500 / 503 | Kesalahan server, atau `HARDWARE_API_KEY` belum diatur            |

## Integrasi ESP32

Firmware tidak ada di repository ini. Perilaku yang diharapkan terhadap API:

1. Setiap `systemConfig.pollFrequency` detik, panggil `GET /api/hardware/{aquariumId}/config`.
2. **Heater**: mode `MANUAL` mengikuti `tempConfig.manualControlState`; mode `AUTOMATIC` membandingkan suhu terukur dengan `tempConfig.targetTemp`.
3. **LED**: mode `MANUAL` mengikuti `lightingConfig.manualControlState`; mode `AUTOMATIC` menyala selama jam lokal (`systemConfig.timezone`) berada di antara `schedule.startTime` dan `schedule.endTime` saat `schedule.isActive` bernilai `true`.
4. **Feeder**: mode `AUTOMATIC` menjalankan servo pada jam di `feederConfig.schedules` yang aktif; mode `MANUAL` menjalankan servo satu kali setiap `feederConfig.lastTriggeredAt` berubah, lalu melaporkan `feederStatus: "Idle"`.
5. Kirim `POST /api/hardware/{aquariumId}/telemetry` berisi suhu dan status aktual heater, LED, dan feeder.

Urutan setiap siklus sebaiknya **baca config → jalankan perintah → kirim telemetry**. Dashboard menganggap perintah Feed Now selesai saat menerima telemetry pertama setelah trigger, jadi telemetry yang dikirim sebelum perintah dijalankan akan membuat status "menunggu" hilang terlalu cepat.

Modul firmware dari dokumen rancangan:

| Modul                  | Input utama                                     | Tanggung jawab                        |
| ---------------------- | ----------------------------------------------- | ------------------------------------- |
| `ReadWaterTemperature` | Pin OneWire, sensor index                       | Membaca suhu (°C) dari DS18B20        |
| `ControlTemperature`   | Mode, suhu sekarang, suhu target, status manual | Mengatur relay heater                 |
| `ControlLighting`      | Mode, status manual, jam mulai/selesai          | Mengatur relay LED                    |
| `TriggerFeeder`        | Mode, trigger manual, jadwal                    | Menggerakkan servo pakan              |
| `TriggerBuzzerAlarm`   | Suhu sekarang, batas minimum/maksimum           | Alarm lokal saat suhu ekstrem         |
| `DisplayOLED`          | Suhu, waktu, status heater dan lampu            | Menampilkan kondisi perangkat di OLED |
| `ConnectIoT`           | SSID, password Wi-Fi, URL server                | Menghubungkan ESP32 ke Wi-Fi dan API  |

## Gaya Kode

- Format otomatis dengan Prettier (`.prettierrc.json` di root: indentasi 4 spasi, lebar baris 120). Jalankan `npm run format` di `backend/` atau `pnpm format` di `frontend/`.
- Komentar ditulis dalam bahasa Indonesia, singkat, dan hanya untuk hal yang tidak terlihat dari kode (alasan aturan, satuan, event `sa:notifications-changed` / `sa:unauthorized`).
- Bagian dalam file dipisahkan dengan pembatas `// ---------- Nama Bagian ----------`.
