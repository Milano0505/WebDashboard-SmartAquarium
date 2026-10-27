import { Router } from "express";
import { aquariumsRef, findAquarium, invalidateAquarium } from "../config/aquarium.js";
import { admin, db } from "../config/firebase.js";
import { requireAuth } from "../middleware/auth.js";
import { AQUARIUM_ROLES, hasRole } from "../utils/access.js";
import { configRules, validateTemperatureRange } from "../utils/config-validation.js";
import { badRequest, forbidden } from "../utils/errors.js";
import { serializeFirestore } from "../utils/firestore.js";
import {
    invalidateNotifications,
    notificationsRef,
    recentNotifications,
    sharedNotification,
} from "../utils/notifications.js";
import { publishConfigChange } from "../utils/config-events.js";
import { cachedTelemetry } from "../utils/telemetry-cache.js";

const router = Router();
router.use(requireAuth);

const { FieldPath, FieldValue, Timestamp } = admin.firestore;
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

// ---------- Fungsi bantu ----------

function parseLimit(value, fallback, maximum = 500) {
    if (value === undefined || value === "") return fallback;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : null;
}

function parseDate(value) {
    if (value === undefined || value === "") return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
}

async function actorName(userId) {
    const user = await db.collection("users").doc(userId).get();
    return user.get("fullName") || "A user";
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
function describeValue(field, value, aquarium) {
    if (field.toLowerCase().includes("temp") && typeof value === "number") {
        return aquarium.tempConfig?.unit === "Fahrenheit" ? `${+((value * 9) / 5 + 32).toFixed(1)}°F` : `${value}°C`;
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

// Validasi PATCH config, simpan field yang berubah saja, lalu buat notifikasi
function patchConfig(section, successMessage) {
    const rules = configRules[section];

    return async (req, res) => {
        const rawEntries = Object.entries(req.body);
        if (rawEntries.length === 0) throw badRequest("A configuration update is required.");
        if (rawEntries.some(([field]) => !Object.hasOwn(rules, field))) {
            throw badRequest("The request contains unsupported configuration fields.");
        }
        const entries = rawEntries.map(([field, value]) => [field, rules[field](value)]);

        const aquarium = await findAquarium(req.params.aquariumId, req.auth, "owner");
        if (!aquarium) return res.status(404).json(NOT_FOUND);
        if (section === "tempConfig") {
            validateTemperatureRange({ ...aquarium.data.tempConfig, ...Object.fromEntries(entries) });
        }

        const changed = entries.filter(
            ([field, value]) =>
                JSON.stringify(valueAt(aquarium.data, fieldPath(section, field))) !== JSON.stringify(value),
        );
        if (changed.length === 0) {
            return res.json({ updatedAt: new Date().toISOString(), message: "No configuration changes detected." });
        }

        const updates = Object.fromEntries(changed.map(([field, value]) => [fieldPath(section, field), value]));
        updates.updatedAt = FieldValue.serverTimestamp();
        if (section === "systemConfig") {
            // Hapus field versi lama (systemConfig.unit, toggle email/SMS)
            updates["systemConfig.unit"] = FieldValue.delete();
            updates["systemConfig.emailAlerts"] = FieldValue.delete();
            updates["systemConfig.smsAlerts"] = FieldValue.delete();
        }

        const name = await actorName(req.auth.userId);
        const changes = changed
            .map(([field, value]) => `${describeField(field)} to ${describeValue(field, value, aquarium.data)}`)
            .join(" and ");

        const batch = db.batch();
        batch.update(aquarium.reference, updates);
        batch.create(
            notificationsRef(aquarium.reference.id).doc(),
            sharedNotification({
                aquariumId: aquarium.reference.id,
                actorId: req.auth.userId,
                actorName: name,
                title: SECTION_TITLES[section],
                message: `${name} changed ${changes}.`,
            }),
        );
        await batch.commit();
        invalidateAquarium(aquarium.reference.id);
        invalidateNotifications(aquarium.reference.id);
        // Dorong ke perangkat yang sedang menunggu GET /config
        publishConfigChange(aquarium.reference.id);
        return res.json({ updatedAt: new Date().toISOString(), message: successMessage });
    };
}

async function telemetryRecords(aquariumReference, query) {
    const limit = parseLimit(query.limit, 40);
    if (limit === null) throw badRequest("Limit must be a positive integer.");
    const startDate = parseDate(query.startDate);
    const endDate = parseDate(query.endDate);
    if ((query.startDate && !startDate) || (query.endDate && !endDate)) {
        throw badRequest("Date filters must be valid dates.");
    }
    if (startDate && endDate && startDate.toMillis() > endDate.toMillis()) {
        throw badRequest("startDate must be before endDate.");
    }

    const load = async () => {
        let request = aquariumReference.collection("telemetry_history").orderBy("timestamp", "desc");
        if (startDate) request = request.where("timestamp", ">=", startDate);
        if (endDate) request = request.where("timestamp", "<=", endDate);
        const snapshot = await request.limit(limit).get();

        // Lewati dokumen yang tidak lengkap
        return snapshot.docs
            .map(document => ({ id: document.id, ...document.data() }))
            .filter(
                record =>
                    Number.isFinite(record.temp) &&
                    typeof record.heaterState === "string" &&
                    typeof record.ledState === "string" &&
                    typeof record.feederState === "string",
            )
            .map(serializeFirestore);
    };
    // Query dengan filter tanggal jarang dan beragam, jadi tidak disimpan
    return startDate || endDate ? load() : cachedTelemetry(aquariumReference.id, limit, load);
}

// Escape sel CSV dan cegah formula spreadsheet (=, +, -, @)
function csvCell(value) {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
}

// Status dibaca: readBy per user untuk notifikasi bersama, isRead untuk privat
function isReadBy(notification, userId) {
    return notification.scope === "user"
        ? Boolean(notification.isRead)
        : (notification.readBy || []).includes(userId) || Boolean(notification.isRead);
}

function isVisibleTo(notification, userId) {
    if (notification.scope === "user") return notification.userid === userId;
    return !(notification.dismissedBy || []).includes(userId);
}

async function findNotification(req) {
    const reference = notificationsRef(req.params.aquariumId).doc(req.params.notificationId);
    const snapshot = await reference.get();
    if (!snapshot.exists || !isVisibleTo(snapshot.data(), req.auth.userId)) return null;
    return { reference, data: snapshot.data() };
}

// ---------- Akuarium & konfigurasi ----------

// Akuarium yang bisa diakses user: admin melihat semuanya, lainnya hanya yang mereka anggotai
router.get("/", async (req, res) => {
    const snapshot =
        req.auth.role === "admin"
            ? await aquariumsRef().get()
            : await aquariumsRef().where("memberIds", "array-contains", req.auth.userId).get();
    const aquariums = snapshot.docs
        .map(document => ({
            id: document.id,
            name: document.get("name") || document.id,
            role: req.auth.role === "admin" ? "admin" : document.get(new FieldPath("members", req.auth.userId)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    return res.json({ aquariums });
});

router.get("/:aquariumId", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId, req.auth);
    if (!aquarium) return res.status(404).json(NOT_FOUND);
    // Daftar anggota tidak ikut dikirim; ada di endpoint /members khusus owner
    const { systemConfig, members, memberIds, ...data } = aquarium.data;
    return res.json(
        serializeFirestore({
            ...data,
            id: aquarium.reference.id,
            name: data.name || aquarium.reference.id,
            role: aquarium.role,
            systemConfig: { pollFrequency: systemConfig?.pollFrequency, timezone: systemConfig?.timezone },
        }),
    );
});

router.patch("/:aquariumId/temperature-config", patchConfig("tempConfig", "Temperature config updated."));
router.patch("/:aquariumId/lighting-config", patchConfig("lightingConfig", "Lighting config updated."));
router.patch("/:aquariumId/feeder-config", patchConfig("feederConfig", "Feeder config updated."));
router.patch("/:aquariumId/system-config", patchConfig("systemConfig", "System config updated."));

router.post("/:aquariumId/feeder/trigger", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId, req.auth, "owner");
    if (!aquarium) return res.status(404).json(NOT_FOUND);
    if (aquarium.data.feederConfig?.mode !== "MANUAL") {
        return res.status(409).json({ message: "Switch the feeder to manual mode before triggering it." });
    }

    const name = await actorName(req.auth.userId);
    const batch = db.batch();
    // Hanya mencatat perintah; ESP32 memberi pakan sekali setiap lastTriggeredAt berubah.
    // realtimeState tidak diubah karena hanya boleh diisi telemetry perangkat
    batch.update(aquarium.reference, { "feederConfig.lastTriggeredAt": FieldValue.serverTimestamp() });
    batch.create(
        notificationsRef(aquarium.reference.id).doc(),
        sharedNotification({
            aquariumId: aquarium.reference.id,
            actorId: req.auth.userId,
            actorName: name,
            title: "Feed Command Sent",
            message: `${name} sent a manual feed command.`,
        }),
    );
    await batch.commit();
    invalidateAquarium(aquarium.reference.id);
    invalidateNotifications(aquarium.reference.id);
    publishConfigChange(aquarium.reference.id);
    return res.json({ status: "triggered", message: "Feed command sent." });
});

// ---------- Telemetry ----------

router.get("/:aquariumId/telemetry/export", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId, req.auth);
    if (!aquarium) return res.status(404).json(NOT_FOUND);
    if (req.query.format && req.query.format !== "csv") throw badRequest("Only CSV export is supported.");

    const records = await telemetryRecords(aquarium.reference, { ...req.query, limit: req.query.limit || 500 });
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
    const records = await telemetryRecords(aquarium.reference, req.query);
    return res.json({ telemetryRecords: records, total: records.length });
});

// ---------- Notifikasi ----------

router.get("/:aquariumId/notifications", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId, req.auth);
    if (!aquarium) return res.status(404).json(NOT_FOUND);

    const limit = parseLimit(req.query.limit, 100);
    if (limit === null) throw badRequest("Limit must be a positive integer.");
    const { readStatus } = req.query;
    if (readStatus && !["read", "unread"].includes(readStatus)) {
        throw badRequest('readStatus must be "read" or "unread".');
    }

    // Daftar terbaru dari cache (semua cakupan); disaring per user di sini
    const userId = req.auth.userId;
    const notificationRecords = (await recentNotifications(aquarium.reference.id))
        .map(data => {
            const scope = data.scope === "user" ? "user" : "aquarium";
            return { ...data, scope, userId: data.userId ?? null, userid: data.userid ?? null };
        })
        .filter(notification => isVisibleTo(notification, userId))
        .map(notification => ({ ...notification, isRead: isReadBy(notification, userId) }))
        .filter(notification => !readStatus || notification.isRead === (readStatus === "read"))
        .slice(0, limit)
        .map(serializeFirestore);
    return res.json({ notificationRecords });
});

