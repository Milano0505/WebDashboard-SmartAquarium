---
paths:
    - "frontend/src/**"
---

# Aturan frontend

Halaman, interval pembaruan, dan status perangkat dijelaskan di `docs/web/development.md`. Jika perilaku tampilan berubah, perbarui dokumen itu.

## Data dan API

- Semua request lewat `src/api/service.js`; jangan memanggil `fetch` dari komponen. Fungsi di sana menambahkan JWT dan mengubah respons gagal menjadi `Error` dengan `message` dan `status`.
- Respons **401** menghapus token dan memicu event `sa:unauthorized`; `AuthContext` lalu mengeluarkan user.
- Setelah aksi yang membuat atau membaca notifikasi, kirim `window.dispatchEvent(new Event("sa:notifications-changed"))` agar badge unread diperbarui (sudah dilakukan lewat `onSystemChange` di Dashboard dan Notifications).

## Dashboard

- Status perangkat dibaca dari `aquarium.realtimeState`. Tombol hanya menyimpan perintah; jangan mengubah status secara lokal setelah aksi.
- Auto-refresh tiap `pollFrequency` detik (minimal 5), dijeda saat tab tidak aktif, dan dimuat ulang setelah setiap aksi (`runAction`).
- Input yang sedang diedit memakai **draft lokal** agar tidak tertimpa auto-refresh.
- `isDeviceOnline` dan `isFeedPending` harus sama dengan backend: lihat `device-contract.md`.

## Komponen dan helper

- Pakai komponen di `components/ui.jsx` (`Card`, `InputField`, `RangeSlider`, `ModeSelector`, `Toggle`, `StatusBadge`, `PrimaryBtn`, `ErrorAlert`, `SuccessAlert`, `PageHeader`, dll.) dan helper di `utils/format.js` (`formatTemp`, `tempUnitSymbol`, `relativeTime`, …). Nilai suhu dari API selalu Celsius.
- Ikon ditambahkan di `components/Icons.jsx`.
- Halaman besar dipecah menjadi komponen per tab di file yang sama.
- Styling dengan class Tailwind; import memakai path relatif; teks UI dalam bahasa Inggris.
- Tab **About** di `pages/Configuration.jsx` harus sejalan dengan fitur di `README.md`.

## Penyimpanan lokal

- `localStorage`: `sa_token`, `sa_user`, `sa_browser_notifications:<userId>`. Bungkus akses dengan `try/catch`.
- Foto profil dikompres di browser (`utils/profilePhoto.js`) menjadi JPEG maks. 180 KB.
