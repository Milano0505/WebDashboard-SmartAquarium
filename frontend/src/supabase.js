// Supabase dipakai di browser HANYA untuk autentikasi (login, daftar, sesi). Data tidak pernah diambil dari sini:
// semuanya lewat backend. Klien lengkapnya (yang punya .from(), .rpc(), .storage) sengaja tidak diekspor,
// jadi kode lain tidak bisa mengakses database langsung dari browser. Nilai env dari Project Settings > API
// (URL dan anon/publishable key; keduanya memang publik)
import { createClient } from "@supabase/supabase-js";

const client = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
});

export const auth = client.auth;
