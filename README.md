# Smart Aquarium Control

## Tujuan Sistem

Smart Aquarium Control bertujuan memantau kondisi akuarium dan membantu mengendalikan heater, pencahayaan, serta feeder. ESP32 mengirim data sensor dan status perangkat ke dashboard melalui API backend, sementara data disimpan di Firebase Cloud Firestore.

## Modul dan Teknologi

- **Perangkat IoT:** ESP32 dengan rancangan sensor suhu DS18B20, relay heater dan lampu, servo feeder, buzzer, RTC, dan OLED.
- **Frontend:** React 19, React Router, Vite, dan Tailwind CSS untuk dashboard, riwayat data, notifikasi browser, dan konfigurasi.
- **Backend:** Node.js dan Express untuk autentikasi, API dashboard, validasi telemetry, dan akses database.
- **Database:** Firebase Cloud Firestore untuk profil pengguna, konfigurasi aquarium, status realtime, riwayat telemetry, dan notifikasi.
- **Notifikasi pengguna:** Browser Notification API.
