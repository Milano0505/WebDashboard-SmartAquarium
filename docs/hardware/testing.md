# Pengujian dan Debugging Hardware

Cara menguji tiap modul perangkat. Tidak ada test otomatis, jadi pengujian dilakukan di perangkat dengan Serial Monitor (115200 baud). Kolom **Hasil yang diharapkan** adalah acuan lulus/gagal. Masalah koneksi ke backend ada di [device/README.md](../../device/README.md#masalah-umum).

## Urutan Pengujian

1. **Per modul, terpisah.** Uji sensor, relay, buzzer, dan jam NTP satu per satu sebelum digabung.
2. **Beban rendah dulu.** Pakai LED atau lampu 12 V sebelum heater dan lampu AC.
3. **Firmware penuh dengan backend.** Uji siklus config dan telemetry.
4. **Uji kegagalan.** Cabut sensor, matikan backend, matikan listrik.

## Alat Bantu

| Alat                           | Yang dilihat                                                           | Kegunaan                                               |
| ------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| Serial Monitor 115200          | Log berlabel: [TEMP] [HEATER] [LAMP] [TIME] [ALARM] [CFG] [WIFI] [API] | Melihat alur program dan alasan keputusan              |
| Multimeter                     | Tegangan rel 5 V dan 3,3 V, tegangan DQ, kontinuitas COM-NO            | Memisahkan masalah kabel dan catu dari masalah program |
| Dashboard dan Firebase Console | Badge Device online, notifikasi, dokumen telemetry_history             | Memastikan data sampai ke ujung sistem                 |
| Browser smartphone             | http://IP-laptop:5000/api/health                                       | Memastikan backend terjangkau dari Wi-Fi yang sama     |
| Uji beban rendah               | Pakai LED atau lampu 12 V sebelum beban AC                             | Aman saat rangkaian baru dirakit                       |

## Uji per Modul

### Sensor suhu DS18B20

| Kode | Uji             | Langkah                                                          | Hasil yang diharapkan                                                                                                                             |
| ---- | --------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1   | Pembacaan dasar | Nyalakan ESP32, buka Serial Monitor 115200, rendam probe di air. | Muncul "DS18B20 sensors found: 1" dan "[TEMP] xx.xx C" tiap 5 detik.                                                                              |
| T2   | Akurasi         | Bandingkan dengan termometer referensi di air yang sama.         | Selisih dalam ±0,5 °C.                                                                                                                            |
| T3   | Sensor terputus | Cabut kabel data (D4) saat berjalan.                             | "[TEMP] Sensor read failed."; heater OFF; buzzer berbunyi; "[API] Telemetry skipped"; dashboard menandai perangkat offline setelah batas offline. |
| T4   | Pull-up         | Ukur tegangan DQ saat bus diam dengan multimeter.                | Sekitar 3,3 V; jika 0 V, R1 belum terpasang.                                                                                                      |
| T5   | Pemutus 36 °C   | Rendam probe di air hangat ±37 °C.                               | Heater OFF dan alarm "Temperature too high" walau mode manual ON.                                                                                 |

### Jam lokal (NTP)

| Kode | Uji                | Langkah                                                      | Hasil yang diharapkan                                                                                       |
| ---- | ------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| T1   | Sinkron NTP        | Nyalakan ESP32 dengan Wi-Fi tersambung internet.             | "[TIME] Timezone Asia/Jakarta, syncing with NTP." lalu "[TIME] NTP synced: hh:mm:ss" dengan jam yang benar. |
| T2   | Zona waktu         | Ganti zona waktu di dashboard.                               | Jam di log mengikuti zona baru pada siklus berikutnya.                                                      |
| T3   | Zona tidak dikenal | Pilih zona yang tidak ada di tabel ZONES.                    | "Timezone ... is not in the firmware list"; lampu otomatis mati.                                            |
| T4   | Jadwal lampu       | Atur jadwal mulai 2 menit dari sekarang pada mode AUTOMATIC. | "[LAMP] ON" tepat pada menit mulai dan "[LAMP] OFF" pada menit selesai.                                     |
| T5   | Tanpa internet     | Nyalakan ESP32 tanpa Wi-Fi.                                  | Lampu otomatis mati (jam belum diketahui); lampu manual dan heater tetap bekerja.                           |

### Modul relay 2 kanal (heater dan lampu)

| Kode | Uji           | Langkah                                                             | Hasil yang diharapkan                                                            |
| ---- | ------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| T1   | Keadaan awal  | Nyalakan ESP32 dan amati relay.                                     | Kedua relay OFF dan tidak berkedip saat boot.                                    |
| T2   | Mode manual   | Di dashboard, nyalakan dan matikan heater lalu lampu.               | Terdengar klik relay dan LED menyala; log "[HEATER] ON/OFF" dan "[LAMP] ON/OFF". |
| T3   | Kontak        | Ukur kontinuitas COM-NO dengan multimeter (tanpa beban AC).         | Tertutup saat ON, terbuka saat OFF.                                              |
| T4   | Tegangan catu | Ukur rel 5 V saat kedua relay menyala.                              | Tidak turun di bawah sekitar 4,75 V dan ESP32 tidak reset.                       |
| T5   | Hysteresis    | Mode AUTOMATIC dengan target 26 °C; hangatkan atau dinginkan probe. | Heater ON di bawah 25,5 °C dan OFF mulai 26,5 °C.                                |

### Buzzer aktif (alarm)

| Kode | Uji            | Langkah                                  | Hasil yang diharapkan                                               |
| ---- | -------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| T1   | Batas bawah    | Atur suhu min di atas suhu air saat ini. | "[ALARM] Temperature too low"; buzzer berbunyi 150 ms tiap 1 detik. |
| T2   | Kembali normal | Kembalikan batas ke nilai wajar.         | "[ALARM] Back to normal." dan buzzer diam.                          |
| T3   | Saat boot      | Nyalakan ESP32.                          | Buzzer tidak berbunyi (R3 menahan basis).                           |

### Wi-Fi dan klien REST API

| Kode | Uji          | Langkah                                  | Hasil yang diharapkan                                                        |
| ---- | ------------ | ---------------------------------------- | ---------------------------------------------------------------------------- |
| T1   | Koneksi      | Jalankan backend, upload firmware.       | "[WIFI] ... connected", "[API] Config: ...", "[API] Telemetry sent: ...".    |
| T2   | Config baru  | Ubah suhu target di dashboard.           | Siklus berikutnya menampilkan nilai baru di log dan relay mengikuti.         |
| T3   | Backend mati | Hentikan backend.                        | Log "failed (HTTP -1)"; heater dan lampu tetap jalan dengan config terakhir. |
| T4   | Mati listrik | Cabut dan colok ESP32 saat backend mati. | "[CFG] Restored the last config from flash."                                 |
| T5   | Kunci salah  | Ubah DEVICE_KEY di secrets.h.            | "(HTTP 401) A valid device key is required."                                 |

## Uji Logika Murni

Fungsi berikut tidak menyentuh hardware, sehingga hasilnya bisa dihitung dari kode.

| Pemanggilan                     | Hasil | Keterangan                                       |
| ------------------------------- | ----- | ------------------------------------------------ |
| inSchedule(19:00, 18:00, 06:00) | true  | Jadwal melewati tengah malam                     |
| inSchedule(07:00, 18:00, 06:00) | false | Di luar jadwal                                   |
| inSchedule(now, 08:00, 08:00)   | false | Awal sama dengan akhir dianggap tidak ada jadwal |
| parseClockTime("12:00 AM")      | 0     | Tengah malam                                     |
| parseClockTime("12:30 PM")      | 750   | 12,5 jam × 60 menit                              |
| parseClockTime("08:00 AM")      | 480   | Format dari dashboard                            |
| parseClockTime("")              | -1    | Jadwal belum diatur                              |
