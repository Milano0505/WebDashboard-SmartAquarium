# Integrasi

Dokumen ini menjelaskan bagaimana frontend, backend, dan database saling terhubung, alur lengkap setiap fitur inti, dan cara mendemonstrasikan bahwa ketiganya sudah terintegrasi. Gambaran blok sistem ada di [architecture.md](architecture.md).

## Titik integrasi

| Integrasi           | Cara terhubung                       | Kode yang terlibat                                            |
| ------------------- | ------------------------------------ | ------------------------------------------------------------- |
| Frontend → Backend  | HTTP + JSON, token JWT               | `frontend/src/api/service.js` → `backend/routes/*`            |
| Backend → Database  | Firebase Admin SDK + service account | `backend/config/firebase.js`, dipakai semua file di `routes/` |
| Perangkat → Backend | HTTP + JSON, header `x-device-key`   | Firmware ESP32 (di luar repo) → `backend/routes/hardware.js`  |

### Pengaturan yang harus cocok

Integrasi hanya berjalan jika nilai berikut sama di kedua sisi:

| Sisi A                                  | Sisi B                         | Jika tidak cocok                                      |
| --------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| `VITE_API_URL` (frontend)               | Alamat dan `PORT` backend      | Frontend menampilkan "Unable to connect to the API."  |
| `VITE_AQUARIUM_ID` (frontend)           | `SHARED_AQUARIUM_ID` (backend) | Semua request akuarium dibalas `404`                  |
| `HARDWARE_API_KEY` (backend)            | Kunci yang dikirim perangkat   | Data perangkat ditolak `401` (atau `503` jika kosong) |
| `FRONTEND_ORIGIN` (backend, production) | Alamat tempat frontend dibuka  | Browser memblokir request karena CORS                 |
| Service account (backend)               | Project Firebase yang dipakai  | Backend gagal membaca/menulis Firestore               |

