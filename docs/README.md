# Dokumentasi

Dokumentasi dipisah menurut bagian sistem.

| Folder                 | Isi                                                                               |
| ---------------------- | --------------------------------------------------------------------------------- |
| [web/](web/)           | Dashboard web: latar belakang, arsitektur, API, database, pengembangan            |
| [hardware/](hardware/) | Perangkat embedded (ESP32): rancangan, komponen, skema, modul firmware, pengujian |

## Web dashboard

| Dokumen                                            | Isi                                                         |
| -------------------------------------------------- | ----------------------------------------------------------- |
| [web/background.md](web/background.md)             | Masalah, solusi, nilai sistem, etika dan dampak             |
| [web/architecture.md](web/architecture.md)         | Blok sistem, aturan desain, alur data, kontrak perangkat    |
| [web/api.md](web/api.md)                           | Semua endpoint, validasi, kode status                       |
| [web/database.md](web/database.md)                 | Skema Firestore, siapa menulis apa, query                   |
| [web/development.md](web/development.md)           | Struktur kode, notifikasi, keamanan, perintah, cara mencoba |
| [web/presentasi-uts.docx](web/presentasi-uts.docx) | Bahan presentasi UTS (dashboard web)                        |

## Hardware

| Dokumen                                                                        | Isi                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| [hardware/design.md](hardware/design.md)                                       | Pembagian hardware/software, ambang, siklus kerja, status     |
| [hardware/components.md](hardware/components.md)                               | Daftar komponen, spesifikasi, alasan pemilihan, anggaran daya |
| [hardware/schematic.md](hardware/schematic.md)                                 | Skema rangkaian, sambungan pin, jalur daya, keselamatan       |
| [hardware/software.md](hardware/software.md)                                   | Modul firmware, library, diagram, driver per modul            |
| [hardware/testing.md](hardware/testing.md)                                     | Pengujian dan debugging tiap modul                            |
| [hardware/presentasi-uts-embedded.docx](hardware/presentasi-uts-embedded.docx) | Bahan presentasi UTS (Embedded System Design Lab)             |

Cara memasang firmware ada di [../device/README.md](../device/README.md).
