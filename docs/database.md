# Database

Dokumen ini menjelaskan teknologi database, struktur data (skema), siapa yang menulis data apa, dan cara membuka database untuk demonstrasi. Endpoint yang membaca dan menulis data ini ada di [api.md](api.md).

## Teknologi

| Bagian     | Pilihan                                   | Alasan                                                                                                                                   |
| ---------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Database   | **Firebase Cloud Firestore**              | Database NoSQL berbasis dokumen di cloud: tidak perlu mengelola server, ada kuota gratis, dan bisa dilihat langsung di Firebase Console. |
| Akses      | **Firebase Admin SDK** (`firebase-admin`) | Dipakai backend dengan hak akses penuh. Aturan akses diatur di kode backend, bukan di Firestore Security Rules.                          |
| Kredensial | Service account Google                    | File `backend/serviceAccountKey.json` atau variabel `FIREBASE_SERVICE_ACCOUNT_JSON` / `FIREBASE_SERVICE_ACCOUNT_PATH`.                   |

Aturan dasar:

- Firestore **hanya diakses oleh backend**. Frontend dan perangkat selalu lewat REST API.
- Semua akun berbagi **satu dokumen akuarium** dengan ID `SHARED_AQUARIUM_ID` (default `aquarium-001`).
- Suhu selalu disimpan dalam **Celsius**.
- Waktu disimpan sebagai tipe `Timestamp` Firestore (diisi waktu server) dan dikirim ke klien sebagai string ISO.

### Istilah Firestore

- **Koleksi**: kumpulan dokumen, mirip tabel. Contoh: `users`.
- **Dokumen**: satu data berisi beberapa field, mirip satu baris. Setiap dokumen punya ID.
- **Subkoleksi**: koleksi di dalam sebuah dokumen. Contoh: `telemetry_history` di dalam dokumen akuarium.
- **Map / object**: field yang berisi field lain. Contoh: `tempConfig.targetTemp`.

Tidak seperti database SQL, Firestore tidak punya relasi atau JOIN. Hubungan antar-data disimpan sebagai ID (misalnya `userId`) atau dengan meletakkan data sebagai subkoleksi.

## Koleksi

| Koleksi / Subkoleksi | Path                                       | ID dokumen            | Isi                                 |
| -------------------- | ------------------------------------------ | --------------------- | ----------------------------------- |
| `users`              | `users/{userId}`                           | UUID acak             | Profil dan password (hash) pengguna |
| `aquariums`          | `aquariums/{aquariumId}`                   | Tetap: `aquarium-001` | Pengaturan dan status akuarium      |
| `telemetry_history`  | `aquariums/{aquariumId}/telemetry_history` | ID otomatis           | Riwayat data yang dikirim perangkat |
| `notifications`      | `aquariums/{aquariumId}/notifications`     | ID otomatis           | Notifikasi bersama dan privat       |

Hubungan antar-data:

- Satu dokumen akuarium punya banyak `telemetry_history` dan banyak `notifications`.
- Notifikasi menyimpan ID pengguna sebagai penerima (`userid`) dan/atau pelaku (`userId`).
- Semua pengguna memakai dokumen akuarium yang sama; tidak ada field "pemilik" yang membatasi akses.

## `users/{userId}`

| Field                    | Tipe          | Keterangan                                                |
| ------------------------ | ------------- | --------------------------------------------------------- |
| `fullName`               | string        | 1–120 karakter                                            |
| `email`                  | string        | Unik, huruf kecil, dipakai untuk login, tidak bisa diubah |
| `password`               | string        | Hash bcrypt (12 putaran), bukan password asli             |
| `photoUrl`               | string / null | URL HTTP(S) atau data URL JPEG maksimal 180 KB            |
| `createdAt`, `updatedAt` | timestamp     | Waktu akun dibuat / terakhir diubah                       |

## `aquariums/{aquariumId}`

| Field            | Tipe      | Keterangan                                                                                    |
| ---------------- | --------- | --------------------------------------------------------------------------------------------- |
| `userId`         | string    | Pengguna yang pertama kali membuat dokumen ini                                                |
| `hardwareInfo`   | object    | `microcontroller`, `tempSensor`, `lighting`, `feeder`, `firmwareVersion` (belum diisi sistem) |
| `realtimeState`  | object    | Status **nyata** perangkat (lihat di bawah)                                                   |
| `tempConfig`     | object    | Pengaturan heater dan batas suhu aman                                                         |
| `lightingConfig` | object    | Pengaturan lampu, jadwal, dan statistik pemakaian                                             |
| `feederConfig`   | object    | Pengaturan pemberi pakan dan perintah Feed Now                                                |
| `systemConfig`   | object    | `pollFrequency` (bilangan bulat 1–60 detik) dan `timezone` (nama zona waktu IANA)             |
| `lightingUsage`  | map       | `{ "YYYY-MM-DD": { onSeconds, offSeconds } }` untuk 7 hari terakhir                           |
| `updatedAt`      | timestamp | Terakhir kali pengaturan diubah dari dashboard                                                |

