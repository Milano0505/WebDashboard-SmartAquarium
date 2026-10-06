# Arsitektur Sistem

Dokumen ini menjelaskan bagian-bagian sistem web Smart Aquarium Control dan bagaimana bagian-bagian itu saling terhubung. Alasan sistem ini dibuat ada di [background.md](background.md).

## Gambaran singkat

Sistem web terdiri dari tiga bagian utama dan satu klien dari luar:

1. **Frontend**: aplikasi web yang dibuka pengguna di browser.
2. **Backend**: REST API yang memproses semua permintaan.
3. **Database**: Firebase Cloud Firestore, tempat semua data disimpan.
4. **Perangkat akuarium (ESP32)**: klien dari luar yang membaca pengaturan dan mengirim data ke backend. Firmware-nya tidak ada di repository ini.

Aturan terpenting: **frontend dan perangkat tidak pernah mengakses database secara langsung.** Semua data selalu lewat backend, sehingga validasi dan hak akses hanya perlu diatur di satu tempat.

## Diagram blok sistem

Diagram blok sistem web berisi lima blok. Pengguna di kiri, perangkat di kanan, backend di tengah, dan database di bawah backend.

### Blok

| Blok               | Isi                                                                   | Tugas                                                                               |
| ------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Pengguna           | Pemilik akuarium dengan browser di laptop atau smartphone             | Memantau kondisi dan mengubah pengaturan akuarium                                   |
| Frontend           | Aplikasi React (single-page app) yang dibangun dengan Vite            | Menampilkan halaman, mengirim permintaan ke backend, menampilkan hasilnya           |
| Backend            | Server Node.js + Express yang menyediakan REST API                    | Memeriksa login dan input, menjalankan aturan sistem, membaca/menulis database      |
| Database           | Firebase Cloud Firestore (di Google Cloud)                            | Menyimpan akun, pengaturan, status perangkat, riwayat data, dan notifikasi          |
| Perangkat akuarium | ESP32 yang mengontrol heater, lampu, dan pemberi pakan (di luar repo) | Mengambil pengaturan terbaru, menjalankannya, lalu melaporkan suhu dan status nyata |

### Hubungan antar-blok

Setiap panah di diagram adalah koneksi HTTP berformat JSON, kecuali koneksi ke database.

| Dari → Ke           | Cara terhubung                    | Bukti identitas                          | Data yang dikirim                                              |
| ------------------- | --------------------------------- | ---------------------------------------- | -------------------------------------------------------------- |
| Pengguna → Frontend | Browser membuka URL dashboard     | –                                        | Klik dan isian form                                            |
| Frontend → Backend  | HTTP + JSON (`/api/...`)          | Token JWT di header `Authorization`      | Login, perubahan pengaturan, Feed Now, permintaan data         |
| Backend → Frontend  | Respons HTTP + JSON               | –                                        | Data akuarium, riwayat, notifikasi, pesan error                |
| Perangkat → Backend | HTTP + JSON (`/api/hardware/...`) | Kunci perangkat di header `x-device-key` | Suhu dan status nyata heater, lampu, pemberi pakan             |
| Backend → Perangkat | Respons HTTP + JSON               | –                                        | Pengaturan terbaru (mode, suhu target, jadwal, perintah pakan) |
| Backend ↔ Database  | Firebase Admin SDK                | Service account Google                   | Baca dan tulis dokumen Firestore                               |

Semua koneksi dimulai dari klien (frontend atau perangkat). Backend tidak pernah "mendorong" data. Karena itu:

- **Frontend** memuat ulang data secara berkala (polling), misalnya dashboard setiap `pollFrequency` detik (minimal 5 detik).
- **Perangkat** menanyakan pengaturan terbaru setiap `pollFrequency` detik, lalu mengirim data hasil pembacaannya.

Polling dipilih karena sederhana dan cukup untuk data akuarium yang berubah lambat, tanpa perlu WebSocket atau MQTT.

## Diagram arsitektur perangkat lunak

Diagram ini menunjukkan modul yang dilihat pengguna, disusun bertingkat dari atas ke bawah.

