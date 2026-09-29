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

| Modul | Tanggung jawab |
| --- | --- |
| `src/App.jsx` | React Router, protected routes, session-aware browser notifications. Memeriksa notifikasi baru setiap 15 detik saat dashboard berjalan dan permission browser sudah diberikan. |
| `src/context/AuthContext.jsx` | Memuat dan memvalidasi sesi, menyimpan profil/token di browser, logout, dan menangani sesi kedaluwarsa. |
| `src/api/service.js` | HTTP client, Bearer token, autentikasi, profil, konfigurasi aquarium, telemetry, CSV export, dan notifikasi. Default API development `http://localhost:5000`; bisa diganti dengan `VITE_API_URL`. |
| `src/pages/Login.jsx`, `Register.jsx` | Login dan pembuatan akun. |
| `src/pages/Dashboard.jsx` | Status realtime, grafik suhu, kontrol manual, konfigurasi mode, jadwal, dan pemicu feeder. |
| `src/pages/DataHistory.jsx` | Riwayat telemetry dalam tabel/kalender, pencarian, filter event, pagination lokal, dan ekspor CSV. Meminta hingga 500 record. |
| `src/pages/Notifications.jsx` | Daftar notifikasi, mark read, mark all read, delete. |
| `src/pages/Configuration.jsx` | Profil, password, unit suhu, timezone, frekuensi polling, threshold suhu, dan preferensi browser notification. |
| `src/components/Layout.jsx` | Navigasi, header, dan jumlah notifikasi belum dibaca. |
| `src/components/AreaChart.jsx` | Grafik area telemetry. |
| `src/components/ui.jsx`, `Icons.jsx` | Komponen UI dan ikon yang dipakai halaman. |

Browser notification memerlukan permission browser dan halaman dashboard tetap terbuka. Preferensinya lokal per browser/per pengguna; ini bukan push notification service dan tidak tersimpan di Firestore.

### Backend

| Modul | Tanggung jawab |
| --- | --- |
| `index.js` | Express server, JSON body parser, CORS, health endpoint, route registration, dan error response. |
| `config/firebase.js` | Menginisialisasi Firebase Admin dan Firestore dari `FIREBASE_SERVICE_ACCOUNT_JSON`, file service account, atau Application Default Credentials. |
| `config/defaults.js` | Membuat dokumen aquarium awal beserta default realtime state dan konfigurasi. |
| `config/security.js` | Memuat `JWT_SECRET`; untuk development dapat membuat secret lokal otomatis. |
| `middleware/auth.js` | Memvalidasi Bearer JWT pengguna dan header `x-device-key` perangkat. |
| `routes/auth.js` | Registrasi, login, password hashing dengan bcrypt, penerbitan JWT, dan perubahan password. Registrasi membuat user dan aquarium secara bersamaan. |
| `routes/users.js` | Membaca dan memperbarui profil milik pengguna yang terautentikasi. |
| `routes/aquariums.js` | Membaca aquarium, memperbarui config, trigger feeder manual, query/export telemetry, dan mengelola notifikasi. Memeriksa kepemilikan aquarium. |
| `routes/hardware.js` | Menerima telemetry dari device, memvalidasi sensor/status, memperbarui realtime state, membuat riwayat telemetry dan alert suhu, serta menyediakan config untuk hardware. |
| `utils/firestore.js` | Konversi timestamp ke ISO, serialisasi Firestore, dan pembentukan ID aquarium. |

### Function Inventory

