# Pengembangan

Panduan untuk membaca dan mengubah kode backend dan frontend. Firmware ada di [device/README.md](../../device/README.md).

## Perintah

| Lokasi      | Perintah         | Fungsi                                                   |
| ----------- | ---------------- | -------------------------------------------------------- |
| `backend/`  | `npm install`    | Pasang dependency (pakai **npm**)                        |
| `backend/`  | `npm run dev`    | API dengan auto-reload (nodemon)                         |
| `backend/`  | `npm start`      | API tanpa auto-reload                                    |
| `backend/`  | `npm run format` | Prettier untuk semua `*.js`                              |
| `frontend/` | `pnpm install`   | Pasang dependency (pakai **pnpm**)                       |
| `frontend/` | `pnpm dev`       | Server development Vite (port 5173, bisa diakses di LAN) |
| `frontend/` | `pnpm build`     | Build produksi ke `frontend/dist`                        |
| `frontend/` | `pnpm format`    | Prettier untuk `src/`                                    |

Node.js 22 dan pnpm 10 dikunci di `frontend/.mise.toml`. **Belum ada test otomatis**; periksa dengan `pnpm build` (frontend), `node --check <file>` (backend), lalu coba endpoint yang terkait ([Mencoba Sistem](#mencoba-sistem)).

## Backend

```text
backend/
  index.js               Server Express, CORS, routing, penanganan error, pengecekan offline
  config/
    aquarium.js          AQUARIUM_ID, aquariumRef(), findAquarium()
    defaults.js          Nilai awal dokumen akuarium
    firebase.js          Koneksi Firestore
    security.js          JWT_SECRET
  middleware/auth.js     requireAuth (JWT) dan requireDeviceKey (ESP32)
  routes/
    auth.js              Register, login, ganti password
    users.js             Profil
    aquariums.js         Pengaturan, Feed Now, riwayat, notifikasi
    hardware.js          Endpoint perangkat: config dan telemetry
  utils/
    config-validation.js Aturan validasi PATCH config
    device-status.js     Batas offline dan pengecekan berkala
    errors.js            badRequest()
    firestore.js         Timestamp → ISO string
    notifications.js     sharedNotification(), privateNotification()
    profile-photo.js     Validasi foto profil
```

### Alur request

1. CORS: di development semua origin diizinkan; di production hanya `FRONTEND_ORIGIN`.
2. `requireAuth` (dashboard) atau `requireDeviceKey` (perangkat).
3. Route memvalidasi input, mengambil akuarium dengan `findAquarium()`, lalu menulis data bersama notifikasinya dalam **satu batch**.
4. Error: `badRequest()` menjadi `400`; error lain menjadi `500` dengan pesan umum.

### Menambah atau mengubah field pengaturan

1. Tambahkan aturan di `utils/config-validation.js` (`configRules`). Field yang tidak terdaftar otomatis ditolak.
2. Tambahkan nilai awal di `config/defaults.js`.
3. Panggil lewat fungsi `update*Config` di `frontend/src/api/service.js`.
4. Perbarui [database.md](database.md) dan [api.md](api.md).

### Notifikasi

| Kejadian                           | Judul                | Jenis   | Terlihat oleh |
| ---------------------------------- | -------------------- | ------- | ------------- |
| Pengaturan diubah                  | `… settings updated` | info    | Semua akun    |
| Feed Now ditekan                   | `Feed Command Sent`  | info    | Semua akun    |
| Suhu keluar dari batas aman        | `Temperature Alert`  | alert   | Semua akun    |
| Sensor suhu rusak                  | `Sensor Error`       | alert   | Semua akun    |
| Tidak ada telemetry melewati batas | `Device Offline`     | alert   | Semua akun    |
| Telemetry kembali setelah offline  | `Device Back Online` | success | Semua akun    |
| Nama atau foto profil diubah       | `Profile updated`    | info    | Pelaku saja   |
| Password diganti                   | `Password updated`   | info    | Pelaku saja   |

Alert suhu, sensor, dan offline hanya dibuat **sekali** saat kondisinya mulai, bukan di setiap pembacaan (penandanya di `deviceMonitor`). Pengecekan offline berjalan tiap 30 detik di server karena perangkat yang mati tidak mengirim request.

### Keamanan

| Hal             | Cara                                                                             |
| --------------- | -------------------------------------------------------------------------------- |
| Password        | Hash bcrypt (12 putaran); pesan login gagal sama untuk email atau password salah |
| Token           | JWT berlaku 12 jam; `JWT_SECRET` wajib di production                             |
| Kunci perangkat | Dibandingkan dengan `timingSafeEqual`; `503` jika belum diatur                   |
| Profil          | Pengguna hanya boleh mengakses profilnya sendiri                                 |
| CORS            | Production hanya mengizinkan `FRONTEND_ORIGIN`                                   |
| Ekspor CSV      | Sel yang diawali `=`, `+`, `-`, `@` diberi awalan `'`                            |
| Rahasia         | `.env`, `serviceAccountKey.json`, `.dev-jwt-secret` ada di `.gitignore`          |

## Frontend

```text
frontend/src/
  main.jsx, App.jsx      Titik awal, daftar route, proteksi login, toast sukses
  api/service.js         Semua request ke backend
  context/AuthContext.jsx Sesi login dan profil
  hooks/                 useUnreadCount, useBrowserNotifications
  components/            Layout, ui.jsx (komponen dasar), AreaChart, Icons
  pages/                 Login, Register, Dashboard, DataHistory, Notifications, Configuration
  utils/                 format.js (suhu, waktu), profilePhoto.js (kompresi foto)
```

### Halaman

Semua halaman kecuali Login dan Register memerlukan login; jika belum, diarahkan ke `/login`.

| Route                    | Isi                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`, `/register`    | Form login dan pendaftaran (foto profil opsional)                                                                                                 |
| `/dashboard`             | **Overview:** suhu, status alat, grafik 12 data terakhir, data dan notifikasi terbaru                                                             |
| `/dashboard/temperature` | Suhu target, mode, tombol heater                                                                                                                  |
| `/dashboard/lighting`    | Jadwal lampu, rata-rata jam menyala, mode, tombol lampu                                                                                           |
| `/dashboard/feeder`      | Jadwal pakan, mode, **Feed Now**                                                                                                                  |
| `/history`               | Tab **Table** (pencarian, filter, ekspor CSV) dan **Calendar**                                                                                    |
| `/notifications`         | Daftar notifikasi: Read, Delete, Mark all read                                                                                                    |
| `/configuration`         | **Profile** (foto, nama, password, Sign Out), **System** (satuan, zona waktu, interval), **Alerts** (batas suhu, browser notification), **About** |

Di desktop menu ada di sidebar kiri; di smartphone pindah ke bar bawah. Menu Alerts menampilkan badge jumlah notifikasi belum dibaca.

### Cara data dimuat

Semua request lewat `api/service.js`: menambahkan JWT, mengubah respons gagal menjadi `Error` berisi pesan API, dan pada `401` menghapus sesi lalu mengeluarkan pengguna. Token (`sa_token`) dan profil (`sa_user`) disimpan di `localStorage`.

Backend tidak mengirim data sendiri, jadi frontend memuat ulang berkala:

| Bagian               | Interval                          | Keterangan                                              |
| -------------------- | --------------------------------- | ------------------------------------------------------- |
| Dashboard            | `pollFrequency` detik (minimal 5) | Berhenti saat tab tidak aktif; juga setelah setiap aksi |
| Badge Alerts         | 10 detik                          | Juga setelah aksi yang membuat notifikasi               |
| Browser notification | 15 detik                          | Hanya jika diaktifkan di Configuration → Alerts         |

Input yang sedang diedit (slider suhu, form jadwal) disimpan sebagai draft lokal agar tidak tertimpa pembaruan.

### Status perangkat di Dashboard

- Status dibaca dari `realtimeState`, bukan dari tombol. Tombol hanya menyimpan perintah.
- Badge: **Device online** (ada telemetry dalam batas offline), **Device offline**, atau **No device data**. Batas offline ada di [architecture.md](architecture.md#kontrak-dengan-perangkat).
- Kartu Manual Control menampilkan "Waiting for the device…" jika perintah berbeda dari status nyata (heater/lampu), atau Feed Now lebih baru dari telemetry terakhir. Selama menunggu, Feed Now dinonaktifkan.
- Sensor rusak: suhu tampil `--` dan notifikasi **Sensor Error** muncul.

### Browser notification

Diaktifkan per pengguna di Configuration → Alerts (browser meminta izin). Hanya bekerja **selama dashboard terbuka**. Preferensinya disimpan di `localStorage` (`sa_browser_notifications:<userId>`), bukan di database.

## Mencoba Sistem

Backend terhubung ke database sungguhan; data yang dibuat saat mencoba ikut tersimpan. Pakai API client seperti Postman, Thunder Client, atau REST Client (VS Code) dengan variabel `baseUrl` (`http://localhost:5000`), `token`, dan `deviceKey` (isi `HARDWARE_API_KEY`).

| No. | Request                                                                            | Hasil yang diharapkan                                             |
| --- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | `GET /api/health`                                                                  | `200 { "status": "ok" }`                                          |
| 2   | `POST /api/auth/login` `{ "email", "password" }`                                   | `200` berisi `token`; salin ke variabel `token`                   |
| 3   | `GET /api/aquariums/aquarium-001` tanpa token                                      | `401`; dengan header `Authorization: Bearer {{token}}` → `200`    |
| 4   | `PATCH …/temperature-config` `{ "targetTemp": 26 }`                                | `200`; notifikasi baru muncul. `{ "targetTemp": 50 }` → `400`     |
| 5   | `POST /api/hardware/aquarium-001/telemetry` dengan `x-device-key` (lihat di bawah) | `201`; dashboard menampilkan **Device online** dan suhu           |
| 6   | Sama seperti 5 dengan `currentTemp` di luar batas aman                             | Notifikasi **Temperature Alert**                                  |
| 7   | Kirim telemetry tanpa `currentTemp` dengan `"event": "Sensor error"`               | Dashboard menampilkan suhu `--` dan notifikasi **Sensor Error**   |
| 8   | `POST …/feeder/trigger`                                                            | `409` jika mode `AUTOMATIC`; ubah ke `MANUAL` lalu ulangi → `200` |
| 9   | `GET …/telemetry/export?format=csv`                                                | File CSV berisi data dari langkah 5–6                             |

Body telemetry untuk langkah 5:

```http
POST {{baseUrl}}/api/hardware/aquarium-001/telemetry
x-device-key: {{deviceKey}}
Content-Type: application/json

{ "currentTemp": 24.5, "heaterStatus": "ON", "ledStatus": "OFF", "feederStatus": "Idle", "event": "Demo telemetry" }
```

Dari dashboard: buka DevTools (`F12`) → **Network** → Fetch/XHR untuk melihat request yang sama saat menekan tombol. Untuk mencoba di layar kecil, gunakan mode perangkat (`Ctrl+Shift+M`).

## Konvensi

- **Format:** Prettier (`.prettierrc.json`: indentasi 4 spasi, lebar 120, `arrowParens: avoid`). Jalankan `npm run format` atau `pnpm format` setelah mengubah kode.
- **Komentar kode:** bahasa Indonesia, singkat, hanya untuk hal yang tidak terlihat dari kode (alasan, satuan, kontrak). Pembatas bagian: `// ---------- Nama Bagian ----------`.
- **Bahasa:** teks UI dan pesan error API dalam bahasa Inggris; dokumentasi dalam bahasa Indonesia; pesan commit dalam bahasa Inggris.
- **Dokumentasi:** setiap informasi ditulis di **satu** dokumen; dokumen lain menautkan. Rapikan Markdown dengan `npx prettier --write <file>.md` dari folder `frontend/`.
- **Commit:** Conventional Commits (`feat`, `fix`, `refactor`, `docs`, `chore`). Gunakan `BREAKING CHANGE:` bila kontrak dengan perangkat berubah.
