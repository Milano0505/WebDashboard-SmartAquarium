import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { query } from "../config/db.js";
import { createCache } from "../utils/cache.js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set (contoh di backend/.env.example).");
}

// Klien hanya untuk memverifikasi token; tidak menyimpan sesi
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

// Token terverifikasi disimpan sebentar: project dengan kunci simetris (HS256) menanyakan server Auth di tiap
// verifikasi. Umur cache jauh lebih pendek dari umur token (1 jam)
const tokenCache = createCache({ ttlMs: 30_000, maxEntries: 200 });
// Peran dan kunci perangkat jarang berubah, dan perubahannya selalu lewat proses ini (invalidate di bawah)
const roleCache = createCache({ ttlMs: 300_000 });
const deviceCache = createCache({ ttlMs: 300_000 });

export const hashDeviceKey = key => createHash("sha256").update(key).digest("hex");

// Dipanggil saat peran user diubah agar berlaku seketika
export const invalidateRole = userId => roleCache.delete(userId);

// Dipanggil saat perangkat dibuat atau dicabut
export const invalidateDevices = () => deviceCache.clear();

// Peran global dari profiles.role ("admin" atau "user"); user tanpa profil dianggap "user"
async function globalRole(userId) {
    const cached = roleCache.get(userId);
    if (cached) return cached;
    const { rows } = await query("select role from profiles where id = $1", [userId]);
    const role = rows[0]?.role === "admin" ? "admin" : "user";
    roleCache.set(userId, role);
    return role;
}

// Verifikasi access token Supabase. Untuk project dengan JWT signing key asimetris, tanda tangan dan masa
// berlaku diperiksa lokal lewat JWKS; untuk kunci simetris SDK menanyakan server Auth
async function verifyToken(token) {
    const cached = tokenCache.get(token);
    if (cached) return cached;

    const { data, error } = await supabase.auth.getClaims(token);
    const claims = data?.claims;
    if (error || !claims?.sub) return null;
    tokenCache.set(token, claims);
    return claims;
}

// Request dashboard: header "Authorization: Bearer <access token Supabase>", mengisi req.auth
export async function requireAuth(req, res, next) {
    const [scheme, token] = (req.get("authorization") || "").split(" ");
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ message: "Authentication is required." });
    }

    const claims = await verifyToken(token).catch(() => null);
    if (!claims) return res.status(401).json({ message: "The session token is invalid or expired." });

    req.auth = {
        userId: claims.sub,
        email: claims.email ? claims.email.toLowerCase() : null,
        name: claims.user_metadata?.full_name || null,
        role: await globalRole(claims.sub),
    };
    return next();
}

export function requireAdmin(req, res, next) {
    if (req.auth?.role !== "admin") return res.status(403).json({ message: "This action requires the admin role." });
    return next();
}

// Request ESP32: header "x-device-key" dicocokkan lewat hash SHA-256 dengan devices.key_hash.
// Kunci acak 256 bit, jadi hash cepat sudah cukup (bcrypt hanya perlu untuk password yang bisa ditebak).
// Hasilnya mengisi req.device = { deviceId, aquariumId }
export async function requireDeviceKey(req, res, next) {
    const key = req.get("x-device-key") || "";
    if (!key) return res.status(401).json({ message: "A valid device key is required." });

    const keyHash = hashDeviceKey(key);
    let device = deviceCache.get(keyHash);
    if (device === undefined) {
        const { rows } = await query("select id, aquarium_id from devices where key_hash = $1", [keyHash]);
        device = rows[0] ? { deviceId: rows[0].id, aquariumId: rows[0].aquarium_id } : null;
        deviceCache.set(keyHash, device);
    }
    if (!device) return res.status(401).json({ message: "A valid device key is required." });

    req.device = device;
    return next();
}

// Perangkat hanya boleh memakai akuarium miliknya sendiri
export function requireOwnAquarium(req, res, next) {
    if (req.params.aquariumId !== req.device.aquariumId) {
        return res.status(403).json({ message: "This device key does not belong to this aquarium." });
    }
    return next();
}
