import { Router } from "express";
import { query, transaction } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { isUuid } from "../utils/access.js";
import { addUserNotification } from "../utils/notifications.js";
import { isValidProfilePhotoUrl } from "../utils/profile-photo.js";

const router = Router();
router.use(requireAuth);

// ---------- Fungsi bantu ----------

function userProfile(row) {
    return {
        id: row.id,
        userId: row.id,
        fullName: row.full_name,
        email: row.email,
        role: row.role === "admin" ? "admin" : "user",
        photoUrl: row.photo_url ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// User hanya boleh mengakses profilnya sendiri; admin boleh membaca profil siapa pun
function isOwnProfile(req) {
    return req.params.userId === req.auth.userId;
}

// ---------- Route ----------

router.get("/:userId", async (req, res) => {
    if (!isOwnProfile(req) && req.auth.role !== "admin") {
        return res.status(403).json({ message: "You cannot access this user profile." });
    }
    if (!isUuid(req.params.userId)) return res.status(404).json({ message: "User profile was not found." });

    const { rows } = await query("select * from profiles where id = $1", [req.params.userId]);
    if (!rows[0]) return res.status(404).json({ message: "User profile was not found." });
    return res.json(userProfile(rows[0]));
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
        updates.full_name = fullName;
    }
    if (req.body.photoUrl !== undefined) {
        if (!isValidProfilePhotoUrl(req.body.photoUrl)) {
            return res
                .status(400)
                .json({ message: "Profile photo must be a small JPEG data URL, an HTTP(S) URL, or null." });
        }
        updates.photo_url = req.body.photoUrl;
    }
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No supported profile fields were provided." });
    }

    const changed = await transaction(async client => {
        const { rows } = await client.query("select full_name, photo_url from profiles where id = $1 for update", [
            req.auth.userId,
        ]);
        const current = rows[0];
        if (!current) return null;
        if (Object.keys(updates).every(column => updates[column] === current[column])) return false;

        // Nama kolom berasal dari daftar tetap di atas, bukan dari input
        const columns = Object.keys(updates);
        const assignments = columns.map((column, index) => `${column} = $${index + 2}`).join(", ");
        await client.query(`update profiles set ${assignments}, updated_at = now() where id = $1`, [
            req.auth.userId,
            ...columns.map(column => updates[column]),
        ]);
        await addUserNotification(client, req.auth.userId, "Profile updated", "Your profile information was updated.");
        return true;
    });

    if (changed === null) return res.status(404).json({ message: "User profile was not found." });
    return res.json({
        updatedAt: new Date().toISOString(),
        message: changed ? "Profile updated successfully." : "No profile changes detected.",
    });
});

export default router;
