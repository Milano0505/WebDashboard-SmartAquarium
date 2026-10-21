# Konvensi kode, dokumentasi, dan commit

## Format dan komentar

- **Prettier** dengan `.prettierrc.json` di root (4 spasi, lebar 120, `arrowParens: avoid`). Jalankan `npm run format` (backend) atau `pnpm format` (frontend) setelah mengubah kode.
- **Komentar**: bahasa Indonesia, singkat, hanya untuk hal yang tidak terlihat dari kode (alasan, satuan, kontrak antar-bagian). Jangan menulis komentar yang mengulang isi kode.
- **Pembatas bagian** di dalam file: `// ---------- Nama Bagian ----------`.

## Bahasa

| Bagian                             | Bahasa    |
| ---------------------------------- | --------- |
| Komentar kode                      | Indonesia |
| Teks UI dan pesan error API        | Inggris   |
| README.md, docs/, device/README.md | Indonesia |
| Pesan commit                       | Inggris   |

## Dokumentasi

Setiap informasi hanya ditulis di **satu** dokumen; dokumen lain cukup menautkan.

| Yang berubah                                             | Dokumen yang diperbarui                       |
| -------------------------------------------------------- | --------------------------------------------- |
| Masalah, solusi, nilai sistem, etika dan dampak          | `docs/web/background.md`                      |
| Blok sistem, aturan desain, alur data, kontrak perangkat | `docs/web/architecture.md`                    |
| Endpoint, input/output, validasi, kode status            | `docs/web/api.md`                             |
| Koleksi atau field Firestore, query                      | `docs/web/database.md`                        |
| Struktur kode, halaman, notifikasi, keamanan, perintah   | `docs/web/development.md`                     |
| Pemasangan, koneksi ke backend, perilaku firmware        | `device/README.md`                            |
| Komponen, skema, pin, jalur daya                         | `docs/hardware/components.md`, `schematic.md` |
| Rancangan hardware/software, ambang                      | `docs/hardware/design.md`                     |
| Modul firmware, library, diagram, driver                 | `docs/hardware/software.md`                   |
| Pengujian dan debugging perangkat                        | `docs/hardware/testing.md`                    |
| Fitur, cara menjalankan, variabel environment            | `README.md`                                   |
| Konteks atau aturan untuk Claude                         | `.claude/CLAUDE.md` atau `.claude/rules/`     |

- Dokumentasi dashboard web ada di `docs/web/`, dokumentasi perangkat embedded di `docs/hardware/`. Jangan dicampur.
- Berkas Word presentasi (`docs/web/presentasi-uts.docx`, `docs/hardware/presentasi-uts-embedded.docx`) dibuat dari isi dokumen di folder yang sama; perbarui jika isinya berubah.
- Perubahan kode dan dokumentasinya masuk **commit yang sama**.
- Tulis dengan bahasa sederhana: kalimat pendek, jelaskan istilah teknis saat pertama dipakai, utamakan tabel dan langkah bernomor.
- Rapikan Markdown dengan Prettier: `npx prettier --write <file>.md` dari folder `frontend/`.

## Commit

Conventional Commits dalam bahasa Inggris:

```text
<type>: <ringkasan imperatif, maks. ~72 karakter>

- poin perubahan

BREAKING CHANGE: <jika kontrak API dengan perangkat berubah>
```

- Tipe: `feat`, `fix`, `refactor`, `docs`, `chore`.
- Gunakan `BREAKING CHANGE:` untuk perubahan yang memengaruhi klien lain, terutama ESP32.
- Perubahan data Firestore bukan bagian dari commit.
