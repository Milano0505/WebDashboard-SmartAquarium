# Frontend

Frontend adalah aplikasi web yang dibuka pengguna di browser. Dokumen ini menjelaskan teknologi, struktur kode, halaman yang tersedia, cara data dimuat, dan cara mendemonstrasikan tampilannya.

## Teknologi

Gambaran teknologi seluruh sistem ada di [architecture.md](architecture.md#teknologi). Library yang dipakai frontend:

| Library / alat       | Versi   | Kegunaan                                                       |
| -------------------- | ------- | -------------------------------------------------------------- |
| React                | 19      | Membangun tampilan dari komponen                               |
| React Router         | 7       | Navigasi antar-halaman tanpa memuat ulang browser              |
| Vite                 | 8       | Server development dan build produksi                          |
| Tailwind CSS         | 4       | Styling dengan class utilitas langsung di JSX                  |
| @vitejs/plugin-react | 6       | Dukungan React (JSX, hot reload) di Vite                       |
| Prettier (dev)       | 3       | Merapikan format kode                                          |
| Node.js / pnpm       | 22 / 10 | Runtime dan package manager (dikunci di `frontend/.mise.toml`) |

Kode ditulis dalam **JavaScript (JSX)**, tanpa TypeScript. Tidak ada library grafik atau ikon tambahan; grafik suhu dan ikon dibuat sendiri dengan SVG.

## Struktur folder

```text
frontend/src/
  main.jsx                Titik awal aplikasi
  App.jsx                 Daftar route, proteksi halaman login, toast sukses
  index.css               Import Tailwind dan style dasar
  api/service.js          Semua request ke backend
  context/AuthContext.jsx Menyimpan sesi login dan profil pengguna
  hooks/
    useUnreadCount.js     Jumlah notifikasi belum dibaca untuk badge menu Alerts
    useBrowserNotifications.js  Izin dan pengecekan browser notification
  components/
    Layout.jsx            Sidebar (desktop), menu bawah (mobile), header, toast
    ui.jsx                Komponen dasar: Card, tombol, input, slider, badge, dll.
    AreaChart.jsx         Grafik suhu (SVG)
    Icons.jsx             Ikon SVG
  pages/                  Login, Register, Dashboard, DataHistory, Notifications, Configuration
  utils/
    format.js             Format suhu (°C/°F), waktu relatif, inisial nama
    profilePhoto.js       Mengecilkan foto profil sebelum dikirim
```

## Halaman

Semua halaman kecuali Login dan Register hanya bisa dibuka setelah login. Jika belum login, pengguna diarahkan ke `/login`.

| Route                    | Halaman       | Isi                                                                                                                                                                             |
| ------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`                 | Login         | Form email dan password                                                                                                                                                         |
| `/register`              | Register      | Form nama, email, password, konfirmasi password, dan foto profil (opsional)                                                                                                     |
| `/dashboard`             | Overview      | Suhu terkini, rentang target, status heater/lampu/pemberi pakan, grafik 12 data suhu terakhir, 5 data terbaru, 5 notifikasi terbaru                                             |
| `/dashboard/temperature` | Temperature   | Suhu terkini, status heater, slider suhu target (Save/Reset), pilihan mode, tombol heater On/Off                                                                                |
| `/dashboard/lighting`    | Lighting      | Status lampu, rata-rata jam ON/OFF per hari, editor jadwal nyala-mati, pilihan mode, tombol lampu On/Off                                                                        |
| `/dashboard/feeder`      | Feeder        | Status pemberi pakan, pilihan mode, tombol **Feed Now**, daftar jadwal pakan (tambah, aktif/nonaktif, hapus)                                                                    |
| `/history`               | Data History  | Tab **Table** (ringkasan, pencarian, filter, halaman, ekspor CSV) dan tab **Calendar** (data per tanggal)                                                                       |
| `/notifications`         | Alerts        | Daftar notifikasi, jumlah per jenis, tombol Read, Delete, dan Mark all read                                                                                                     |
| `/configuration`         | Configuration | Tab **Profile** (foto, nama, ganti password, Sign Out), **System** (satuan suhu, zona waktu, interval pembaruan), **Alerts** (batas suhu aman, browser notification), **About** |

Semua halaman di dashboard menampilkan jam sesuai zona waktu akuarium (`systemConfig.timezone`).

### Tampilan desktop dan mobile

- **Desktop** (lebar ≥ 768 px): menu di sidebar kiri yang bisa diciutkan, nama dan foto pengguna di header.
- **Mobile**: menu pindah ke bar bawah layar (Dashboard, History, Alerts, Config), sehingga dashboard nyaman dibuka dari smartphone.
- Menu **Alerts** menampilkan badge jumlah notifikasi yang belum dibaca.

## Cara data dimuat

### Request ke backend

Semua request lewat `src/api/service.js`. File ini:

- Menambahkan token login (`Authorization: Bearer …`) ke setiap request.
- Mengubah respons gagal menjadi error berisi pesan dari backend, lalu ditampilkan di halaman.
- Saat menerima `401` (token habis atau tidak valid), menghapus sesi dan mengeluarkan pengguna ke halaman login.

### Sesi login

`AuthContext` menyimpan token (`sa_token`) dan profil (`sa_user`) di `localStorage`. Saat aplikasi dibuka, profil diambil ulang dari backend untuk memastikan sesi masih berlaku.

### Pembaruan otomatis

Backend tidak mengirim data sendiri, jadi frontend memuat ulang data secara berkala:

| Bagian               | Interval                                | Keterangan                                                                   |
| -------------------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| Dashboard            | `pollFrequency` detik (minimal 5 detik) | Berhenti saat tab browser tidak aktif; juga dimuat ulang setelah setiap aksi |
| Badge Alerts         | 10 detik                                | Juga diperbarui setelah aksi yang membuat notifikasi                         |
| Browser notification | 15 detik                                | Hanya jika diaktifkan pengguna                                               |

Input yang sedang diedit (slider suhu target, form jadwal lampu) disimpan sebagai **draft** di halaman, sehingga tidak tertimpa saat data dimuat ulang.

### Status perangkat di Dashboard

- **Sumber status**: `realtimeState`, yang **hanya** diisi oleh data dari perangkat. Tombol di dashboard hanya menyimpan perintah; status di layar baru berubah setelah perangkat menjalankan perintah dan mengirim data.
- **Badge perangkat** di samping judul:
    - "Device online": ada data dari perangkat dalam maks(120 detik, 3 × `pollFrequency`) terakhir.
    - "Device offline": data terakhir lebih lama dari batas itu.
    - "No device data": perangkat belum pernah mengirim data.
- **Menunggu perangkat**: kartu Manual Control menampilkan "Waiting for the device…" (atau peringatan offline) jika:
    - Heater/lampu: perintah (`manualControlState`) berbeda dengan status nyata.
    - Pemberi pakan: perintah Feed Now lebih baru dari data terakhir perangkat. Selama menunggu, tombol Feed Now dinonaktifkan agar pakan tidak terkirim dua kali.

### Notifikasi di browser

- **Halaman Alerts** menampilkan semua notifikasi yang dibuat backend (daftar kejadiannya ada di [backend.md](backend.md#notifikasi)).
- **Browser notification** diaktifkan di Configuration → Alerts. Browser akan meminta izin. Setelah aktif, frontend mengecek notifikasi baru setiap 15 detik dan menampilkannya sebagai pop-up sistem operasi.
- Browser notification **hanya bekerja selama dashboard terbuka** di browser. Pilihan aktif/nonaktif disimpan per pengguna di `localStorage` (`sa_browser_notifications:<userId>`), bukan di database.

### Foto profil

Foto dikecilkan di browser (`utils/profilePhoto.js`) menjadi JPEG maksimal 180 KB, lalu dikirim sebagai data URL.

## Menjalankan

```powershell
cd frontend
pnpm install
pnpm dev
```

Buka `http://localhost:5173`. Backend harus sudah berjalan; alamatnya diatur dengan `VITE_API_URL` di `frontend/.env` (lihat [README.md](../README.md#konfigurasi-environment)). Untuk build produksi jalankan `pnpm build`; hasilnya ada di `frontend/dist`.

## Demonstrasi

Urutan berikut menunjukkan semua halaman. Siapkan backend yang berjalan dan, jika perlu, kirim beberapa data simulasi perangkat agar dashboard tidak kosong (lihat [backend.md](backend.md#demonstrasi), langkah 5).

1. **Register**: buka `/register`, isi form, pilih foto. Setelah berhasil, langsung masuk ke dashboard.
2. **Login / logout**: Sign Out dari sidebar, lalu login lagi. Coba password salah untuk melihat pesan error.
3. **Overview**: tunjukkan suhu terkini, status heater/lampu/pakan, grafik suhu, data terbaru, notifikasi terbaru, dan badge "Device online/offline".
4. **Temperature**: geser slider suhu target lalu **Save**; ganti mode ke Manual lalu tekan **Turn On**. Jika perangkat belum mengirim data baru, muncul "Waiting for the device…".
5. **Lighting**: ubah jadwal lampu (misalnya 08:00 AM–10:00 PM) dan simpan; durasi dihitung otomatis.
6. **Feeder**: tambah jadwal pakan lewat **Add feeding time**, nonaktifkan salah satu, lalu ganti mode ke Manual dan tekan **Feed Now**.
7. **Data History**: tunjukkan ringkasan, pencarian, filter, pindah halaman, tab Calendar, dan tombol **Export CSV**.
8. **Alerts**: tunjukkan notifikasi dari langkah 4–6 lengkap dengan nama pengubahnya, lalu **Read**, **Delete**, dan **Mark all read**. Badge di menu ikut berkurang.
9. **Configuration**: di tab System, ganti satuan ke Fahrenheit dan simpan (semua suhu di dashboard ikut berubah); ubah zona waktu; di tab Alerts, ubah batas suhu aman dan aktifkan browser notification; tunjukkan tab About.
10. **Mobile**: buka DevTools (`F12`) → mode perangkat (`Ctrl+Shift+M`) untuk menunjukkan menu bawah di layar kecil.
