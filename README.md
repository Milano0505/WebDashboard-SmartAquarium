# Smart Aquarium Control

Dashboard web untuk memantau dan mengontrol akuarium dari jarak jauh: suhu air, heater, lampu, dan pemberi pakan. Sistem terdiri dari frontend React, REST API Express, dan database Firebase Cloud Firestore. Perangkat di akuarium (ESP32) mengirim data dan membaca pengaturan lewat API; firmware-nya tidak ada di repository ini.

| Dokumen                                      | Isi                                                   |
| -------------------------------------------- | ----------------------------------------------------- |
| [docs/background.md](docs/background.md)     | Masalah yang diselesaikan dan dampak sistem           |
| [docs/architecture.md](docs/architecture.md) | Bagian-bagian sistem dan hubungannya                  |
| [docs/api.md](docs/api.md)                   | Semua endpoint REST API                               |
| [docs/backend.md](docs/backend.md)           | Backend dan demo API                                  |
| [docs/database.md](docs/database.md)         | Skema Firestore dan cara membuka database             |
| [docs/frontend.md](docs/frontend.md)         | Halaman dashboard dan demo tampilan                   |
| [docs/integrations.md](docs/integrations.md) | Alur frontend → backend → database dan demo integrasi |

## Fitur

| Fitur         | Keterangan                                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Monitoring    | Suhu terkini, status heater/lampu/pemberi pakan yang diperbarui otomatis, status perangkat online/offline, dan grafik suhu. |
| Suhu          | Suhu target dan mode heater otomatis/manual.                                                                                |
| Lampu         | Jadwal lampu harian, mode otomatis/manual, dan rata-rata jam lampu menyala per hari.                                        |
| Pakan         | Hingga 12 jadwal pakan harian dan tombol **Feed Now** pada mode manual.                                                     |
| Riwayat       | Data dari perangkat dalam tampilan tabel dan kalender, dengan pencarian, filter, dan ekspor CSV.                            |
| Alerts        | Peringatan suhu di luar batas aman, catatan perubahan pengaturan, dan **browser notification**. Tidak ada email atau SMS.   |
| Akun          | Register dan login, foto profil, ganti nama dan password. Email tidak bisa diubah.                                          |
| Akses bersama | Semua akun memantau dan mengontrol satu akuarium yang sama (default `aquarium-001`).                                        |
| Tampilan      | Responsif: sidebar di desktop, menu bawah di smartphone.                                                                    |

## Teknologi

