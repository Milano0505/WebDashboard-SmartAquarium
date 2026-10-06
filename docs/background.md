# Latar Belakang

Dokumen ini menjelaskan masalah yang mendorong pembuatan Smart Aquarium Control, cara sistem web menyelesaikannya, nilai yang diberikan sistem IoT ini, serta dampak etis, non-teknis, dan lingkungan yang perlu diperhatikan.

Cakupan dokumentasi ini adalah **sistem web** (dashboard, REST API, dan database). Perangkat di akuarium (ESP32) hanya disebut sebagai pihak yang mengirim data dan menjalankan perintah dari sistem web.

## Masalah

Merawat akuarium rumah butuh tiga pekerjaan rutin yang harus konsisten setiap hari:

| Pekerjaan      | Yang terjadi jika dilakukan manual                                       | Akibat bagi ikan                 |
| -------------- | ------------------------------------------------------------------------ | -------------------------------- |
| Menjaga suhu   | Pemilik harus sering mengecek termometer dan menyalakan/mematikan heater | Suhu naik-turun tidak stabil     |
| Memberi pakan  | Pemilik bisa lupa, terlambat, atau memberi pakan dua kali                | Ikan kelaparan atau kekenyangan  |
| Mengatur lampu | Lampu dinyalakan dan dimatikan pada jam yang berbeda-beda                | Siklus siang-malam tidak teratur |

Semua kondisi di atas bisa membuat ikan stres, bahkan mati. Masalah bertambah saat pemilik sedang tidak di rumah: tidak ada cara untuk mengetahui kondisi akuarium atau mengubah pengaturannya dari jauh.

**Pengguna sasaran:** pemilik akuarium rumah yang ingin akuariumnya terawat secara konsisten tanpa harus selalu berada di dekatnya.

**Kondisi yang diharapkan:** pemilik dapat menjaga suhu tetap stabil, memberi pakan secara teratur, dan mengatur lampu secara otomatis, serta memantau dan mengontrol semuanya dari jarak jauh lewat browser di laptop atau smartphone.

## Solusi

Smart Aquarium Control menghubungkan akuarium dengan dashboard web. Perangkat di akuarium membaca suhu dan menjalankan heater, lampu, dan pemberi pakan. Sistem web menjadi tempat pengguna memantau, mengatur, dan menyimpan semua data tersebut.

| Masalah                        | Cara sistem web menyelesaikannya                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Suhu tidak stabil              | Pengguna menentukan suhu target dan batas aman. Pada mode otomatis, heater mengikuti suhu target.                                        |
| Suhu berbahaya tidak diketahui | Server membuat **Temperature Alert** saat suhu keluar dari batas aman, ditampilkan di halaman Alerts dan browser notification.           |
| Pakan lupa atau terlambat      | Hingga 12 jadwal pakan harian. Tombol **Feed Now** untuk memberi pakan dari jauh.                                                        |
| Lampu tidak teratur            | Jadwal nyala-mati lampu harian dan statistik rata-rata jam lampu menyala per hari.                                                       |
| Tidak bisa memantau dari jauh  | Dashboard menampilkan suhu terkini, status heater/lampu/pakan, dan status perangkat online/offline, diperbarui otomatis.                 |
| Tidak ada catatan kondisi      | Semua data dari perangkat disimpan sebagai riwayat, bisa dilihat dalam tabel atau kalender, dan diekspor ke CSV.                         |
| Perawatan dilakukan bersama    | Beberapa akun (misalnya anggota keluarga) memantau dan mengontrol akuarium yang sama, dan setiap perubahan tercatat atas nama pelakunya. |

Setiap fitur punya **mode otomatis** (sistem bekerja sesuai aturan) dan **mode manual** (pengguna mengontrol langsung dari dashboard).

## Nilai sistem IoT ini

Sistem ini tidak hanya "menghubungkan alat ke internet". Nilai yang diberikan:

1. **Pemantauan jarak jauh secara langsung.** Kondisi akuarium bisa dilihat dari mana saja, dan dashboard memberi tahu apakah perangkat masih mengirim data (online) atau tidak (offline).
2. **Otomatisasi berbasis aturan.** Pengguna cukup menentukan aturan sekali (suhu target, jadwal lampu, jadwal pakan). Aturan bisa diubah kapan saja dari web tanpa memprogram ulang perangkat.
3. **Peringatan proaktif.** Pengguna tidak perlu terus mengecek; sistem yang memberi tahu saat suhu keluar dari batas aman.
4. **Umpan balik perintah.** Dashboard membedakan _perintah_ yang dikirim pengguna dengan _status nyata_ yang dilaporkan perangkat. Jika perintah belum dijalankan, dashboard menampilkan "Waiting for the device…", sehingga pengguna tahu apakah perintahnya benar-benar sampai.
5. **Data untuk mengambil keputusan.** Riwayat suhu, grafik, statistik jam lampu, dan ekspor CSV membantu pemilik melihat pola, misalnya jam berapa suhu sering turun.
6. **Kolaborasi dan jejak perubahan.** Semua pengguna melihat data yang sama, dan setiap perubahan pengaturan dicatat sebagai notifikasi berisi siapa yang mengubahnya.

