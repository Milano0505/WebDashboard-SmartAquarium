# Smart Aquarium Control

Dashboard web untuk memantau dan mengontrol akuarium dari jarak jauh: suhu air, heater, lampu, dan pemberi pakan. Sistem terdiri dari frontend React, REST API Express, database Firebase Cloud Firestore, dan firmware ESP32.

```text
Browser (React)  ──JWT──▶  REST API (Express)  ◀──x-device-key──  ESP32
                                   │
                                   ▼
                       Firebase Cloud Firestore
```

Frontend dan ESP32 tidak pernah mengakses database langsung. Semua data lewat REST API.

## Isi Repository

| Folder      | Isi                                                         | Panduan                                            |
| ----------- | ----------------------------------------------------------- | -------------------------------------------------- |
| `frontend/` | Dashboard React 19 + Vite 8 + Tailwind CSS 4                | [docs/web/development.md](docs/web/development.md) |
| `backend/`  | REST API Node.js 22 + Express 5 + Firebase Admin SDK        | [docs/web/api.md](docs/web/api.md)                 |
| `device/`   | Firmware ESP32 (PlatformIO): heater, lampu, sensor suhu     | [device/README.md](device/README.md)               |
| `docs/`     | Dokumentasi: `web/` (dashboard) dan `hardware/` (perangkat) | Lihat [Dokumentasi](#dokumentasi)                  |

## Fitur

| Fitur         | Keterangan                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Monitoring    | Suhu terkini, status heater/lampu/pemberi pakan, status perangkat online/offline, dan grafik suhu.                                   |
| Suhu          | Suhu target, batas aman, dan mode heater otomatis/manual.                                                                            |
| Lampu         | Jadwal harian, mode otomatis/manual, dan rata-rata jam menyala per hari.                                                             |
| Pakan         | Hingga 12 jadwal pakan harian dan tombol **Feed Now** (mode manual).                                                                 |
| Riwayat       | Data dari perangkat dalam tabel dan kalender, dengan pencarian, filter, dan ekspor CSV.                                              |
| Alerts        | Suhu di luar batas aman, sensor rusak, perangkat offline, dan catatan perubahan. Ada browser notification; tidak ada email atau SMS. |
| Akun          | Register, login, foto profil, ganti nama dan password. Email tidak bisa diubah.                                                      |
| Akses bersama | Semua akun mengontrol satu akuarium yang sama (default `aquarium-001`).                                                              |
| Tampilan      | Responsif: sidebar di desktop, menu bawah di smartphone.                                                                             |

**Batasan saat ini:** belum ada peran pengguna; semua akun punya akses yang sama.

## Menjalankan

Prasyarat: Node.js 22, pnpm, project Firebase dengan Firestore aktif, dan service-account key.

1. Salin `backend/.env.example` ke `backend/.env` dan `frontend/.env.example` ke `frontend/.env`, lalu isi nilainya ([variabel](#variabel-environment)). Simpan service-account key sebagai `backend/serviceAccountKey.json`.
2. Jalankan backend:

    ```powershell
    cd backend
    npm install
    npm run dev
    ```

3. Jalankan frontend di terminal lain:

    ```powershell
    cd frontend
    pnpm install
    pnpm dev
    ```

4. Buka `http://localhost:5173`, lalu register satu akun. Cek backend di `http://localhost:5000/api/health`.
5. (Opsional) Pasang firmware ke ESP32: [device/README.md](device/README.md). Tanpa ESP32, data perangkat bisa disimulasikan lewat API ([docs/web/development.md](docs/web/development.md#mencoba-sistem)).

## Variabel Environment

**Backend** (`backend/.env`)

| Variabel                        | Fungsi                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `PORT`                          | Port API. Default kode `3000`; contoh `.env` memakai `5000`.                                               |
| `NODE_ENV`                      | Isi `production` untuk deployment.                                                                         |
| `JWT_SECRET`                    | Secret token login. Wajib di production; di development dibuat otomatis (`.dev-jwt-secret`) bila kosong.   |
| `HARDWARE_API_KEY`              | Kunci perangkat (header `x-device-key`). Harus sama dengan `DEVICE_KEY` di firmware.                       |
| `SHARED_AQUARIUM_ID`            | ID akuarium bersama. Default `aquarium-001`.                                                               |
| `FRONTEND_ORIGIN`               | Origin frontend yang diizinkan (CORS) saat production, dipisahkan koma.                                    |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path service-account JSON. Default `backend/serviceAccountKey.json`, lalu Application Default Credentials. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Alternatif: isi service-account sebagai string JSON (dipakai lebih dulu bila ada).                         |

**Frontend** (`frontend/.env`)

| Variabel           | Fungsi                                                                       |
| ------------------ | ---------------------------------------------------------------------------- |
| `VITE_API_URL`     | Alamat backend. Default `http://localhost:5000`.                             |
| `VITE_AQUARIUM_ID` | ID akuarium. Harus sama dengan `SHARED_AQUARIUM_ID`. Default `aquarium-001`. |

Jangan commit `.env`, `serviceAccountKey.json`, atau `.dev-jwt-secret` (sudah ada di `.gitignore`).

## Dokumentasi

| Dokumen                                                    | Isi                                                                    |
| ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| [docs/web/background.md](docs/web/background.md)           | Masalah yang diselesaikan, nilai sistem, etika dan dampak              |
| [docs/web/architecture.md](docs/web/architecture.md)       | Blok sistem, aturan desain, alur data, kontrak dengan perangkat        |
| [docs/web/api.md](docs/web/api.md)                         | Semua endpoint REST API                                                |
| [docs/web/database.md](docs/web/database.md)               | Skema Firestore dan cara membuka database                              |
| [docs/web/development.md](docs/web/development.md)         | Struktur kode, notifikasi, keamanan, perintah, cara mencoba sistem     |
| [docs/hardware/design.md](docs/hardware/design.md)         | Rancangan embedded: pembagian hardware/software, ambang, status        |
| [docs/hardware/components.md](docs/hardware/components.md) | Daftar komponen, spesifikasi, alasan pemilihan, anggaran daya          |
| [docs/hardware/schematic.md](docs/hardware/schematic.md)   | Skema rangkaian, sambungan pin, jalur daya, keselamatan                |
| [docs/hardware/software.md](docs/hardware/software.md)     | Modul firmware, library, diagram, driver per modul                     |
| [docs/hardware/testing.md](docs/hardware/testing.md)       | Pengujian dan debugging tiap modul perangkat                           |
| [device/README.md](device/README.md)                       | Firmware ESP32: pemasangan, koneksi ke backend, perilaku, masalah umum |
