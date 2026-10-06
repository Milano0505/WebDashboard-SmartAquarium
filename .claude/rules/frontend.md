---
paths:
    - "frontend/src/**"
---

# Aturan frontend

Penjelasan frontend (halaman, interval pembaruan, status perangkat, notifikasi browser) ada di `docs/frontend.md`. File ini hanya berisi cara menulis kodenya. Jika halaman, interval, atau perilaku tampilan berubah, perbarui `docs/frontend.md`.

## Data dan API

- Semua request lewat `src/api/service.js`; jangan memanggil `fetch` langsung dari komponen. Fungsi di sana sudah menambahkan JWT dan mengubah respons gagal menjadi `Error` dengan `message` dan `status` dari API.
- Respons **401** otomatis menghapus token dan memicu event `sa:unauthorized`; `AuthContext` lalu mengeluarkan user.
- Setelah aksi yang membuat atau membaca notifikasi, kirim `window.dispatchEvent(new Event("sa:notifications-changed"))` agar badge unread (`useUnreadCount`) diperbarui. Di Dashboard dan Notifications ini sudah dilakukan lewat `onSystemChange`.

## Dashboard

- Status perangkat dibaca dari `aquarium.realtimeState` (hanya diisi telemetry ESP32). Tombol hanya menyimpan perintah di config; jangan mengubah status secara lokal setelah aksi.
- Auto-refresh setiap `pollFrequency` detik (min. 5 detik), dijeda saat tab browser tidak aktif, dan dimuat ulang setelah setiap aksi (`runAction`).
- Input yang sedang diedit memakai **draft lokal** (contoh: slider target suhu, form jadwal lampu) agar tidak tertimpa auto-refresh.
- Aturan online/offline (`isDeviceOnline`) dan pending Feed Now (`isFeedPending`) harus sama dengan backend; lihat `esp32-contract.md`.

## Komponen dan helper

- Pakai komponen di `components/ui.jsx`: `Card`, `InputField`, `RangeSlider`, `ModeSelector`, `Toggle`, `StatusBadge`, `InfoField`, `PrimaryBtn`, `ErrorAlert`, `SuccessAlert`, `PageHeader`, `Spinner`, `LiveClock`.
- Pakai helper di `utils/format.js`: `formatTemp`, `formatTempValue`, `tempUnitSymbol`, `initialsOf`, `relativeTime`. Nilai suhu dari API selalu Celsius.
- Ikon ditambahkan di `components/Icons.jsx` memakai wrapper `Icon` (`small` = 16 px).
- Halaman besar dipecah menjadi komponen per tab di file yang sama (contoh `TemperatureTab`, `ProfileTab`).
- Styling dengan class Tailwind; warna utama `blue-500`, latar navigasi `#0d1b4b`.
- Import memakai path relatif (alias `@` tersedia di Vite tapi tidak dipakai).
- Teks UI dalam bahasa Inggris.

## Penyimpanan lokal

- `localStorage`: `sa_token` (JWT), `sa_user` (profil cache), `sa_browser_notifications:<userId>` (preferensi notifikasi). Selalu bungkus akses localStorage dengan `try/catch`.
- Foto profil dikompres di browser (`utils/profilePhoto.js`) menjadi data URL JPEG maks. 180 KB sebelum dikirim.
