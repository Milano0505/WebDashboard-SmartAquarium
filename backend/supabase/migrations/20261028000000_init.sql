-- Skema awal Smart Aquarium. Dijalankan lewat Supabase CLI (supabase db push) atau integrasi GitHub.
--
-- Prinsip keamanan: database HANYA diakses backend lewat koneksi langsung (role postgres). Browser dan ESP32 tidak
-- boleh menyentuhnya. Supabase membuka schema public lewat Data API (REST dan GraphQL) untuk role anon dan
-- authenticated, jadi di bawah ini hak akses role itu dicabut berlapis:
--   1. hak bawaan untuk objek BARU dicabut (blok ini), supaya tabel atau fungsi yang ditambah nanti ikut aman
--   2. hak pada semua objek yang dibuat di sini dicabut (bagian "Keamanan" di akhir berkas)
--   3. RLS diaktifkan pada semua tabel tanpa policy, sebagai pengaman kedua

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
-- PostgreSQL memberi EXECUTE ke PUBLIC (termasuk anon) untuk setiap fungsi baru; hak itu bukan bagian dari
-- pencabutan di atas, jadi dicabut terpisah (berlaku untuk semua schema, untuk objek milik role yang menjalankan migrasi)
alter default privileges revoke execute on functions from public;

-- ---------- Profil user ----------
-- Satu baris per akun Supabase Auth, dibuat otomatis oleh trigger di bawah. Peran admin bersifat global
create table public.profiles (
    id          uuid primary key references auth.users (id) on delete cascade,
    full_name   text        not null check (char_length(full_name) between 1 and 120),
    email       text        not null unique check (email = lower(email)),
    photo_url   text,
    role        text        not null default 'user' check (role in ('admin', 'user')),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, full_name, email)
    values (
        new.id,
        left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)), 120),
        lower(new.email)
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ---------- Akuarium ----------
-- ID berupa teks agar AQUARIUM_ID di firmware tidak perlu diubah. Config disimpan sebagai jsonb dengan bentuk
-- yang sama dengan respons API (validasinya di backend/utils/config-validation.js)
create table public.aquariums (
    id                       text primary key check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
    name                     text        not null check (char_length(name) between 1 and 80),
    hardware_info            jsonb       not null default '{}',
    temp_config              jsonb       not null,
    lighting_config          jsonb       not null,
    feeder_config            jsonb       not null,
    system_config            jsonb       not null,
    feeder_last_triggered_at timestamptz,
    created_by               uuid references public.profiles (id) on delete set null,
    created_at               timestamptz not null default now(),
    updated_at               timestamptz not null default now()
);

-- Peran owner dan member per akuarium
create table public.aquarium_members (
    aquarium_id text        not null references public.aquariums (id) on delete cascade,
    user_id     uuid        not null references public.profiles (id) on delete cascade,
    role        text        not null check (role in ('owner', 'member')),
    created_at  timestamptz not null default now(),
    primary key (aquarium_id, user_id)
);
create index on public.aquarium_members (user_id);

-- Perangkat ESP32. Kunci aslinya tidak disimpan, hanya hash SHA-256
create table public.devices (
    id          uuid primary key default gen_random_uuid(),
    aquarium_id text        not null references public.aquariums (id) on delete cascade,
    name        text        not null check (char_length(name) between 1 and 80),
    key_hash    text        not null unique,
    created_by  uuid references public.profiles (id) on delete set null,
    created_at  timestamptz not null default now()
);
create index on public.devices (aquarium_id);

-- ---------- Status realtime ----------
-- Hanya diisi telemetry perangkat. Dipisah dari aquariums supaya penulisan tiap beberapa detik
-- tidak menyentuh baris config
create table public.device_state (
    aquarium_id           text primary key references public.aquariums (id) on delete cascade,
    current_temp          numeric(4, 1),
    heater_status         text    not null default 'OFF'  check (heater_status in ('ON', 'OFF')),
    led_status            text    not null default 'OFF'  check (led_status in ('ON', 'OFF')),
    feeder_status         text    not null default 'Idle' check (feeder_status in ('Idle', 'Active')),
    last_updated          timestamptz,
    offline_notified      boolean not null default false,
    sensor_error_notified boolean not null default false,
    last_history_at       timestamptz
);

