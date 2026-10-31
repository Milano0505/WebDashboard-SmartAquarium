import { createClient } from "@supabase/supabase-js";

// supabase client
const supabaseClient = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
});

// auth only
export const supabaseAuth = supabaseClient.auth;