### `realtimeState`

| Field          | Tipe             | Keterangan                                                       |
| -------------- | ---------------- | ---------------------------------------------------------------- |
| `currentTemp`  | number / null    | Suhu terakhir (°C)                                               |
| `heaterStatus` | string           | `ON` / `OFF`                                                     |
| `ledStatus`    | string           | `ON` / `OFF`                                                     |
| `feederStatus` | string           | `Idle` / `Active`                                                |
| `lastUpdated`  | timestamp / null | Waktu data terakhir dari perangkat; `null` jika belum pernah ada |

**Hanya diisi oleh endpoint telemetry perangkat.** Tombol di dashboard tidak pernah mengubahnya.

### `tempConfig`

| Field                | Tipe   | Keterangan                                           |
| -------------------- | ------ | ---------------------------------------------------- |
| `unit`               | string | `Celsius` / `Fahrenheit` (hanya untuk tampilan)      |
| `targetTemp`         | number | 10–35 °C                                             |
| `minTempThreshold`   | number | 0–40 °C, lebih kecil dari `maxTempThreshold`         |
| `maxTempThreshold`   | number | 0–40 °C                                              |
| `mode`               | string | `AUTOMATIC` / `MANUAL`                               |
| `manualControlState` | string | `ON` / `OFF`; perintah untuk heater pada mode manual |

### `lightingConfig`

| Field                    | Tipe          | Keterangan                                                |
| ------------------------ | ------------- | --------------------------------------------------------- |
| `mode`                   | string        | `AUTOMATIC` / `MANUAL`                                    |
| `manualControlState`     | string        | `ON` / `OFF`; perintah untuk lampu pada mode manual       |
| `schedule.startTime`     | string / null | Format `hh:mm AM/PM`, misalnya `08:00 AM`                 |
| `schedule.endTime`       | string / null | Format `hh:mm AM/PM`, berbeda dari `startTime`            |
| `schedule.durationHours` | number / null | **Dihitung server**                                       |
| `schedule.isActive`      | boolean       | Jadwal dipakai pada mode otomatis                         |
| `avgHoursOn`             | number / null | **Dihitung server**: rata-rata jam lampu menyala per hari |
| `avgHoursOff`            | number / null | **Dihitung server**: `24 − avgHoursOn`                    |

### `feederConfig`

| Field             | Tipe             | Keterangan                                                                       |
| ----------------- | ---------------- | -------------------------------------------------------------------------------- |
| `mode`            | string           | `AUTOMATIC` / `MANUAL`                                                           |
| `schedules`       | array            | Maksimal 12 `{ time: "hh:mm AM/PM", isActive: boolean }`, jam tidak boleh kembar |
| `lastTriggeredAt` | timestamp / null | **Diisi server** saat Feed Now; perangkat memberi pakan setiap nilai ini berubah |

### Nilai yang dihitung server

- **`schedule.durationHours`**: selisih `endTime` dan `startTime`. Jadwal boleh melewati tengah malam, misalnya 10:00 PM–06:30 AM = 8,5 jam.
- **`avgHoursOn` / `avgHoursOff`**: setiap kali perangkat mengirim data, server menambahkan waktu sejak data sebelumnya ke status lampu sebelumnya (ON atau OFF) di `lightingUsage`, dikelompokkan per tanggal sesuai `systemConfig.timezone`. Jeda lebih dari maks(120 detik, 3 × `pollFrequency`) dianggap perangkat offline dan tidak dihitung. `avgHoursOn` = 24 × ON ÷ (ON + OFF) selama 7 hari terakhir.
- **`feederConfig.lastTriggeredAt`**: diisi oleh `POST …/feeder/trigger`.

Field lama `systemConfig.unit`, `systemConfig.emailAlerts`, dan `systemConfig.smsAlerts` dihapus otomatis saat pengaturan sistem disimpan.

## `aquariums/{aquariumId}/telemetry_history/{autoId}`

Satu dokumen untuk setiap data yang dikirim perangkat.

| Field                                    | Tipe      | Keterangan                                        |
| ---------------------------------------- | --------- | ------------------------------------------------- |
| `aquariumId`                             | string    | Akuarium asal data                                |
| `userId`                                 | null      | Selalu `null` karena dikirim perangkat            |
| `timestamp`                              | timestamp | Waktu server saat data diterima                   |
| `temp`                                   | number    | Suhu (°C)                                         |
| `heaterState`, `ledState`, `feederState` | string    | Status saat data dicatat                          |
| `event`                                  | string    | Maksimal 160 karakter, default `Telemetry update` |

## `aquariums/{aquariumId}/notifications/{autoId}`

