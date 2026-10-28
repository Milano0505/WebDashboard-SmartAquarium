-- Satu akuarium hanya punya satu perangkat (ESP32). Kendala unik ini menjaga aturan itu langsung di database,
-- sekalipun ada dua permintaan pendaftaran yang bersamaan.
-- Jika sudah ada akuarium dengan lebih dari satu perangkat, migrasi berhenti dengan error "could not create unique
-- index ... is duplicated". Cabut perangkat yang berlebih dari halaman Access, lalu jalankan ulang.
alter table public.devices
    add constraint devices_one_per_aquarium unique (aquarium_id);

-- Kendala unik sudah membuat indeks pada aquarium_id, jadi indeks biasa menjadi mubazir
drop index if exists public.devices_aquarium_id_idx;
