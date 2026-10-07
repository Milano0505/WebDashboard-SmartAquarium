# CLAUDE.md

Konteks utama untuk Claude Code (dan anggota tim) di repository ini. Aturan yang lebih spesifik ada di [`.claude/rules/`](rules/) dan dimuat otomatis:

| File                      | Dimuat saat                                       | Isi                                                         |
| ------------------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| `rules/conventions.md`    | Selalu                                            | Format kode, komentar, bahasa, dokumentasi, commit          |
| `rules/backend.md`        | Mengerjakan `backend/**`                          | Cara menulis route, validasi, error, notifikasi             |
| `rules/frontend.md`       | Mengerjakan `frontend/src/**`                     | Cara memanggil API, event, pembaruan otomatis, komponen     |
| `rules/esp32-contract.md` | Mengerjakan endpoint perangkat atau status device | Aturan yang tidak boleh dilanggar agar firmware tetap jalan |
| `rules/api.md`            | Mengerjakan route, middleware, atau client API    | Kapan membaca dan memperbarui `docs/api.md`                 |
| `rules/database.md`       | Mengerjakan config, route, atau utils backend     | Kapan membaca dan memperbarui `docs/database.md`            |

- [docs/background.md](../docs/background.md): masalah, solusi, nilai sistem, etika dan dampak.
- [docs/architecture.md](../docs/architecture.md): blok sistem, modul, prinsip desain, teknologi.
- [docs/api.md](../docs/api.md): resource, konvensi, semua endpoint, aturan validasi, kode status.
- [docs/backend.md](../docs/backend.md): struktur backend, alur request, notifikasi, keamanan, demo API.
- [docs/database.md](../docs/database.md): skema Firestore, siapa menulis apa, cara membuka database.
- [docs/frontend.md](../docs/frontend.md): halaman, pembaruan otomatis, status perangkat, demo tampilan.
- [docs/integrations.md](../docs/integrations.md): alur per fitur, kontrak dengan perangkat, demo integrasi.
- [docs/esp32-connection.md](../docs/esp32-connection.md): cara menghubungkan ESP32 dan contoh kode penghubung (Wi-Fi, baca config, kirim telemetry).
- [README.md](../README.md): fitur, cara menjalankan, variabel environment.

## Tentang proyek

**Smart Aquarium Control** adalah tugas kelompok mata kuliah Embedded & Pervasive (UMN): dashboard web untuk memantau dan mengontrol akuarium dari jarak jauh (suhu air, heater, lampu, pemberi pakan).

```text
Browser (React)  ──JWT──▶  REST API (Express)  ◀──x-device-key──  ESP32
                                   │
                                   ▼
                       Firebase Cloud Firestore
```

- `frontend/`: React 19 + Vite 8 + Tailwind CSS 4 + React Router 7. JavaScript (JSX), tanpa TypeScript.
- `backend/`: Node.js 22 + Express 5 (ES modules) + Firebase Admin SDK.
- Repository ini hanya berisi **sistem web**. Firmware ESP32 dan perangkat keras tidak ada di sini; ESP32 hanya dilihat sebagai klien API. Satu-satunya kode firmware adalah contoh kode penghubung di `docs/esp32-connection.md`.
- Frontend dan ESP32 **tidak pernah** mengakses Firestore langsung; semuanya lewat REST API.

## Perintah

| Lokasi      | Perintah         | Fungsi                                                                                  |
| ----------- | ---------------- | --------------------------------------------------------------------------------------- |
| `backend/`  | `npm install`    | Pasang dependency (pakai **npm**)                                                       |
| `backend/`  | `npm run dev`    | API dengan auto-reload (nodemon); port dari `PORT` (contoh `.env`: 5000, default: 3000) |
| `backend/`  | `npm run format` | Prettier untuk semua `*.js`                                                             |
| `frontend/` | `pnpm install`   | Pasang dependency (pakai **pnpm**)                                                      |
| `frontend/` | `pnpm dev`       | Server development Vite (port 5173)                                                     |
| `frontend/` | `pnpm build`     | Build produksi ke `frontend/dist`                                                       |
| `frontend/` | `pnpm format`    | Prettier untuk `src/`                                                                   |

- **Tidak ada test otomatis.** Periksa dengan `pnpm build` (frontend), `node --check <file>` dan import modul route (backend), lalu coba endpoint yang terkait.
- Cek server: `GET http://localhost:5000/api/health`.

## Struktur kode

```text
backend/
  index.js               Server Express, CORS, routing, penanganan error
  config/                aquarium.js (AQUARIUM_ID, findAquarium), defaults.js, firebase.js, security.js
  middleware/auth.js     requireAuth (JWT) dan requireDeviceKey (ESP32)
  routes/                auth.js, users.js, aquariums.js, hardware.js
  utils/                 config-validation.js, errors.js, firestore.js, notifications.js, profile-photo.js
frontend/src/
  App.jsx                Routing, ProtectedRoute, toast sukses
  api/service.js         Semua request HTTP
  context/AuthContext.jsx Sesi login
  hooks/                 useUnreadCount, useBrowserNotifications
  components/            Layout, ui.jsx (komponen dasar), AreaChart, Icons
  pages/                 Login, Register, Dashboard, DataHistory, Notifications, Configuration
  utils/                 format.js (suhu, waktu, inisial), profilePhoto.js (kompresi foto)
docs/                    Dokumentasi detail (lihat daftar di atas)
```

## Aturan inti sistem (jangan dilanggar)

1. **Satu akuarium bersama.** Semua akun memakai `aquariums/{SHARED_AQUARIUM_ID}` (default `aquarium-001`). ID lain dibalas 404. `VITE_AQUARIUM_ID` di frontend harus sama.
2. **Suhu selalu disimpan dalam Celsius.** Fahrenheit hanya untuk tampilan; pilihan satuan disimpan di `tempConfig.unit`.
3. **`realtimeState` hanya diisi oleh data dari ESP32.** Tombol di dashboard hanya menyimpan _perintah_ di pengaturan.
4. **Nilai turunan dihitung server**: `schedule.durationHours`, `avgHoursOn/avgHoursOff`, `feederConfig.lastTriggeredAt`.
5. **Tidak ada notifikasi email/SMS.** Peringatan hanya lewat halaman Alerts dan browser notification.
6. **Email pengguna tidak bisa diubah.**

## Hal yang perlu diwaspadai

- **Firestore yang terhubung adalah database proyek sungguhan.** Membaca untuk mencari masalah boleh, tetapi **minta konfirmasi sebelum menulis atau menghapus data**.
- **Jangan commit atau menampilkan isi rahasia**: `backend/.env`, `frontend/.env`, `backend/serviceAccountKey.json`, `backend/.dev-jwt-secret` (sudah ada di `.gitignore`).
- `frontend/.mise.toml` mengunci Node 22 dan pnpm 10; `pnpm-lock.yaml` memakai format v9.
