---
paths:
    - "backend/**/*.js"
---

# Aturan backend

Penjelasan backend (struktur folder, alur request, daftar notifikasi, keamanan) ada di `docs/backend.md`. File ini hanya berisi cara menulis kodenya. Jika struktur, alur, daftar notifikasi, atau keamanan berubah, perbarui `docs/backend.md`.

## Akses akuarium

- Gunakan `findAquarium(req.params.aquariumId)` dari `config/aquarium.js`. Fungsi ini mengembalikan `{ reference, data }` atau `null` (ID selain `AQUARIUM_ID`, atau dokumen belum ada); balas `404 { message: "Aquarium was not found." }` jika `null`.
- Gunakan `aquariumRef()` untuk referensi dokumen, jangan menulis `db.collection("aquariums").doc(...)` sendiri.

## Mengubah atau menambah field konfigurasi

1. Tambahkan aturan di `utils/config-validation.js` (`configRules`). Setiap aturan memvalidasi satu field dan mengembalikan nilai yang disimpan. Field yang tidak terdaftar otomatis ditolak 400.
2. Tambahkan nilai awal di `config/defaults.js`.
3. Pastikan frontend memanggilnya lewat fungsi `update*Config` di `frontend/src/api/service.js`.
4. Perbarui `docs/database.md` (field) dan `docs/api.md` (tabel aturan validasi endpoint config).

`patchConfig` di `routes/aquariums.js` hanya menyimpan field yang benar-benar berubah, mengisi `updatedAt`, lalu membuat notifikasi bersama "X settings updated" berisi nama pelaku.

## Error

- Lempar `badRequest("pesan")` dari `utils/errors.js` untuk input tidak valid. Express 5 menangkap error dari handler async; error handler di `index.js` mengirim `{ message }` dengan status error tersebut.
- Error tanpa `status` menjadi 500 dengan pesan umum (detailnya hanya di log server).
- Pesan error API ditulis dalam bahasa Inggris.

## Notifikasi

Selalu buat lewat helper di `utils/notifications.js`, jangan menyusun objek sendiri:

- `sharedNotification({ actorId, actorName, title, message, type })`: `scope: "aquarium"`, `userid: null`, terlihat semua user. Status baca/hapus per user di `readBy` / `dismissedBy`.
- `privateNotification(userId, title, message)`: `scope: "user"`, hanya untuk penerima (perubahan profil/password). Memakai `isRead` dan dihapus permanen saat Delete.
- Dua field mirip: **`userid` = penerima**, **`userId` = pelaku**.
- Tulis notifikasi dalam batch yang sama dengan perubahan datanya (`db.batch()`).

## Lain-lain

- Serialisasi dokumen Firestore ke JSON dengan `serializeFirestore()` (Timestamp → ISO string).
- Autentikasi: `requireAuth` (JWT, mengisi `req.auth.userId`) untuk dashboard, `requireDeviceKey` (header `x-device-key`) untuk `/api/hardware/*`.
- User hanya boleh membaca/mengubah profilnya sendiri; email tidak dapat diubah.
- `routes/auth.js` (`prepareSharedAquarium`, `joinSharedAquarium`, `migratePrivateNotifications`) membersihkan data versi lama saat register/login. Biarkan kecuali data lama sudah dipastikan tidak ada.
- Jika `JWT_SECRET` kosong saat development, `config/security.js` membuat `.dev-jwt-secret`; di production wajib diisi.
