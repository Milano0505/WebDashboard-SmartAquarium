---
paths:
    - "device/**"
    - "backend/routes/hardware.js"
    - "backend/config/defaults.js"
    - "backend/utils/config-validation.js"
    - "backend/utils/device-status.js"
    - "frontend/src/pages/Dashboard.jsx"
    - "docs/web/architecture.md"
---

# Kontrak backend, dashboard, dan firmware

Firmware (`device/`) hanya berbicara dengan endpoint `/api/hardware/*`. Perubahan sepihak di salah satu sisi merusak sisi lain.

- **Baca dulu** sebelum mengubah endpoint perangkat, field yang dibaca firmware, atau status perangkat di Dashboard: `docs/web/api.md` (bagian Endpoint Perangkat), `docs/web/architecture.md` (bagian Kontrak dengan Perangkat), dan `device/README.md`.
- Jika pin, ambang, atau nama fungsi firmware berubah, perbarui juga `docs/hardware/` (skema, modul, diagram).
- Jika kontrak berubah, perbarui **backend, firmware, dan ketiga dokumen itu** pada commit yang sama, dan tandai `BREAKING CHANGE:` di pesan commit.

## Aturan yang harus dijaga

- **`realtimeState` hanya ditulis oleh endpoint telemetry.** Route dashboard (termasuk Feed Now) tidak boleh mengubahnya; Feed Now hanya mengisi `feederConfig.lastTriggeredAt`.
- **Urutan siklus firmware:** baca config → jalankan → kirim telemetry. Dashboard menganggap Feed Now selesai saat telemetry pertama setelah perintah.
- **Offline** = tidak ada telemetry lebih dari maks(120 detik, 3 × `pollFrequency`). Dihitung di `offlineThresholdSeconds()` (`utils/device-status.js`) dan `isDeviceOnline` (`Dashboard.jsx`); keduanya harus sama.
- **Sensor rusak** dilaporkan sebagai telemetry **tanpa `currentTemp`** dengan `event`. Backend mengosongkan `realtimeState.currentTemp`, tidak mencatat riwayat, dan membuat notifikasi Sensor Error sekali.
- **Batas suhu telemetry** −10..60 °C; batas heater firmware `HEATER_CUTOFF_C` (36 °C) harus tetap di atas suhu target maksimum dashboard (35 °C).
- Format jam jadwal tetap `hh:mm AM/PM`. Nilai `timezone` harus ada di daftar zona `device/src/main.cpp` agar jadwal lampu akurat; tambahkan di kedua tempat bila menambah zona di dashboard.
- `AQUARIUM_ID` dan `DEVICE_KEY` di `device/include/secrets.h` harus sama dengan `SHARED_AQUARIUM_ID` dan `HARDWARE_API_KEY` di backend.
