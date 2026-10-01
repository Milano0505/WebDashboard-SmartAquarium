import bcrypt from "bcrypt";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { AQUARIUM_ID } from "../config/aquarium.js";
import { createDefaultAquarium } from "../config/defaults.js";
import { admin, db } from "../config/firebase.js";
import { JWT_SECRET } from "../config/security.js";
import { requireAuth } from "../middleware/auth.js";
import { toIsoString } from "../utils/firestore.js";
import { isValidProfilePhotoUrl } from "../utils/profile-photo.js";

const router = Router();
const SALT_ROUNDS = 12;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createToken(userId) {
    return jwt.sign({ sub: userId }, JWT_SECRET, {
        expiresIn: "12h",
        issuer: "smart-aquarium-api",
    });
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

async function joinSharedAquarium(userId) {
    const sharedRef = db.collection("aquariums").doc(AQUARIUM_ID);
    const userRef = db.collection("users").doc(userId);
    await db.runTransaction(async transaction => {
        const sharedSnapshot = await transaction.get(sharedRef);
        transaction.update(userRef, {
            aquariumId: admin.firestore.FieldValue.delete(),
            aquariumIds: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        if (sharedSnapshot.exists) {
            const aquariumUpdates = {
                memberIds: admin.firestore.FieldValue.delete(),
                "systemConfig.unit": admin.firestore.FieldValue.delete(),
            };
            const legacyUnit = sharedSnapshot.get("systemConfig.unit");
            if (legacyUnit && !sharedSnapshot.get("tempConfig.unit")) aquariumUpdates["tempConfig.unit"] = legacyUnit;
            transaction.update(sharedRef, aquariumUpdates);
        } else {
            transaction.create(sharedRef, createDefaultAquarium(userId));
        }
    });
}

async function migratePrivateNotifications(userId) {
    const legacyRef = db.collection("users").doc(userId).collection("notifications");
    const legacySnapshot = await legacyRef.get();
    for (let offset = 0; offset < legacySnapshot.docs.length; offset += 400) {
        const batch = db.batch();
        legacySnapshot.docs.slice(offset, offset + 400).forEach(document => {
            const notificationRef = db
                .collection("aquariums")
                .doc(AQUARIUM_ID)
                .collection("notifications")
                .doc(`profile-${userId}-${document.id}`);
            batch.set(notificationRef, {
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

router.post("/register", async (req, res) => {
    const fullName = typeof req.body.fullName === "string" ? req.body.fullName.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const photoUrl = req.body.photoUrl === undefined ? null : req.body.photoUrl;

    if (!fullName || fullName.length > 120 || !emailPattern.test(email) || password.length < 6) {
        return res.status(400).json({
            message: "Provide a valid name, email, and password of at least 6 characters.",
        });
    }
    if (!isValidProfilePhotoUrl(photoUrl)) {
        return res.status(400).json({
            message: "Profile photo must be a small JPEG data URL, an HTTP(S) URL, or null.",
        });
    }

    const existing = await db.collection("users").where("email", "==", email).limit(1).get();
    if (!existing.empty) return res.status(409).json({ message: "An account with this email already exists." });

    const userId = randomUUID();
    const userRef = db.collection("users").doc(userId);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const now = admin.firestore.FieldValue.serverTimestamp();
    const aquariumRef = db.collection("aquariums").doc(AQUARIUM_ID);
    await db.runTransaction(async transaction => {
        const aquariumSnapshot = await transaction.get(aquariumRef);
        transaction.create(userRef, {
            fullName,
            email,
            password: passwordHash,
            photoUrl,
            createdAt: now,
            updatedAt: now,
        });
        if (!aquariumSnapshot.exists) {
            transaction.create(aquariumRef, createDefaultAquarium(userId));
        } else {
            const aquariumUpdates = {
                memberIds: admin.firestore.FieldValue.delete(),
                "systemConfig.unit": admin.firestore.FieldValue.delete(),
            };
            const legacyUnit = aquariumSnapshot.get("systemConfig.unit");
            if (legacyUnit && !aquariumSnapshot.get("tempConfig.unit")) aquariumUpdates["tempConfig.unit"] = legacyUnit;
            transaction.update(aquariumRef, aquariumUpdates);
        }
    });

    const userProfile = createUserProfile(userId, {
        fullName,
        email,
        photoUrl,
        createdAt: new Date(),
    });
    return res.status(201).json({ userId, token: createToken(userId), userProfile });
});

router.post("/login", async (req, res) => {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

    const users = await db.collection("users").where("email", "==", email).limit(1).get();
    if (users.empty) return res.status(401).json({ message: "Invalid email or password." });

    const userDoc = users.docs[0];
    const user = userDoc.data();
    const passwordMatches = await bcrypt.compare(password, user.password || "");
    if (!passwordMatches) return res.status(401).json({ message: "Invalid email or password." });

    await joinSharedAquarium(userDoc.id);
    await migratePrivateNotifications(userDoc.id);
    const userProfile = createUserProfile(userDoc.id, user);
    return res.json({
        userId: userDoc.id,
        token: createToken(userDoc.id),
        userProfile,
    });
});

router.post("/change-password", requireAuth, async (req, res) => {
    const currentPassword = typeof req.body.currentPassword === "string" ? req.body.currentPassword : "";
    const newPassword = typeof req.body.newPassword === "string" ? req.body.newPassword : "";
    if (!currentPassword || newPassword.length < 6) {
        return res.status(400).json({
            message: "Provide the current password and a new password of at least 6 characters.",
        });
    }

    const userRef = db.collection("users").doc(req.auth.userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ message: "User account was not found." });

    const user = userDoc.data();
    if (!(await bcrypt.compare(currentPassword, user.password || ""))) {
        return res.status(400).json({ message: "Current password is incorrect." });
    }

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.update(userRef, {
        password: await bcrypt.hash(newPassword, SALT_ROUNDS),
        updatedAt: timestamp,
    });
    batch.create(db.collection("aquariums").doc(AQUARIUM_ID).collection("notifications").doc(), {
        userid: req.auth.userId,
        userId: req.auth.userId,
        aquariumId: AQUARIUM_ID,
        title: "Password updated",
        message: "Your account password was changed.",
        type: "info",
        scope: "user",
        isRead: false,
        timestamp,
    });
    await batch.commit();
    return res.json({ message: "Password updated successfully." });
});

export default router;
