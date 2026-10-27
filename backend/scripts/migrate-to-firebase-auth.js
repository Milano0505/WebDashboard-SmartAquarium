// Migrasi satu kali dari login buatan sendiri (bcrypt + JWT) ke Firebase Authentication dan peran akuarium.
// Menulis ke Firebase sungguhan, jadi default-nya hanya simulasi:
//   node scripts/migrate-to-firebase-auth.js           (dry run, hanya menampilkan rencana)
//   node scripts/migrate-to-firebase-auth.js --apply   (menjalankan)
//   tambahan --remove-password-hashes menghapus field `password` dari users setelah impor berhasil
//
// Langkah: (1) impor user ke Firebase Auth dengan UID sama dengan ID dokumen (hash bcrypt ikut diimpor,
// jadi password lama tetap berlaku), (2) isi `name`, `members`, `memberIds` akuarium bersama
// (pembuat menjadi owner, lainnya member), (3) daftarkan HARDWARE_API_KEY lama sebagai perangkat akuarium itu
// sehingga firmware tidak perlu di-flash ulang.
import "dotenv/config";
import { createHash } from "node:crypto";
import { auth, admin, db } from "../config/firebase.js";

const apply = process.argv.includes("--apply");
const removeHashes = process.argv.includes("--remove-password-hashes");
const aquariumId = process.env.SHARED_AQUARIUM_ID || "aquarium-001";
const { FieldValue } = admin.firestore;

console.log(apply ? "MODE: APPLY (menulis data)" : "MODE: DRY RUN (tidak menulis apa pun)");

// ---------- 1. User ke Firebase Authentication ----------

const users = await db.collection("users").get();
const importable = [];
for (const document of users.docs) {
    const { email, fullName, password } = document.data();
    if (!email || typeof password !== "string" || !password.startsWith("$2")) {
        console.log(`  lewati ${document.id}: email atau hash bcrypt tidak ada`);
        continue;
    }
    importable.push({
        uid: document.id,
        email,
        displayName: fullName,
        passwordHash: Buffer.from(password),
    });
}
console.log(`User yang akan diimpor ke Firebase Auth: ${importable.length} dari ${users.size}`);

if (apply && importable.length > 0) {
    const result = await auth.importUsers(importable, { hash: { algorithm: "BCRYPT" } });
    console.log(`  berhasil ${result.successCount}, gagal ${result.failureCount}`);
    result.errors.forEach(error => console.log(`  gagal index ${error.index}: ${error.error.message}`));
    if (result.failureCount > 0) {
        console.log("Dihentikan karena ada kegagalan impor; perbaiki lalu jalankan ulang.");
        process.exit(1);
    }
}

// ---------- 2. Keanggotaan akuarium ----------

const reference = db.collection("aquariums").doc(aquariumId);
const snapshot = await reference.get();
if (!snapshot.exists) {
    console.log(`Akuarium ${aquariumId} tidak ditemukan; lewati keanggotaan dan perangkat.`);
} else {
    const creatorId = snapshot.get("userId");
    const members = Object.fromEntries(
        users.docs.map(document => [document.id, document.id === creatorId ? "owner" : "member"]),
    );
    // Tanpa pembuat yang dikenal, jadikan user paling awal sebagai owner agar akuarium tidak tanpa pemilik
    if (!Object.values(members).includes("owner") && users.size > 0) {
        const earliest = [...users.docs].sort(
            (a, b) => (a.get("createdAt")?.toMillis?.() ?? 0) - (b.get("createdAt")?.toMillis?.() ?? 0),
        )[0];
        members[earliest.id] = "owner";
    }
    console.log(`Akuarium ${aquariumId}: ${Object.keys(members).length} anggota`, members);

    const updates = {
        name: snapshot.get("name") || "My Aquarium",
        members,
        memberIds: Object.keys(members),
        createdBy: creatorId ?? null,
    };

    // ---------- 3. Perangkat ----------

    const legacyKey = process.env.HARDWARE_API_KEY;
    const existingDevices = await db.collection("devices").where("aquariumId", "==", aquariumId).limit(1).get();
    const device =
        legacyKey && existingDevices.empty
            ? {
                  name: "ESP32 (migrated)",
                  aquariumId,
                  keyHash: createHash("sha256").update(legacyKey).digest("hex"),
                  createdAt: FieldValue.serverTimestamp(),
              }
            : null;
    console.log(
        device
            ? "Perangkat: HARDWARE_API_KEY lama akan didaftarkan (firmware tidak perlu diubah)"
            : "Perangkat: dilewati (sudah ada perangkat, atau HARDWARE_API_KEY tidak diisi)",
    );

    if (apply) {
        await reference.update(updates);
        if (device) await db.collection("devices").add(device);
    }
}

// ---------- Opsional: hapus hash password lama ----------

if (removeHashes) {
    console.log(`Hash password lama pada ${users.size} user akan dihapus`);
    if (apply) {
        for (let offset = 0; offset < users.docs.length; offset += 400) {
            const batch = db.batch();
            users.docs.slice(offset, offset + 400).forEach(document => {
                batch.update(document.ref, { password: FieldValue.delete() });
            });
            await batch.commit();
        }
    }
}

console.log(apply ? "Selesai." : "Dry run selesai. Jalankan ulang dengan --apply untuk menerapkan.");
process.exit(0);
