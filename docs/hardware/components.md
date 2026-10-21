# Komponen Hardware

Daftar komponen, fungsinya, spesifikasi yang penting, dan alasan pemilihannya. Sambungan antar-komponen ada di [schematic.md](schematic.md).

Nilai komponen pendukung (resistor, kapasitor, transistor, sekering) adalah **nilai rancangan** yang umum dipakai. Cocokkan dengan rangkaian yang dirakit sebelum dipakai sebagai acuan.

## Daftar Komponen

| No  | Komponen                                            | Jml | Fungsi                                   | Spesifikasi penting                                                          | Alasan pemilihan                                                                                                        |
| --- | --------------------------------------------------- | --- | ---------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | ESP32 DevKit (ESP32-WROOM-32)                       | 1   | Otak sistem: kontrol, Wi-Fi, REST API    | 2 core 240 MHz, RAM 520 KB, Wi-Fi 2,4 GHz, GPIO 3,3 V                        | Wi-Fi bawaan untuk REST API. Dua core memisahkan jaringan dari kontrol. Didukung PlatformIO/Arduino.                    |
| 2   | Sensor DS18B20 (probe tahan air)                    | 1   | Mengukur suhu air                        | −55 hingga +125 °C, ±0,5 °C (−10 hingga +85 °C), 9–12 bit, 1-Wire, 3,0–5,5 V | Tahan air, keluaran digital, cukup akurat untuk akuarium, hanya butuh 1 kabel data.                                     |
| 3   | Modul relay 2 kanal 5 V (aktif LOW)                 | 1   | Mengaktifkan heater dan lampu (AC 220 V) | Koil 5 V, kontak 10 A 250 VAC, optocoupler                                   | Memisahkan listrik AC dari ESP32. Dua kanal pas untuk heater dan lampu. Transistor dan dioda pada modul sudah tersedia. |
| 4   | Heater akuarium                                     | 1   | Memanaskan air                           | Beban AC 220 V; daya disesuaikan volume akuarium (jauh di bawah 10 A)        | Dikendalikan lewat kontak relay kanal 1.                                                                                |
| 5   | Lampu akuarium                                      | 1   | Pencahayaan                              | Beban AC 220 V; daya sesuai lampu                                            | Dikendalikan lewat kontak relay kanal 2.                                                                                |
| 6   | Buzzer aktif 5 V                                    | 1   | Alarm suara                              | Osilator internal, sekitar 30 mA                                             | Cukup diberi level HIGH, tanpa PWM, sehingga program sederhana.                                                         |
| 7   | Transistor NPN 2N2222 / BC547 (Q1)                  | 1   | Driver buzzer                            | Ic maks. 100 mA (BC547) hingga 800 mA (2N2222)                               | Arus buzzer terlalu besar untuk pin ESP32; transistor menanggungnya.                                                    |
| 8   | Resistor R1 4,7 kΩ                                  | 1   | Pull-up jalur data DS18B20               | Menarik jalur 1-Wire ke 3,3 V                                                | Nilai yang dianjurkan datasheet DS18B20; tanpa ini sensor tidak terbaca.                                                |
| 9   | Resistor R2 1 kΩ                                    | 1   | Pembatas arus basis Q1                   | (3,3 − 0,7) V / 1 kΩ ≈ 2,6 mA                                                | Cukup untuk menjenuhkan Q1 (hFE ≥ 100 → hingga 260 mA) sambil menjaga pin ESP32 aman.                                   |
| 10  | Resistor R3 10 kΩ                                   | 1   | Pull-down basis Q1                       | Menahan basis di 0 V                                                         | Buzzer tidak berbunyi saat ESP32 boot atau pin mengambang.                                                              |
| 11  | Kapasitor C1, C3 100 nF (keramik)                   | 2   | Bypass catu DS18B20 dan modul relay      | Meredam noise frekuensi tinggi                                               | Pembacaan sensor lebih stabil dan ESP32 tidak ter-reset oleh lonjakan.                                                  |
| 12  | Kapasitor C2 470 µF, C4 100 µF (elektrolit, ≥ 10 V) | 2   | Penyangga catu 5 V                       | Menyimpan muatan sesaat                                                      | Koil relay menarik arus sesaat saat menyala; penyangga mencegah tegangan turun dan ESP32 reset.                         |
| 13  | Sekering 5 A + dudukan                              | 1   | Pengaman jalur fase (L) AC               | 5 A                                                                          | Memutus arus jika terjadi korsleting pada heater atau lampu.                                                            |
| 14  | Adaptor 5 V DC min. 2 A                             | 1   | Catu daya                                | Kebutuhan total ±0,5 A (lihat anggaran daya)                                 | Cadangan arus besar untuk puncak Wi-Fi dan dua relay.                                                                   |

## Komponen Opsional dan Pengembangan

Tidak ada di rakitan saat ini.

| Komponen                           | Fungsi                                                                 | Spesifikasi                                                           | Keterangan                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Modul RTC DS3231                   | Jam cadangan agar jadwal lampu jalan tanpa internet dan setelah reboot | I²C alamat 0x68 (SDA D21, SCL D22), ±2 ppm, baterai CR2032, 2,3–5,5 V | Versi firmware di commit 2c42b43 sudah mendukungnya. Versi saat ini tanpa RTC. |
| Pemberi pakan (servo atau stepper) | Memberi pakan terjadwal dan Feed Now                                   | Butuh driver motor dan pin tambahan                                   | Backend dan dashboard sudah siap; firmware belum.                              |

## Anggaran Daya

Nilai di bawah adalah nilai umum dari datasheet, bukan hasil pengukuran.

| Beban               | Tegangan                     | Arus                                                      |
| ------------------- | ---------------------------- | --------------------------------------------------------- |
| ESP32 (Wi-Fi aktif) | 3,3 V (dari regulator board) | sekitar 80–250 mA                                         |
| Modul relay 2 kanal | 5 V                          | sekitar 2 × 70 mA saat kedua koil aktif                   |
| Buzzer aktif        | 5 V                          | sekitar 30 mA (hanya saat alarm)                          |
| DS18B20             | 3,3 V                        | sekitar 1–1,5 mA                                          |
| Total terburuk      | 5 V                          | sekitar 0,5 A → adaptor 2 A memberi cadangan 4 kali lipat |
