import { Router } from "express";
import { admin, db } from "../config/firebase.js";
import { requireAuth } from "../middleware/auth.js";
import { toIsoString } from "../utils/firestore.js";
import { notificationsRef, privateNotification } from "../utils/notifications.js";
import { isValidProfilePhotoUrl } from "../utils/profile-photo.js";

const router = Router();
router.use(requireAuth);

// ---------- Fungsi bantu ----------

function userProfile(userId, user) {
    return {
        id: userId,
        userId,
        fullName: user.fullName,
        email: user.email,
        photoUrl: user.photoUrl ?? null,
        createdAt: toIsoString(user.createdAt),
        updatedAt: toIsoString(user.updatedAt),
    };
}

// User hanya boleh mengakses profilnya sendiri
function isOwnProfile(req) {
    return req.params.userId === req.auth.userId;
}

// ---------- Route ----------

router.get("/:userId", async (req, res) => {
    if (!isOwnProfile(req)) return res.status(403).json({ message: "You cannot access this user profile." });
    const userDoc = await db.collection("users").doc(req.auth.userId).get();
    if (!userDoc.exists) return res.status(404).json({ message: "User profile was not found." });
    return res.json(userProfile(userDoc.id, userDoc.data()));
});

// Hanya fullName dan photoUrl yang bisa diubah; email tetap
router.put("/:userId", async (req, res) => {
    if (!isOwnProfile(req)) return res.status(403).json({ message: "You cannot update this user profile." });

    const updates = {};
    if (req.body.fullName !== undefined) {
        const fullName = typeof req.body.fullName === "string" ? req.body.fullName.trim() : "";
        if (!fullName || fullName.length > 120) {
            return res.status(400).json({ message: "Full name must be between 1 and 120 characters." });
        }
        updates.fullName = fullName;
    }
    if (req.body.photoUrl !== undefined) {
        if (!isValidProfilePhotoUrl(req.body.photoUrl)) {
            return res
                .status(400)
                .json({ message: "Profile photo must be a small JPEG data URL, an HTTP(S) URL, or null." });
        }
        updates.photoUrl = req.body.photoUrl;
    }
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No supported profile fields were provided." });
    }

    const userRef = db.collection("users").doc(req.auth.userId);
    const currentUser = (await userRef.get()).data() || {};
    if (Object.keys(updates).every(field => updates[field] === currentUser[field])) {
        return res.json({ updatedAt: new Date().toISOString(), message: "No profile changes detected." });
    }

    const batch = db.batch();
    batch.update(userRef, { ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    batch.create(
        notificationsRef().doc(),
        privateNotification(req.auth.userId, "Profile updated", "Your profile information was updated."),
    );
    await batch.commit();
    return res.json({ updatedAt: new Date().toISOString(), message: "Profile updated successfully." });
});

export default router;
