---
paths:
    - "backend/config/**"
    - "backend/routes/**"
    - "backend/utils/**"
    - "docs/database.md"
---

# Database (Firestore)

- Skema lengkap setiap koleksi dan field, field yang dihitung server, dan tabel "siapa menulis apa": **baca `docs/database.md`** sebelum menambah, mengubah, atau menghapus field.
- Setiap perubahan skema **wajib** dicatat di `docs/database.md` (dan `docs/api.md` jika endpoint terpengaruh) pada commit yang sama.
- Hanya ada satu dokumen akuarium (`aquarium-001`); akses lewat `findAquarium()` / `aquariumRef()`.
- `realtimeState` **hanya** ditulis oleh endpoint telemetry ESP32.
- Notifikasi: `userid` = **penerima**, `userId` = **pelaku**. Buat dokumennya hanya lewat `sharedNotification()` / `privateNotification()`.
- Suhu selalu disimpan dalam Celsius; timestamp memakai `FieldValue.serverTimestamp()` dan dikirim ke klien lewat `serializeFirestore()`.
- Field baru yang bisa diubah dari dashboard butuh nilai awal di `config/defaults.js` dan aturan di `utils/config-validation.js`.
- Query Firestore baru dicatat di tabel "Query yang dipakai" di `docs/database.md`. Query dengan filter/urutan di lebih dari satu field butuh indeks gabungan di Firestore.
- Data yang sudah ada di Firestore tidak berubah otomatis. Database yang terhubung adalah database sungguhan: **minta konfirmasi sebelum menulis atau memigrasi data**.
