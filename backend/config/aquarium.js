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
