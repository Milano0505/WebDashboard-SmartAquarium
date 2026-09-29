import { Router } from "express";
import { admin, db } from "../config/firebase.js";
import { requireAuth } from "../middleware/auth.js";
import { aquariumIdFor, toIsoString } from "../utils/firestore.js";
import { isValidProfilePhotoUrl } from "../utils/profile-photo.js";

const router = Router();
router.use(requireAuth);

function userProfile(userId, user) {
    return {
        id: userId,
        userId,
        aquariumId: aquariumIdFor(userId),
        fullName: user.fullName,
        email: user.email,
        photoUrl: user.photoUrl ?? null,
        createdAt: toIsoString(user.createdAt),
        updatedAt: toIsoString(user.updatedAt),
    };
}

router.get("/:userId", async (req, res) => {
    if (req.params.userId !== req.auth.userId)
        return res.status(403).json({ message: "You cannot access this user profile." });
    const userDoc = await db.collection("users").doc(req.auth.userId).get();
    if (!userDoc.exists) return res.status(404).json({ message: "User profile was not found." });
    return res.json(userProfile(userDoc.id, userDoc.data()));
});

router.put("/:userId", async (req, res) => {
    if (req.params.userId !== req.auth.userId)
        return res.status(403).json({ message: "You cannot update this user profile." });
    const updates = {};

    if (req.body.fullName !== undefined) {
        if (
            typeof req.body.fullName !== "string" ||
            !req.body.fullName.trim() ||
            req.body.fullName.trim().length > 120
        ) {
            return res.status(400).json({ message: "Full name must be between 1 and 120 characters." });
        }
        updates.fullName = req.body.fullName.trim();
    }

    if (req.body.photoUrl !== undefined) {
        if (!isValidProfilePhotoUrl(req.body.photoUrl)) {
            return res
                .status(400)
                .json({ message: "Profile photo must be a small JPEG data URL, an HTTP(S) URL, or null." });
        }
        updates.photoUrl = req.body.photoUrl;
    }

    if (Object.keys(updates).length === 0)
        return res.status(400).json({ message: "No supported profile fields were provided." });
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    const userRef = db.collection("users").doc(req.auth.userId);
    await userRef.update(updates);
    return res.json({
        updatedAt: new Date().toISOString(),
        message: "Profile updated successfully.",
    });
});

export default router;
