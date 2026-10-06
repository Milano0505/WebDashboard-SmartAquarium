# Smart Aquarium Control

Dashboard web untuk memantau dan mengontrol akuarium berbasis ESP32. Sistem terdiri dari frontend React, REST API Express, dan Firebase Cloud Firestore. Firmware ESP32 tidak ada di repository ini.

Detail arsitektur, skema database, dan daftar API lengkap ada di [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md).

## Fitur

| Fitur         | Keterangan                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| Monitoring    | Suhu dan status heater, LED, feeder yang refresh otomatis, indikator perangkat online/offline, dan grafik suhu. |
| Suhu          | Suhu target dan mode heater otomatis/manual.                                                                    |
| Lampu         | Jadwal LED harian, mode otomatis/manual, dan rata-rata jam ON/OFF per hari yang dihitung server.                |
| Pakan         | Hingga 12 jadwal pakan harian dan tombol **Feed Now** pada mode manual.                                         |
| Riwayat       | Data telemetry dalam tampilan tabel dan kalender, pencarian, filter, dan ekspor CSV.                            |
| Alerts        | Alert suhu di luar batas, log perubahan konfigurasi, dan **browser notification**. Tidak ada email atau SMS.    |
| Akun          | Registrasi dan login (bcrypt + JWT), foto profil, ganti nama dan password. Email tidak dapat diubah.            |
| Akses bersama | Semua akun memantau dan mengontrol satu akuarium yang sama (default `aquarium-001`).                            |

## Teknologi

| Bagian         | Teknologi                                        |
| -------------- | ------------------------------------------------ |
| Frontend       | React 19, React Router 7, Vite 8, Tailwind CSS 4 |
| Backend        | Node.js 22, Express 5, Firebase Admin SDK        |
| Database       | Firebase Cloud Firestore                         |
| Authentication | JWT (pengguna), device key (ESP32), bcrypt       |
| Hardware       | ESP32 melalui HTTP REST API                      |

## Menjalankan Secara Lokal

Prasyarat: Node.js 22, pnpm, project Firebase dengan Firestore aktif, dan service-account key untuk backend.

1. Salin `backend/.env.example` menjadi `backend/.env` dan `frontend/.env.example` menjadi `frontend/.env`, lalu isi nilainya (lihat tabel di bawah). Simpan service-account key sebagai `backend/serviceAccountKey.json`.
2. Jalankan backend di terminal pertama:

    ```powershell
    cd backend
    npm install
    npm run dev
    ```

3. Jalankan frontend di terminal kedua:

    ```powershell
    cd frontend
    pnpm install
    pnpm dev
    ```

4. Buka URL Vite yang muncul di terminal (biasanya `http://localhost:5173`). Cek backend di `http://localhost:5000/api/health`.

## Konfigurasi Environment

| Variabel                        | Lokasi   | Fungsi                                                                                             |
| ------------------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `PORT`                          | backend  | Port API. Default kode `3000`; contoh `.env` memakai `5000`.                                       |
| `NODE_ENV`                      | backend  | Isi `production` saat deploy. CORS lalu hanya mengizinkan `FRONTEND_ORIGIN`.                       |
| `JWT_SECRET`                    | backend  | Secret token login. Wajib di production; di development dibuat otomatis di `.dev-jwt-secret`.      |
| `HARDWARE_API_KEY`              | backend  | Nilai header `x-device-key` yang wajib dikirim ESP32.                                              |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | backend  | Service-account sebagai string JSON (opsional).                                                    |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | backend  | Path file service-account. Default `serviceAccountKey.json`, lalu Application Default Credentials. |
| `FRONTEND_ORIGIN`               | backend  | Origin frontend yang diizinkan di production, dipisahkan koma.                                     |
| `SHARED_AQUARIUM_ID`            | backend  | ID akuarium bersama. Default `aquarium-001`.                                                       |
| `VITE_API_URL`                  | frontend | URL backend. Default `http://localhost:5000`.                                                      |
| `VITE_AQUARIUM_ID`              | frontend | Harus sama dengan `SHARED_AQUARIUM_ID`.                                                            |

Jangan commit file `.env`, `serviceAccountKey.json`, atau `.dev-jwt-secret` (sudah ada di `.gitignore`).

## Script

| Perintah                         | Fungsi                                                       |
| -------------------------------- | ------------------------------------------------------------ |
| `npm run dev` (backend)          | Menjalankan API dengan auto-reload (nodemon).                |
| `npm start` (backend)            | Menjalankan API tanpa auto-reload.                           |
| `pnpm dev` (frontend)            | Menjalankan dev server Vite.                                 |
| `pnpm build` (frontend)          | Build produksi ke `frontend/dist`.                           |
| `npm run format` / `pnpm format` | Merapikan kode dengan Prettier (`.prettierrc.json` di root). |

## Struktur Singkat

```text
backend/
  config/       Firebase, JWT secret, ID akuarium, data awal akuarium
  middleware/   Autentikasi JWT dan device key
  routes/       auth, users, aquariums, hardware
  utils/        Validasi config, notifikasi, serialisasi Firestore
frontend/src/
  api/          Client REST API
  components/   Layout, komponen UI, chart, ikon
  context/      Sesi login
  hooks/        Badge unread dan browser notification
  pages/        Login, Register, Dashboard, History, Alerts, Configuration
  utils/        Format suhu/waktu dan kompresi foto profil
```
