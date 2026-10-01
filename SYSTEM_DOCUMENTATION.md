# System Documentation

Dokumen ini menjelaskan implementasi yang ada di repository. Frontend dan backend adalah dua aplikasi terpisah dan dijalankan sebagai dua proses saat development. Firmware ESP32 tidak disertakan di repository ini.

## Struktur Repository

```text
backend/
  config/       Firebase, security, default aquarium data
  middleware/   JWT user auth dan device-key auth
  routes/       auth, users, aquarium, hardware endpoints
  utils/        Firestore serialization dan ID helpers
  index.js       Express API server
frontend/
  src/api/       API client
  src/components/ reusable UI, layout, chart, icons
  src/context/   authentication/session state
  src/pages/     login, register, dashboard, history, notifications, configuration
README.md
SYSTEM_DOCUMENTATION.md
GITHUB_GUIDE.md
```

## Aplikasi dan Modul

### Frontend

- `src/App.jsx`: routing halaman, proteksi sesi, browser notification polling setiap 15 detik.
- `src/context/AuthContext.jsx`: validasi sesi dan profil user.
- `src/api/service.js`: HTTP client, autentikasi, profil, aquarium, telemetry, export, dan alerts.
- `src/pages/Login.jsx`, `Register.jsx`: login dan registrasi.
- `src/pages/Dashboard.jsx`: status realtime, grafik, kontrol, konfigurasi mode, dan feeder.
- `src/pages/DataHistory.jsx`: history telemetry satu aquarium, pencarian, filter, pagination, dan CSV.
- `src/pages/Notifications.jsx`: alerts aquarium dan notifikasi profil privat.
- `src/pages/Configuration.jsx`: profil, password, pengaturan aquarium, threshold, dan browser notification.
- `src/components/Layout.jsx`: navigasi, header, dan badge alerts.
- `src/components/AreaChart.jsx`, `ui.jsx`, `Icons.jsx`: chart, komponen UI, dan ikon.

Browser notification memerlukan permission browser dan halaman dashboard tetap terbuka. Preferensinya lokal per browser/per pengguna; ini bukan push notification service dan tidak tersimpan di Firestore.

### Backend

- `index.js`: Express server, JSON parser, CORS, health endpoint, route registration, dan error handling.
- `config/firebase.js`: Firebase Admin/Firestore initialization dari environment, service-account file, atau ADC.
- `config/defaults.js`: data awal aquarium, realtime state, dan konfigurasi.
- `config/security.js`: `JWT_SECRET`; membuat secret lokal otomatis hanya untuk development.
- `middleware/auth.js`: validasi Bearer JWT user dan header device key.
- `routes/auth.js`: registrasi/login, bcrypt, JWT, perubahan password, dan cleanup field aquarium legacy pada user.
- `routes/users.js`: membaca/memperbarui profil serta membuat notifikasi profil privat pada aquarium.
- `routes/aquariums.js`: akses fixed aquarium ID, config, feeder, telemetry query/export, dan alerts.
- `routes/hardware.js`: validasi telemetry untuk fixed aquarium ID, realtime state, temperature alerts, dan config perangkat.
- `utils/firestore.js`: timestamp serialization dan aquarium ID untuk akun legacy.

### Function Inventory

- `createToken`, `createUserProfile` (`routes/auth.js`): JWT dan profil respons.
- `joinSharedAquarium` (`routes/auth.js`): memastikan single aquarium tersedia dan menghapus aquarium IDs legacy dari user.
- `migratePrivateNotifications` (`routes/auth.js`): memindahkan notifikasi privat lama ke subkoleksi notifications aquarium.
- `userProfile` (`routes/users.js`): serialisasi profil tanpa aquarium IDs.
- `parseLimit`, `parseDate`, `ownedAquarium` (`routes/aquariums.js`): validasi query dan fixed aquarium ID.
- `patchConfig` (`routes/aquariums.js`): update config dan audit notification global.
- `telemetryRecords`, `csvCell` (`routes/aquariums.js`): query history dan CSV-safe output.
- `createDefaultAquarium` (`config/defaults.js`): initial aquarium data.
- `requireAuth`, `requireDeviceKey` (`middleware/auth.js`): autentikasi dashboard/perangkat.
- `serializeFirestore` (`utils/firestore.js`): serialisasi data Firestore.
- `request`, `apiFetch`, `queryString` (`frontend/src/api/service.js`): request HTTP dan query serialization.
- API service functions lain menangani auth, config, telemetry, export, dan notifications.

