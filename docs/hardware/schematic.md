# Skema Rangkaian

Sambungan sinyal data, daya, dan komponen pendukung. Daftar komponen dan alasannya ada di [components.md](components.md).

Gambar skema (Gambar 3) ada di [presentasi-uts-embedded.docx](presentasi-uts-embedded.docx). Berikut sambungannya dalam bentuk tabel; nama komponen sama dengan di gambar tersebut.

| Komponen            | Pin       | Tersambung ke                                                            |
| ------------------- | --------- | ------------------------------------------------------------------------ |
| Adaptor 5 V         | +         | VIN ESP32 dan jalur +5 V; C4 100 µF (kaki + ke +5 V) antara +5 V dan GND |
| Adaptor 5 V         | −         | GND bersama                                                              |
| ESP32               | 3V3       | Jalur +3,3 V (untuk DS18B20 dan R1)                                      |
| DS18B20             | VCC       | +3,3 V; C1 100 nF antara VCC dan GND                                     |
| DS18B20             | GND       | GND                                                                      |
| DS18B20             | DQ        | GPIO4; R1 4,7 kΩ antara DQ dan +3,3 V                                    |
| Modul relay         | VCC       | +5 V; C2 470 µF (kaki + ke +5 V) dan C3 100 nF antara VCC dan GND        |
| Modul relay         | GND       | GND                                                                      |
| Modul relay         | IN1 / IN2 | GPIO18 (heater) / GPIO19 (lampu)                                         |
| Sisi AC             | L (fase)  | Sekering F1 5 A, lalu COM1 dan COM2 disambung bersama                    |
| Sisi AC             | NO1 / NO2 | Heater / lampu, lalu ke N (netral)                                       |
| Buzzer aktif        | +         | +5 V                                                                     |
| Buzzer aktif        | −         | Kolektor Q1                                                              |
| Transistor Q1 (NPN) | Basis     | GPIO5 lewat R2 1 kΩ; R3 10 kΩ dari basis ke GND                          |
| Transistor Q1 (NPN) | Emitor    | GND                                                                      |

## Sambungan Pin ESP32

Nomor pin juga didefinisikan di bagian atas [main.cpp](../../device/src/main.cpp) (`PIN_ONE_WIRE`, `PIN_RELAY_HEATER`, `PIN_RELAY_LAMP`, `PIN_BUZZER`).

| Perangkat           | Pin perangkat | Pin ESP32    | Jenis sinyal                 | Catatan                               |
| ------------------- | ------------- | ------------ | ---------------------------- | ------------------------------------- |
| Sensor suhu DS18B20 | DQ            | GPIO4 (D4)   | 1-Wire (dua arah)            | Pull-up R1 4,7 kΩ ke 3,3 V            |
| Relay heater        | IN1           | GPIO18 (D18) | Keluaran digital, aktif LOW  | LOW = heater menyala                  |
| Relay lampu         | IN2           | GPIO19 (D19) | Keluaran digital, aktif LOW  | LOW = lampu menyala                   |
| Buzzer              | Basis Q1      | GPIO5 (D5)   | Keluaran digital, aktif HIGH | Lewat R2 1 kΩ; HIGH = buzzer berbunyi |

## Jalur Daya

| Jalur  | Dipakai oleh                                    | Sumber                                  |
| ------ | ----------------------------------------------- | --------------------------------------- |
| +5 V   | VIN ESP32, VCC modul relay, kaki + buzzer       | Dari adaptor 5 V (atau USB)             |
| +3,3 V | VCC DS18B20 dan pull-up R1                      | Dari regulator di board ESP32 (pin 3V3) |
| GND    | Semua GND (ESP32, sensor, relay, emitor Q1, R3) | Satu titik GND bersama                  |

## Catatan Perancangan

1. **Relay aktif LOW.** Saat ESP32 reset, pin masih mengambang. Firmware segera menulis HIGH (`initRelay()`), sehingga relay OFF sebelum pin menjadi output.
2. **Buzzer lewat transistor.** R3 10 kΩ menjaga basis Q1 tetap 0 V saat boot, sehingga buzzer tidak berbunyi. GPIO5 adalah pin strapping (dibaca saat boot), tetapi beban kecil lewat transistor tidak mengganggu.
3. **Penyangga daya.** C2 dan C4 menahan tegangan saat koil relay menarik arus sesaat. Tanpa ini ESP32 bisa reset saat relay menyala.
4. **Sisi AC hanya lewat kontak relay.** Sekering F1 5 A dipasang pada jalur fase (L). ESP32 dan sensor tidak tersambung ke listrik AC.

## Keselamatan

- Rakit dan uji dengan beban rendah (LED atau lampu 12 V) sebelum menyambungkan heater dan lampu AC.
- Cabut listrik AC sebelum mengubah kabel di sisi relay.
- Letakkan sambungan AC di dalam kotak tertutup dan jauhkan dari air.
