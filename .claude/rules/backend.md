---
paths:
    - "backend/**/*.js"
    - "docs/api.md"
    - "docs/database.md"
---

# Aturan backend

Struktur, alur request, notifikasi, dan keamanan dijelaskan di `docs/development.md`. Endpoint ada di `docs/api.md`, skema di `docs/database.md`. **Baca dokumen terkait sebelum mengubah route atau skema**, dan perbarui pada commit yang sama.

## Akses akuarium

- Gunakan `findAquarium(req.params.aquariumId)` dari `config/aquarium.js`. Hasilnya `{ reference, data }` atau `null`; balas `404 { message: "Aquarium was not found." }` jika `null`.
- Gunakan `aquariumRef()` untuk referensi dokumen; jangan menulis `db.collection("aquariums").doc(...)` sendiri.

## Route dan API

- Endpoint dashboard memakai `requireAuth`; endpoint `/api/hardware/*` memakai `requireDeviceKey`.
- Semua error dikirim sebagai `{ message }` berbahasa Inggris. Input tidak valid → `throw badRequest("pesan")` (`utils/errors.js`). Error tanpa `status` menjadi 500 dengan pesan umum.
- Endpoint config hanya menerima field di `configRules`; field turunan (`durationHours`, `avgHoursOn/Off`, `lastTriggeredAt`) tidak boleh diterima dari klien.
- URL memakai kata benda dengan tanda hubung (`temperature-config`); kode status mengikuti `docs/api.md`.

## Menambah field pengaturan

1. Aturan di `utils/config-validation.js` (`configRules`).
2. Nilai awal di `config/defaults.js`.
3. Fungsi `update*Config` di `frontend/src/api/service.js`.
4. Perbarui `docs/database.md` dan `docs/api.md`.

`patchConfig` di `routes/aquariums.js` hanya menyimpan field yang berubah, mengisi `updatedAt`, lalu membuat notifikasi bersama berisi nama pelaku.

## Database

- `realtimeState` **hanya** ditulis oleh endpoint telemetry.
- Suhu selalu Celsius; waktu memakai `FieldValue.serverTimestamp()` dan dikirim ke klien lewat `serializeFirestore()`.
- Query dengan filter atau urutan di lebih dari satu field butuh indeks gabungan; catat query baru di `docs/database.md`.
- Database yang terhubung adalah database sungguhan: **minta konfirmasi sebelum menulis atau memigrasi data**.

## Notifikasi

Buat lewat helper di `utils/notifications.js`, jangan menyusun objek sendiri, dan tulis dalam batch yang sama dengan perubahan datanya (`db.batch()`):

- `sharedNotification({ actorId, actorName, title, message, type })`: terlihat semua akun; status baca/hapus per akun di `readBy` / `dismissedBy`.
- `privateNotification(userId, title, message)`: hanya untuk penerima (profil/password); memakai `isRead`.
- **`userid` = penerima**, **`userId` = pelaku**.

## Lain-lain

- User hanya boleh mengakses profilnya sendiri; email tidak dapat diubah.
- `routes/auth.js` (`prepareSharedAquarium`, `joinSharedAquarium`, `migratePrivateNotifications`) membersihkan data versi lama. Biarkan kecuali data lama sudah dipastikan tidak ada.
