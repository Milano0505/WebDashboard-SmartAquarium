# Backend

Backend adalah REST API yang menjadi satu-satunya jalan masuk ke database. Dokumen ini menjelaskan teknologi, struktur kode, cara sebuah request diproses, notifikasi, keamanan, dan cara mendemonstrasikan API. Daftar endpoint lengkap ada di [api.md](api.md).

## Teknologi

Gambaran teknologi seluruh sistem ada di [architecture.md](architecture.md#teknologi). Library yang dipakai backend:

| Library        | Versi | Kegunaan                                                      |
| -------------- | ----- | ------------------------------------------------------------- |
| Node.js        | 22    | Runtime JavaScript di server (ES modules, `"type": "module"`) |
| Express        | 5     | Web framework untuk routing dan middleware                    |
| firebase-admin | 14    | Membaca dan menulis Firestore dengan hak akses server         |
| jsonwebtoken   | 9     | Membuat dan memeriksa token login (JWT)                       |
| bcrypt         | 6     | Mengubah password menjadi hash sebelum disimpan               |
| cors           | 2     | Mengatur origin (alamat frontend) yang boleh memanggil API    |
| dotenv         | 18    | Membaca variabel environment dari `backend/.env`              |
| nodemon (dev)  | 3     | Menjalankan ulang server otomatis saat kode berubah           |
| Prettier (dev) | 3     | Merapikan format kode                                         |

Dependency dipasang dengan **npm**.

## Struktur folder

```text
backend/
  index.js                Membuat server Express, CORS, daftar route, penanganan error
  config/
    aquarium.js           ID akuarium bersama, aquariumRef(), findAquarium()
    defaults.js           Pengaturan awal saat dokumen akuarium dibuat
    firebase.js           Menghubungkan ke Firestore dengan service account
    security.js           Mengambil JWT_SECRET (atau membuatnya saat development)
  middleware/auth.js      requireAuth (token pengguna) dan requireDeviceKey (kunci perangkat)
  routes/
    auth.js               Register, login, ganti password
    users.js              Melihat dan mengubah profil sendiri
    aquariums.js          Pengaturan, Feed Now, riwayat, notifikasi
    hardware.js           Endpoint untuk perangkat: kirim data dan baca pengaturan
  utils/
    config-validation.js  Aturan pemeriksaan setiap field pengaturan
    errors.js             badRequest() untuk membuat error 400
    firestore.js          Mengubah Timestamp Firestore menjadi string ISO
    notifications.js      Membuat dokumen notifikasi bersama dan privat
    profile-photo.js      Memeriksa URL foto profil
```

## Cara request diproses

Contoh: pengguna mengubah suhu target di dashboard (`PATCH /api/aquariums/aquarium-001/temperature-config`).

1. **CORS** (`index.js`) memeriksa apakah request datang dari alamat frontend yang diizinkan.
2. **`express.json()`** membaca body JSON (maksimal 1 MB).
3. **Router** mencocokkan URL dengan file route (`routes/aquariums.js`).
4. **`requireAuth`** memeriksa token JWT. Jika tidak ada atau tidak valid, request dihentikan dengan `401`. Jika valid, ID pengguna disimpan di `req.auth.userId`.
5. **`findAquarium()`** memastikan ID akuarium benar dan dokumennya ada. Jika tidak, `404`.
6. **Validasi** (`utils/config-validation.js`) memeriksa setiap field. Nilai yang salah dihentikan dengan `400`.
7. **Firestore**: hanya field yang berubah disimpan, bersama notifikasi bersama, dalam satu _batch_ (semua berhasil atau semua gagal).
8. **Respons** JSON dikirim ke frontend.

Jika terjadi error di langkah mana pun, **error handler** di `index.js` mengirim `{ "message": "…" }` dengan kode status yang sesuai. Error yang tidak terduga dikirim sebagai `500` dengan pesan umum; detailnya hanya dicatat di log server.

## Fungsi penting

| Fungsi                                                             | File                         | Kegunaan                                                                                 |
| ------------------------------------------------------------------ | ---------------------------- | ---------------------------------------------------------------------------------------- |
| `findAquarium`                                                     | `config/aquarium.js`         | Mengembalikan `{ reference, data }` akuarium bersama, atau `null` untuk ID lain.         |
| `requireAuth`, `requireDeviceKey`                                  | `middleware/auth.js`         | Memeriksa token JWT dan header `x-device-key`.                                           |
| `prepareSharedAquarium`, `joinSharedAquarium`                      | `routes/auth.js`             | Membuat akuarium saat pertama dipakai dan membersihkan field dari versi lama.            |
| `migratePrivateNotifications`                                      | `routes/auth.js`             | Memindahkan notifikasi versi lama (`users/{id}/notifications`) ke subkoleksi akuarium.   |
| `patchConfig`                                                      | `routes/aquariums.js`        | Memeriksa input, menyimpan field yang berubah saja, lalu membuat notifikasi bersama.     |
| `telemetryRecords`, `csvCell`                                      | `routes/aquariums.js`        | Mengambil riwayat dengan filter tanggal dan membuat CSV yang aman dibuka di spreadsheet. |
| `isVisibleTo`, `isReadBy`                                          | `routes/aquariums.js`        | Menentukan notifikasi mana yang terlihat dan sudah dibaca oleh tiap pengguna.            |
| `lightingUsageUpdate`                                              | `routes/hardware.js`         | Mencatat lama lampu menyala per hari dan menghitung `avgHoursOn` / `avgHoursOff`.        |
| `configRules`, `validateTemperatureRange`, `scheduleDurationHours` | `utils/config-validation.js` | Aturan setiap field pengaturan dan perhitungan durasi jadwal lampu.                      |
| `sharedNotification`, `privateNotification`                        | `utils/notifications.js`     | Membuat dokumen notifikasi dengan struktur yang selalu sama.                             |

## Notifikasi

Backend membuat dokumen notifikasi di Firestore; frontend menampilkannya di halaman Alerts dan sebagai browser notification (lihat [frontend.md](frontend.md#notifikasi-di-browser)).

| Kejadian                                                     | Judul                                                 | Jenis   | Cakupan |
| ------------------------------------------------------------ | ----------------------------------------------------- | ------- | ------- |
| Suhu keluar dari batas aman (hanya sekali saat mulai keluar) | `Temperature Alert`                                   | `alert` | Bersama |
| Pengaturan suhu/lampu/pakan/sistem diubah                    | `Temperature/Lighting/Feeder/System settings updated` | `info`  | Bersama |
| Perintah Feed Now dikirim                                    | `Feed Command Sent`                                   | `info`  | Bersama |
| Profil diubah                                                | `Profile updated`                                     | `info`  | Privat  |
| Password diubah                                              | `Password updated`                                    | `info`  | Privat  |

- **Bersama**: terlihat oleh semua pengguna. Status dibaca dan dihapus dicatat per pengguna.
- **Privat**: hanya terlihat oleh pengguna yang bersangkutan.

Struktur dokumennya ada di [database.md](database.md#aquariumsaquariumidnotificationsautoid).

## Keamanan

| Hal                 | Cara penanganan                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Password            | Disimpan sebagai hash bcrypt (12 putaran), tidak pernah dikirim kembali ke klien.                |
| Login pengguna      | Token JWT berlaku 12 jam, ditandatangani dengan `JWT_SECRET` dan penerbit `smart-aquarium-api`.  |
| Login perangkat     | Header `x-device-key` dibandingkan dengan `HARDWARE_API_KEY` memakai perbandingan waktu-konstan. |
| Pesan login salah   | Sama untuk email salah dan password salah, agar email terdaftar tidak bisa ditebak.              |
| Akses profil        | Pengguna hanya bisa membaca dan mengubah profilnya sendiri; email tidak bisa diubah.             |
| Asal request (CORS) | Saat production, hanya alamat di `FRONTEND_ORIGIN` yang diizinkan.                               |
| Input               | Semua input diperiksa di server; field yang tidak dikenal ditolak.                               |
| Ekspor CSV          | Sel yang bisa dianggap rumus spreadsheet diberi awalan `'`.                                      |
| Pesan error         | Error tak terduga hanya mengirim pesan umum; detailnya di log server.                            |
| Rahasia             | `.env`, `serviceAccountKey.json`, dan `.dev-jwt-secret` tidak di-commit (ada di `.gitignore`).   |

## Menjalankan

```powershell
cd backend
npm install
npm run dev
```

Server berjalan di port dari `PORT` (contoh `.env`: 5000). Daftar variabel environment ada di [README.md](../README.md#konfigurasi-environment).

## Demonstrasi

Bagian ini menunjukkan backend bekerja dengan memanggil API langsung dari **API client**, tanpa frontend.

> **Perhatian:** backend terhubung ke database Firestore sungguhan. Data yang dibuat saat demo (akun, perubahan pengaturan, telemetry) ikut tersimpan.

### Persiapan

1. Jalankan backend (`npm run dev`).
2. Buka API client, misalnya **Postman**, **Thunder Client** (ekstensi VS Code), atau **REST Client** (ekstensi VS Code yang bisa langsung menjalankan blok `http` di bawah).
3. Buat tiga variabel: `baseUrl` = `http://localhost:5000`, `token` (diisi setelah login), dan `deviceKey` = nilai `HARDWARE_API_KEY` di `backend/.env`.

### Langkah demo

#### 1. Cek server berjalan

```http
GET {{baseUrl}}/api/health
```

Hasil: `200 { "status": "ok" }`.

#### 2. Login (atau register jika belum punya akun)

```http
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{ "email": "john@example.com", "password": "secret123" }
```

Hasil: `200` berisi `token`. Salin nilainya ke variabel `token`. Coba juga password yang salah untuk melihat `401 "Invalid email or password."`.

#### 3. Akses tanpa token ditolak

```http
GET {{baseUrl}}/api/aquariums/aquarium-001
```

Hasil: `401`. Ulangi dengan header `Authorization: Bearer {{token}}`; hasilnya `200` berisi semua data akuarium.

#### 4. Mengubah pengaturan dan melihat validasi

```http
PATCH {{baseUrl}}/api/aquariums/aquarium-001/temperature-config
Authorization: Bearer {{token}}
Content-Type: application/json

{ "targetTemp": 26 }
```

Hasil: `200 { "message": "Temperature config updated." }`. Kirim `{ "targetTemp": 50 }` untuk melihat `400` karena di luar rentang 10–35.

#### 5. Mengirim data sebagai perangkat

Karena firmware tidak ada di repo, data perangkat bisa disimulasikan dari API client:

```http
POST {{baseUrl}}/api/hardware/aquarium-001/telemetry
x-device-key: {{deviceKey}}
Content-Type: application/json

{ "currentTemp": 24.5, "heaterStatus": "ON", "ledStatus": "OFF", "feederStatus": "Idle", "event": "Demo telemetry" }
```

Hasil: `201 { "status": "received", … }`. Tanpa header `x-device-key` hasilnya `401`. Kirim `currentTemp` di luar batas aman (misalnya 35) untuk membuat notifikasi "Temperature Alert".

#### 6. Melihat hasilnya

```http
GET {{baseUrl}}/api/aquariums/aquarium-001/telemetry?limit=5
Authorization: Bearer {{token}}
```

Data dari langkah 5 muncul paling atas. `GET …/notifications` menampilkan notifikasi dari langkah 4 dan 5.

#### 7. Feed Now

```http
POST {{baseUrl}}/api/aquariums/aquarium-001/feeder/trigger
Authorization: Bearer {{token}}
```

Jika mode pemberi pakan masih `AUTOMATIC`, hasilnya `409`. Ubah dulu dengan `PATCH …/feeder-config` body `{ "mode": "MANUAL" }`, lalu ulangi; hasilnya `200 { "status": "triggered" }`.

#### 8. Ekspor CSV

```http
GET {{baseUrl}}/api/aquariums/aquarium-001/telemetry/export?format=csv
Authorization: Bearer {{token}}
```

Hasil: file `telemetry-YYYY-MM-DD.csv`.

### Dari frontend

Semua endpoint di atas juga dipanggil oleh frontend. Buka dashboard, tekan `F12`, pilih tab **Network**, lalu lakukan aksi di halaman untuk melihat request dan respons yang sama. Skenario lengkap frontend → backend → database ada di [integrations.md](integrations.md#demonstrasi).
