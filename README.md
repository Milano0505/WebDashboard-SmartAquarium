# Smart Aquarium Control

Dashboard web untuk memantau telemetry dan mengelola konfigurasi aquarium berbasis ESP32. Aplikasi terdiri dari frontend React, REST API Express, dan Firebase Cloud Firestore. Source firmware ESP32 belum disertakan di repository ini.

## Fitur

- Login dan registrasi dengan password bcrypt serta sesi JWT.
- Semua akun terautentikasi dapat mengakses satu aquarium bersama yang ID-nya dikonfigurasi, default `aquarium-001`.
- Anggota dapat mengubah konfigurasi suhu, lampu, feeder, dan sistem; aksi perubahan menghasilkan alert yang dapat dilihat anggota aquarium.
- Alerts menyebutkan nama user pelaku. Alert profil/password hanya terlihat oleh pemilik profil.
- Telemetry dan riwayat selalu menggunakan satu aquarium terkonfigurasi. History menampilkan data perangkat.
- Riwayat dapat difilter dan diekspor ke CSV; browser notification tersedia selama dashboard terbuka.

## Teknologi

| Bagian         | Teknologi                                                     |
| -------------- | ------------------------------------------------------------- |
| Frontend       | React 19, React Router, Vite, Tailwind CSS 4                  |
| Backend        | Node.js, Express 5, Firebase Admin SDK                        |
| Database       | Firebase Cloud Firestore                                      |
| Authentication | JWT, bcrypt                                                   |
| Hardware       | ESP32                                                         |

## Menjalankan Secara Lokal

Prasyarat: Node.js 22 LTS, pnpm, project Firebase dengan Firestore aktif, dan service-account credential untuk backend.

1. Buat `backend/.env` dari `backend/.env.example` dan `frontend/.env` dari `frontend/.env.example`.
2. Pastikan `SHARED_AQUARIUM_ID` pada backend sama dengan `VITE_AQUARIUM_ID` pada frontend. Isi `JWT_SECRET`, `HARDWARE_API_KEY`, dan kredensial Firebase.
3. Di terminal pertama, jalankan backend:

    ```powershell
    cd backend
    npm install
    npm run dev
    ```

4. Di terminal kedua, jalankan frontend:

    ```powershell
    cd frontend
    npm install
    npm run dev
    ```

5. Buka URL Vite yang dicetak di terminal, biasanya `http://localhost:5173`. Periksa backend melalui `http://localhost:5000/api/health`.

Frontend memakai `http://localhost:5000` sebagai API default. Ubah `VITE_API_URL` jika backend berjalan di alamat lain. Port backend dikendalikan oleh `PORT`; `backend/.env.example` mengatur port `5000`.

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

Daftar field dan parameter terperinci, termasuk struktur Firestore dan alur request, ada di [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md).