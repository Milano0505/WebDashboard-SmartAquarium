# Database

Data disimpan di **Firebase Cloud Firestore**. Hanya backend yang membaca dan menulisnya (`firebase-admin`). Koneksinya diatur di `backend/config/firebase.js`.

## Koleksi

```text
users/{userId}
aquariums/{aquariumId}                  ← satu dokumen: aquarium-001
    ├── telemetry_history/{id}          ← riwayat data perangkat
    └── notifications/{id}              ← notifikasi
```

## `users/{userId}`

| Field       | Isi                                             |
| ----------- | ----------------------------------------------- |
| `fullName`  | Nama (1–120 karakter)                           |
| `email`     | Huruf kecil, unik, tidak bisa diubah            |
| `password`  | Hash bcrypt (12 putaran), bukan teks asli       |
| `photoUrl`  | `null`, URL HTTP(S), atau data URL JPEG ≤180 KB |
| `createdAt` | Waktu server                                    |
| `updatedAt` | Waktu server                                    |

## `aquariums/{aquariumId}`

Dibuat saat akun pertama register, dengan nilai awal dari `backend/config/defaults.js`.

| Field            | Isi                                                                                                              | Nilai awal                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `userId`         | Pembuat akuarium                                                                                                 | Akun pertama                         |
| `hardwareInfo`   | Info perangkat (`microcontroller`, `tempSensor`, `lighting`, `feeder`, `firmwareVersion`)                        | Semua `null`                         |
| `realtimeState`  | **Status nyata dari perangkat:** `currentTemp`, `heaterStatus`, `ledStatus`, `feederStatus`, `lastUpdated`       | `null`, `OFF`, `OFF`, `Idle`, `null` |
| `tempConfig`     | `unit`, `targetTemp`, `minTempThreshold`, `maxTempThreshold`, `mode`, `manualControlState`                       | Celsius, 24, 20, 30, `MANUAL`, `OFF` |
| `lightingConfig` | `mode`, `manualControlState`, `schedule` (`startTime`, `endTime`, `durationHours`, `isActive`), `avgHoursOn/Off` | `MANUAL`, `OFF`, jadwal kosong       |
| `feederConfig`   | `mode`, `schedules` (`{ time, isActive }`, maks. 12), `lastTriggeredAt`                                          | `MANUAL`, `[]`, `null`               |
| `systemConfig`   | `pollFrequency` (detik), `timezone` (IANA)                                                                       | 5, `Asia/Manila`                     |
| `lightingUsage`  | Detik lampu ON/OFF per tanggal (7 hari terakhir), dasar `avgHoursOn/Off`                                         | `{}`                                 |
| `deviceMonitor`  | Penanda notifikasi: `offlineNotified`, `sensorErrorNotified`                                                     | Dibuat saat dibutuhkan               |
| `updatedAt`      | Waktu perubahan pengaturan terakhir                                                                              | –                                    |

`realtimeState.currentTemp` bernilai `null` saat sensor rusak. `lastUpdated` adalah waktu telemetry terakhir diterima server.

### Siapa menulis apa

| Data                                                                                                             | Ditulis oleh                                                 |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `tempConfig`, `lightingConfig` (kecuali `avgHours*`), `feederConfig` (kecuali `lastTriggeredAt`), `systemConfig` | Dashboard, lewat `PATCH …-config`                            |
| `schedule.durationHours`                                                                                         | Server, dihitung dari jam mulai dan selesai                  |
| `feederConfig.lastTriggeredAt`                                                                                   | Server, saat **Feed Now**                                    |
| `realtimeState`, `lightingUsage`, `avgHoursOn/Off`, riwayat suhu                                                 | Telemetry perangkat (`POST /api/hardware/…/telemetry`)       |
| `deviceMonitor.offlineNotified`                                                                                  | Pengecekan offline berkala di server; direset oleh telemetry |
| `deviceMonitor.sensorErrorNotified`                                                                              | Telemetry perangkat                                          |

## `aquariums/{id}/telemetry_history/{id}`

Satu dokumen per telemetry normal. Telemetry tanpa suhu (sensor rusak) tidak dicatat.

| Field         | Isi                                                  |
| ------------- | ---------------------------------------------------- |
| `timestamp`   | Waktu server                                         |
| `temp`        | Suhu (°C)                                            |
| `heaterState` | `ON` atau `OFF`                                      |
| `ledState`    | `ON` atau `OFF`                                      |
| `feederState` | `Idle` atau `Active`                                 |
| `event`       | Alasan alarm dari perangkat, atau "Telemetry update" |
| `aquariumId`  | ID akuarium                                          |
| `userId`      | Selalu `null` (data berasal dari perangkat)          |

## `aquariums/{id}/notifications/{id}`

| Field              | Isi                                                                         |
| ------------------ | --------------------------------------------------------------------------- |
| `scope`            | `aquarium` (terlihat semua akun) atau `user` (privat)                       |
| `title`, `message` | Isi notifikasi                                                              |
| `type`             | `info`, `alert`, atau `success`                                             |
| `actorName`        | Nama pelaku, atau "Aquarium hardware"                                       |
| `userId`           | **Pelaku** (`null` untuk perangkat dan sistem)                              |
| `userid`           | **Penerima** (hanya untuk `scope: "user"`; `null` untuk notifikasi bersama) |
| `isRead`           | Status baca untuk notifikasi privat                                         |
| `readBy`           | ID akun yang sudah membaca (notifikasi bersama)                             |
| `dismissedBy`      | ID akun yang menghapusnya (notifikasi bersama; dokumen tetap ada)           |
| `timestamp`        | Waktu server                                                                |

> `userId` dan `userid` mirip tetapi berbeda arti. Buat notifikasi hanya lewat `sharedNotification()` atau `privateNotification()` di `backend/utils/notifications.js`.

## Query yang Dipakai

Semua query hanya memakai satu field, jadi **tidak butuh indeks gabungan**.

| Tujuan              | Query                                                                             |
| ------------------- | --------------------------------------------------------------------------------- |
| Login dan cek email | `users` dengan `email == …`, `limit 1`                                            |
| Riwayat dan ekspor  | `telemetry_history` urut `timestamp` turun, filter `timestamp` `>=`/`<=` opsional |
| Daftar notifikasi   | `notifications` urut `timestamp` turun, `limit` × 5, lalu disaring per akun       |
| Tandai semua dibaca | `notifications` dengan `isRead == false`                                          |

## Membuka Database

1. Buka [Firebase Console](https://console.firebase.google.com) dan pilih project yang sama dengan service account backend.
2. Menu **Build → Firestore Database → Data**.
3. Buka `aquariums` → `aquarium-001` untuk melihat pengaturan dan `realtimeState`. Sub-koleksi `telemetry_history` dan `notifications` ada di dalamnya.

> Database yang terhubung adalah database sungguhan. Jangan ubah atau hapus data tanpa yakin; perubahan struktur tidak memigrasi data lama secara otomatis.
