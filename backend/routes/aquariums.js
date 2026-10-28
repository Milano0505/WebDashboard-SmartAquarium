import { Router } from "express";
import { aquariumResponse, configSections, findAquarium } from "../config/aquarium.js";
import { query, transaction } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { AQUARIUM_ROLES, hasRole, isUuid } from "../utils/access.js";
import { publishConfigChange } from "../utils/config-events.js";
import { configRules, validateTemperatureRange } from "../utils/config-validation.js";
import { badRequest, forbidden } from "../utils/errors.js";
import { addAquariumNotification, VISIBLE_NOTIFICATION } from "../utils/notifications.js";

const router = Router();
router.use(requireAuth);

const NOT_FOUND = { message: "Aquarium was not found." };

const FIELD_LABELS = {
    targetTemp: "target temperature",
    minTempThreshold: "minimum temperature threshold",
    maxTempThreshold: "maximum temperature threshold",
    pollFrequency: "sensor poll interval",
    manualControlState: "manual control state",
};

const SECTION_TITLES = {
    tempConfig: "Temperature settings updated",
    lightingConfig: "Lighting settings updated",
    feederConfig: "Feeder settings updated",
    systemConfig: "System settings updated",
};

// Bagian config -> kolom jsonb di tabel aquariums (daftar tetap, dipakai untuk menyusun SQL)
const CONFIG_COLUMNS = {
    tempConfig: "temp_config",
    lightingConfig: "lighting_config",
    feederConfig: "feeder_config",
    systemConfig: "system_config",
};

// ---------- Fungsi bantu ----------

function parseLimit(value, fallback, maximum = 500) {
    if (value === undefined || value === "") return fallback;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : null;
}