router.patch("/:aquariumId/notifications/read-all", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId, req.auth);
    if (!aquarium) return res.status(404).json(NOT_FOUND);

    // Hanya notifikasi di daftar terbaru (yang tampil di Alerts); query "semua yang belum dibaca" akan membaca
    // seluruh riwayat karena isRead notifikasi bersama tidak pernah berubah
    const userId = req.auth.userId;
    const aquariumId = aquarium.reference.id;
    const unread = (await recentNotifications(aquariumId)).filter(
        data => isVisibleTo(data, userId) && !isReadBy(data, userId),
    );

    // Batas batch Firestore 500 operasi
    try {
        for (let offset = 0; offset < unread.length; offset += 450) {
            const batch = db.batch();
            unread.slice(offset, offset + 450).forEach(data => {
                batch.update(
                    notificationsRef(aquariumId).doc(data.id),
                    data.scope === "user" ? { isRead: true } : { readBy: FieldValue.arrayUnion(userId) },
                );
            });
            await batch.commit();
        }
    } finally {
        invalidateNotifications(aquariumId);
    }
    return res.json({ message: "All notifications marked as read." });
});

router.patch("/:aquariumId/notifications/:notificationId/read", async (req, res) => {
    if (!(await findAquarium(req.params.aquariumId, req.auth))) return res.status(404).json(NOT_FOUND);
    const notification = await findNotification(req);
    if (!notification) return res.status(404).json({ message: "Notification was not found." });

    await notification.reference.update(
        notification.data.scope === "user" ? { isRead: true } : { readBy: FieldValue.arrayUnion(req.auth.userId) },
    );
    invalidateNotifications(req.params.aquariumId);
    return res.json({ message: "Notification marked as read." });
});

