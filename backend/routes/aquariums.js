import { Router } from "express";
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

async function ownedAquarium(req, res) {
    const reference = db.collection("aquariums").doc(req.params.aquariumId);
    const snapshot = await reference.get();
    if (!snapshot.exists) {
        res.status(404).json({ message: "Aquarium was not found." });
        return null;
    }
    if (snapshot.get("userId") !== req.auth.userId) {
        res.status(403).json({ message: "You do not have access to this aquarium." });
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
        if (section === "systemConfig") {
            const updates = Object.fromEntries(
                Object.entries(req.body).map(([key, value]) => [`${section}.${key}`, value]),
            );
            updates["systemConfig.emailAlerts"] = admin.firestore.FieldValue.delete();
            updates["systemConfig.smsAlerts"] = admin.firestore.FieldValue.delete();
            updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            await aquarium.reference.update(updates);
        } else {
            await aquarium.reference.set(
                {
                    [section]: req.body,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true },
            );
        }
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

    let collection = db.collection("aquariums").doc(aquariumId).collection("telemetry_history");
    let request = collection.orderBy("timestamp", "desc");
    if (startDate) request = request.where("timestamp", ">=", startDate);
    if (endDate) request = request.where("timestamp", "<=", endDate);
    const snapshot = await request.limit(limit).get();
    return snapshot.docs.map(document => serializeFirestore({ id: document.id, ...document.data() }));
}

function csvCell(value) {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
}

router.get("/:aquariumId", async (req, res) => {
    const aquarium = await ownedAquarium(req, res);
    if (!aquarium) return;
    return res.json(serializeFirestore(aquarium.data));
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
    batch.set(notificationRef, {
        title: "Feeder Activated",
        message: "The feeder was triggered manually.",
        type: "info",
        isRead: false,
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

    let request = aquarium.reference.collection("notifications").orderBy("timestamp", "desc");
    if (readStatus) request = request.where("isRead", "==", readStatus === "read");
    const snapshot = await request.limit(limit).get();
    const notificationRecords = snapshot.docs.map(document =>
        serializeFirestore({ id: document.id, ...document.data() }),
    );
    return res.json({ notificationRecords });
});

router.patch("/:aquariumId/notifications/read-all", async (req, res) => {
    const aquarium = await ownedAquarium(req, res);
    if (!aquarium) return;
    const unread = await aquarium.reference.collection("notifications").where("isRead", "==", false).get();
    for (let offset = 0; offset < unread.docs.length; offset += 450) {
        const batch = db.batch();
        unread.docs.slice(offset, offset + 450).forEach(document => batch.update(document.ref, { isRead: true }));
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
    await notificationRef.update({ isRead: true });
    return res.json({ message: "Notification marked as read." });
});

router.delete("/:aquariumId/notifications/:notificationId", async (req, res) => {
    const aquarium = await ownedAquarium(req, res);
    if (!aquarium) return;
    const notificationRef = aquarium.reference.collection("notifications").doc(req.params.notificationId);
    const notification = await notificationRef.get();
    if (!notification.exists) return res.status(404).json({ message: "Notification was not found." });
    await notificationRef.delete();
    return res.json({ message: "Notification deleted." });
});

export default router;
