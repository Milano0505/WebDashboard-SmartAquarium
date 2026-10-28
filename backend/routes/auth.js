import { Router } from "express";
import { query, transaction } from "../config/db.js";
import { invalidateRole, requireAuth } from "../middleware/auth.js";
import { addUserNotification } from "../utils/notifications.js";
import { isValidProfilePhotoUrl } from "../utils/profile-photo.js";

// Register, login, dan ganti password dikerjakan Supabase Auth di browser. Baris profil dibuat oleh trigger
// database saat akun dibuat; backend memastikannya ada, menerapkan foto, dan memverifikasi token tiap request.
const router = Router();

// Email yang otomatis menjadi admin saat sesi dibuka (pemula sistem; selanjutnya admin mengatur lewat dashboard)
const ADMIN_EMAILS = new Set(
    (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map(email => email.trim().toLowerCase())
        .filter(Boolean),
);

// ---------- Fungsi bantu ----------

function createUserProfile(row) {
    return {
        id: row.id,
        userId: row.id,
        fullName: row.full_name,
        email: row.email,
        role: row.role === "admin" ? "admin" : "user",
        photoUrl: row.photo_url ?? null,
        createdAt: row.created_at,
    };
}

// ---------- Route ----------

// Dipanggil frontend setelah login dan setiap aplikasi dibuka.
// Memastikan profil ada, menerapkan foto jika dikirim, menyegarkan peran admin dari ADMIN_EMAILS, lalu mengembalikan profil
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

    const makeAdmin = ADMIN_EMAILS.has(email);
    const profile = await transaction(async client => {
        // Trigger biasanya sudah membuat baris; insert ini hanya jaga-jaga (mis. akun dibuat sebelum trigger ada)
        await client.query(
            `insert into profiles (id, full_name, email) values ($1, $2, $3) on conflict (id) do nothing`,
            [userId, fullName.slice(0, 120), email],
        );
        const { rows } = await client.query(
            `update profiles
             set photo_url = coalesce($2, photo_url),
                 role = case when $3 then 'admin' else role end,
                 updated_at = case when $2 is not null or ($3 and role <> 'admin') then now() else updated_at end
             where id = $1
             returning *`,
            [userId, photoUrl, makeAdmin],
        );
        return rows[0];
    });

    invalidateRole(userId);
    return res.json({ userId, userProfile: createUserProfile(profile) });
});

// Password diganti di browser lewat Supabase; endpoint ini hanya mencatat notifikasi privat
router.post("/password-changed", requireAuth, async (req, res) => {
    await addUserNotification({ query }, req.auth.userId, "Password updated", "Your account password was changed.");
    return res.json({ message: "Password change recorded." });
});

export default router;