- **Tingkat 1: Authentication.** Semua modul lain hanya bisa dibuka setelah login.
- **Tingkat 2:** tiga modul di bawah Authentication: **Notifikasi**, **Dashboard**, dan **Riwayat Data**.
- **Tingkat 3:** empat modul di bawah Dashboard: **Lighting Control**, **Monitoring**, **Temperature Control**, dan **Automatic Feeder**.
- **Tingkat 4:** Lighting Control, Temperature Control, dan Automatic Feeder masing-masing punya dua cabang, yaitu **Manual** dan **Automatic**. Monitoring punya satu cabang: memantau suhu air dan status sistem secara langsung.

Hubungan modul dengan halaman di aplikasi:

| Modul               | Mode manual          | Mode otomatis                     | Halaman / route                                   |
| ------------------- | -------------------- | --------------------------------- | ------------------------------------------------- |
| Authentication      | –                    | –                                 | `/login`, `/register`                             |
| Monitoring          | –                    | –                                 | `/dashboard` (tab Overview)                       |
| Temperature Control | Tombol heater On/Off | Heater mengikuti suhu target      | `/dashboard/temperature`                          |
| Lighting Control    | Tombol lampu On/Off  | Lampu mengikuti jadwal nyala-mati | `/dashboard/lighting`                             |
| Automatic Feeder    | Tombol **Feed Now**  | Pakan mengikuti jadwal harian     | `/dashboard/feeder`                               |
| Riwayat Data        | –                    | –                                 | `/history` (tab Table dan Calendar)               |
| Notifikasi          | –                    | –                                 | `/notifications` (menu **Alerts**)                |
| Konfigurasi\*       | –                    | –                                 | `/configuration` (Profile, System, Alerts, About) |

\* Konfigurasi tidak ada di diagram awal, tetapi ditambahkan untuk profil pengguna, satuan suhu, zona waktu, interval pembaruan, batas suhu aman, dan browser notification.

## Prinsip desain

| Prinsip                             | Artinya                                                                                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Satu akuarium bersama               | Semua akun memakai satu dokumen akuarium (`aquarium-001`). ID lain ditolak.                                                              |
| Perintah terpisah dari status nyata | Tombol di dashboard hanya menyimpan **perintah** di pengaturan. **Status nyata** (`realtimeState`) hanya diisi oleh data dari perangkat. |
| Nilai turunan dihitung server       | Durasi jadwal lampu, rata-rata jam lampu, dan waktu perintah pakan dihitung backend, bukan dikirim klien.                                |
| Suhu selalu Celsius                 | Database selalu menyimpan Celsius. Fahrenheit hanya untuk tampilan.                                                                      |
| Validasi di backend                 | Frontend boleh memeriksa input, tetapi backend selalu memeriksa ulang sebelum menyimpan.                                                 |
| Notifikasi hanya di web             | Tidak ada email atau SMS. Peringatan muncul di halaman Alerts dan browser notification.                                                  |

## Teknologi

| Bagian      | Teknologi                                                              | Detail                       |
| ----------- | ---------------------------------------------------------------------- | ---------------------------- |
| Frontend    | React 19, React Router 7, Vite 8, Tailwind CSS 4 (JavaScript/JSX)      | [frontend.md](frontend.md)   |
| Backend     | Node.js 22, Express 5, Firebase Admin SDK                              | [backend.md](backend.md)     |
| Database    | Firebase Cloud Firestore (NoSQL berbasis dokumen)                      | [database.md](database.md)   |
| Autentikasi | JWT untuk pengguna, kunci perangkat untuk ESP32, bcrypt untuk password | [api.md](api.md#autentikasi) |
| Komunikasi  | REST API dengan JSON lewat HTTP                                        | [api.md](api.md)             |
| Alat bantu  | npm (backend), pnpm (frontend), Prettier, nodemon                      | [README.md](../README.md)    |

## Lingkungan menjalankan

| Lingkungan  | Frontend                             | Backend                                  | Catatan                                                                     |
| ----------- | ------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------- |
| Development | `pnpm dev` → `http://localhost:5173` | `npm run dev` → `http://localhost:5000`  | Semua origin diizinkan (CORS). JWT secret dibuat otomatis jika kosong.      |
| Production  | Hasil `pnpm build` (`frontend/dist`) | `npm start` dengan `NODE_ENV=production` | Hanya origin di `FRONTEND_ORIGIN` yang diizinkan; `JWT_SECRET` wajib diisi. |

Kedua lingkungan memakai project Firestore yang sama jika service account-nya sama. Cara menghubungkan semua bagian dijelaskan di [integrations.md](integrations.md).
