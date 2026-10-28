import { Router } from "express";
import { randomBytes } from "node:crypto";
import { createDefaultAquarium } from "../config/defaults.js";
import { query, transaction } from "../config/db.js";
import { hashDeviceKey, invalidateDevices, invalidateRole, requireAdmin, requireAuth } from "../middleware/auth.js";
import { isUuid, isValidAquariumId } from "../utils/access.js";
import { badRequest } from "../utils/errors.js";

// Semua endpoint di sini khusus admin
const router = Router();
router.use(requireAuth, requireAdmin);

const UNIQUE_VIOLATION = "23505";

// ---------- Fungsi bantu ----------

function cleanName(value, label) {
    const name = typeof value === "string" ? value.trim() : "";
    if (!name || name.length > 80) throw badRequest(`${label} must be between 1 and 80 characters.`);
    return name;
}

// ---------- User ----------

// Semua user beserta akuarium yang mereka anggotai
router.get("/users", async (req, res) => {
    const { rows } = await query(
        `select p.id as "userId", p.full_name as "fullName", p.email, p.role,
                coalesce(
                    json_agg(json_build_object('aquariumId', a.id, 'name', a.name, 'role', m.role) order by a.name)
                        filter (where a.id is not null),
                    '[]'
                ) as aquariums
         from profiles p
         left join aquarium_members m on m.user_id = p.id
         left join aquariums a on a.id = m.aquarium_id
         group by p.id
         order by p.email`,
    );
    return res.json({ users: rows.map(row => ({ ...row, role: row.role === "admin" ? "admin" : "user" })) });
});

// Jadikan user admin atau kembalikan menjadi user biasa
router.patch("/users/:userId", async (req, res) => {
    const { role } = req.body;
    if (!["admin", "user"].includes(role)) throw badRequest('Role must be "admin" or "user".');
    // Mencegah sistem tanpa admin
    if (req.params.userId === req.auth.userId && role !== "admin") {
        throw badRequest("You cannot remove your own admin role.");
    }
    if (!isUuid(req.params.userId)) return res.status(404).json({ message: "User was not found." });

    const { rowCount } = await query("update profiles set role = $2, updated_at = now() where id = $1", [
        req.params.userId,
        role,
    ]);
    if (rowCount === 0) return res.status(404).json({ message: "User was not found." });
    invalidateRole(req.params.userId);
    return res.json({ userId: req.params.userId, role, message: "User role updated." });
});

// ---------- Akuarium ----------

// id opsional (huruf, angka, - dan _): berguna agar ESP32 yang sudah terpasang dengan AQUARIUM_ID tertentu
// tidak perlu di-flash ulang. Tanpa id dibuat otomatis
router.post("/aquariums", async (req, res) => {
    const name = cleanName(req.body.name, "Aquarium name");
    const requestedId = typeof req.body.id === "string" ? req.body.id.trim() : "";
    if (requestedId && !isValidAquariumId(requestedId)) {
        throw badRequest("Aquarium ID may only contain letters, numbers, - and _ (up to 64 characters).");
    }

    let ownerId = null;
    if (req.body.ownerEmail) {
        const email = String(req.body.ownerEmail).trim().toLowerCase();
        const { rows } = await query("select id from profiles where email = $1", [email]);
        if (!rows[0]) return res.status(404).json({ message: "No user with this email was found." });
        ownerId = rows[0].id;
    }

    const aquariumId = requestedId || `aquarium-${randomBytes(4).toString("hex")}`;
    const defaults = createDefaultAquarium();
    try {
        await transaction(async client => {
            await client.query(
                `insert into aquariums (id, name, hardware_info, temp_config, lighting_config, feeder_config, system_config, created_by)
                 values ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    aquariumId,
                    name,
                    defaults.hardwareInfo,
                    defaults.tempConfig,
                    defaults.lightingConfig,
                    defaults.feederConfig,
                    defaults.systemConfig,
                    req.auth.userId,
                ],
            );
            if (ownerId) {
                await client.query(
                    "insert into aquarium_members (aquarium_id, user_id, role) values ($1, $2, 'owner')",
                    [aquariumId, ownerId],
                );
            }
        });
    } catch (error) {
        if (error.code === UNIQUE_VIOLATION) {
            return res.status(409).json({ message: "An aquarium with this ID already exists." });
        }
        throw error;
    }
    return res.status(201).json({ id: aquariumId, name, message: "Aquarium created." });
});

// ---------- Perangkat ----------

async function aquariumExists(aquariumId) {
    if (!isValidAquariumId(aquariumId)) return false;
    const { rowCount } = await query("select 1 from aquariums where id = $1", [aquariumId]);
    return rowCount > 0;
}

router.get("/aquariums/:aquariumId/devices", async (req, res) => {
    if (!(await aquariumExists(req.params.aquariumId)))
        return res.status(404).json({ message: "Aquarium was not found." });
    // key_hash tidak pernah dikirim
    const { rows } = await query(
        `select id, name, aquarium_id as "aquariumId", created_at as "createdAt"
         from devices where aquarium_id = $1 order by created_at`,
        [req.params.aquariumId],
    );
    return res.json({ devices: rows });
});

// Kunci perangkat hanya ditampilkan sekali di respons ini; yang disimpan hanya hash-nya
router.post("/aquariums/:aquariumId/devices", async (req, res) => {
    const name = cleanName(req.body.name, "Device name");
    if (!(await aquariumExists(req.params.aquariumId)))
        return res.status(404).json({ message: "Aquarium was not found." });

    const deviceKey = randomBytes(32).toString("hex");
    const { rows } = await query(
        "insert into devices (aquarium_id, name, key_hash, created_by) values ($1, $2, $3, $4) returning id",
        [req.params.aquariumId, name, hashDeviceKey(deviceKey), req.auth.userId],
    );
    invalidateDevices();
    return res.status(201).json({
        id: rows[0].id,
        deviceKey,
        message: "Device registered. Copy the key now; it cannot be shown again.",
    });
});

router.delete("/devices/:deviceId", async (req, res) => {
    if (!isUuid(req.params.deviceId)) return res.status(404).json({ message: "Device was not found." });
    const { rowCount } = await query("delete from devices where id = $1", [req.params.deviceId]);
    if (rowCount === 0) return res.status(404).json({ message: "Device was not found." });
    invalidateDevices();
    return res.json({ message: "Device revoked." });
});

export default router;