### Firmware Modules in the Design

Modul berikut berasal dari dokumen rancangan Task 4. Modul ini mendeskripsikan pekerjaan firmware yang diharapkan, bukan source code yang tersedia di repository.

| Modul rancangan        | Input utama                                     | Hasil / tanggung jawab                                               |
| ---------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| `ReadWaterTemperature` | Pin OneWire, sensor index                       | Suhu Celsius;                                                        |
| `ControlTemperature`   | Mode, suhu sekarang, suhu target, status manual | Status logika relay heater.                                          |
| `ControlLighting`      | Mode, status manual, jam mulai/selesai          | Status logika relay LED.                                             |
| `TriggerFeeder`        | Mode, trigger manual, jadwal                    | Menggerakkan servo dan mengembalikan status eksekusi.                |
| `TriggerBuzzerAlarm`   | Suhu sekarang, batas minimum/maksimum           | Mengaktifkan alarm lokal saat suhu ekstrem.                          |
| `DisplayOLED`          | Suhu, waktu, status heater dan lampu            | Menampilkan kondisi perangkat di OLED.                               |
| `ConnectIoT`           | SSID, password Wi-Fi, URL server                | Menghubungkan ESP32 ke Wi-Fi dan API.                                |

## Database

Database: **Firebase Cloud Firestore**. Firebase Admin SDK hanya diakses backend; frontend tidak mengakses Firestore langsung.

### `users/{userId}`

| Field                    | Tipe             | Catatan                                |
| ------------------------ | ---------------- | -------------------------------------- |
| `fullName`               | string           | Nama pengguna                          |
| `email`                  | string           | Email unik untuk login                 |
| `password`               | string           | Hash bcrypt, bukan password plain text |
| `photoUrl`               | string atau null | URL foto profil                        |
| `createdAt`, `updatedAt` | timestamp        | Waktu pembuatan/perubahan              |

### `aquariums/{aquariumId}`

Sistem menggunakan satu dokumen aquarium dengan ID dari `SHARED_AQUARIUM_ID` (default `aquarium-001`). Semua user terautentikasi dapat mengakses ID tersebut; route menolak ID lain. `userId` menyimpan ID pembuat sesuai schema PDF.

| Field            | Tipe      | Catatan                                                                                                                         |
| ---------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `hardwareInfo`   | object    | `microcontroller`, `tempSensor`, `lighting`, `feeder`, `firmwareVersion`                                                        |
| `realtimeState`  | object    | `currentTemp` (Celsius), `heaterStatus` (`ON`/`OFF`), `ledStatus` (`ON`/`OFF`), `feederStatus` (`Idle`/`Active`), `lastUpdated` |
| `tempConfig`     | object    | `unit`, `targetTemp`, `minTempThreshold`, `maxTempThreshold`, `mode`, `manualControlState`                                      |
| `lightingConfig` | object    | `mode`, `manualControlState`, `schedule` (`startTime`, `endTime`, `durationHours`, `isActive`), `avgHoursOn`, `avgHoursOff`     |
| `feederConfig`   | object    | `mode`, `schedules` (array of `{ time, isActive }`)                                                                             |
| `systemConfig`   | object    | `pollFrequency` (seconds), `timezone`                                                                                           |
| `userId`         | string    | Owner user ID                                                                                                                   |
| `updatedAt`      | timestamp | Last config update, when present                                                                                                |

Endpoint `PATCH /api/aquariums/:aquariumId/system-config` tetap menerima parameter `unit` sesuai daftar API PDF, tetapi backend menyimpannya pada `tempConfig.unit`. `systemConfig` yang disimpan hanya berisi `pollFrequency` dan `timezone`.

### Subcollections

- `aquariums/{aquariumId}/telemetry_history/{autoId}`: data hardware (`timestamp`, `temp` Celsius, `heaterState`, `ledState`, `feederState`, `event`) dengan `aquariumId`; `userId` bernilai `null` karena telemetry dikirim perangkat.
- `aquariums/{AQUARIUM_ID}/notifications/{autoId}`: semua notifikasi. `userid` adalah penerima (`null` untuk global), `aquariumId` adalah aquarium sumber, `userId` tambahan mencatat pelaku (`null` untuk hardware), serta `title`, `message`, `type`, dan `timestamp`. Field tambahan: `scope`, `actorName`, `readBy`, `dismissedBy`, dan `isRead`.

