import { createHash } from "node:crypto";
import { auth, db } from "../config/firebase.js";
import { createCache } from "../utils/cache.js";

// Peran dan kunci perangkat jarang berubah, dan perubahannya selalu lewat proses ini (invalidate di bawah)
const roleCache = createCache({ ttlMs: 300_000 });
const deviceCache = createCache({ ttlMs: 300_000 });

export const hashDeviceKey = key => createHash("sha256").update(key).digest("hex");

// Dipanggil saat peran user diubah agar berlaku seketika
export const invalidateRole = userId => roleCache.delete(userId);

// Dipanggil saat perangkat dibuat atau dicabut
export const invalidateDevices = () => deviceCache.clear();

// Peran global dari users/{uid}.role ("admin" atau "user"); user tanpa dokumen dianggap "user"
async function globalRole(userId) {
    const cached = roleCache.get(userId);
    if (cached) return cached;
    const snapshot = await db.collection("users").doc(userId).get();
    const role = snapshot.get("role") === "admin" ? "admin" : "user";
    roleCache.set(userId, role);
    return role;
}

// Request dashboard: header "Authorization: Bearer <Firebase ID token>".
// Admin SDK memeriksa tanda tangan RS256, masa berlaku, audience, dan issuer; hasilnya mengisi req.auth
export async function requireAuth(req, res, next) {
    const [scheme, token] = (req.get("authorization") || "").split(" ");
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ message: "Authentication is required." });
    }

    let decoded;
    try {
        decoded = await auth.verifyIdToken(token);
    } catch {
        return res.status(401).json({ message: "The session token is invalid or expired." });
    }

    req.auth = {
        userId: decoded.uid,
        email: decoded.email ? decoded.email.toLowerCase() : null,
        name: decoded.name || null,
        role: await globalRole(decoded.uid),
    };
    return next();
}

export function requireAdmin(req, res, next) {
    if (req.auth?.role !== "admin") return res.status(403).json({ message: "This action requires the admin role." });
    return next();
}

// Request ESP32: header "x-device-key" dicocokkan lewat hash SHA-256 dengan devices/{id}.keyHash.
// Kunci acak 256 bit, jadi hash cepat sudah cukup (bcrypt hanya perlu untuk password yang bisa ditebak).
// Hasilnya mengisi req.device = { deviceId, aquariumId }
export async function requireDeviceKey(req, res, next) {
    const key = req.get("x-device-key") || "";
    if (!key) return res.status(401).json({ message: "A valid device key is required." });

    const keyHash = hashDeviceKey(key);
    let device = deviceCache.get(keyHash);
    if (device === undefined) {
        const snapshot = await db.collection("devices").where("keyHash", "==", keyHash).limit(1).get();
        device = snapshot.empty
            ? null
            : { deviceId: snapshot.docs[0].id, aquariumId: snapshot.docs[0].get("aquariumId") };
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
