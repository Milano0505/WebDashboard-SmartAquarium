import "dotenv/config";
import { db } from "./firebase.js";
import { createCache } from "../utils/cache.js";
import { forbidden } from "../utils/errors.js";
import { hasRole, isValidAquariumId, roleInAquarium } from "../utils/access.js";

export const aquariumsRef = () => db.collection("aquariums");

export const aquariumRef = aquariumId => aquariumsRef().doc(aquariumId);

// Dokumen akuarium dibaca di hampir setiap request (cek akses, dashboard, telemetry, config perangkat), jadi
// disimpan di memori. Setiap penulisan ke dokumen ini harus memanggil invalidateAquarium
const aquariumCache = createCache({ ttlMs: 60_000, maxEntries: 200 });

export const invalidateAquarium = aquariumId => aquariumCache.delete(aquariumId);

// Ambil akuarium tanpa pemeriksaan akses (dipakai perangkat dan proses internal); null jika tidak ada
export async function getAquarium(aquariumId) {
    if (!isValidAquariumId(aquariumId)) return null;
    return aquariumCache.load(aquariumId, async () => {
        const reference = aquariumRef(aquariumId);
        const snapshot = await reference.get();
        return snapshot.exists ? { reference, data: snapshot.data() } : null;
    });
}

// Ambil akuarium untuk user yang login sekaligus memeriksa perannya.
// null = akuarium tidak ada (404); user yang bukan anggota atau perannya kurang ditolak dengan 403
export async function findAquarium(aquariumId, auth, minimumRole = "member") {
    const aquarium = await getAquarium(aquariumId);
    if (!aquarium) return null;

    const role = roleInAquarium(auth, aquarium.data);
    if (!role) throw forbidden("You do not have access to this aquarium.");
    if (!hasRole(role, minimumRole)) throw forbidden(`This action requires the ${minimumRole} role.`);
    return { ...aquarium, role };
}