function parseDate(value) {
    if (value === undefined || value === "") return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

async function actorName(client, userId) {
    const { rows } = await client.query("select full_name from profiles where id = $1", [userId]);
    return rows[0]?.full_name || "A user";
}

// Satuan suhu diubah dari tab System, tapi disimpan di tempConfig
function fieldPath(section, field) {
    return section === "systemConfig" && field === "unit" ? "tempConfig.unit" : `${section}.${field}`;
}

function valueAt(data, path) {
    return path.split(".").reduce((object, key) => object?.[key], data);
}

function describeField(field) {
    return FIELD_LABELS[field] || field.replace(/[A-Z]/g, character => ` ${character.toLowerCase()}`);
}

// Nilai yang mudah dibaca untuk pesan notifikasi perubahan
function describeValue(field, value, tempConfig) {
    if (field.toLowerCase().includes("temp") && typeof value === "number") {
        return tempConfig?.unit === "Fahrenheit" ? `${+((value * 9) / 5 + 32).toFixed(1)}°F` : `${value}°C`;
    }
    if (field === "pollFrequency") return `${value} seconds`;
    if (field === "schedule")
        return `${value.startTime} - ${value.endTime} (${value.isActive ? "active" : "inactive"})`;
    if (field === "schedules") {
        const active = value.filter(entry => entry.isActive).map(entry => entry.time);
        return active.length > 0 ? active.join(", ") : "no active feeding times";
    }
    return String(value);
}

// Validasi PATCH config, simpan field yang berubah saja (di dalam transaksi dengan baris terkunci),
// lalu buat notifikasi dan dorong perubahan ke perangkat
function patchConfig(section, successMessage) {
    const rules = configRules[section];

    return async (req, res) => {
        const rawEntries = Object.entries(req.body);
        if (rawEntries.length === 0) throw badRequest("A configuration update is required.");
        if (rawEntries.some(([field]) => !Object.hasOwn(rules, field))) {
            throw badRequest("The request contains unsupported configuration fields.");
        }
        const entries = rawEntries.map(([field, value]) => [field, rules[field](value)]);

        const outcome = await transaction(async client => {
            const aquarium = await findAquarium(req.params.aquariumId, req.auth, "owner", { client, lock: true });
            if (!aquarium) return null;

            const current = configSections(aquarium.row);
            if (section === "tempConfig") {
                validateTemperatureRange({ ...current.tempConfig, ...Object.fromEntries(entries) });
            }

            const changed = entries.filter(
                ([field, value]) =>
                    JSON.stringify(valueAt(current, fieldPath(section, field))) !== JSON.stringify(value),
            );
            if (changed.length === 0) return { unchanged: true };

            // Kelompokkan perubahan per kolom jsonb lalu gabungkan ke nilai lama
            const patches = {};
            changed.forEach(([field, value]) => {
                const [targetSection, key] = fieldPath(section, field).split(".");
                (patches[CONFIG_COLUMNS[targetSection]] ||= {})[key] = value;
            });
            const columns = Object.keys(patches);
            const assignments = columns.map((column, index) => `${column} = ${column} || $${index + 2}::jsonb`);
            await client.query(`update aquariums set ${assignments.join(", ")}, updated_at = now() where id = $1`, [
                aquarium.id,
                ...columns.map(column => JSON.stringify(patches[column])),
            ]);

            const name = await actorName(client, req.auth.userId);
            const changes = changed
                .map(
                    ([field, value]) =>
                        `${describeField(field)} to ${describeValue(field, value, patches.temp_config ? { ...current.tempConfig, ...patches.temp_config } : current.tempConfig)}`,
                )
                .join(" and ");
            await addAquariumNotification(client, {
                aquariumId: aquarium.id,
                actorId: req.auth.userId,
                actorName: name,
                title: SECTION_TITLES[section],
                message: `${name} changed ${changes}.`,
            });
            return { aquariumId: aquarium.id };
        });

        if (outcome === null) return res.status(404).json(NOT_FOUND);
        if (outcome.unchanged) {
            return res.json({ updatedAt: new Date().toISOString(), message: "No configuration changes detected." });
        }
        // Dorong ke perangkat yang sedang menunggu GET /config
        publishConfigChange(outcome.aquariumId);
        return res.json({ updatedAt: new Date().toISOString(), message: successMessage });
    };
}

// Escape sel CSV dan cegah formula spreadsheet (=, +, -, @)
function csvCell(value) {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
}

async function telemetryRecords(aquariumId, params) {
    const limit = parseLimit(params.limit, 40);
    if (limit === null) throw badRequest("Limit must be a positive integer.");
    const startDate = parseDate(params.startDate);
    const endDate = parseDate(params.endDate);
    if ((params.startDate && !startDate) || (params.endDate && !endDate)) {
        throw badRequest("Date filters must be valid dates.");
    }
    if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
        throw badRequest("startDate must be before endDate.");
    }

    const { rows } = await query(
        `select id, aquarium_id as "aquariumId", recorded_at as "timestamp", temp,
                heater_state as "heaterState", led_state as "ledState", feeder_state as "feederState", event
         from telemetry_history
         where aquarium_id = $1
           and ($2::timestamptz is null or recorded_at >= $2)
           and ($3::timestamptz is null or recorded_at <= $3)
         order by recorded_at desc
         limit $4`,
        [aquariumId, startDate, endDate, limit],
    );
    return rows;
}

// ---------- Akuarium & konfigurasi ----------

// Akuarium yang bisa diakses user: admin melihat semuanya, lainnya hanya yang mereka anggotai
router.get("/", async (req, res) => {
    const { rows } =
        req.auth.role === "admin"
            ? await query("select id, name, 'admin' as role from aquariums order by name")
            : await query(
                  `select a.id, a.name, m.role
                   from aquarium_members m join aquariums a on a.id = m.aquarium_id
                   where m.user_id = $1
                   order by a.name`,
                  [req.auth.userId],
              );
    return res.json({ aquariums: rows });
});

router.get("/:aquariumId", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId, req.auth);
    if (!aquarium) return res.status(404).json(NOT_FOUND);
    return res.json(await aquariumResponse(aquarium));
});

router.patch("/:aquariumId/temperature-config", patchConfig("tempConfig", "Temperature config updated."));
router.patch("/:aquariumId/lighting-config", patchConfig("lightingConfig", "Lighting config updated."));
router.patch("/:aquariumId/feeder-config", patchConfig("feederConfig", "Feeder config updated."));
router.patch("/:aquariumId/system-config", patchConfig("systemConfig", "System config updated."));

