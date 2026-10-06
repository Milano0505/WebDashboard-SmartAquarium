---
paths:
    - "backend/routes/hardware.js"
    - "backend/config/defaults.js"
    - "backend/utils/config-validation.js"
    - "frontend/src/pages/Dashboard.jsx"
    - "docs/integrations.md"
---

# Kontrak API dengan perangkat (ESP32)

Firmware tidak ada di repo ini; ESP32 hanya dilihat sebagai klien API.

- **Baca dulu** sebelum mengubah endpoint perangkat, field yang dibaca perangkat, atau status device di Dashboard:
    - `docs/api.md` bagian "Detail: endpoint perangkat" (body, nilai yang diterima, respons).
    - `docs/integrations.md` bagian "Kontrak dengan perangkat" (urutan siklus perangkat dan aturan bersama).
- Perubahan pada hal di atas akan merusak firmware yang sudah ada: perbarui kedua dokumen itu pada commit yang sama dan tandai `BREAKING CHANGE:` di pesan commit.

## Aturan yang harus dijaga

- **`realtimeState` hanya ditulis oleh endpoint telemetry.** Route dashboard (termasuk Feed Now) tidak boleh mengubahnya; Feed Now hanya mengisi `feederConfig.lastTriggeredAt`.
- **Offline** = tidak ada telemetry lebih dari maks(120 detik, 3 × `pollFrequency`). Dipakai di `hardware.js` (statistik lampu) dan `Dashboard.jsx` (`isDeviceOnline`); keduanya harus sama.
- **Feed Now menunggu** = `lastTriggeredAt` lebih baru dari `realtimeState.lastUpdated` (`isFeedPending` di Dashboard). Ini bergantung pada urutan perangkat: baca pengaturan → jalankan → kirim telemetry.
- Format jam jadwal tetap `hh:mm AM/PM`.
