---
paths:
    - "backend/routes/hardware.js"
    - "backend/config/defaults.js"
    - "backend/utils/config-validation.js"
    - "frontend/src/pages/Dashboard.jsx"
    - "docs/integrations.md"
    - "docs/esp32-connection.md"
---

# Kontrak API dengan perangkat (ESP32)

Firmware tidak ada di repo ini; ESP32 hanya dilihat sebagai klien API.

- **Baca dulu** sebelum mengubah endpoint perangkat, field yang dibaca perangkat, atau status device di Dashboard:
    - `docs/api.md` bagian "Detail: endpoint perangkat" (body, nilai yang diterima, respons).
    - `docs/integrations.md` bagian "Kontrak dengan perangkat" (urutan siklus perangkat dan aturan bersama).
    - `docs/esp32-connection.md` (contoh kode penghubung yang dipakai tim firmware).
- Perubahan pada hal di atas akan merusak firmware yang sudah ada: perbarui ketiga dokumen itu pada commit yang sama (termasuk contoh kode di `esp32-connection.md`) dan tandai `BREAKING CHANGE:` di pesan commit.

## Aturan yang harus dijaga

- **`realtimeState` hanya ditulis oleh endpoint telemetry.** Route dashboard (termasuk Feed Now) tidak boleh mengubahnya; Feed Now hanya mengisi `feederConfig.lastTriggeredAt`.
- **Offline** = tidak ada telemetry lebih dari maks(120 detik, 3 × `pollFrequency`). Dihitung oleh `offlineThresholdSeconds()` di `utils/device-status.js` (statistik lampu di `hardware.js` dan notifikasi "Device Offline") dan oleh `Dashboard.jsx` (`isDeviceOnline`); keduanya harus sama.
- **Feed Now menunggu** = `lastTriggeredAt` lebih baru dari `realtimeState.lastUpdated` (`isFeedPending` di Dashboard). Ini bergantung pada urutan perangkat: baca pengaturan → jalankan → kirim telemetry.
- Format jam jadwal tetap `hh:mm AM/PM`.
