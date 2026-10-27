import "dotenv/config";
import { db } from "./firebase.js";

// Satu akuarium dipakai bersama semua akun. Harus sama dengan VITE_AQUARIUM_ID di frontend
export const AQUARIUM_ID = process.env.SHARED_AQUARIUM_ID || "aquarium-001";

export const aquariumRef = () => db.collection("aquariums").doc(AQUARIUM_ID);

// Ambil akuarium bersama; null jika ID salah atau dokumen belum ada
export async function findAquarium(aquariumId) {
    if (aquariumId !== AQUARIUM_ID) return null;
    const reference = aquariumRef();
    const snapshot = await reference.get();
    return snapshot.exists ? { reference, data: snapshot.data() } : null;
}

// ---------- Cache config perangkat ----------

// Cache pendek khusus GET /api/hardware/.../config. ESP32 menanyakan config tiap beberapa detik agar perintah
// dashboard cepat berjalan; tanpa cache tiap pertanyaan = 1 baca Firestore. Dibatalkan setiap kali dashboard
// mengubah dokumen. Batas umur untuk berjaga jika dokumen diubah dari luar backend ini
const CONFIG_CACHE_MS = 60_000;
let configCache = null;
let cacheVersion = 0;

export function invalidateConfigCache() {
    cacheVersion += 1;
    configCache = null;
}

export async function findAquariumForDevice(aquariumId) {
    if (aquariumId !== AQUARIUM_ID) return null;
    if (configCache && Date.now() - configCache.cachedAt < CONFIG_CACHE_MS) return configCache.aquarium;

    const version = cacheVersion;
    const aquarium = await findAquarium(aquariumId);
    // Jangan simpan jika dokumen diubah selagi dibaca
    if (aquarium && version === cacheVersion) configCache = { aquarium, cachedAt: Date.now() };
    return aquarium;
}