| Fungsi | Lokasi | Peran |
| --- | --- | --- |
| `createToken`, `createUserProfile` | `routes/auth.js` | Membuat JWT dan bentuk profil pengguna yang dikembalikan API. |
| `userProfile` | `routes/users.js` | Membentuk respons profil pengguna. |
| `parseLimit`, `parseDate` | `routes/aquariums.js` | Memvalidasi batas jumlah record dan tanggal filter. |
| `ownedAquarium` | `routes/aquariums.js` | Memastikan aquarium ada dan dimiliki oleh user yang login. |
| `patchConfig` | `routes/aquariums.js` | Memvalidasi field config lalu menyimpannya ke dokumen aquarium. |
| `telemetryRecords`, `csvCell` | `routes/aquariums.js` | Mengambil riwayat dengan filter tanggal dan menulis nilai dengan aman ke CSV. |
| `validStatus` | `routes/hardware.js` | Memastikan status aktuator termasuk nilai yang diterima API. |
| `createDefaultAquarium` | `config/defaults.js` | Membentuk data awal aquarium saat user mendaftar. |
| `requireAuth`, `requireDeviceKey` | `middleware/auth.js` | Memvalidasi JWT dashboard atau shared device key. |
| `toIsoString`, `serializeFirestore`, `aquariumIdFor` | `utils/firestore.js` | Konversi timestamp, serialisasi hasil Firestore, dan pembuatan ID `aquarium-${userId}`. |
| `request`, `apiFetch`, `queryString` | `frontend/src/api/service.js` | Mengirim HTTP request, menambahkan token/JSON headers, dan membuat query string. |
| `login`, `register`, `changePassword`, `getUserProfile`, `updateUserProfile` | `frontend/src/api/service.js` | Operasi autentikasi dan profil. |
| `getAquarium`, `updateTemperatureConfig`, `updateLightingConfig`, `updateFeederConfig`, `updateSystemConfig`, `triggerFeeder` | `frontend/src/api/service.js` | Membaca aquarium dan mengubah konfigurasi atau memicu feeder. |
| `getTelemetry`, `exportTelemetry`, `getTemperatureChart` | `frontend/src/api/service.js` | Mengambil/export riwayat dan membentuk data grafik suhu. |
| `getNotifications`, `markNotificationRead`, `markAllNotificationsRead`, `deleteNotification` | `frontend/src/api/service.js` | Operasi baca dan pengelolaan notifikasi. |

### Firmware Modules in the Design

Modul berikut berasal dari dokumen rancangan Task 4. Modul ini mendeskripsikan pekerjaan firmware yang diharapkan, bukan source code yang tersedia di repository.

| Modul rancangan | Input utama | Hasil / tanggung jawab |
| --- | --- | --- |
| `ReadWaterTemperature` | Pin OneWire, sensor index | Suhu Celsius; rancangan mengembalikan `-127.0` saat sensor terputus. |
| `ControlTemperature` | Mode, suhu sekarang, suhu target, status manual | Status logika relay heater. |
| `ControlLighting` | Mode, status manual, jam mulai/selesai | Status logika relay LED. |
| `TriggerFeeder` | Mode, trigger manual, jadwal | Menggerakkan servo dan mengembalikan status eksekusi. |
| `TriggerBuzzerAlarm` | Suhu sekarang, batas minimum/maksimum | Mengaktifkan alarm lokal saat suhu ekstrem. |
| `DisplayOLED` | Suhu, waktu, status heater dan lampu | Menampilkan kondisi perangkat di OLED. |
| `ConnectIoT` | SSID, password Wi-Fi, URL server | Menghubungkan ESP32 ke Wi-Fi dan API. |


## Database

Database: **Firebase Cloud Firestore**. Firebase Admin SDK hanya diakses backend; frontend tidak mengakses Firestore langsung.

### `users/{userId}`

| Field | Tipe | Catatan |
| --- | --- | --- |
| `fullName` | string | Nama pengguna |
| `email` | string | Email unik untuk login |
| `password` | string | Hash bcrypt, bukan password plain text |
| `photoUrl` | string atau null | URL foto profil |
| `createdAt`, `updatedAt` | timestamp | Waktu pembuatan/perubahan |

### `aquariums/{aquariumId}`

ID aquarium dibuat sebagai `aquarium-${userId}`. Dokumen menyimpan `userId` pemilik dan konfigurasi/status berikut.

| Field | Tipe | Catatan |
| --- | --- | --- |
| `hardwareInfo` | object | `microcontroller`, `tempSensor`, `lighting`, `feeder`, `firmwareVersion` |
| `realtimeState` | object | `currentTemp` (Celsius), `heaterStatus` (`ON`/`OFF`), `ledStatus` (`ON`/`OFF`), `feederStatus` (`Idle`/`Active`), `lastUpdated` |
| `tempConfig` | object | `unit`, `targetTemp`, `minTempThreshold`, `maxTempThreshold`, `mode`, `manualControlState` |
| `lightingConfig` | object | `mode`, `manualControlState`, `schedule` (`startTime`, `endTime`, `durationHours`, `isActive`), `avgHoursOn`, `avgHoursOff` |
| `feederConfig` | object | `mode`, `schedules` (array of `{ time, isActive }`) |
| `systemConfig` | object | `unit`, `pollFrequency` (seconds), `timezone` |
| `userId` | string | Owner user ID |
| `updatedAt` | timestamp | Last config update, when present |

