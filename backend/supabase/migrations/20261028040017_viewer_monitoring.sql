-- Peran viewer: user yang belum punya peran (bukan admin dan bukan owner/member di akuarium mana pun) boleh
-- melihat monitoring akuarium yang ditandai publik, tanpa bisa mengubah apa pun. Admin dapat mematikannya per
-- akuarium. Default true agar user baru langsung bisa melihat monitoring.
alter table public.aquariums
    add column monitoring_public boolean not null default true;