router.delete("/:aquariumId/notifications/:notificationId", async (req, res) => {
    if (!(await findAquarium(req.params.aquariumId, req.auth))) return res.status(404).json(NOT_FOUND);
    const notification = await findNotification(req);
    if (!notification) return res.status(404).json({ message: "Notification was not found." });

    // Notifikasi privat dihapus; notifikasi bersama hanya disembunyikan untuk user ini
    if (notification.data.scope === "user") {
        await notification.reference.delete();
    } else {
        await notification.reference.update({ dismissedBy: FieldValue.arrayUnion(req.auth.userId) });
    }
    invalidateNotifications(req.params.aquariumId);
    return res.json({ message: "Notification deleted." });
});

// ---------- Anggota ----------

// Owner mengelola member di akuarium miliknya. Mengangkat atau mengubah owner hanya boleh admin
router.get("/:aquariumId/members", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId, req.auth, "owner");
    if (!aquarium) return res.status(404).json(NOT_FOUND);

    const entries = Object.entries(aquarium.data.members || {});
    const profiles = entries.length
        ? await db.getAll(...entries.map(([userId]) => db.collection("users").doc(userId)))
        : [];
    const members = entries.map(([userId, role], index) => ({
        userId,
        role,
        fullName: profiles[index].get("fullName") || null,
        email: profiles[index].get("email") || null,
    }));
    return res.json({ members });
});

