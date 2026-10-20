# CLAUDE.md

Konteks utama untuk Claude Code di repository ini. Aturan yang lebih spesifik ada di [`.claude/rules/`](rules/) dan dimuat otomatis sesuai file yang dikerjakan.

## Tentang proyek

**Smart Aquarium Control** adalah tugas kelompok mata kuliah Embedded & Pervasive (UMN): dashboard web untuk memantau dan mengontrol akuarium dari jarak jauh (suhu air, heater, lampu, pemberi pakan).

```text
Browser (React)  ──JWT──▶  REST API (Express)  ◀──x-device-key──  ESP32
                                   │
                                   ▼
                       Firebase Cloud Firestore
```

| Folder      | Isi                                                                                   |
| ----------- | ------------------------------------------------------------------------------------- |
| `frontend/` | React 19 + Vite 8 + Tailwind CSS 4 + React Router 7 (JSX, tanpa TypeScript)           |
| `backend/`  | Node.js 22 + Express 5 (ES modules) + Firebase Admin SDK                              |
| `device/`   | Firmware ESP32 (PlatformIO, C++): heater, lampu, sensor suhu. Pemberi pakan belum ada |
| `docs/`     | Dokumentasi sistem                                                                    |

## Dokumentasi

| Dokumen                                         | Isi                                                         |
| ----------------------------------------------- | ----------------------------------------------------------- |
| [README.md](../README.md)                       | Fitur, cara menjalankan, variabel environment               |
| [docs/background.md](../docs/background.md)     | Masalah, solusi, nilai sistem, etika dan dampak             |
| [docs/architecture.md](../docs/architecture.md) | Blok sistem, aturan desain, alur data, kontrak perangkat    |
| [docs/api.md](../docs/api.md)                   | Semua endpoint, validasi, kode status                       |
| [docs/database.md](../docs/database.md)         | Skema Firestore, siapa menulis apa, query                   |
| [docs/development.md](../docs/development.md)   | Struktur kode, notifikasi, keamanan, perintah, cara mencoba |
| [device/README.md](../device/README.md)         | Firmware: pemasangan, koneksi, perilaku, masalah umum       |

## Perintah

| Lokasi      | Perintah                         | Fungsi                                         |
| ----------- | -------------------------------- | ---------------------------------------------- |
| `backend/`  | `npm install`, `npm run dev`     | Pasang dependency (**npm**), API + auto-reload |
| `frontend/` | `pnpm install`, `pnpm dev`       | Pasang dependency (**pnpm**), Vite (port 5173) |
| `frontend/` | `pnpm build`                     | Build produksi                                 |
| keduanya    | `npm run format` / `pnpm format` | Prettier                                       |

**Tidak ada test otomatis.** Periksa dengan `pnpm build` (frontend), `node --check <file>` (backend), lalu coba endpoint terkait. Cek server: `GET http://localhost:5000/api/health`.

## Aturan inti sistem (jangan dilanggar)

1. **Satu akuarium bersama.** Semua akun memakai `aquariums/{SHARED_AQUARIUM_ID}` (default `aquarium-001`); ID lain dibalas 404. `VITE_AQUARIUM_ID` dan `AQUARIUM_ID` firmware harus sama.
2. **Semua lewat backend.** Frontend dan ESP32 tidak pernah mengakses Firestore langsung.
3. **`realtimeState` hanya ditulis oleh telemetry perangkat.** Tombol di dashboard hanya menyimpan _perintah_ di pengaturan.
4. **Suhu disimpan dalam Celsius.** Fahrenheit hanya tampilan (`tempConfig.unit`).
5. **Nilai turunan dihitung server:** `schedule.durationHours`, `avgHoursOn/Off`, `feederConfig.lastTriggeredAt`.
6. **Tanpa email/SMS.** Peringatan hanya lewat halaman Alerts dan browser notification.
7. **Email pengguna tidak bisa diubah.**

## Hal yang perlu diwaspadai

- **Firestore yang terhubung adalah database sungguhan.** Membaca untuk mencari masalah boleh, tetapi **minta konfirmasi sebelum menulis atau menghapus data**.
- **Jangan commit atau menampilkan isi rahasia:** `backend/.env`, `frontend/.env`, `backend/serviceAccountKey.json`, `backend/.dev-jwt-secret`, `device/include/secrets.h`.
- Mengubah endpoint `/api/hardware/*` atau field yang dibaca ESP32 dapat merusak firmware: lihat [rules/device-contract.md](rules/device-contract.md).
