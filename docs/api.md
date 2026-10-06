# API

Dokumen ini menjelaskan REST API Smart Aquarium: resource yang tersedia, apa yang bisa dilakukan pada setiap resource, aturan umum, ringkasan semua endpoint, dan detail tiap endpoint. Data yang dibaca dan ditulis API ada di [database.md](database.md). Cara mencobanya ada di [backend.md](backend.md#demonstrasi).

## Pendekatan

API ini **berorientasi resource** (mengikuti gaya REST), tetapi tidak sepenuhnya RESTful. Yang sudah diikuti:

- URL menunjuk ke **benda** (resource), bukan ke aksi. Contoh: `/api/aquariums/{aquariumId}/telemetry`.
- **Method HTTP** menunjukkan jenis operasi (lihat tabel CRUD di bawah).
- **Kode status HTTP** menunjukkan hasil (200 berhasil, 400 input salah, 404 tidak ditemukan, dan seterusnya).
- Server tidak menyimpan sesi; setiap request membawa token sendiri (_stateless_).

Bagian yang sengaja tidak mengikuti REST murni karena lebih praktis:

| Endpoint                            | Kenapa berbeda                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `POST /api/auth/login`, `/register` | Membuat sesi (token), bukan menyimpan resource yang bisa diambil lagi.                                       |
| `POST /api/auth/change-password`    | Berupa aksi, bukan perubahan resource biasa, karena butuh password lama.                                     |
| `POST …/feeder/trigger`             | Berupa **perintah** (Feed Now), bukan pembuatan data baru.                                                   |
| `PATCH …/notifications/read-all`    | Mengubah banyak notifikasi sekaligus.                                                                        |
| `DELETE …/notifications/{id}`       | Untuk notifikasi bersama, data hanya disembunyikan untuk user tersebut, bukan dihapus dari database.         |
| `/api/aquariums/{aquariumId}`       | Sistem hanya punya satu akuarium, jadi tidak ada endpoint untuk membuat, mendaftar, atau menghapus akuarium. |
| Tautan antar-resource (HATEOAS)     | Respons tidak berisi link ke resource lain; klien sudah tahu URL-nya.                                        |

## Konvensi

### Dasar

- **Base URL**: `http://localhost:5000` saat development (diatur `PORT` di backend dan `VITE_API_URL` di frontend).
- **Format**: request dan response memakai JSON (`Content-Type: application/json`), kecuali ekspor CSV.
- **Penamaan URL**: kata benda jamak (`users`, `aquariums`, `notifications`), huruf kecil, kata dipisah tanda hubung (`temperature-config`). Data milik akuarium berada di bawah `/api/aquariums/{aquariumId}/`.
- **Satu akuarium**: `{aquariumId}` harus sama dengan `SHARED_AQUARIUM_ID` (default `aquarium-001`). ID lain dibalas `404`.
- **Waktu**: semua timestamp di response berupa string ISO 8601 dalam UTC, misalnya `2026-10-06T02:31:06.818Z`.
- **Suhu**: selalu dalam Celsius, apa pun pilihan satuan di pengaturan.
- **Jam jadwal**: format `hh:mm AM/PM`, misalnya `08:00 AM`.

### Method HTTP dan operasi CRUD

| Method   | Operasi CRUD    | Dipakai untuk                                  | Contoh                                             |
| -------- | --------------- | ---------------------------------------------- | -------------------------------------------------- |
| `GET`    | Read            | Mengambil data, tidak pernah mengubah data     | `GET /api/aquariums/aquarium-001/telemetry`        |
| `POST`   | Create / aksi   | Membuat data baru atau menjalankan perintah    | `POST /api/auth/register`, `POST …/feeder/trigger` |
| `PUT`    | Update          | Mengubah profil pengguna                       | `PUT /api/users/{userId}`                          |
| `PATCH`  | Update sebagian | Mengubah sebagian field saja; field lain tetap | `PATCH …/temperature-config`                       |
| `DELETE` | Delete          | Menghapus (atau menyembunyikan) data           | `DELETE …/notifications/{id}`                      |

### Autentikasi

| Jenis  | Header                             | Dipakai oleh                                                                               |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------------------ |
| Publik | –                                  | `/api/health`, `/api/auth/register`, `/api/auth/login`                                     |
| JWT    | `Authorization: Bearer <token>`    | Semua endpoint dashboard (`/api/auth/change-password`, `/api/users/*`, `/api/aquariums/*`) |
| Device | `x-device-key: <HARDWARE_API_KEY>` | Endpoint perangkat (`/api/hardware/*`)                                                     |

Token JWT didapat dari register atau login dan berlaku **12 jam**. Frontend menyimpannya di `localStorage` (`sa_token`) dan otomatis logout saat menerima `401`.

### Kode status dan format error

Semua error memakai bentuk yang sama, dengan pesan dalam bahasa Inggris:

```json
{ "message": "mode must be one of: AUTOMATIC, MANUAL." }
```

| Kode      | Arti                                                                        |
| --------- | --------------------------------------------------------------------------- |
| 200       | Berhasil                                                                    |
| 201       | Berhasil membuat data (register, penerimaan telemetry)                      |
| 400       | Input tidak valid; pesan menyebut field yang salah                          |
| 401       | Token atau kunci perangkat tidak ada/tidak valid; email atau password salah |
| 403       | Mencoba membaca atau mengubah profil pengguna lain                          |
| 404       | Akuarium, profil, notifikasi, atau endpoint tidak ditemukan                 |
| 409       | Email sudah terdaftar, atau Feed Now saat mode pemberi pakan bukan `MANUAL` |
| 500 / 503 | Kesalahan server, atau `HARDWARE_API_KEY` belum diatur di server            |

### Query parameter

- `limit`: jumlah maksimal data yang dikembalikan (bilangan bulat positif, maksimal 500).
- `startDate`, `endDate`: filter rentang waktu untuk riwayat.
- `readStatus`: filter notifikasi `read` atau `unread`.

## Resource

| Resource                   | URL                                                                               | Yang bisa dilakukan                                   | Akses        |
| -------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------ |
| Health                     | `/api/health`                                                                     | Mengecek server berjalan                              | Publik       |
| Akun (sesi)                | `/api/auth/register`, `/login`, `/change-password`                                | Mendaftar, login, mengganti password                  | Publik / JWT |
| Profil pengguna            | `/api/users/{userId}`                                                             | Melihat dan mengubah profil sendiri                   | JWT          |
| Akuarium                   | `/api/aquariums/{aquariumId}`                                                     | Mengambil semua data akuarium (pengaturan dan status) | JWT          |
| Pengaturan akuarium        | `…/temperature-config`, `…/lighting-config`, `…/feeder-config`, `…/system-config` | Mengubah pengaturan heater, lampu, pakan, dan sistem  | JWT          |
| Perintah pakan             | `…/feeder/trigger`                                                                | Mengirim perintah Feed Now                            | JWT          |
| Telemetry (riwayat)        | `…/telemetry`, `…/telemetry/export`                                               | Melihat riwayat data perangkat dan mengekspor ke CSV  | JWT          |
| Notifikasi                 | `…/notifications`, `…/notifications/{id}`                                         | Melihat, menandai dibaca, dan menghapus notifikasi    | JWT          |
| Data dari perangkat        | `/api/hardware/{aquariumId}/telemetry`                                            | Perangkat mengirim suhu dan status nyata              | Device       |
| Pengaturan untuk perangkat | `/api/hardware/{aquariumId}/config`                                               | Perangkat membaca pengaturan terbaru                  | Device       |

## Ringkasan API

Tanda `…` berarti `/api/aquariums/{aquariumId}`.

| Kategori   | Method   | Endpoint                               | Fungsi                              | Input                                                                                      | Output                                                                             |
| ---------- | -------- | -------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Sistem     | `GET`    | `/api/health`                          | Cek server berjalan                 | –                                                                                          | `status`                                                                           |
| Akun       | `POST`   | `/api/auth/register`                   | Membuat akun                        | `fullName`, `email`, `password`, `photoUrl?`                                               | `userId`, `token`, `userProfile`                                                   |
| Akun       | `POST`   | `/api/auth/login`                      | Login                               | `email`, `password`                                                                        | `userId`, `token`, `userProfile`                                                   |
| Akun       | `POST`   | `/api/auth/change-password`            | Ganti password                      | `currentPassword`, `newPassword`                                                           | `message`                                                                          |
| Profil     | `GET`    | `/api/users/{userId}`                  | Melihat profil sendiri              | –                                                                                          | `fullName`, `email`, `photoUrl`, `createdAt`, `updatedAt`                          |
| Profil     | `PUT`    | `/api/users/{userId}`                  | Mengubah nama/foto                  | `fullName?`, `photoUrl?`                                                                   | `updatedAt`, `message`                                                             |
| Akuarium   | `GET`    | `…`                                    | Semua data akuarium                 | –                                                                                          | `realtimeState`, `tempConfig`, `lightingConfig`, `feederConfig`, `systemConfig`, … |
| Akuarium   | `PATCH`  | `…/temperature-config`                 | Pengaturan heater dan batas suhu    | `mode`, `manualControlState`, `targetTemp`, `minTempThreshold`, `maxTempThreshold`, `unit` | `updatedAt`, `message`                                                             |
| Akuarium   | `PATCH`  | `…/lighting-config`                    | Pengaturan lampu dan jadwal         | `mode`, `manualControlState`, `schedule`                                                   | `updatedAt`, `message`                                                             |
| Akuarium   | `PATCH`  | `…/feeder-config`                      | Pengaturan pakan dan jadwal         | `mode`, `schedules`                                                                        | `updatedAt`, `message`                                                             |
| Akuarium   | `PATCH`  | `…/system-config`                      | Satuan suhu, interval, zona waktu   | `unit`, `pollFrequency`, `timezone`                                                        | `updatedAt`, `message`                                                             |
| Akuarium   | `POST`   | `…/feeder/trigger`                     | Feed Now                            | –                                                                                          | `status`, `message`                                                                |
| Riwayat    | `GET`    | `…/telemetry`                          | Riwayat data perangkat              | `startDate?`, `endDate?`, `limit?`                                                         | `telemetryRecords`, `total`                                                        |
| Riwayat    | `GET`    | `…/telemetry/export`                   | Ekspor riwayat ke CSV               | `startDate?`, `endDate?`, `format=csv`                                                     | File CSV                                                                           |
| Notifikasi | `GET`    | `…/notifications`                      | Daftar notifikasi                   | `limit?`, `readStatus?`                                                                    | `notificationRecords`                                                              |
| Notifikasi | `PATCH`  | `…/notifications/{id}/read`            | Tandai satu notifikasi dibaca       | –                                                                                          | `message`                                                                          |
| Notifikasi | `PATCH`  | `…/notifications/read-all`             | Tandai semua dibaca                 | –                                                                                          | `message`                                                                          |
| Notifikasi | `DELETE` | `…/notifications/{id}`                 | Hapus notifikasi dari tampilan user | –                                                                                          | `message`                                                                          |
| Perangkat  | `POST`   | `/api/hardware/{aquariumId}/telemetry` | Perangkat mengirim data             | `currentTemp`, `heaterStatus`, `ledStatus`, `feederStatus`, `event?`                       | `status`, `timestamp`                                                              |
| Perangkat  | `GET`    | `/api/hardware/{aquariumId}/config`    | Perangkat membaca pengaturan        | –                                                                                          | `tempConfig`, `lightingConfig`, `feederConfig`, `systemConfig`                     |

Tanda `?` berarti opsional.

## Detail: akun dan profil

### `POST /api/auth/register`

Membuat akun baru. Password disimpan sebagai hash bcrypt. Jika dokumen akuarium bersama belum ada, server membuatnya dengan pengaturan awal.

```json
{ "fullName": "John Doe", "email": "john@example.com", "password": "secret123", "photoUrl": null }
```

- `fullName`: 1–120 karakter.
- `email`: harus valid; disimpan dalam huruf kecil.
- `password`: minimal 6 karakter.
- `photoUrl` (opsional): `null`, URL HTTP(S), atau data URL JPEG maksimal 180 KB.

Respons `201`:

```json
{
    "userId": "6f1c…",
    "token": "<JWT>",
    "userProfile": {
        "id": "6f1c…",
        "userId": "6f1c…",
        "fullName": "John Doe",
        "email": "john@example.com",
        "photoUrl": null,
        "createdAt": "2026-10-06T02:00:00.000Z"
    }
}
```

Email yang sudah terdaftar dibalas `409`.

### `POST /api/auth/login`

Body `{ "email", "password" }`. Respons sama dengan register, dengan status `200`. Jika email atau password salah, server membalas `401 "Invalid email or password."`. Pesannya sengaja sama untuk kedua kasus agar orang lain tidak bisa menebak email mana yang terdaftar.

### `POST /api/auth/change-password` (JWT)

Body `{ "currentPassword", "newPassword" }`. `newPassword` minimal 6 karakter. Respons `{ "message": "Password updated successfully." }`. Password lama yang salah dibalas `400`. Server juga membuat notifikasi privat "Password updated".

### `GET /api/users/{userId}` (JWT)

Hanya bisa untuk profil sendiri. Jika `{userId}` berbeda dengan pemilik token, server membalas `403`.

```json
{
    "id": "…",
    "userId": "…",
    "fullName": "John Doe",
    "email": "john@example.com",
    "photoUrl": null,
    "createdAt": "…",
    "updatedAt": "…"
}
```

### `PUT /api/users/{userId}` (JWT)

Body berisi `fullName` dan/atau `photoUrl`. Email **tidak bisa** diubah. Respons `{ "updatedAt", "message" }`.

- Jika tidak ada yang berubah, pesannya `"No profile changes detected."` dan tidak ada notifikasi.
- Jika ada yang berubah, server membuat notifikasi privat "Profile updated".

## Detail: akuarium dan pengaturan

### `GET /api/aquariums/{aquariumId}` (JWT)

Mengembalikan seluruh data akuarium: `userId`, `hardwareInfo`, `realtimeState`, `tempConfig`, `lightingConfig`, `feederConfig`, `systemConfig` (`pollFrequency`, `timezone`), `lightingUsage`, dan `updatedAt`. Arti setiap field ada di [database.md](database.md#aquariumsaquariumid).

### Endpoint `PATCH …-config` (JWT)

Aturan untuk keempat endpoint pengaturan:

- Body berisi **minimal satu** field dari daftar di bawah. Field lain ditolak dengan `400 "The request contains unsupported configuration fields."`.
- Setiap nilai diperiksa. Nilai yang salah dibalas `400` dengan pesan yang menyebut field-nya.
- Hanya field yang benar-benar berubah yang disimpan. Jika tidak ada yang berubah, respons berisi `"No configuration changes detected."`.
- Setiap perubahan membuat notifikasi bersama, misalnya "Temperature settings updated", berisi nama pengubah dan nilai barunya.
- Respons sukses: `{ "updatedAt": "…", "message": "Temperature config updated." }`.

| Endpoint             | Field                | Nilai yang diterima                                                                                             |
| -------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `temperature-config` | `mode`               | `AUTOMATIC` / `MANUAL`                                                                                          |
|                      | `manualControlState` | `ON` / `OFF`                                                                                                    |
|                      | `targetTemp`         | Angka 10–35 (°C)                                                                                                |
|                      | `minTempThreshold`   | Angka 0–40, harus lebih kecil dari `maxTempThreshold`                                                           |
|                      | `maxTempThreshold`   | Angka 0–40                                                                                                      |
|                      | `unit`               | `Celsius` / `Fahrenheit`                                                                                        |
| `lighting-config`    | `mode`               | `AUTOMATIC` / `MANUAL`                                                                                          |
|                      | `manualControlState` | `ON` / `OFF`                                                                                                    |
|                      | `schedule`           | `{ startTime, endTime, isActive }`; jam `hh:mm AM/PM`, jam mulai ≠ jam selesai. `durationHours` dihitung server |
| `feeder-config`      | `mode`               | `AUTOMATIC` / `MANUAL`                                                                                          |
|                      | `schedules`          | Array maksimal 12 `{ time, isActive }`; `time` format `hh:mm AM/PM` dan tidak boleh kembar                      |
| `system-config`      | `unit`               | `Celsius` / `Fahrenheit` (disimpan di `tempConfig.unit`)                                                        |
|                      | `pollFrequency`      | Bilangan bulat 1–60 (detik)                                                                                     |
|                      | `timezone`           | Nama zona waktu IANA, misalnya `Asia/Jakarta`                                                                   |

Field yang **tidak boleh** dikirim klien: `avgHoursOn`, `avgHoursOff`, `lastTriggeredAt` (dihitung server).

Contoh:

```http
PATCH /api/aquariums/aquarium-001/lighting-config
Authorization: Bearer <token>
Content-Type: application/json

{ "schedule": { "startTime": "08:00 AM", "endTime": "10:00 PM", "isActive": true } }
```

Mengubah `mode` atau `manualControlState` hanya menyimpan **perintah**. Status nyata (`realtimeState`) baru berubah setelah perangkat menjalankan perintah itu dan mengirim data.

### `POST /api/aquariums/{aquariumId}/feeder/trigger` (JWT)

Feed Now. Tidak perlu body. Hanya bisa dipakai saat `feederConfig.mode` bernilai `MANUAL`; selain itu dibalas `409`.

- Server mengisi `feederConfig.lastTriggeredAt` dengan waktu sekarang. `realtimeState` **tidak** diubah.
- Server membuat notifikasi bersama "Feed Command Sent".
- Respons `{ "status": "triggered", "message": "Feed command sent." }`.

Perangkat memberi pakan satu kali setiap nilai `lastTriggeredAt` berubah.

## Detail: riwayat (telemetry)

### `GET /api/aquariums/{aquariumId}/telemetry` (JWT)

| Query       | Keterangan                                            |
| ----------- | ----------------------------------------------------- |
| `startDate` | Opsional; tanggal atau string ISO (termasuk batasnya) |
| `endDate`   | Opsional; tidak boleh lebih awal dari `startDate`     |
| `limit`     | Bilangan bulat positif; default 40, maksimal 500      |

Data diurutkan dari yang terbaru. Data yang tidak lengkap dilewati.

```json
{
    "telemetryRecords": [
        {
            "id": "…",
            "aquariumId": "aquarium-001",
            "userId": null,
            "timestamp": "…",
            "temp": 23.6,
            "heaterState": "ON",
            "ledState": "OFF",
            "feederState": "Idle",
            "event": "Telemetry update"
        }
    ],
    "total": 1
}
```

### `GET /api/aquariums/{aquariumId}/telemetry/export` (JWT)

Query sama dengan endpoint telemetry, ditambah `format=csv` (satu-satunya format yang didukung). Default 500 data. Respons berupa file `telemetry-YYYY-MM-DD.csv` dengan kolom `timestamp, temp, heaterState, ledState, feederState, event`.

Isi sel yang diawali `=`, `+`, `-`, atau `@` diberi awalan `'` agar tidak dijalankan sebagai rumus saat dibuka di Excel atau Google Sheets.

## Detail: notifikasi

### `GET /api/aquariums/{aquariumId}/notifications` (JWT)

| Query        | Keterangan                     |
| ------------ | ------------------------------ |
| `limit`      | Default 100, maksimal 500      |
| `readStatus` | Opsional; `read` atau `unread` |

Respons `{ "notificationRecords": [...] }`, diurutkan dari yang terbaru. Isinya notifikasi bersama yang belum dihapus user ini dan notifikasi privat milik user ini. Field `isRead` sudah disesuaikan **untuk user yang meminta** (lihat [database.md](database.md#aquariumsaquariumidnotificationsautoid)).

### Menandai dibaca dan menghapus (JWT)

- `PATCH …/notifications/{id}/read`: untuk notifikasi bersama, ID user ditambahkan ke `readBy`; untuk notifikasi privat, `isRead` menjadi `true`.
- `PATCH …/notifications/read-all`: menandai semua notifikasi yang terlihat dan belum dibaca oleh user ini.
- `DELETE …/notifications/{id}`: notifikasi bersama hanya disembunyikan untuk user ini (`dismissedBy`); notifikasi privat dihapus dari database.
- Notifikasi yang tidak terlihat oleh user (privat milik orang lain, atau sudah dihapus) dibalas `404`.
- Respons `{ "message": "…" }`.

## Detail: endpoint perangkat

Semua endpoint di bawah wajib memakai header `x-device-key`. Urutan kerja yang diharapkan dari perangkat ada di [integrations.md](integrations.md#kontrak-dengan-perangkat).

### `POST /api/hardware/{aquariumId}/telemetry`

```json
{ "currentTemp": 24.5, "heaterStatus": "ON", "ledStatus": "OFF", "feederStatus": "Idle", "event": "Heater ON" }
```

| Field          | Nilai yang diterima                                          |
| -------------- | ------------------------------------------------------------ |
| `currentTemp`  | Angka −10 sampai 60 (°C)                                     |
| `heaterStatus` | `ON` / `OFF`                                                 |
| `ledStatus`    | `ON` / `OFF`                                                 |
| `feederStatus` | `Idle` / `Active`                                            |
| `event`        | Opsional, maksimal 160 karakter (default `Telemetry update`) |

Yang dilakukan server:

1. Memperbarui `realtimeState` (termasuk `lastUpdated`) dan menyimpan satu data baru di `telemetry_history`.
2. Memperbarui statistik lampu (`lightingUsage`, `avgHoursOn`, `avgHoursOff`).
3. Membuat notifikasi "Temperature Alert" jika suhu **baru saja** keluar dari batas `minTempThreshold`–`maxTempThreshold`. Selama suhu masih di luar batas, alert tidak dibuat berulang.

Respons `201 { "status": "received", "timestamp": "…" }`.

### `GET /api/hardware/{aquariumId}/config`

```json
{
    "tempConfig": {
        "unit": "Celsius",
        "targetTemp": 24,
        "minTempThreshold": 20,
        "maxTempThreshold": 30,
        "mode": "MANUAL",
        "manualControlState": "OFF"
    },
    "lightingConfig": {
        "mode": "AUTOMATIC",
        "manualControlState": "OFF",
        "schedule": { "startTime": "08:00 AM", "endTime": "10:00 PM", "durationHours": 14, "isActive": true },
        "avgHoursOn": 7.6,
        "avgHoursOff": 16.4
    },
    "feederConfig": {
        "mode": "AUTOMATIC",
        "schedules": [{ "time": "08:00 AM", "isActive": true }],
        "lastTriggeredAt": null
    },
    "systemConfig": { "pollFrequency": 5, "timezone": "Asia/Jakarta" }
}
```

## Mengubah API

Saat menambah atau mengubah endpoint:

1. Perbarui dokumen ini: tabel resource, ringkasan API, dan detail endpoint.
2. Jika field database berubah, perbarui [database.md](database.md).
3. Perubahan pada `/api/hardware/*` atau field yang dibaca perangkat akan merusak firmware yang sudah ada. Tandai `BREAKING CHANGE:` di pesan commit dan perbarui [integrations.md](integrations.md#kontrak-dengan-perangkat).