### Subcollections

- `aquariums/{aquariumId}/telemetry_history/{autoId}`: `timestamp`, `temp` (Celsius), `heaterState`, `ledState`, `feederState`, `event`.
- `aquariums/{aquariumId}/notifications/{autoId}`: `title`, `message`, `type`, `isRead`, `timestamp`.

Telemetry POST updates `realtimeState` and adds a telemetry record in one Firestore batch. A notification is created when temperature crosses from in-range to out-of-range; returning in range and crossing again can create another alert. A manual feeder trigger also creates an info notification and updates `realtimeState.feederStatus` in Firestore. It does not currently enqueue or send a one-time command to ESP32, so the device may not actually activate its servo from this API call.

## API

Base URL defaults to `http://localhost:5000`. Dashboard endpoints use `Authorization: Bearer <token>` unless marked **Public** or **Device key**. JSON request bodies use `Content-Type: application/json`.

| Method | Endpoint | Auth | Fungsi / parameter utama |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Health status `{ status: "ok" }` |
| `POST` | `/api/auth/register` | Public | Body: `fullName`, `email`, `password`, optional `photoUrl`; creates user and aquarium. |
| `POST` | `/api/auth/login` | Public | Body: `email`, `password`; returns token/profile. |
| `POST` | `/api/auth/change-password` | Bearer | Body: `currentPassword`, `newPassword`. |
| `GET` | `/api/users/:userId` | Bearer | Read own profile only. |
| `PUT` | `/api/users/:userId` | Bearer | Update own `fullName` and/or `photoUrl`. |
| `GET` | `/api/aquariums/:aquariumId` | Bearer | Read own aquarium document. |
| `PATCH` | `/api/aquariums/:aquariumId/temperature-config` | Bearer | `unit`, `targetTemp`, `minTempThreshold`, `maxTempThreshold`, `mode`, `manualControlState`. |
| `PATCH` | `/api/aquariums/:aquariumId/lighting-config` | Bearer | `mode`, `manualControlState`, `schedule`, `avgHoursOn`, `avgHoursOff`. |
| `PATCH` | `/api/aquariums/:aquariumId/feeder-config` | Bearer | `mode`, `schedules`. |
| `PATCH` | `/api/aquariums/:aquariumId/system-config` | Bearer | `unit`, `pollFrequency`, `timezone`. |
| `POST` | `/api/aquariums/:aquariumId/feeder/trigger` | Bearer | No body; only allowed in `MANUAL` feeder mode. Updates server state and writes a notification. |
| `GET` | `/api/aquariums/:aquariumId/telemetry` | Bearer | Query: `startDate`, `endDate`, `limit` (default 40, max 500). |
| `GET` | `/api/aquariums/:aquariumId/telemetry/export` | Bearer | Query: `startDate`, `endDate`, `format=csv`, optional `limit`; returns CSV. |
| `GET` | `/api/aquariums/:aquariumId/notifications` | Bearer | Query: `limit` (default 100, max 500), `readStatus=read\|unread`. |
| `PATCH` | `/api/aquariums/:aquariumId/notifications/read-all` | Bearer | Mark all unread notifications read. |
| `PATCH` | `/api/aquariums/:aquariumId/notifications/:notificationId/read` | Bearer | Mark one notification read. |
| `DELETE` | `/api/aquariums/:aquariumId/notifications/:notificationId` | Bearer | Delete one notification. |
| `POST` | `/api/hardware/:aquariumId/telemetry` | Device key | Header: `x-device-key`. Body: `currentTemp`, `heaterStatus`, `ledStatus`, `feederStatus`, optional `event`. |
| `GET` | `/api/hardware/:aquariumId/config` | Device key | Returns `tempConfig`, `lightingConfig`, `feederConfig`, `systemConfig`. |

## Running Frontend and Backend Separately

Use Node.js 22. Backend defaults to port `5000` in `backend/.env.example`; Vite defaults to port `5173`.

1. Copy `backend/.env.example` to `backend/.env` and fill in `JWT_SECRET`, `HARDWARE_API_KEY`, and Firebase credentials. Never commit the filled `.env` or service-account key.
2. Terminal 1: `cd backend`, `npm install`, `npm run dev`.
3. Terminal 2: `cd frontend`, `npm install`, `npm run dev`.
4. Open `http://localhost:5173`.

Check backend availability at `http://localhost:5000/api/health`.