router.post("/:aquariumId/feeder/trigger", async (req, res) => {
    const outcome = await transaction(async client => {
        const aquarium = await findAquarium(req.params.aquariumId, req.auth, "owner", { client, lock: true });
        if (!aquarium) return null;
        if (aquarium.row.feeder_config?.mode !== "MANUAL") return { notManual: true };

        // Hanya mencatat perintah; ESP32 memberi pakan sekali setiap feederConfig.lastTriggeredAt berubah.
        // device_state tidak diubah karena hanya boleh diisi telemetry perangkat
        await client.query("update aquariums set feeder_last_triggered_at = now() where id = $1", [aquarium.id]);
        const name = await actorName(client, req.auth.userId);
        await addAquariumNotification(client, {
            aquariumId: aquarium.id,
            actorId: req.auth.userId,
            actorName: name,
            title: "Feed Command Sent",
            message: `${name} sent a manual feed command.`,
        });
        return { aquariumId: aquarium.id };
    });

    if (outcome === null) return res.status(404).json(NOT_FOUND);
    if (outcome.notManual) {
        return res.status(409).json({ message: "Switch the feeder to manual mode before triggering it." });
    }
    publishConfigChange(outcome.aquariumId);
    return res.json({ status: "triggered", message: "Feed command sent." });
});

// ---------- Telemetry ----------

router.get("/:aquariumId/telemetry/export", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId, req.auth);
    if (!aquarium) return res.status(404).json(NOT_FOUND);
    if (req.query.format && req.query.format !== "csv") throw badRequest("Only CSV export is supported.");

    const records = await telemetryRecords(aquarium.id, { ...req.query, limit: req.query.limit || 500 });
    const fields = ["timestamp", "temp", "heaterState", "ledState", "feederState", "event"];
    const csv = [fields, ...records.map(record => fields.map(field => record[field]))]
        .map(row => row.map(csvCell).join(","))
        .join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="telemetry-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    return res.send(csv);
});

router.get("/:aquariumId/telemetry", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId, req.auth);
    if (!aquarium) return res.status(404).json(NOT_FOUND);
    const records = await telemetryRecords(aquarium.id, req.query);
    return res.json({ telemetryRecords: records, total: records.length });
});

// ---------- Notifikasi ----------

// Semua query notifikasi memakai $1 = akuarium dan $2 = user; hanya yang terlihat oleh user ini
const NOTIFICATION_JOIN = `
    from notifications n
    left join notification_states s on s.notification_id = n.id and s.user_id = $2`;

router.get("/:aquariumId/notifications", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId, req.auth);
    if (!aquarium) return res.status(404).json(NOT_FOUND);

    const limit = parseLimit(req.query.limit, 100);
    if (limit === null) throw badRequest("Limit must be a positive integer.");
    const { readStatus } = req.query;
    if (readStatus && !["read", "unread"].includes(readStatus)) {
        throw badRequest('readStatus must be "read" or "unread".');
    }

    const { rows } = await query(
        `select n.id, case when n.scope = 'user' then 'user' else 'aquarium' end as scope,
                n.aquarium_id as "aquariumId", n.actor_name as "actorName", n.title, n.message, n.type,
                n.created_at as "timestamp", (s.read_at is not null) as "isRead"
         ${NOTIFICATION_JOIN}
         where ${VISIBLE_NOTIFICATION}
           and ($3::boolean is null or (s.read_at is not null) = $3)
         order by n.created_at desc
         limit $4`,
        [aquarium.id, req.auth.userId, readStatus ? readStatus === "read" : null, limit],
    );
    return res.json({ notificationRecords: rows });
});

router.patch("/:aquariumId/notifications/read-all", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId, req.auth);
    if (!aquarium) return res.status(404).json(NOT_FOUND);

    await query(
        `insert into notification_states (notification_id, user_id, read_at)
         select n.id, $2, now()
         ${NOTIFICATION_JOIN}
         where ${VISIBLE_NOTIFICATION} and s.read_at is null
         on conflict (notification_id, user_id) do update set read_at = now()`,
        [aquarium.id, req.auth.userId],
    );
    return res.json({ message: "All notifications marked as read." });
});

