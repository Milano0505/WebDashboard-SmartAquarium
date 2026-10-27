import { Router } from "express";
import { admin, db } from "../config/firebase.js";
import { invalidateRole, requireAuth } from "../middleware/auth.js";
import { toIsoString } from "../utils/firestore.js";
import { addPrivateNotifications, invalidateNotifications } from "../utils/notifications.js";
import { isValidProfilePhotoUrl } from "../utils/profile-photo.js";

// Register, login, dan ganti password dikerjakan Firebase Authentication di browser.
// Backend hanya membuat salinan profil di Firestore (users/{uid}) dan memverifikasi ID token di setiap request.
const router = Router();
const { FieldValue } = admin.firestore;

// Email yang otomatis menjadi admin saat sesi dibuka (pemula sistem; selanjutnya admin mengatur lewat dashboard)
const ADMIN_EMAILS = new Set(
    (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map(email => email.trim().toLowerCase())
        .filter(Boolean),
);

// ---------- Fungsi bantu ----------

function createUserProfile(userId, user) {
    return {
        id: userId,
        userId,
        fullName: user.fullName,
        email: user.email,
        role: user.role === "admin" ? "admin" : "user",
        photoUrl: user.photoUrl ?? null,
        createdAt: toIsoString(user.createdAt),
    };
}

// ---------- Route ----------

// Dipanggil frontend setelah register/login dan setiap aplikasi dibuka.
// Membuat profil jika belum ada, atau menyegarkan peran admin dari ADMIN_EMAILS, lalu mengembalikan profil
router.post("/session", requireAuth, async (req, res) => {
    const { userId, email } = req.auth;
    if (!email) return res.status(400).json({ message: "The account has no email address." });

    const fullName =
        typeof req.body.fullName === "string" && req.body.fullName.trim()
            ? req.body.fullName.trim()
            : req.auth.name || email.split("@")[0];
    const photoUrl = req.body.photoUrl ?? null;
    if (fullName.length > 120) return res.status(400).json({ message: "Full name must be at most 120 characters." });
    if (!isValidProfilePhotoUrl(photoUrl)) {
        return res
            .status(400)
            .json({ message: "Profile photo must be a small JPEG data URL, an HTTP(S) URL, or null." });
    }

    const shouldBeAdmin = ADMIN_EMAILS.has(email);
    const reference = db.collection("users").doc(userId);
    const profile = await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) {
            const created = {
                fullName,
                email,
                role: shouldBeAdmin ? "admin" : "user",
                photoUrl,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            };
            transaction.create(reference, created);
            return { ...created, createdAt: new Date() };
        }

        const data = snapshot.data();
        if (shouldBeAdmin && data.role !== "admin") {
            transaction.update(reference, { role: "admin", updatedAt: FieldValue.serverTimestamp() });
            return { ...data, role: "admin" };
        }
        return data;
    });

    invalidateRole(userId);
    return res.json({ userId, userProfile: createUserProfile(userId, profile) });
});

// Password diganti di browser lewat Firebase; endpoint ini hanya mencatat notifikasi privat
router.post("/password-changed", requireAuth, async (req, res) => {
    const batch = db.batch();
    const notified = await addPrivateNotifications(
        batch,
        req.auth.userId,
        "Password updated",
        "Your account password was changed.",
    );
    await batch.commit();
    notified.forEach(invalidateNotifications);
    return res.json({ message: "Password change recorded." });
});

export default router;
