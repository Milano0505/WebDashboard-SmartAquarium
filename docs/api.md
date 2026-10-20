# REST API

Referensi semua endpoint backend. Kode route ada di `backend/routes/`. Alur penggunaannya ada di [architecture.md](architecture.md#alur-data).

## Konvensi

| Hal         | Aturan                                                                               |
| ----------- | ------------------------------------------------------------------------------------ |
| Base URL    | `http://localhost:5000` (sesuai `PORT`)                                              |
| Format      | Request dan response berupa JSON. Pengecualian: ekspor CSV                           |
| ID akuarium | Hanya `SHARED_AQUARIUM_ID` (default `aquarium-001`); ID lain dibalas `404`           |
| Error       | `{ "message": "…" }` berbahasa Inggris. Error server (`500`) hanya berisi pesan umum |
| Waktu       | String ISO 8601 (UTC)                                                                |
| Suhu        | Selalu Celsius                                                                       |
| Jam jadwal  | `hh:mm AM/PM`, contoh `08:00 AM`                                                     |

Dua jenis autentikasi:

| Jenis           | Header                             | Dipakai oleh                             |
| --------------- | ---------------------------------- | ---------------------------------------- |
| Token login     | `Authorization: Bearer <JWT>`      | Dashboard (semua kecuali register/login) |
| Kunci perangkat | `x-device-key: <HARDWARE_API_KEY>` | ESP32 (`/api/hardware/*`)                |

## Ringkasan Endpoint

`{id}` adalah ID akuarium. `{nid}` adalah ID notifikasi.

| Method | Path                                           | Auth      | Fungsi                             |
| ------ | ---------------------------------------------- | --------- | ---------------------------------- |
| GET    | `/api/health`                                  | –         | Cek server berjalan                |
| POST   | `/api/auth/register`                           | –         | Buat akun                          |
| POST   | `/api/auth/login`                              | –         | Login, mendapat token              |
| POST   | `/api/auth/change-password`                    | Token     | Ganti password                     |
| GET    | `/api/users/{userId}`                          | Token     | Profil sendiri                     |
| PUT    | `/api/users/{userId}`                          | Token     | Ubah nama atau foto profil         |
| GET    | `/api/aquariums/{id}`                          | Token     | Data akuarium                      |
| PATCH  | `/api/aquariums/{id}/temperature-config`       | Token     | Ubah pengaturan suhu               |
| PATCH  | `/api/aquariums/{id}/lighting-config`          | Token     | Ubah pengaturan lampu              |
| PATCH  | `/api/aquariums/{id}/feeder-config`            | Token     | Ubah pengaturan pemberi pakan      |
| PATCH  | `/api/aquariums/{id}/system-config`            | Token     | Ubah satuan, interval, zona waktu  |
| POST   | `/api/aquariums/{id}/feeder/trigger`           | Token     | Feed Now                           |
| GET    | `/api/aquariums/{id}/telemetry`                | Token     | Riwayat data perangkat             |
| GET    | `/api/aquariums/{id}/telemetry/export`         | Token     | Ekspor riwayat ke CSV              |
| GET    | `/api/aquariums/{id}/notifications`            | Token     | Daftar notifikasi                  |
| PATCH  | `/api/aquariums/{id}/notifications/read-all`   | Token     | Tandai semua dibaca                |
| PATCH  | `/api/aquariums/{id}/notifications/{nid}/read` | Token     | Tandai satu dibaca                 |
| DELETE | `/api/aquariums/{id}/notifications/{nid}`      | Token     | Hapus notifikasi                   |
| GET    | `/api/hardware/{id}/config`                    | Perangkat | Perangkat membaca pengaturan       |
| POST   | `/api/hardware/{id}/telemetry`                 | Perangkat | Perangkat mengirim suhu dan status |

## Akun dan Profil

### `POST /api/auth/register`

```json
{ "fullName": "John Doe", "email": "john@example.com", "password": "secret123", "photoUrl": null }
```

| Field      | Aturan                                                                                 |
| ---------- | -------------------------------------------------------------------------------------- |
| `fullName` | 1–120 karakter                                                                         |
| `email`    | Format email; disimpan huruf kecil; harus unik (`409` jika sudah ada)                  |
| `password` | Minimal 6 karakter                                                                     |
| `photoUrl` | Opsional: `null`, URL HTTP(S) (maks. 2048 karakter), atau data URL JPEG (maks. 180 KB) |

Respons `201`: `{ "userId", "token", "userProfile" }`. Akun pertama sekaligus membuat dokumen akuarium bersama.

### `POST /api/auth/login`

Body `{ "email", "password" }`. Respons `200`: `{ "userId", "token", "userProfile" }`. Email atau password salah dibalas `401 "Invalid email or password."` (pesan sama agar akun tidak bisa ditebak). Token berlaku 12 jam.

### `POST /api/auth/change-password`

Body `{ "currentPassword", "newPassword" }` (baru minimal 6 karakter). Password lama salah dibalas `400`. Membuat notifikasi privat "Password updated".

### `GET /api/users/{userId}` dan `PUT /api/users/{userId}`

`userId` harus sama dengan pemilik token, jika tidak `403`. `PUT` hanya menerima `fullName` dan/atau `photoUrl` (email tidak bisa diubah) dan membuat notifikasi privat "Profile updated". Jika tidak ada yang berubah: `200 "No profile changes detected."`.

## Akuarium dan Pengaturan

### `GET /api/aquariums/{id}`

Mengembalikan seluruh dokumen akuarium ([struktur](database.md#aquariumsaquariumid)). `systemConfig` hanya berisi `pollFrequency` dan `timezone`.

### `PATCH …/{section}-config`

Body berisi satu atau lebih field dari bagian itu. Hanya field di tabel yang diterima; field lain dibalas `400`. Hanya field yang benar-benar berubah yang disimpan, dan satu notifikasi "… settings updated" dibuat atas nama pengguna. Jika tidak ada yang berubah: `200 "No configuration changes detected."`.

| Endpoint             | Field                | Aturan                                                                                                              |
| -------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `temperature-config` | `unit`               | `Celsius` atau `Fahrenheit`                                                                                         |
|                      | `targetTemp`         | Angka 10–35                                                                                                         |
|                      | `minTempThreshold`   | Angka 0–40, harus lebih kecil dari `maxTempThreshold`                                                               |
|                      | `maxTempThreshold`   | Angka 0–40                                                                                                          |
|                      | `mode`               | `AUTOMATIC` atau `MANUAL`                                                                                           |
|                      | `manualControlState` | `ON` atau `OFF` (perintah heater saat mode manual)                                                                  |
| `lighting-config`    | `mode`               | `AUTOMATIC` atau `MANUAL`                                                                                           |
|                      | `manualControlState` | `ON` atau `OFF`                                                                                                     |
|                      | `schedule`           | `{ startTime, endTime, isActive }`; jam harus berbeda; boleh melewati tengah malam. `durationHours` dihitung server |
| `feeder-config`      | `mode`               | `AUTOMATIC` atau `MANUAL`                                                                                           |
|                      | `schedules`          | Array maks. 12 `{ time, isActive }`; jam harus unik                                                                 |
| `system-config`      | `unit`               | Sama seperti di atas (disimpan di `tempConfig.unit`)                                                                |
|                      | `pollFrequency`      | Bilangan bulat 1–60 (detik)                                                                                         |
|                      | `timezone`           | Nama zona waktu IANA, contoh `Asia/Jakarta`                                                                         |

Contoh:

```http
PATCH /api/aquariums/aquarium-001/lighting-config
Authorization: Bearer <token>

{ "schedule": { "startTime": "06:00 PM", "endTime": "06:00 AM", "isActive": true } }
```

Respons `200`: `{ "updatedAt": "…", "message": "Lighting config updated." }`.

### `POST /api/aquariums/{id}/feeder/trigger`

Tanpa body. Hanya jika `feederConfig.mode` adalah `MANUAL`, jika tidak `409`. Mengisi `feederConfig.lastTriggeredAt` dan membuat notifikasi "Feed Command Sent". Respons `200`: `{ "status": "triggered", "message": "Feed command sent." }`.

## Riwayat dan Notifikasi

### `GET /api/aquariums/{id}/telemetry`

| Query       | Aturan                                                         |
| ----------- | -------------------------------------------------------------- |
| `limit`     | Bilangan bulat positif, default 40, maks. 500                  |
| `startDate` | Tanggal valid (ISO), opsional                                  |
| `endDate`   | Tanggal valid (ISO), opsional; tidak boleh sebelum `startDate` |

Respons: `{ "telemetryRecords": [ … ], "total": 2 }`, terbaru lebih dulu.

```json
{
    "id": "abc123",
    "timestamp": "2026-10-20T08:15:00.000Z",
    "temp": 25.4,
    "heaterState": "ON",
    "ledState": "OFF",
    "feederState": "Idle",
    "event": "Telemetry update"
}
```

### `GET /api/aquariums/{id}/telemetry/export`

Query sama seperti di atas (default `limit` 500) dan `format=csv` (satu-satunya format). Respons berupa file `telemetry-YYYY-MM-DD.csv` dengan kolom `timestamp, temp, heaterState, ledState, feederState, event`. Sel yang diawali `=`, `+`, `-`, atau `@` diberi awalan `'` agar tidak dibaca sebagai rumus spreadsheet.

### `GET /api/aquariums/{id}/notifications`

| Query        | Aturan                                         |
| ------------ | ---------------------------------------------- |
| `limit`      | Bilangan bulat positif, default 100, maks. 500 |
| `readStatus` | `read` atau `unread`, opsional                 |

Respons: `{ "notificationRecords": [ … ] }`, terbaru lebih dulu, sudah disaring untuk pengguna ini. `isRead` dihitung untuk pengguna ini.

```json
{
    "id": "n1",
    "scope": "aquarium",
    "title": "Temperature Alert",
    "message": "Water temperature is above the configured threshold of 30°C (31.2°C).",
    "type": "alert",
    "actorName": "Aquarium hardware",
    "isRead": false,
    "timestamp": "2026-10-20T08:15:00.000Z"
}
```

`type` bernilai `info`, `alert`, atau `success`. Daftar kejadian yang membuat notifikasi ada di [development.md](development.md#notifikasi).

### Tandai dibaca dan hapus

| Endpoint                           | Efek                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| `PATCH …/notifications/read-all`   | Semua notifikasi pengguna ini ditandai dibaca                                        |
| `PATCH …/notifications/{nid}/read` | Satu notifikasi ditandai dibaca                                                      |
| `DELETE …/notifications/{nid}`     | Notifikasi bersama hanya disembunyikan untuk pengguna ini; notifikasi privat dihapus |

Notifikasi yang tidak ada atau bukan milik pengguna dibalas `404 "Notification was not found."`.

## Endpoint Perangkat

Semua memakai header `x-device-key`. Nilai yang salah dibalas `401 "A valid device key is required."`; jika `HARDWARE_API_KEY` kosong di backend: `503`.

### `GET /api/hardware/{id}/config`

Respons `200`: pengaturan yang perlu dijalankan perangkat.

```json
{
    "tempConfig": {
        "unit": "Celsius",
        "targetTemp": 24,
        "minTempThreshold": 20,
        "maxTempThreshold": 30,
        "mode": "AUTOMATIC",
        "manualControlState": "OFF"
    },
    "lightingConfig": {
        "mode": "AUTOMATIC",
        "manualControlState": "OFF",
        "schedule": { "startTime": "06:00 PM", "endTime": "06:00 AM", "durationHours": 12, "isActive": true },
        "avgHoursOn": null,
        "avgHoursOff": null
    },
    "feederConfig": { "mode": "MANUAL", "schedules": [], "lastTriggeredAt": null },
    "systemConfig": { "pollFrequency": 5, "timezone": "Asia/Jakarta" }
}
```

### `POST /api/hardware/{id}/telemetry`

```json
{
    "currentTemp": 25.4,
    "heaterStatus": "ON",
    "ledStatus": "OFF",
    "feederStatus": "Idle",
    "event": "Temperature too low"
}
```

| Field          | Aturan                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------- |
| `currentTemp`  | Angka −10 sampai 60. Boleh dihilangkan **hanya** untuk melaporkan sensor rusak (dengan `event`) |
| `heaterStatus` | `ON` atau `OFF`                                                                                 |
| `ledStatus`    | `ON` atau `OFF`                                                                                 |
| `feederStatus` | `Idle` atau `Active`                                                                            |
| `event`        | Opsional, maks. 160 karakter. Alasan alarm; kosong dicatat sebagai "Telemetry update"           |

Respons `201`: `{ "status": "received", "timestamp": "…" }`. Yang dilakukan backend:

- Menulis `realtimeState` dan memperbarui statistik jam lampu.
- **Normal:** menambah dokumen `telemetry_history`. Jika suhu baru keluar dari batas aman, membuat notifikasi **Temperature Alert** (sekali, bukan di setiap pembacaan).
- **Sensor rusak** (tanpa `currentTemp`): `realtimeState.currentTemp` dikosongkan, tidak ada dokumen riwayat, dan notifikasi **Sensor Error** dibuat sekali sampai pembacaan normal kembali.
- Jika perangkat sebelumnya dinyatakan offline, membuat notifikasi **Device Back Online**.

## Kode Status

| Kode  | Arti                                                                  |
| ----- | --------------------------------------------------------------------- |
| `200` | Berhasil                                                              |
| `201` | Akun dibuat, atau telemetry diterima                                  |
| `400` | Input tidak valid (pesan menjelaskan field-nya)                       |
| `401` | Token atau kunci perangkat tidak ada atau tidak valid; login gagal    |
| `403` | Mengakses profil pengguna lain                                        |
| `404` | Akuarium, notifikasi, atau profil tidak ditemukan; endpoint tidak ada |
| `409` | Email sudah terdaftar; Feed Now saat mode bukan `MANUAL`              |
| `500` | Error server (detail hanya di log)                                    |
| `503` | `HARDWARE_API_KEY` belum diatur di backend                            |
