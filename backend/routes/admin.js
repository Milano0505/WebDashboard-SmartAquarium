import { Router } from "express";
import { randomBytes } from "node:crypto";
import { aquariumRef, aquariumsRef, getAquarium } from "../config/aquarium.js";
import { createDefaultAquarium } from "../config/defaults.js";
import { admin, db } from "../config/firebase.js";
import { hashDeviceKey, invalidateDevices, invalidateRole, requireAdmin, requireAuth } from "../middleware/auth.js";
import { badRequest } from "../utils/errors.js";
import { serializeFirestore } from "../utils/firestore.js";

// Semua endpoint di sini khusus admin
const router = Router();
router.use(requireAuth, requireAdmin);

const { FieldValue } = admin.firestore;

// ---------- Fungsi bantu ----------

function cleanName(value, label) {
    const name = typeof value === "string" ? value.trim() : "";
    if (!name || name.length > 80) throw badRequest(`${label} must be between 1 and 80 characters.`);
    return name;
}

// ---------- User ----------

// Semua user beserta akuarium yang mereka anggotai
router.get("/users", async (req, res) => {
    const [users, aquariums] = await Promise.all([db.collection("users").get(), aquariumsRef().get()]);
    const memberships = new Map();
    aquariums.docs.forEach(document => {
        Object.entries(document.get("members") || {}).forEach(([userId, role]) => {
            const list = memberships.get(userId) || [];
            list.push({ aquariumId: document.id, name: document.get("name") || document.id, role });
            memberships.set(userId, list);
        });
    });

    return res.json({
        users: users.docs
            .map(document => ({
                userId: document.id,
                fullName: document.get("fullName"),
                email: document.get("email"),
                role: document.get("role") === "admin" ? "admin" : "user",
                aquariums: memberships.get(document.id) || [],
            }))
            .sort((a, b) => (a.email || "").localeCompare(b.email || "")),
    });
});

// Jadikan user admin atau kembalikan menjadi user biasa
router.patch("/users/:userId", async (req, res) => {
    const { role } = req.body;
    if (!["admin", "user"].includes(role)) throw badRequest('Role must be "admin" or "user".');
    // Mencegah sistem tanpa admin
    if (req.params.userId === req.auth.userId && role !== "admin") {
        throw badRequest("You cannot remove your own admin role.");
    }

    const reference = db.collection("users").doc(req.params.userId);
    if (!(await reference.get()).exists) return res.status(404).json({ message: "User was not found." });
    await reference.update({ role, updatedAt: FieldValue.serverTimestamp() });
    invalidateRole(req.params.userId);
    return res.json({ userId: req.params.userId, role, message: "User role updated." });
});

// ---------- Akuarium ----------

router.post("/aquariums", async (req, res) => {
    const name = cleanName(req.body.name, "Aquarium name");

    let ownerId = null;
    if (req.body.ownerEmail) {
        const email = String(req.body.ownerEmail).trim().toLowerCase();
        const owner = await db.collection("users").where("email", "==", email).limit(1).get();
        if (owner.empty) return res.status(404).json({ message: "No user with this email was found." });
        ownerId = owner.docs[0].id;
    }

    const aquariumId = `aquarium-${randomBytes(4).toString("hex")}`;
    await aquariumRef(aquariumId).create(createDefaultAquarium({ name, createdBy: req.auth.userId, ownerId }));
    return res.status(201).json({ id: aquariumId, name, message: "Aquarium created." });
});

// ---------- Perangkat ----------

router.get("/aquariums/:aquariumId/devices", async (req, res) => {
    if (!(await getAquarium(req.params.aquariumId)))
        return res.status(404).json({ message: "Aquarium was not found." });
    const snapshot = await db.collection("devices").where("aquariumId", "==", req.params.aquariumId).get();
    // keyHash tidak pernah dikirim
    const devices = snapshot.docs.map(document =>
        serializeFirestore({
            id: document.id,
            name: document.get("name"),
            aquariumId: document.get("aquariumId"),
            createdAt: document.get("createdAt"),
        }),
    );
    return res.json({ devices });
});

// Kunci perangkat hanya ditampilkan sekali di respons ini; yang disimpan hanya hash-nya
router.post("/aquariums/:aquariumId/devices", async (req, res) => {
    const name = cleanName(req.body.name, "Device name");
    if (!(await getAquarium(req.params.aquariumId)))
        return res.status(404).json({ message: "Aquarium was not found." });

    const deviceKey = randomBytes(32).toString("hex");
    const reference = db.collection("devices").doc();
    await reference.create({
        name,
        aquariumId: req.params.aquariumId,
        keyHash: hashDeviceKey(deviceKey),
        createdBy: req.auth.userId,
        createdAt: FieldValue.serverTimestamp(),
    });
    invalidateDevices();
    return res.status(201).json({
        id: reference.id,
        deviceKey,
        message: "Device registered. Copy the key now; it cannot be shown again.",
    });
});

router.delete("/devices/:deviceId", async (req, res) => {
    const reference = db.collection("devices").doc(req.params.deviceId);
    if (!(await reference.get()).exists) return res.status(404).json({ message: "Device was not found." });
    await reference.delete();
    invalidateDevices();
    return res.json({ message: "Device revoked." });
});

export default router;
