# Latar Belakang

Dokumen ini menjelaskan masalah yang mendorong pembuatan Smart Aquarium Control, cara sistem menyelesaikannya, dan hal-hal etis yang perlu diperhatikan.

## Masalah

Merawat akuarium rumah butuh tiga pekerjaan rutin yang harus konsisten setiap hari:

| Pekerjaan      | Jika dilakukan manual                                      | Akibat bagi ikan                 |
| -------------- | ---------------------------------------------------------- | -------------------------------- |
| Menjaga suhu   | Sering mengecek termometer dan menyalakan/mematikan heater | Suhu naik-turun tidak stabil     |
| Memberi pakan  | Bisa lupa, terlambat, atau memberi dua kali                | Ikan kelaparan atau kekenyangan  |
| Mengatur lampu | Dinyalakan dan dimatikan pada jam yang berbeda-beda        | Siklus siang-malam tidak teratur |

Masalah bertambah saat pemilik tidak di rumah: tidak ada cara mengetahui kondisi akuarium atau mengubah pengaturannya dari jauh.

**Pengguna sasaran:** pemilik akuarium rumah yang ingin akuariumnya terawat konsisten tanpa selalu berada di dekatnya.

## Solusi

Perangkat ESP32 di akuarium membaca suhu dan menjalankan heater dan lampu. Sistem web menjadi tempat pengguna memantau, mengatur, dan menyimpan semua datanya.

| Masalah                        | Cara sistem menyelesaikannya                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| Suhu tidak stabil              | Pengguna menentukan suhu target; pada mode otomatis heater mengikuti suhu target.               |
| Suhu berbahaya tidak diketahui | Alert saat suhu keluar dari batas aman, di halaman Alerts dan browser notification.             |
| Pakan lupa atau terlambat      | Hingga 12 jadwal pakan harian dan tombol **Feed Now**.                                          |
| Lampu tidak teratur            | Jadwal nyala-mati harian dan statistik rata-rata jam lampu menyala.                             |
| Tidak bisa memantau dari jauh  | Dashboard menampilkan suhu, status alat, dan status perangkat online/offline secara otomatis.   |
| Tidak ada catatan kondisi      | Semua data perangkat disimpan sebagai riwayat, bisa dilihat di tabel/kalender dan diekspor CSV. |
| Perawatan dilakukan bersama    | Beberapa akun mengontrol akuarium yang sama; setiap perubahan tercatat atas nama pelakunya.     |

Setiap fitur punya **mode otomatis** (sistem bekerja sesuai aturan) dan **mode manual** (pengguna mengontrol langsung).

## Nilai Sistem IoT Ini

1. **Pemantauan jarak jauh.** Kondisi akuarium bisa dilihat dari mana saja, termasuk apakah perangkat masih online.
2. **Otomatisasi berbasis aturan.** Aturan (suhu target, jadwal lampu) diubah dari web tanpa memprogram ulang perangkat.
3. **Peringatan proaktif.** Sistem yang memberi tahu saat suhu di luar batas atau perangkat offline (sensor rusak saat ini terlihat sebagai perangkat offline).
4. **Umpan balik perintah.** Dashboard membedakan _perintah_ pengguna dari _status nyata_ perangkat, dan menampilkan "Waiting for the device…" jika belum dijalankan.
5. **Data untuk keputusan.** Riwayat, grafik, dan statistik jam lampu membantu melihat pola.
6. **Jejak perubahan.** Setiap perubahan pengaturan dicatat beserta nama pengubahnya.

## Etika dan Dampak

Tidak semua hal di bawah diselesaikan oleh sistem ini, tetapi perlu disadari.

### Keselamatan hewan

- **Ketergantungan pada otomatisasi.** Jika internet atau server mati, perintah baru tidak sampai ke perangkat. Perangkat tetap menjalankan pengaturan terakhir, tetapi pemilik tetap perlu mengecek akuarium langsung.
- **Kontrol jarak jauh punya risiko.** Heater bisa dinyalakan manual dari jauh. Karena itu firmware punya pengaman sendiri: heater dipaksa mati saat sensor gagal atau suhu mencapai 36 °C.
- **Pakan berlebihan.** Beberapa pengguna bisa menekan Feed Now berdekatan. Belum ada batas jumlah pakan per hari.
- **Pengaturan yang keliru.** Sistem hanya membatasi rentang nilai (misalnya suhu target 10–35 °C), bukan menilai kecocokannya untuk jenis ikan tertentu.
- **Rasa aman yang semu.** Browser notification hanya muncul selama dashboard terbuka.

### Privasi dan keamanan data

- **Data pribadi.** Nama, email, dan foto profil disimpan di Firebase (Google Cloud, mungkin di luar negeri). Password disimpan sebagai hash bcrypt.
- **Akses bersama tanpa peran.** Siapa pun bisa mendaftar dan langsung mengontrol akuarium.
- **Token di browser.** Token login (12 jam) disimpan di `localStorage`; bisa disalahgunakan jika perangkat dipakai orang lain.
- **Satu kunci perangkat.** Jika `HARDWARE_API_KEY` bocor, pihak lain bisa mengirim data palsu.
- **HTTP biasa di jaringan lokal.** Kunci perangkat terkirim tanpa enkripsi; di internet gunakan HTTPS.

### Dampak lain

- **Biaya dan ketergantungan layanan.** Firebase punya kuota gratis; biaya bisa muncul saat data bertambah, dan pindah layanan butuh usaha.
- **Aksesibilitas.** Antarmuka berbahasa Inggris dan butuh internet serta browser modern.
- **Energi dan data.** Dashboard dan perangkat mengirim request berkala, dan riwayat telemetry belum punya batas umur. Interval bisa dinaikkan di **System → Poll frequency**; dashboard berhenti memperbarui saat tab tidak aktif.
- **Perangkat elektronik.** Perangkat akan menjadi limbah elektronik di akhir masa pakainya. Mode otomatis membantu karena heater hanya menyala saat dibutuhkan.
- **Hubungan pemilik dan hewan.** Sistem adalah alat bantu, bukan pengganti perhatian langsung.