| Field                   | Tipe            | Keterangan                                                      |
| ----------------------- | --------------- | --------------------------------------------------------------- |
| `userid`                | string / null   | **Penerima** notifikasi privat; `null` untuk notifikasi bersama |
| `userId`                | string / null   | **Pelaku** kejadian; `null` jika dipicu perangkat               |
| `aquariumId`            | string          | Akuarium terkait                                                |
| `actorName`             | string          | Nama pelaku (hanya notifikasi bersama)                          |
| `scope`                 | string          | `aquarium` (bersama) atau `user` (privat)                       |
| `title`, `message`      | string          | Judul dan isi                                                   |
| `type`                  | string          | `alert`, `info`, atau `success`                                 |
| `isRead`                | boolean         | Status dibaca untuk notifikasi privat                           |
| `readBy`, `dismissedBy` | array of string | ID pengguna yang sudah membaca / menghapus notifikasi bersama   |
| `timestamp`             | timestamp       | Waktu dibuat                                                    |

Perhatikan dua field yang namanya mirip: **`userid` = penerima**, **`userId` = pelaku**.

| Cakupan | Terlihat oleh              | Status dibaca            | Saat dihapus                             |
| ------- | -------------------------- | ------------------------ | ---------------------------------------- |
| Bersama | Semua pengguna             | Per pengguna di `readBy` | ID pengguna ditambahkan ke `dismissedBy` |
| Privat  | Hanya pengguna di `userid` | `isRead`                 | Dokumen dihapus                          |

Dokumen notifikasi selalu dibuat lewat `sharedNotification()` / `privateNotification()` di `backend/utils/notifications.js`. Daftar kejadian yang membuat notifikasi ada di [backend.md](backend.md#notifikasi).

## Siapa menulis apa

| Data                                                                        | Ditulis oleh                                                          |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `users/*`                                                                   | Register, ubah profil, ganti password                                 |
| `tempConfig`, `lightingConfig`, `feederConfig`, `systemConfig`, `updatedAt` | Endpoint `PATCH …-config` dari dashboard                              |
| `feederConfig.lastTriggeredAt`                                              | `POST …/feeder/trigger` (Feed Now)                                    |
| `realtimeState`, `lightingUsage`, `avgHoursOn/Off`, `telemetry_history/*`   | `POST /api/hardware/{id}/telemetry` (perangkat)                       |
| `notifications/*`                                                           | Perubahan pengaturan, Feed Now, alert suhu, perubahan profil/password |
| Dokumen akuarium awal                                                       | Register/login pertama (`config/defaults.js`)                         |

## Query yang dipakai

| Kebutuhan                | Query Firestore                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------ |
| Login / cek email kembar | `users` dengan `where("email", "==", email)`, maksimal 1                             |
| Riwayat telemetry        | `telemetry_history` diurutkan `timestamp` turun, filter rentang `timestamp`, `limit` |
| Daftar notifikasi        | `notifications` diurutkan `timestamp` turun, lalu disaring per pengguna di backend   |

Semua query hanya memakai satu field, sehingga cukup dengan indeks otomatis Firestore (tidak perlu membuat indeks gabungan).

## Membuka database

Untuk demonstrasi, database dibuka lewat **Firebase Console**:

1. Buka [console.firebase.google.com](https://console.firebase.google.com) dan login dengan akun Google yang punya akses ke project.
2. Pilih project Smart Aquarium.
3. Di menu kiri, pilih **Build → Firestore Database**, lalu tab **Data**.
4. Kolom pertama menampilkan koleksi `users` dan `aquariums`. Klik `aquariums` → `aquarium-001` untuk melihat semua field pengaturan dan `realtimeState`.
5. Di dokumen `aquarium-001`, klik subkoleksi `telemetry_history` atau `notifications` untuk melihat isinya.

Yang bisa ditunjukkan saat demo:

| Aksi                                         | Yang berubah di Firestore                                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Register akun baru                           | Dokumen baru di `users` dengan `password` berupa hash, bukan teks asli                                   |
| Ubah suhu target di dashboard                | `aquariums/aquarium-001` → `tempConfig.targetTemp` dan `updatedAt`, plus dokumen baru di `notifications` |
| Feed Now                                     | `feederConfig.lastTriggeredAt` terisi; `realtimeState` tidak berubah                                     |
| Perangkat (atau simulasi) mengirim data      | `realtimeState` diperbarui dan dokumen baru muncul di `telemetry_history`                                |
| Hapus notifikasi bersama dari halaman Alerts | ID pengguna masuk ke `dismissedBy`; dokumennya tetap ada                                                 |

> **Jangan mengubah data langsung di Firebase Console.** Perubahan dari console tidak melewati validasi backend dan tidak membuat notifikasi. Database ini juga dipakai sungguhan, jadi diskusikan dengan tim sebelum menghapus atau memindahkan data.

## Mengubah skema

1. Perbarui nilai awal di `backend/config/defaults.js`, dan aturan validasi di `backend/utils/config-validation.js` jika field bisa diubah dari dashboard.
2. Perbarui dokumen ini, dan [api.md](api.md) jika endpoint ikut berubah.
3. Data yang sudah ada di Firestore tidak berubah sendiri. Tangani field lama di kode (contoh: `prepareSharedAquarium` di `routes/auth.js`) atau lakukan migrasi manual setelah disetujui tim.