## Etika, dampak non-teknis, dan lingkungan

Bagian ini mencatat masalah yang mungkin muncul. Tidak semuanya diselesaikan di sistem ini, tetapi tim perlu menyadarinya.

### Kesejahteraan hewan dan keselamatan

- **Ketergantungan pada otomatisasi.** Jika internet, server, atau database mati, perintah dan jadwal baru tidak sampai ke perangkat. Pemilik tetap bertanggung jawab mengecek akuarium secara langsung.
- **Kontrol dari jarak jauh punya risiko.** Heater bisa dinyalakan manual dari jauh tanpa ada orang di dekat akuarium. Jika perangkat bermasalah, suhu bisa terus naik. Sistem web hanya mengirim perintah; pengaman fisik tetap dibutuhkan di sisi perangkat.
- **Pakan berlebihan.** Karena akuarium dipakai bersama, beberapa pengguna bisa menekan Feed Now dalam waktu berdekatan. Dashboard menonaktifkan tombol selama perintah sebelumnya belum dijalankan, tetapi belum ada batas jumlah pakan per hari.
- **Pengaturan yang salah.** Suhu target atau batas aman yang keliru tetap akan dijalankan. Sistem hanya membatasi rentang nilai (misalnya suhu target 10–35 °C), bukan menilai apakah nilai itu cocok untuk jenis ikan tertentu.
- **Rasa aman yang semu.** Browser notification hanya muncul selama dashboard terbuka di browser. Pengguna bisa mengira akan selalu diberi tahu padahal tidak.

### Privasi dan keamanan data

- **Data pribadi.** Sistem menyimpan nama, email, dan foto profil. Password disimpan dalam bentuk hash (bcrypt), bukan teks asli.
- **Akses bersama tanpa peran.** Semua akun yang terdaftar bisa mengontrol akuarium yang sama dan siapa pun bisa mendaftar. Belum ada peran seperti "pemilik" dan "tamu", sehingga orang yang tidak berwenang bisa ikut mengubah pengaturan jika mengetahui alamat dashboard.
- **Penyimpanan token.** Token login disimpan di `localStorage` browser. Jika perangkat pengguna dipakai orang lain atau terkena skrip berbahaya, sesi bisa disalahgunakan selama token masih berlaku (12 jam).
- **Satu kunci perangkat.** Semua perangkat memakai satu `HARDWARE_API_KEY`. Jika kunci bocor, pihak lain bisa mengirim data palsu.
- **Data di layanan pihak ketiga.** Data disimpan di Firebase (Google Cloud). Pengguna perlu tahu bahwa data mereka tersimpan di server pihak lain, mungkin di luar negeri.

### Dampak non-teknis

- **Biaya dan ketergantungan layanan.** Firebase punya kuota gratis; jika data dan pengguna bertambah, biaya bisa muncul. Memindahkan data ke layanan lain juga butuh usaha (vendor lock-in).
- **Aksesibilitas.** Antarmuka berbahasa Inggris dan butuh internet serta perangkat dengan browser modern, sehingga bisa menyulitkan sebagian pengguna, misalnya orang lanjut usia.
- **Hubungan pemilik dengan hewan.** Otomatisasi bisa mengurangi perhatian langsung pemilik pada ikannya. Sistem sebaiknya dipandang sebagai alat bantu, bukan pengganti perawatan.

### Dampak lingkungan

- **Energi dari pembaruan otomatis.** Dashboard memuat ulang data setiap beberapa detik dan perangkat mengirim data terus-menerus. Setiap request memakai energi di server dan pusat data. Interval pembaruan bisa dinaikkan (System → Poll frequency) untuk mengurangi jumlah request; dashboard juga berhenti memperbarui saat tab browser tidak aktif.
- **Data yang terus bertambah.** Riwayat telemetry belum punya batas umur, sehingga penyimpanan akan terus bertambah. Kebijakan penghapusan data lama (misalnya setelah 90 hari) bisa mengurangi pemakaian penyimpanan.
- **Perangkat elektronik.** Perangkat di akuarium akan menjadi limbah elektronik di akhir masa pakainya, dan heater yang dikontrol dari jauh tetap memakai listrik. Mode otomatis membantu karena heater hanya menyala saat dibutuhkan.

## Dokumen terkait

- [architecture.md](architecture.md): gambaran arsitektur sistem web.
- [README.md](../README.md): daftar fitur dan cara menjalankan.
