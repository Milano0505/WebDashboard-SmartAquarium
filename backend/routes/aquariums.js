import { Router } from "express";
import { AQUARIUM_ID } from "../config/aquarium.js";
import { admin, db } from "../config/firebase.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeFirestore } from "../utils/firestore.js";

const router = Router();
router.use(requireAuth);
const temperatureFields = ["unit", "targetTemp", "minTempThreshold", "maxTempThreshold", "mode", "manualControlState"];
const lightingFields = ["mode", "manualControlState", "schedule", "avgHoursOn", "avgHoursOff"];
const feederFields = ["mode", "schedules"];
const systemFields = ["unit", "pollFrequency", "timezone"];

function parseLimit(value, fallback, maximum = 500) {
    if (value === undefined || value === "") return fallback;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : null;
}

function parseDate(value) {
    if (value === undefined || value === "") return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : admin.firestore.Timestamp.fromDate(date);
}

function fieldLabel(field) {
    const labels = {
        targetTemp: "target temperature",
        minTempThreshold: "minimum temperature threshold",
        maxTempThreshold: "maximum temperature threshold",
        pollFrequency: "sensor poll interval",
        manualControlState: "manual control state",
    };
    return labels[field] || field.replace(/[A-Z]/g, character => ` ${character.toLowerCase()}`);
}

function fieldValue(field, value, aquarium) {
    if (field.toLowerCase().includes("temp") && typeof value === "number") {
        if (aquarium.tempConfig?.unit === "Fahrenheit") {
            return `${+((value * 9) / 5 + 32).toFixed(1)}°F`;
        }
        return `${value}°C`;
    }
    if (field === "pollFrequency" && typeof value === "number") return `${value} seconds`;
    return value && typeof value === "object" ? JSON.stringify(value) : String(value);
}

function sectionTitle(section) {
    const titles = {
        tempConfig: "Temperature settings updated",
        lightingConfig: "Lighting settings updated",
        feederConfig: "Feeder settings updated",
        systemConfig: "System settings updated",
    };
    return titles[section] || "Aquarium settings updated";
}

async function ownedAquarium(req, res) {
    if (req.params.aquariumId !== AQUARIUM_ID) {
        res.status(404).json({ message: "Aquarium was not found." });
        return null;
    }
    const reference = db.collection("aquariums").doc(req.params.aquariumId);
    const snapshot = await reference.get();
    if (!snapshot.exists) {
        res.status(404).json({ message: "Aquarium was not found." });
        return null;
    }
    return { reference, data: snapshot.data() };
}

function patchConfig(section, allowedFields, message) {
    return async (req, res) => {
        const entries = Object.entries(req.body);
        if (entries.length === 0) return res.status(400).json({ message: "A configuration update is required." });
        if (entries.some(([key]) => !allowedFields.includes(key))) {
            return res.status(400).json({
                message: "The request contains unsupported configuration fields.",
            });
        }
        const aquarium = await ownedAquarium(req, res);
        if (!aquarium) return;
        const changedEntries = entries.filter(
            ([key, value]) =>
                JSON.stringify(
                    section === "systemConfig" && key === "unit"
                        ? aquarium.data.tempConfig?.unit
                        : aquarium.data[section]?.[key],
                ) !== JSON.stringify(value),
        );
        if (changedEntries.length === 0) {
            return res.json({ updatedAt: new Date().toISOString(), message: "No configuration changes detected." });
        }
        const actor = await db.collection("users").doc(req.auth.userId).get();
        const actorName = actor.get("fullName") || "A user";
        const changes = changedEntries
            .map(([key, value]) => `${fieldLabel(key)} to ${fieldValue(key, value, aquarium.data)}`)
            .join(" and ");
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        const batch = db.batch();
        if (section === "systemConfig") {
            const updates = Object.fromEntries(
                changedEntries.map(([key, value]) => [key === "unit" ? "tempConfig.unit" : `${section}.${key}`, value]),
            );
            updates["systemConfig.unit"] = admin.firestore.FieldValue.delete();
            updates["systemConfig.emailAlerts"] = admin.firestore.FieldValue.delete();
            updates["systemConfig.smsAlerts"] = admin.firestore.FieldValue.delete();
            updates.updatedAt = timestamp;
            batch.update(aquarium.reference, updates);
        } else {
            const updates = Object.fromEntries(changedEntries.map(([key, value]) => [`${section}.${key}`, value]));
            updates.updatedAt = timestamp;
            batch.update(aquarium.reference, updates);
        }
        batch.create(aquarium.reference.collection("notifications").doc(), {
            userid: null,
            userId: req.auth.userId,
            aquariumId: req.params.aquariumId,
            actorName,
            scope: "aquarium",
            title: sectionTitle(section),
            message: `${actorName} changed ${changes}.`,
            type: "info",
            isRead: false,
            readBy: [],
            dismissedBy: [],
            timestamp,
        });
        await batch.commit();
        return res.json({ updatedAt: new Date().toISOString(), message });
    };
}

