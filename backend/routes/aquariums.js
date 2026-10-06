import { Router } from "express";
import { findAquarium } from "../config/aquarium.js";
import { admin, db } from "../config/firebase.js";
import { requireAuth } from "../middleware/auth.js";
import { configRules, validateTemperatureRange } from "../utils/config-validation.js";
import { badRequest } from "../utils/errors.js";
import { serializeFirestore } from "../utils/firestore.js";
import { notificationsRef, sharedNotification } from "../utils/notifications.js";

const router = Router();
router.use(requireAuth);

const { FieldValue, Timestamp } = admin.firestore;
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

        const aquarium = await findAquarium(req.params.aquariumId);
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
            notificationsRef().doc(),
            sharedNotification({
                actorId: req.auth.userId,
                actorName: name,
                title: SECTION_TITLES[section],
                message: `${name} changed ${changes}.`,
            }),
        );
        await batch.commit();
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
    const reference = notificationsRef().doc(req.params.notificationId);
    const snapshot = await reference.get();
    if (!snapshot.exists || !isVisibleTo(snapshot.data(), req.auth.userId)) return null;
    return { reference, data: snapshot.data() };
}

// ---------- Akuarium & konfigurasi ----------

router.get("/:aquariumId", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId);
    if (!aquarium) return res.status(404).json(NOT_FOUND);
    const { systemConfig, ...data } = aquarium.data;
    return res.json(
        serializeFirestore({
            ...data,
            systemConfig: { pollFrequency: systemConfig?.pollFrequency, timezone: systemConfig?.timezone },
        }),
    );
});

router.patch("/:aquariumId/temperature-config", patchConfig("tempConfig", "Temperature config updated."));
router.patch("/:aquariumId/lighting-config", patchConfig("lightingConfig", "Lighting config updated."));
router.patch("/:aquariumId/feeder-config", patchConfig("feederConfig", "Feeder config updated."));
router.patch("/:aquariumId/system-config", patchConfig("systemConfig", "System config updated."));

router.post("/:aquariumId/feeder/trigger", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId);
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
        notificationsRef().doc(),
        sharedNotification({
            actorId: req.auth.userId,
            actorName: name,
            title: "Feed Command Sent",
            message: `${name} sent a manual feed command.`,
        }),
    );
    await batch.commit();
    return res.json({ status: "triggered", message: "Feed command sent." });
});

// ---------- Telemetry ----------

router.get("/:aquariumId/telemetry/export", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId);
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
    const aquarium = await findAquarium(req.params.aquariumId);
    if (!aquarium) return res.status(404).json(NOT_FOUND);
    const records = await telemetryRecords(aquarium.reference, req.query);
    return res.json({ telemetryRecords: records, total: records.length });
});

// ---------- Notifikasi ----------

router.get("/:aquariumId/notifications", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId);
    if (!aquarium) return res.status(404).json(NOT_FOUND);

    const limit = parseLimit(req.query.limit, 100);
    if (limit === null) throw badRequest("Limit must be a positive integer.");
    const { readStatus } = req.query;
    if (readStatus && !["read", "unread"].includes(readStatus)) {
        throw badRequest('readStatus must be "read" or "unread".');
    }

    // Ambil lebih banyak karena sebagian akan disaring per user
    const snapshot = await notificationsRef()
        .orderBy("timestamp", "desc")
        .limit(limit * 5)
        .get();
    const userId = req.auth.userId;
    const notificationRecords = snapshot.docs
        .map(document => {
            const data = document.data();
            const scope = data.scope === "user" ? "user" : "aquarium";
            return { id: document.id, ...data, scope, userId: data.userId ?? null, userid: data.userid ?? null };
        })
        .filter(notification => isVisibleTo(notification, userId))
        .map(notification => ({ ...notification, isRead: isReadBy(notification, userId) }))
        .filter(notification => !readStatus || notification.isRead === (readStatus === "read"))
        .slice(0, limit)
        .map(serializeFirestore);
    return res.json({ notificationRecords });
});

router.patch("/:aquariumId/notifications/read-all", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId);
    if (!aquarium) return res.status(404).json(NOT_FOUND);

    const userId = req.auth.userId;
    const snapshot = await notificationsRef().where("isRead", "==", false).get();
    const unread = snapshot.docs.filter(document => {
        const data = document.data();
        return isVisibleTo(data, userId) && !isReadBy(data, userId);
    });

    // Batas batch Firestore 500 operasi
    for (let offset = 0; offset < unread.length; offset += 450) {
        const batch = db.batch();
        unread.slice(offset, offset + 450).forEach(document => {
            batch.update(
                document.ref,
                document.get("scope") === "user" ? { isRead: true } : { readBy: FieldValue.arrayUnion(userId) },
            );
        });
        await batch.commit();
    }
    return res.json({ message: "All notifications marked as read." });
});

router.patch("/:aquariumId/notifications/:notificationId/read", async (req, res) => {
    if (!(await findAquarium(req.params.aquariumId))) return res.status(404).json(NOT_FOUND);
    const notification = await findNotification(req);
    if (!notification) return res.status(404).json({ message: "Notification was not found." });

    await notification.reference.update(
        notification.data.scope === "user" ? { isRead: true } : { readBy: FieldValue.arrayUnion(req.auth.userId) },
    );
    return res.json({ message: "Notification marked as read." });
});

router.delete("/:aquariumId/notifications/:notificationId", async (req, res) => {
    if (!(await findAquarium(req.params.aquariumId))) return res.status(404).json(NOT_FOUND);
    const notification = await findNotification(req);
    if (!notification) return res.status(404).json({ message: "Notification was not found." });

    // Notifikasi privat dihapus; notifikasi bersama hanya disembunyikan untuk user ini
    if (notification.data.scope === "user") {
        await notification.reference.delete();
    } else {
        await notification.reference.update({ dismissedBy: FieldValue.arrayUnion(req.auth.userId) });
    }
    return res.json({ message: "Notification deleted." });
});

export default router;