Data history hanya memuat dokumen telemetry hardware, bukan notifikasi, dan selalu membaca satu aquarium. `aquariumId` menunjukkan konteks sumber; `userId` bernilai `null` karena record dibuat hardware. Pada notifications, `userid` adalah penerima privat atau `null` untuk global, sedangkan `userId` adalah pelaku event tambahan. Notifikasi profil/password juga disimpan di subkoleksi aquarium dan difilter berdasarkan `userid`. Status baca/dismiss global bersifat per-user melalui `readBy` dan `dismissedBy`.

## API

Base URL defaults to `http://localhost:5000`. Dashboard endpoints use `Authorization: Bearer <token>` unless marked **Public** or **Device key**. JSON request bodies use `Content-Type: application/json`.

- Public: `GET /api/health`; `POST /api/auth/register` (`fullName`, `email`, `password`, optional `photoUrl`); `POST /api/auth/login` (`email`, `password`).
- Bearer: `POST /api/auth/change-password` (`currentPassword`, `newPassword`).
- Bearer: `GET` and `PUT /api/users/:userId` for the signed-in user's profile.
- Bearer: aquarium route IDs must match the single configured `SHARED_AQUARIUM_ID`; other IDs return 404.
- Bearer: `GET /api/aquariums/:aquariumId` reads the shared aquarium.
- Bearer: `PATCH /api/aquariums/:aquariumId/temperature-config` accepts `unit`, `targetTemp`, thresholds, `mode`, and `manualControlState`.
- Bearer: `PATCH /api/aquariums/:aquariumId/lighting-config` accepts `mode`, `manualControlState`, `schedule`, `avgHoursOn`, and `avgHoursOff`.
- Bearer: `PATCH /api/aquariums/:aquariumId/feeder-config` accepts `mode` and `schedules`.
- Bearer: `PATCH /api/aquariums/:aquariumId/system-config` accepts `unit`, `pollFrequency`, and `timezone`.
- Bearer: each actual config change above writes a shared notification with actor attribution.
- Bearer: `POST /api/aquariums/:aquariumId/feeder/trigger` has no body and requires feeder mode `MANUAL`.
- Bearer: `GET /api/aquariums/:aquariumId/telemetry` supports `startDate`, `endDate`, and `limit` (default 40, maximum 500).
- Bearer: `GET /api/aquariums/:aquariumId/telemetry/export` supports date filters and `format=csv`.
- Bearer: `GET /api/aquariums/:aquariumId/notifications` supports `limit` (default 100, maximum 500) and `readStatus=read|unread`.
- Bearer: `PATCH /api/aquariums/:aquariumId/notifications/read-all` and `PATCH /api/aquariums/:aquariumId/notifications/:notificationId/read` update read state for the current user.
- Bearer: `DELETE /api/aquariums/:aquariumId/notifications/:notificationId` dismisses a shared alert for the current user or deletes a private alert.
- Device key: `POST /api/hardware/:aquariumId/telemetry` requires `x-device-key` and accepts `currentTemp`, `heaterStatus`, `ledStatus`, `feederStatus`, and optional `event`.
- Device key: `GET /api/hardware/:aquariumId/config` returns `tempConfig`, `lightingConfig`, `feederConfig`, and `systemConfig`.

## Running Frontend and Backend Separately

Use Node.js 22. Backend code defaults to port `3000`; `backend/.env.example` sets `PORT=5000`. Vite defaults to port `5173`.

1. Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`. Set `SHARED_AQUARIUM_ID` and `VITE_AQUARIUM_ID` to the same value. Fill in `JWT_SECRET`, `HARDWARE_API_KEY`, and Firebase credentials. Never commit filled `.env` files or service-account keys.
2. Terminal 1: `cd backend`, `npm install`, `npm run dev`.
3. Terminal 2: `cd frontend`, `pnpm install`, `pnpm dev`.
4. Open the Vite URL, normally `http://localhost:5173`.

Check backend availability at `http://localhost:5000/api/health`.
