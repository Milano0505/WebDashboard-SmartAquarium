import bcrypt from "bcrypt";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { createDefaultAquarium } from "../config/defaults.js";
import { admin, db } from "../config/firebase.js";
import { JWT_SECRET } from "../config/security.js";
import { requireAuth } from "../middleware/auth.js";
import { aquariumIdFor, toIsoString } from "../utils/firestore.js";
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
        aquariumId: aquariumIdFor(userId),
        fullName: user.fullName,
        email: user.email,
        photoUrl: user.photoUrl ?? null,
        createdAt: toIsoString(user.createdAt),
    };
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
    const aquariumId = aquariumIdFor(userId);
    const userRef = db.collection("users").doc(userId);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const now = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();

    batch.create(userRef, {
        fullName,
        email,
        password: passwordHash,
        photoUrl,
        createdAt: now,
        updatedAt: now,
    });
    batch.create(db.collection("aquariums").doc(aquariumId), createDefaultAquarium(userId));
    await batch.commit();

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

    await userRef.update({
        password: await bcrypt.hash(newPassword, SALT_ROUNDS),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.json({ message: "Password updated successfully." });
});

export default router;