router.put("/:aquariumId/members", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId, req.auth, "owner");
    if (!aquarium) return res.status(404).json(NOT_FOUND);

    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const { role } = req.body;
    if (!email || !AQUARIUM_ROLES.includes(role)) {
        throw badRequest('Provide a user email and a role of "owner" or "member".');
    }

    const users = await db.collection("users").where("email", "==", email).limit(1).get();
    if (users.empty) return res.status(404).json({ message: "No user with this email was found." });
    const userId = users.docs[0].id;

    const currentRole = aquarium.data.members?.[userId];
    if (!hasRole(aquarium.role, "admin") && (role === "owner" || currentRole === "owner")) {
        throw forbidden("Only an admin can assign or change an owner.");
    }

    await aquarium.reference.update(new FieldPath("members", userId), role, "memberIds", FieldValue.arrayUnion(userId));
    invalidateAquarium(aquarium.reference.id);
    return res.json({ userId, role, message: "Member saved." });
});

router.delete("/:aquariumId/members/:userId", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId, req.auth, "owner");
    if (!aquarium) return res.status(404).json(NOT_FOUND);

    const { userId } = req.params;
    const currentRole = aquarium.data.members?.[userId];
    if (!currentRole) return res.status(404).json({ message: "This user is not a member of the aquarium." });
    if (currentRole === "owner" && !hasRole(aquarium.role, "admin")) {
        throw forbidden("Only an admin can remove an owner.");
    }

    await aquarium.reference.update(
        new FieldPath("members", userId),
        FieldValue.delete(),
        "memberIds",
        FieldValue.arrayRemove(userId),
    );
    invalidateAquarium(aquarium.reference.id);
    return res.json({ message: "Member removed." });
});

export default router;
