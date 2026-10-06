---
paths:
    - "backend/routes/**"
    - "backend/middleware/**"
    - "frontend/src/api/**"
    - "docs/api.md"
---

# API

- Referensi lengkap (resource, konvensi, ringkasan endpoint, contoh request/response, aturan validasi, kode status): **baca `docs/api.md`** sebelum menambah atau mengubah route, atau sebelum memanggil endpoint baru dari frontend.
- Setiap endpoint baru, perubahan input/output, atau perubahan kode status **wajib** dicatat di `docs/api.md` (tabel resource, ringkasan API, dan detail) pada commit yang sama. Jika alur fitur berubah, perbarui juga tabel "Alur fitur inti" di `docs/integrations.md`.
- Ikuti konvensi di `docs/api.md`: URL kata benda jamak dengan tanda hubung, method sesuai tabel CRUD, error `{ message }`.
- Endpoint dashboard memakai `requireAuth`; endpoint `/api/hardware/*` memakai `requireDeviceKey`.
- Semua error dikirim sebagai `{ message }` dalam bahasa Inggris; input tidak valid → `badRequest()` (400).
- Endpoint config hanya menerima field yang terdaftar di `configRules`; field turunan (`durationHours`, `avgHoursOn/Off`, `lastTriggeredAt`) tidak boleh diterima dari klien.
- Perubahan pada `/api/hardware/*` atau field yang dibaca ESP32 adalah **breaking change** untuk firmware: ikuti `esp32-contract.md`.
- Frontend memanggil API hanya lewat `frontend/src/api/service.js`.
