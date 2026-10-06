import bcrypt from "bcrypt";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { AQUARIUM_ID, aquariumRef } from "../config/aquarium.js";
import { createDefaultAquarium } from "../config/defaults.js";
import { admin, db } from "../config/firebase.js";
import { JWT_SECRET } from "../config/security.js";
import { requireAuth } from "../middleware/auth.js";
import { toIsoString } from "../utils/firestore.js";
import { notificationsRef, privateNotification } from "../utils/notifications.js";
import { isValidProfilePhotoUrl } from "../utils/profile-photo.js";

const router = Router();
const { FieldValue } = admin.firestore;
const SALT_ROUNDS = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- Fungsi bantu ----------

function createToken(userId) {
    return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "12h", issuer: "smart-aquarium-api" });
}

function createUserProfile(userId, user) {
    return {
        id: userId,
        userId,
        fullName: user.fullName,
        email: user.email,
        photoUrl: user.photoUrl ?? null,
        createdAt: toIsoString(user.createdAt),
    };
}

// Buat akuarium bersama jika belum ada, atau bersihkan field versi lama.
// Dipanggil di dalam transaction, setelah semua read
function prepareSharedAquarium(transaction, snapshot, userId) {
    if (!snapshot.exists) {
        transaction.create(snapshot.ref, createDefaultAquarium(userId));
        return;
    }
    const updates = { memberIds: FieldValue.delete(), "systemConfig.unit": FieldValue.delete() };
    const legacyUnit = snapshot.get("systemConfig.unit");
    if (legacyUnit && !snapshot.get("tempConfig.unit")) updates["tempConfig.unit"] = legacyUnit;
    transaction.update(snapshot.ref, updates);
}

// Akun lama: hapus aquariumId per user agar memakai akuarium bersama
async function joinSharedAquarium(userId) {
    await db.runTransaction(async transaction => {
        const aquariumSnapshot = await transaction.get(aquariumRef());
        transaction.update(db.collection("users").doc(userId), {
            aquariumId: FieldValue.delete(),
            aquariumIds: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        prepareSharedAquarium(transaction, aquariumSnapshot, userId);
    });
}

// Akun lama: pindahkan users/{id}/notifications menjadi notifikasi privat di akuarium
async function migratePrivateNotifications(userId) {
    const legacySnapshot = await db.collection("users").doc(userId).collection("notifications").get();
    for (let offset = 0; offset < legacySnapshot.docs.length; offset += 400) {
        const batch = db.batch();
        legacySnapshot.docs.slice(offset, offset + 400).forEach(document => {
            batch.set(notificationsRef().doc(`profile-${userId}-${document.id}`), {
                ...document.data(),
                userid: userId,
                aquariumId: AQUARIUM_ID,
                scope: "user",
            });
            batch.delete(document.ref);
        });
        await batch.commit();
    }
}

// ---------- Route ----------

router.post("/register", async (req, res) => {
    const fullName = typeof req.body.fullName === "string" ? req.body.fullName.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const photoUrl = req.body.photoUrl ?? null;

    if (!fullName || fullName.length > 120 || !EMAIL_PATTERN.test(email) || password.length < 6) {
        return res.status(400).json({ message: "Provide a valid name, email, and password of at least 6 characters." });
    }
    if (!isValidProfilePhotoUrl(photoUrl)) {
        return res
            .status(400)
            .json({ message: "Profile photo must be a small JPEG data URL, an HTTP(S) URL, or null." });
    }

    const existing = await db.collection("users").where("email", "==", email).limit(1).get();
    if (!existing.empty) return res.status(409).json({ message: "An account with this email already exists." });

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await db.runTransaction(async transaction => {
        const aquariumSnapshot = await transaction.get(aquariumRef());
        transaction.create(db.collection("users").doc(userId), {
            fullName,
            email,
            password: passwordHash,
            photoUrl,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        prepareSharedAquarium(transaction, aquariumSnapshot, userId);
    });

    const userProfile = createUserProfile(userId, { fullName, email, photoUrl, createdAt: new Date() });
    return res.status(201).json({ userId, token: createToken(userId), userProfile });
});

router.post("/login", async (req, res) => {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

    const users = await db.collection("users").where("email", "==", email).limit(1).get();
    const userDoc = users.docs[0];
    // Pesan sama untuk email/password salah agar akun tidak bisa ditebak
    if (!userDoc || !(await bcrypt.compare(password, userDoc.get("password") || ""))) {
        return res.status(401).json({ message: "Invalid email or password." });
    }

    await joinSharedAquarium(userDoc.id);
    await migratePrivateNotifications(userDoc.id);
    return res.json({
        userId: userDoc.id,
        token: createToken(userDoc.id),
        userProfile: createUserProfile(userDoc.id, userDoc.data()),
    });
});

router.post("/change-password", requireAuth, async (req, res) => {
    const currentPassword = typeof req.body.currentPassword === "string" ? req.body.currentPassword : "";
    const newPassword = typeof req.body.newPassword === "string" ? req.body.newPassword : "";
    if (!currentPassword || newPassword.length < 6) {
        return res
            .status(400)
            .json({ message: "Provide the current password and a new password of at least 6 characters." });
    }

    const userRef = db.collection("users").doc(req.auth.userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ message: "User account was not found." });
    if (!(await bcrypt.compare(currentPassword, userDoc.get("password") || ""))) {
        return res.status(400).json({ message: "Current password is incorrect." });
    }

    const batch = db.batch();
    batch.update(userRef, {
        password: await bcrypt.hash(newPassword, SALT_ROUNDS),
        updatedAt: FieldValue.serverTimestamp(),
    });
    batch.create(
        notificationsRef().doc(),
        privateNotification(req.auth.userId, "Password updated", "Your account password was changed."),
    );
    await batch.commit();
    return res.json({ message: "Password updated successfully." });
});

export default router;
