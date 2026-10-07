# Konvensi kode, dokumentasi, dan commit

## Format dan komentar

- **Prettier** dengan `.prettierrc.json` di root (4 spasi, lebar 120, `arrowParens: avoid`). Jalankan `npm run format` (backend) atau `pnpm format` (frontend) setelah mengubah kode. Jangan kembali ke oxfmt; versi lamanya menghapus titik koma.
- **Komentar**: bahasa Indonesia, singkat, hanya untuk hal yang tidak terlihat dari kode (alasan, satuan, kontrak antar-bagian). Jangan menulis komentar yang mengulang isi kode.
- **Pembatas bagian** di dalam file: `// ---------- Nama Bagian ----------` (contoh: `Fungsi bantu`, `Route`, `Tab Overview`, `Halaman`).

## Bahasa

| Bagian                      | Bahasa    |
| --------------------------- | --------- |
| Komentar kode               | Indonesia |
| Teks UI dan pesan error API | Inggris   |
| README.md, docs/            | Indonesia |
| Pesan commit                | Inggris   |

## Dokumentasi

Setiap informasi hanya ditulis di **satu** dokumen; dokumen lain cukup menautkan.

| Yang berubah                                                 | Dokumen yang diperbarui                   |
| ------------------------------------------------------------ | ----------------------------------------- |
| Masalah, solusi, nilai sistem, etika dan dampak              | `docs/background.md`                      |
| Blok sistem, modul, prinsip desain, daftar teknologi         | `docs/architecture.md`                    |
| Resource, endpoint, input/output, validasi, kode status      | `docs/api.md`                             |
| Struktur backend, alur request, notifikasi, keamanan         | `docs/backend.md`                         |
| Koleksi atau field Firestore, query                          | `docs/database.md`                        |
| Halaman, pembaruan otomatis, status perangkat di tampilan    | `docs/frontend.md`                        |
| Alur frontend → backend → database, kontrak dengan perangkat | `docs/integrations.md`                    |
| Cara menghubungkan ESP32, contoh kode penghubung firmware    | `docs/esp32-connection.md`                |
| Fitur, cara menjalankan, variabel environment                | `README.md`                               |
| Konteks atau aturan untuk Claude                             | `.claude/CLAUDE.md` atau `.claude/rules/` |

- Dokumentasi hanya membahas **sistem web**; jangan menambahkan detail perangkat keras atau firmware. Pengecualian: `docs/esp32-connection.md` boleh berisi kode firmware, tetapi **hanya kode penghubung** ke API (Wi-Fi, baca config, kirim telemetry), tanpa kode sensor atau aktuator.
- Tulis dengan bahasa yang sederhana dan jelas: kalimat pendek, jelaskan istilah teknis saat pertama dipakai, utamakan tabel dan langkah bernomor.
- Rapikan tabel Markdown dengan Prettier (`npx prettier --write <file>.md` dari folder `frontend/`).

## Commit

Conventional Commits dalam bahasa Inggris, mengikuti riwayat repo:

```text
<type>: <ringkasan imperatif, maks. ~72 karakter>

<Grup>
- poin perubahan
- poin perubahan

BREAKING CHANGE: <jika kontrak API dengan perangkat berubah>
```

- Tipe: `feat`, `fix`, `refactor`, `docs`, `chore`.
- Gunakan `BREAKING CHANGE:` untuk perubahan yang memengaruhi klien lain, terutama ESP32.
- Perubahan data Firestore bukan bagian dari commit.
