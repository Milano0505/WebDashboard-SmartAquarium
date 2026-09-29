import { Router } from "express";
import { admin, db } from "../config/firebase.js";
import { requireDeviceKey } from "../middleware/auth.js";
import { serializeFirestore } from "../utils/firestore.js";

const router = Router();
router.use(requireDeviceKey);

router.post("/:aquariumId/telemetry", async (req, res) => {
    const { currentTemp, heaterStatus, ledStatus, feederStatus } = req.body;
    const validStatus = (value, allowed) => allowed.includes(value);

    if (!Number.isFinite(currentTemp) || currentTemp < -10 || currentTemp > 60) {
        return res.status(400).json({
            message: "currentTemp must be a finite Celsius value between -10 and 60.",
        });
    }
    if (
        !validStatus(heaterStatus, ["ON", "OFF"]) ||
        !validStatus(ledStatus, ["ON", "OFF"]) ||
        !validStatus(feederStatus, ["Idle", "Active"])
    ) {
        return res.status(400).json({ message: "Device statuses are invalid." });
    }

    const aquariumRef = db.collection("aquariums").doc(req.params.aquariumId);
    const aquariumSnapshot = await aquariumRef.get();
    if (!aquariumSnapshot.exists) return res.status(404).json({ message: "Aquarium was not found." });

    const aquarium = aquariumSnapshot.data();
    const now = new Date();
    const event = typeof req.body.event === "string" ? req.body.event.slice(0, 160) : "Telemetry update";
    const telemetryRef = aquariumRef.collection("telemetry_history").doc();
    const batch = db.batch();
    batch.update(aquariumRef, {
        "realtimeState.currentTemp": currentTemp,
        "realtimeState.heaterStatus": heaterStatus,
        "realtimeState.ledStatus": ledStatus,
        "realtimeState.feederStatus": feederStatus,
        "realtimeState.lastUpdated": admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.set(telemetryRef, {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        temp: currentTemp,
        heaterState: heaterStatus,
        ledState: ledStatus,
        feederState: feederStatus,
        event,
    });

    const minTemp = aquarium.tempConfig?.minTempThreshold;
    const maxTemp = aquarium.tempConfig?.maxTempThreshold;
    const previousTemp = aquarium.realtimeState?.currentTemp;
    const outOfRange =
        (Number.isFinite(minTemp) && currentTemp < minTemp) || (Number.isFinite(maxTemp) && currentTemp > maxTemp);
    const previouslyOutOfRange =
        Number.isFinite(previousTemp) &&
        ((Number.isFinite(minTemp) && previousTemp < minTemp) || (Number.isFinite(maxTemp) && previousTemp > maxTemp));
    if (outOfRange && !previouslyOutOfRange) {
        const direction = currentTemp < minTemp ? "below" : "above";
        const threshold = currentTemp < minTemp ? minTemp : maxTemp;
        const notificationRef = aquariumRef.collection("notifications").doc();
        const message = `Water temperature is ${direction} the configured threshold of ${threshold}°C (${currentTemp}°C).`;
        batch.set(notificationRef, {
            title: "Temperature Alert",
            message,
            type: "alert",
            isRead: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    await batch.commit();
    return res.status(201).json({ status: "received", timestamp: now.toISOString() });
});

router.get("/:aquariumId/config", async (req, res) => {
    const aquarium = await db.collection("aquariums").doc(req.params.aquariumId).get();
    if (!aquarium.exists) return res.status(404).json({ message: "Aquarium was not found." });
    const data = aquarium.data();
    return res.json(
        serializeFirestore({
            tempConfig: data.tempConfig,
            lightingConfig: data.lightingConfig,
            feederConfig: data.feederConfig,
            systemConfig: data.systemConfig,
        }),
    );
});

export default router;