-- Baris status dibuat otomatis untuk setiap akuarium baru
create function public.create_device_state() returns trigger
language plpgsql
as $$
begin
    insert into public.device_state (aquarium_id) values (new.id);
    return new;
end;
$$;

create trigger on_aquarium_created
    after insert on public.aquariums
    for each row execute function public.create_device_state();

-- ---------- Riwayat telemetry ----------
-- Unik per (akuarium, waktu) sehingga pembacaan yang dikirim ulang perangkat tidak menjadi duplikat
create table public.telemetry_history (
    id           bigint generated always as identity primary key,
    aquarium_id  text         not null references public.aquariums (id) on delete cascade,
    recorded_at  timestamptz  not null default now(),
    temp         numeric(4, 1) not null check (temp between -10 and 60),
    heater_state text         not null check (heater_state in ('ON', 'OFF')),
    led_state    text         not null check (led_state in ('ON', 'OFF')),
    feeder_state text         not null check (feeder_state in ('Idle', 'Active')),
    event        text         not null default 'Telemetry update',
    unique (aquarium_id, recorded_at)
);
create index on public.telemetry_history (aquarium_id, recorded_at desc);

-- ---------- Pemakaian lampu per hari (dalam zona waktu akuarium) ----------
create table public.lighting_usage (
    aquarium_id text    not null references public.aquariums (id) on delete cascade,
    day         date    not null,
    on_seconds  numeric not null default 0,
    off_seconds numeric not null default 0,
    primary key (aquarium_id, day)
);

-- ---------- Notifikasi ----------
-- scope 'aquarium': untuk semua anggota akuarium. scope 'user': milik satu user (perubahan profil atau password),
-- tidak menempel pada akuarium sehingga tampil di semua akuarium. dedupe_key mencegah notifikasi ganda
-- ketika perangkat mengirim ulang laporan yang sama
create table public.notifications (
    id           uuid primary key default gen_random_uuid(),
    scope        text        not null check (scope in ('aquarium', 'user')),
    aquarium_id  text references public.aquariums (id) on delete cascade,
    recipient_id uuid references public.profiles (id) on delete cascade,
    actor_id     uuid references public.profiles (id) on delete set null,
    actor_name   text,
    title        text        not null,
    message      text        not null,
    type         text        not null default 'info' check (type in ('info', 'alert', 'success')),
    dedupe_key   text,
    created_at   timestamptz not null default now(),
    check (
        (scope = 'aquarium' and aquarium_id is not null and recipient_id is null)
        or (scope = 'user' and recipient_id is not null)
    )
);
create index on public.notifications (aquarium_id, created_at desc);
create index on public.notifications (recipient_id, created_at desc);
create unique index on public.notifications (aquarium_id, dedupe_key) where dedupe_key is not null;

-- Status baca dan hapus per user
create table public.notification_states (
    notification_id uuid not null references public.notifications (id) on delete cascade,
    user_id         uuid not null references public.profiles (id) on delete cascade,
    read_at         timestamptz,
    dismissed_at    timestamptz,
    primary key (notification_id, user_id)
);

-- ---------- Keamanan ----------
-- RLS tanpa policy menolak semua akses dari role anon dan authenticated; backend memakai koneksi langsung
-- (role postgres, pemilik tabel) sehingga tidak terpengaruh
alter table public.profiles            enable row level security;
alter table public.aquariums           enable row level security;
alter table public.aquarium_members    enable row level security;
alter table public.devices             enable row level security;
alter table public.device_state        enable row level security;
alter table public.telemetry_history   enable row level security;
alter table public.lighting_usage      enable row level security;
alter table public.notifications       enable row level security;
alter table public.notification_states enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
-- Fungsi trigger tidak perlu bisa dipanggil siapa pun; trigger tetap berjalan tanpa hak EXECUTE pemanggil
revoke all on all functions in schema public from public, anon, authenticated;