Cara mengisi variabel-variabel ini ada di [README.md](../README.md#konfigurasi-environment).

## Alur fitur inti

Setiap baris menunjukkan perjalanan satu aksi: dari halaman, ke fungsi di `service.js`, ke endpoint backend, ke operasi Firestore, sampai hasilnya terlihat di layar.

| Fitur                 | Aksi pengguna / pemicu                   | Fungsi frontend                                                                                       | Endpoint                                                | Operasi Firestore                                                                                      | Hasil di layar                                            |
| --------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Register              | Isi form di `/register`                  | `register()`                                                                                          | `POST /api/auth/register`                               | Cek email di `users`; transaksi: buat `users/{id}`, buat/rapikan `aquariums/aquarium-001`              | Token disimpan, pindah ke dashboard                       |
| Login                 | Isi form di `/login`                     | `login()`                                                                                             | `POST /api/auth/login`                                  | Cari `users` berdasarkan email, cocokkan hash password                                                 | Token disimpan, pindah ke dashboard                       |
| Monitoring            | Buka `/dashboard`, lalu otomatis berkala | `getAquarium()`, `getTemperatureChart()`, `getTelemetry()`, `getNotifications()`                      | `GET …`, `GET …/telemetry`, `GET …/notifications`       | Baca dokumen akuarium, query `telemetry_history` dan `notifications`                                   | Suhu, status, grafik, data dan notifikasi terbaru         |
| Ubah pengaturan       | Ubah mode, suhu target, jadwal, dll.     | `updateTemperatureConfig()`, `updateLightingConfig()`, `updateFeederConfig()`, `updateSystemConfig()` | `PATCH …/…-config`                                      | Batch: perbarui field yang berubah + buat notifikasi bersama                                           | Toast sukses, data dimuat ulang, badge Alerts bertambah   |
| Feed Now              | Tekan **Feed Now** (mode Manual)         | `triggerFeeder()`                                                                                     | `POST …/feeder/trigger`                                 | Batch: isi `feederConfig.lastTriggeredAt` + buat notifikasi bersama                                    | "Waiting for the device…" sampai perangkat mengirim data  |
| Data perangkat masuk  | Perangkat mengirim data berkala          | – (bukan dari frontend)                                                                               | `POST /api/hardware/{id}/telemetry`                     | Batch: perbarui `realtimeState` dan statistik lampu, tambah `telemetry_history`, alert suhu jika perlu | Dashboard menampilkan data baru pada pembaruan berikutnya |
| Riwayat               | Buka `/history`                          | `getTelemetry({ limit: 500 })`                                                                        | `GET …/telemetry`                                       | Query `telemetry_history` urut waktu terbaru                                                           | Tabel dan kalender riwayat                                |
| Ekspor CSV            | Tekan **Export CSV**                     | `exportTelemetry()`                                                                                   | `GET …/telemetry/export?format=csv`                     | Query `telemetry_history` (maksimal 500)                                                               | File CSV terunduh                                         |
| Notifikasi            | Buka `/notifications`; badge berkala     | `getNotifications()`                                                                                  | `GET …/notifications`                                   | Query `notifications`, disaring per pengguna                                                           | Daftar notifikasi dan badge unread                        |
| Tandai dibaca / hapus | Tekan Read, Mark all read, Delete        | `markNotificationRead()`, `markAllNotificationsRead()`, `deleteNotification()`                        | `PATCH …/read`, `PATCH …/read-all`, `DELETE …/{id}`     | Tambah ID ke `readBy` / `dismissedBy`, atau ubah `isRead` / hapus dokumen privat                       | Status di daftar dan badge berubah                        |
| Profil dan password   | Simpan di Configuration → Profile        | `updateUserProfile()`, `changePassword()`                                                             | `PUT /api/users/{id}`, `POST /api/auth/change-password` | Perbarui `users/{id}` + buat notifikasi privat                                                         | Nama/foto di header berubah, toast sukses                 |

Tanda `…` berarti `/api/aquariums/aquarium-001`. Detail setiap endpoint ada di [api.md](api.md).

### Contoh alur lengkap: mengubah suhu target

1. Pengguna menggeser slider di tab Temperature lalu menekan **Save**.
2. Frontend memanggil `updateTemperatureConfig("aquarium-001", { targetTemp: 26 })`.
3. `service.js` mengirim `PATCH /api/aquariums/aquarium-001/temperature-config` dengan token login.
4. Backend memeriksa token, memeriksa nilai 26 (harus 10–35), lalu dalam satu batch menyimpan `tempConfig.targetTemp = 26` dan `updatedAt`, serta membuat notifikasi "Temperature settings updated".
5. Backend membalas `200 { "message": "Temperature config updated." }`.
6. Frontend menampilkan toast sukses, memuat ulang data dashboard, dan memperbarui badge Alerts.
7. Pada pembacaan pengaturan berikutnya, perangkat menerima suhu target baru dan menyesuaikan heater.

## Kontrak dengan perangkat

Firmware ESP32 tidak ada di repository ini. Bagian ini hanya menjelaskan apa yang diharapkan backend dari perangkat, tanpa detail perangkat keras.

Setiap `systemConfig.pollFrequency` detik, perangkat menjalankan siklus berikut **dengan urutan ini**:

1. **Baca pengaturan**: `GET /api/hardware/{aquariumId}/config`.
2. **Jalankan pengaturan**:
    - **Heater**: mode `MANUAL` mengikuti `tempConfig.manualControlState`; mode `AUTOMATIC` membandingkan suhu terukur dengan `tempConfig.targetTemp`.
    - **Lampu**: mode `MANUAL` mengikuti `lightingConfig.manualControlState`; mode `AUTOMATIC` menyala selama jam lokal (`systemConfig.timezone`) berada di antara `schedule.startTime` dan `schedule.endTime`, jika `schedule.isActive` bernilai `true`.
    - **Pemberi pakan**: mode `AUTOMATIC` memberi pakan pada jam di `feederConfig.schedules` yang aktif; mode `MANUAL` memberi pakan satu kali setiap `feederConfig.lastTriggeredAt` berubah, lalu melaporkan `feederStatus: "Idle"`.
3. **Kirim data**: `POST /api/hardware/{aquariumId}/telemetry` berisi suhu dan status nyata heater, lampu, dan pemberi pakan.

Urutan ini penting. Dashboard menganggap perintah Feed Now selesai saat menerima data pertama setelah perintah dikirim. Jika perangkat mengirim data sebelum menjalankan perintah, status "Waiting for the device…" akan hilang terlalu cepat.

Aturan yang dipakai bersama oleh backend dan frontend:

| Aturan            | Definisi                                                                   | Dipakai di                                                                 |
| ----------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Perangkat offline | Tidak ada data lebih dari maks(120 detik, 3 × `pollFrequency`)             | `routes/hardware.js` (statistik lampu), `Dashboard.jsx` (`isDeviceOnline`) |
| Feed Now menunggu | `feederConfig.lastTriggeredAt` lebih baru dari `realtimeState.lastUpdated` | `Dashboard.jsx` (`isFeedPending`)                                          |

Karena firmware tidak ada di repo, perangkat bisa **disimulasikan** dengan API client yang mengirim request di atas (lihat [backend.md](backend.md#demonstrasi), langkah 5).

## Status integrasi

| Fungsi inti                             | Frontend | Backend | Database | Keterangan                              |
| --------------------------------------- | :------: | :-----: | :------: | --------------------------------------- |
| Register, login, logout                 |    ✅    |   ✅    |    ✅    |                                         |
| Profil dan ganti password               |    ✅    |   ✅    |    ✅    |                                         |
| Monitoring dan status perangkat         |    ✅    |   ✅    |    ✅    | Data dari perangkat atau simulasi       |
| Pengaturan heater, lampu, pakan, sistem |    ✅    |   ✅    |    ✅    |                                         |
| Feed Now                                |    ✅    |   ✅    |    ✅    | Dijalankan oleh perangkat               |
| Riwayat dan ekspor CSV                  |    ✅    |   ✅    |    ✅    |                                         |
| Notifikasi dan browser notification     |    ✅    |   ✅    |    ✅    | Browser notification butuh izin browser |
| Menjalankan heater, lampu, dan pakan    |    –     |   ✅    |    ✅    | Butuh firmware ESP32 (di luar repo)     |

## Demonstrasi

Skenario ini menunjukkan frontend memanggil backend dan backend membaca/menulis database, secara bersamaan.

### Persiapan

Buka tiga jendela berdampingan:

1. **Browser** dengan dashboard (`http://localhost:5173`) dan DevTools (`F12`) terbuka di tab **Network**, filter **Fetch/XHR**.
2. **Firebase Console** → Firestore Database → Data, buka `aquariums/aquarium-001` (lihat [database.md](database.md#membuka-database)).
3. **API client** untuk menyimulasikan perangkat (lihat [backend.md](backend.md#persiapan)).

> Database yang dipakai adalah database sungguhan; semua data demo ikut tersimpan.

### Langkah

| No. | Lakukan                                                               | Lihat di Network                                            | Lihat di Firestore                                                   | Lihat di dashboard                                                       |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | Login                                                                 | `POST /api/auth/login` → 200, respons berisi `token`        | Dokumen pengguna di `users` (password berupa hash)                   | Masuk ke Overview                                                        |
| 2   | Diamkan halaman Overview                                              | `GET /api/aquariums/aquarium-001` berulang sesuai interval  | –                                                                    | Data dimuat ulang otomatis                                               |
| 3   | Kirim telemetry dari API client (`currentTemp: 24.5`)                 | –                                                           | `realtimeState` berubah; dokumen baru di `telemetry_history`         | Suhu 24.5 °C dan badge "Device online" pada pembaruan berikutnya         |
| 4   | Tab Temperature: ubah suhu target ke 26 lalu **Save**                 | `PATCH …/temperature-config` → 200                          | `tempConfig.targetTemp` = 26; dokumen baru di `notifications`        | Toast sukses; badge Alerts bertambah                                     |
| 5   | Kirim `{ "targetTemp": 50 }` dari API client dengan token yang sama   | –                                                           | Tidak berubah                                                        | – (validasi backend menolak dengan 400)                                  |
| 6   | Tab Feeder: mode Manual, lalu **Feed Now**                            | `PATCH …/feeder-config`, lalu `POST …/feeder/trigger` → 200 | `feederConfig.lastTriggeredAt` terisi; `realtimeState` tidak berubah | "Waiting for the device…"; tombol nonaktif                               |
| 7   | Kirim telemetry lagi dari API client                                  | –                                                           | `realtimeState.lastUpdated` lebih baru dari `lastTriggeredAt`        | Status menunggu hilang                                                   |
| 8   | Kirim telemetry dengan `currentTemp` di atas batas aman (misalnya 35) | –                                                           | Dokumen "Temperature Alert" di `notifications`                       | Notifikasi muncul di Alerts (dan pop-up jika browser notification aktif) |
| 9   | Buka Data History, tekan **Export CSV**                               | `GET …/telemetry`, `GET …/telemetry/export` → file CSV      | –                                                                    | Data dari langkah 3, 7, 8 ada di tabel dan file CSV                      |
| 10  | Buka Alerts, tekan **Delete** pada notifikasi bersama                 | `DELETE …/notifications/{id}` → 200                         | ID pengguna masuk ke `dismissedBy`; dokumen tetap ada                | Notifikasi hilang hanya untuk pengguna ini                               |

Langkah 3, 7, dan 8 menggantikan perangkat sungguhan. Jika ESP32 sudah tersambung, langkah tersebut terjadi sendiri.