async function telemetryRecords(aquariumId, query) {
    const limit = parseLimit(query.limit, 40);
    if (limit === null)
        throw Object.assign(new Error("Limit must be a positive integer."), {
            status: 400,
        });
    const startDate = parseDate(query.startDate);
    const endDate = parseDate(query.endDate);
    if ((query.startDate && !startDate) || (query.endDate && !endDate)) {
        throw Object.assign(new Error("Date filters must be valid dates."), {
            status: 400,
        });
    }
    if (startDate && endDate && startDate.toMillis() > endDate.toMillis()) {
        throw Object.assign(new Error("startDate must be before endDate."), {
            status: 400,
        });
    }

    const collection = db.collection("aquariums").doc(aquariumId).collection("telemetry_history");
    let request = collection.orderBy("timestamp", "desc");
    if (startDate) request = request.where("timestamp", ">=", startDate);
    if (endDate) request = request.where("timestamp", "<=", endDate);
    const snapshot = await request.limit(limit).get();
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

function csvCell(value) {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
}

router.get("/:aquariumId", async (req, res) => {
    const aquarium = await ownedAquarium(req, res);
    if (!aquarium) return;
    const { systemConfig, ...aquariumData } = aquarium.data;
    return res.json(
        serializeFirestore({
            ...aquariumData,
            systemConfig: { pollFrequency: systemConfig?.pollFrequency, timezone: systemConfig?.timezone },
        }),
    );
});

router.patch(
    "/:aquariumId/temperature-config",
    patchConfig("tempConfig", temperatureFields, "Temperature config updated."),
);
router.patch("/:aquariumId/lighting-config", patchConfig("lightingConfig", lightingFields, "Lighting config updated."));
router.patch("/:aquariumId/feeder-config", patchConfig("feederConfig", feederFields, "Feeder config updated."));
router.patch("/:aquariumId/system-config", patchConfig("systemConfig", systemFields, "System config updated."));

router.post("/:aquariumId/feeder/trigger", async (req, res) => {
    const aquarium = await ownedAquarium(req, res);
    if (!aquarium) return;
    if (aquarium.data.feederConfig?.mode !== "MANUAL") {
        return res.status(409).json({
            message: "Switch the feeder to manual mode before triggering it.",
        });
    }

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.update(aquarium.reference, {
        "realtimeState.feederStatus": "Active",
        "realtimeState.lastUpdated": timestamp,
    });
    const notificationRef = aquarium.reference.collection("notifications").doc();
    const actor = await db.collection("users").doc(req.auth.userId).get();
    const actorName = actor.get("fullName") || "A user";
    batch.set(notificationRef, {
        userid: null,
        userId: req.auth.userId,
        aquariumId: req.params.aquariumId,
        actorName,
        scope: "aquarium",
        title: "Feeder Activated",
        message: `${actorName} triggered the feeder manually.`,
        type: "info",
        isRead: false,
        readBy: [],
        dismissedBy: [],
        timestamp,
    });
    await batch.commit();
    return res.json({
        status: "triggered",
        message: "Feeder triggered successfully.",
    });
});

router.get("/:aquariumId/telemetry/export", async (req, res) => {
    const aquarium = await ownedAquarium(req, res);
    if (!aquarium) return;
    if (req.query.format && req.query.format !== "csv") {
        return res.status(400).json({ message: "Only CSV export is supported." });
    }

    const records = await telemetryRecords(req.params.aquariumId, {
        ...req.query,
        limit: req.query.limit || 500,
    });
    const fields = ["timestamp", "temp", "heaterState", "ledState", "feederState", "event"];
    const csv = [fields, ...records.map(record => fields.map(field => record[field]))]
        .map(row => row.map(csvCell).join(","))
        .join("\r\n");
    const filename = `telemetry-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
});

router.get("/:aquariumId/telemetry", async (req, res) => {
    const aquarium = await ownedAquarium(req, res);
    if (!aquarium) return;
    const records = await telemetryRecords(req.params.aquariumId, req.query);
    return res.json({ telemetryRecords: records, total: records.length });
});

router.get("/:aquariumId/notifications", async (req, res) => {
    const aquarium = await ownedAquarium(req, res);
    if (!aquarium) return;

    const limit = parseLimit(req.query.limit, 100);
    if (limit === null) return res.status(400).json({ message: "Limit must be a positive integer." });
    const readStatus = req.query.readStatus;
    if (readStatus && !["read", "unread"].includes(readStatus)) {
        return res.status(400).json({ message: 'readStatus must be "read" or "unread".' });
    }

    const snapshot = await aquarium.reference
        .collection("notifications")
        .orderBy("timestamp", "desc")
        .limit(limit * 5)
        .get();
    const notificationRecords = snapshot.docs
        .map(document => {
            const data = document.data();
            const scope = data.scope === "user" ? "user" : "aquarium";
            if (scope === "user" && data.userid !== req.auth.userId) return null;
            return {
                id: document.id,
                ...data,
                userId: data.userId ?? null,
                userid: data.userid ?? null,
                aquariumId: data.aquariumId || AQUARIUM_ID,
                scope,
                isRead:
                    scope === "user"
                        ? Boolean(data.isRead)
                        : (data.readBy || []).includes(req.auth.userId) || Boolean(data.isRead),
            };
        })
        .filter(
            notification =>
                notification &&
                !(notification.dismissedBy || []).includes(req.auth.userId) &&
                (!readStatus || notification.isRead === (readStatus === "read")),
        )
        .sort((first, second) => (second.timestamp?.toMillis?.() || 0) - (first.timestamp?.toMillis?.() || 0))
        .slice(0, limit)
        .map(serializeFirestore);
    return res.json({ notificationRecords });
});

router.patch("/:aquariumId/notifications/read-all", async (req, res) => {
    const aquarium = await ownedAquarium(req, res);
    if (!aquarium) return;
    const snapshot = await aquarium.reference.collection("notifications").where("isRead", "==", false).get();
    const unread = snapshot.docs.filter(document => {
        const data = document.data();
        if (data.scope === "user") return data.userid === req.auth.userId;
        return !(data.readBy || []).includes(req.auth.userId) && !(data.dismissedBy || []).includes(req.auth.userId);
    });
    for (let offset = 0; offset < unread.length; offset += 450) {
        const batch = db.batch();
        unread.slice(offset, offset + 450).forEach(document => {
            if (document.get("scope") === "user") {
                batch.update(document.ref, { isRead: true });
            } else {
                batch.update(document.ref, { readBy: admin.firestore.FieldValue.arrayUnion(req.auth.userId) });
            }
        });
        await batch.commit();
    }
    return res.json({ message: "All notifications marked as read." });
});

router.patch("/:aquariumId/notifications/:notificationId/read", async (req, res) => {
    const aquarium = await ownedAquarium(req, res);
    if (!aquarium) return;
    const notificationRef = aquarium.reference.collection("notifications").doc(req.params.notificationId);
    const notification = await notificationRef.get();
    if (!notification.exists) return res.status(404).json({ message: "Notification was not found." });
    if (notification.get("scope") === "user" && notification.get("userid") !== req.auth.userId) {
        return res.status(404).json({ message: "Notification was not found." });
    }
    if (notification.get("scope") === "user") {
        await notificationRef.update({ isRead: true });
    } else {
        await notificationRef.update({ readBy: admin.firestore.FieldValue.arrayUnion(req.auth.userId) });
    }
    return res.json({ message: "Notification marked as read." });
});

router.delete("/:aquariumId/notifications/:notificationId", async (req, res) => {
    const aquarium = await ownedAquarium(req, res);
    if (!aquarium) return;
    const notificationRef = aquarium.reference.collection("notifications").doc(req.params.notificationId);
    const notification = await notificationRef.get();
    if (!notification.exists) return res.status(404).json({ message: "Notification was not found." });
    if (notification.get("scope") === "user" && notification.get("userid") !== req.auth.userId) {
        return res.status(404).json({ message: "Notification was not found." });
    }
    if (notification.get("scope") === "user") {
        await notificationRef.delete();
    } else {
        await notificationRef.update({ dismissedBy: admin.firestore.FieldValue.arrayUnion(req.auth.userId) });
    }
    return res.json({ message: "Notification deleted." });
});

export default router;