// Pastikan notifikasi ada dan terlihat oleh user ini di akuarium tersebut
async function visibleNotification(aquariumId, userId, notificationId) {
    if (!isUuid(notificationId)) return false;
    const { rowCount } = await query(`select 1 ${NOTIFICATION_JOIN} where n.id = $3 and ${VISIBLE_NOTIFICATION}`, [
        aquariumId,
        userId,
        notificationId,
    ]);
    return rowCount > 0;
}

router.patch("/:aquariumId/notifications/:notificationId/read", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId, req.auth);
    if (!aquarium) return res.status(404).json(NOT_FOUND);
    if (!(await visibleNotification(aquarium.id, req.auth.userId, req.params.notificationId))) {
        return res.status(404).json({ message: "Notification was not found." });
    }

    await query(
        `insert into notification_states (notification_id, user_id, read_at) values ($1, $2, now())
         on conflict (notification_id, user_id) do update set read_at = coalesce(notification_states.read_at, now())`,
        [req.params.notificationId, req.auth.userId],
    );
    return res.json({ message: "Notification marked as read." });
});

// "Hapus" hanya menyembunyikan notifikasi untuk user ini; notifikasi bersama tetap terlihat oleh anggota lain
router.delete("/:aquariumId/notifications/:notificationId", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId, req.auth);
    if (!aquarium) return res.status(404).json(NOT_FOUND);
    if (!(await visibleNotification(aquarium.id, req.auth.userId, req.params.notificationId))) {
        return res.status(404).json({ message: "Notification was not found." });
    }

    await query(
        `insert into notification_states (notification_id, user_id, dismissed_at) values ($1, $2, now())
         on conflict (notification_id, user_id) do update set dismissed_at = now()`,
        [req.params.notificationId, req.auth.userId],
    );
    return res.json({ message: "Notification deleted." });
});

// ---------- Anggota ----------

// Owner mengelola member di akuarium miliknya. Mengangkat atau mengubah owner hanya boleh admin
router.get("/:aquariumId/members", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId, req.auth, "owner");
    if (!aquarium) return res.status(404).json(NOT_FOUND);

    const { rows } = await query(
        `select m.user_id as "userId", m.role, p.full_name as "fullName", p.email
         from aquarium_members m join profiles p on p.id = m.user_id
         where m.aquarium_id = $1
         order by m.created_at`,
        [aquarium.id],
    );
    return res.json({ members: rows });
});

router.put("/:aquariumId/members", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId, req.auth, "owner");
    if (!aquarium) return res.status(404).json(NOT_FOUND);

    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const { role } = req.body;
    if (!email || !AQUARIUM_ROLES.includes(role)) {
        throw badRequest('Provide a user email and a role of "owner" or "member".');
    }

    const users = await query("select id from profiles where email = $1", [email]);
    if (!users.rows[0]) return res.status(404).json({ message: "No user with this email was found." });
    const userId = users.rows[0].id;

    const current = await query("select role from aquarium_members where aquarium_id = $1 and user_id = $2", [
        aquarium.id,
        userId,
    ]);
    if (!hasRole(aquarium.role, "admin") && (role === "owner" || current.rows[0]?.role === "owner")) {
        throw forbidden("Only an admin can assign or change an owner.");
    }

    await query(
        `insert into aquarium_members (aquarium_id, user_id, role) values ($1, $2, $3)
         on conflict (aquarium_id, user_id) do update set role = excluded.role`,
        [aquarium.id, userId, role],
    );
    return res.json({ userId, role, message: "Member saved." });
});

router.delete("/:aquariumId/members/:userId", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId, req.auth, "owner");
    if (!aquarium) return res.status(404).json(NOT_FOUND);

    const { userId } = req.params;
    const notMember = { message: "This user is not a member of the aquarium." };
    if (!isUuid(userId)) return res.status(404).json(notMember);

    const current = await query("select role from aquarium_members where aquarium_id = $1 and user_id = $2", [
        aquarium.id,
        userId,
    ]);
    const currentRole = current.rows[0]?.role;
    if (!currentRole) return res.status(404).json(notMember);
    if (currentRole === "owner" && !hasRole(aquarium.role, "admin")) {
        throw forbidden("Only an admin can remove an owner.");
    }

    await query("delete from aquarium_members where aquarium_id = $1 and user_id = $2", [aquarium.id, userId]);
    return res.json({ message: "Member removed." });
});

export default router;