React 19 + Vite 8 + Tailwind CSS 4 (frontend), Node.js 22 + Express 5 (backend), dan Firebase Cloud Firestore (database). Penjelasan lengkap ada di [docs/architecture.md](docs/architecture.md#teknologi).

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

| Variabel                        | Fungsi                                                                                                                                        |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                          | Port HTTP API, default aplikasi `3000`; contoh environment memakai `5000`.                                                                    |
| `NODE_ENV`                      | Gunakan `production` untuk deployment production.                                                                                             |
| `JWT_SECRET`                    | Secret penandatanganan token. Wajib di production.                                                                                            |
| `HARDWARE_API_KEY`              | Secret pada header `x-device-key` untuk request perangkat.                                                                                    |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Kredensial service account sebagai JSON string, bila digunakan.                                                                               |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path service-account JSON. Bila tidak diatur, backend mencari `backend/serviceAccountKey.json`, lalu mencoba Application Default Credentials. |
| `FRONTEND_ORIGIN`               | Daftar origin frontend yang diizinkan saat `NODE_ENV=production`, dipisahkan koma.                                                            |
| `SHARED_AQUARIUM_ID`            | ID aquarium yang digunakan bersama; default `aquarium-001`. Samakan nilainya di seluruh instance backend.                                     |
| `VITE_API_URL`                  | URL backend yang digunakan frontend; default `http://localhost:5000`.                                                                         |
| `VITE_AQUARIUM_ID`              | Satu-satunya ID aquarium yang digunakan frontend; harus sama dengan `SHARED_AQUARIUM_ID`.                                                     |

Di development, backend dapat membuat `.dev-jwt-secret` lokal bila `JWT_SECRET` tidak ditetapkan. Gunakan secret eksplisit dan penyimpanan secret terkelola di production.

## Model Data

- `users/{userId}` menyimpan profil dan hash password.
- `aquariums/{AQUARIUM_ID}` menyimpan owner `userId`, konfigurasi, status realtime, dan metadata hardware. Semua akun yang lolos autentikasi diberi akses ke ID aquarium tunggal tersebut.
- `aquariums/{aquariumId}/telemetry_history/{autoId}` hanya menyimpan data sensor/perangkat.
- `aquariums/{AQUARIUM_ID}/notifications/{autoId}` menyimpan alert global dan private. Alert global memakai `userid: null` dan mencatat pelaku di `userId`; alert profil/password mencantumkan penerima di `userid` dan `scope: "user"`.

`aquariumId` pada telemetry dan notification mengidentifikasi konteks aquarium. `userId` pada telemetry tidak menunjukkan pembuat data sensor, sehingga nilainya `null`. Pada alert global, `userId` mengidentifikasi pelaku; pada alert privat, `userid` adalah penerima.

Telemetry dan semua notification berada pada subcollection aquarium. History hanya membaca telemetry hardware dari aquarium tunggal. Notification profil/password tetap privat melalui filter `userid`; read/dismiss alerts global tetap per-user.

### Akses Bersama

Saat registrasi, akun baru bergabung ke aquarium dengan ID `SHARED_AQUARIUM_ID`. Saat login, akun lama juga diarahkan ke aquarium tersebut. API dashboard hanya menerima ID tunggal yang dikonfigurasi. Untuk memakai aquarium ID lain di masa depan, ubah konfigurasi backend dan frontend bersama-sama.

## API Utama

Semua endpoint `/api/users` dan `/api/aquariums` memerlukan `Authorization: Bearer <token>`, kecuali register/login. Endpoint hardware memakai `x-device-key`.

| Method       | Endpoint                                                        | Ringkasan                                                                      |
| ------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `POST`       | `/api/auth/register`                                            | Buat akun dan bergabung ke aquarium shared.                                    |
| `POST`       | `/api/auth/login`                                               | Verifikasi kredensial dan migrasi akses shared untuk akun lama.                |
| `POST`       | `/api/auth/change-password`                                     | Ubah password dan buat pemberitahuan privat.                                   |
| `GET`, `PUT` | `/api/users/:userId`                                            | Baca atau ubah profil sendiri. Perubahan profil membuat pemberitahuan privat.  |
| `GET`        | `/api/aquariums/:aquariumId`                                    | Baca aquarium tunggal jika ID sesuai konfigurasi.                              |
| `PATCH`      | `/api/aquariums/:aquariumId/temperature-config`                 | Ubah konfigurasi suhu; perubahan aktual membuat alert bersama.                 |
| `PATCH`      | `/api/aquariums/:aquariumId/lighting-config`                    | Ubah mode, kontrol, atau jadwal lampu dan buat alert bersama.                  |
| `PATCH`      | `/api/aquariums/:aquariumId/feeder-config`                      | Ubah konfigurasi feeder dan buat alert bersama.                                |
| `PATCH`      | `/api/aquariums/:aquariumId/system-config`                      | Ubah unit, poll frequency, atau timezone dan buat alert bersama.               |
| `POST`       | `/api/aquariums/:aquariumId/feeder/trigger`                     | Trigger feeder manual; hanya saat mode `MANUAL`.                               |
| `GET`        | `/api/aquariums/:aquariumId/telemetry`                          | Ambil history aquarium dengan filter tanggal dan batas record.                 |
| `GET`        | `/api/aquariums/:aquariumId/telemetry/export`                   | Ekspor telemetry ke CSV.                                                       |
| `GET`        | `/api/aquariums/:aquariumId/notifications`                      | Ambil alerts aquarium dan alerts privat user.                                  |
| `PATCH`      | `/api/aquariums/:aquariumId/notifications/read-all`             | Tandai alerts yang tampil sebagai dibaca oleh user ini.                        |
| `PATCH`      | `/api/aquariums/:aquariumId/notifications/:notificationId/read` | Tandai satu alert sebagai dibaca oleh user ini.                                |
| `DELETE`     | `/api/aquariums/:aquariumId/notifications/:notificationId`      | Dismiss alert global untuk user ini atau hapus alert privatnya.                |
| `POST`       | `/api/hardware/:aquariumId/telemetry`                           | Terima telemetry perangkat dan buat temperature alert saat melewati threshold. |
| `GET`        | `/api/hardware/:aquariumId/config`                              | Ambil konfigurasi yang dibaca perangkat.                                       |
