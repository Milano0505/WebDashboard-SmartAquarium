import { Router } from "express";
import { AQUARIUM_ID, findAquarium } from "../config/aquarium.js";
import { admin, db } from "../config/firebase.js";
import { requireDeviceKey } from "../middleware/auth.js";
import { serializeFirestore } from "../utils/firestore.js";
import { notificationsRef, sharedNotification } from "../utils/notifications.js";

const router = Router();
router.use(requireDeviceKey);

const { FieldValue } = admin.firestore;
const NOT_FOUND = { message: "Aquarium was not found." };
const LIGHTING_USAGE_DAYS = 7;

// ---------- Fungsi bantu ----------

// Tanggal YYYY-MM-DD sesuai timezone akuarium (fallback UTC)
function dayKey(date, timezone) {
    try {
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(date);
    } catch {
        return date.toISOString().slice(0, 10);
    }
}

const isOutOfRange = (temp, min, max) => (Number.isFinite(min) && temp < min) || (Number.isFinite(max) && temp > max);

// Tambahkan durasi sejak telemetry sebelumnya ke status LED sebelumnya, simpan 7 hari terakhir,
// lalu hitung rata-rata jam ON/OFF per hari.
// Jeda > 3x poll interval (min. 120 detik) dianggap offline dan tidak dihitung
function lightingUsageUpdate(aquarium, now) {
    const previousLed = aquarium.realtimeState?.ledStatus;
    const lastUpdated = aquarium.realtimeState?.lastUpdated?.toDate?.();
    const pollFrequency = aquarium.systemConfig?.pollFrequency;
    const maxGapSeconds = Math.max(120, (Number.isFinite(pollFrequency) ? pollFrequency : 5) * 3);
    const elapsedSeconds = lastUpdated ? (now.getTime() - lastUpdated.getTime()) / 1000 : 0;
    if (!["ON", "OFF"].includes(previousLed) || elapsedSeconds <= 0 || elapsedSeconds > maxGapSeconds) return null;

    const usage = { ...aquarium.lightingUsage };
    const key = dayKey(now, aquarium.systemConfig?.timezone);
    const today = { onSeconds: 0, offSeconds: 0, ...usage[key] };
    today[previousLed === "ON" ? "onSeconds" : "offSeconds"] += Math.round(elapsedSeconds * 10) / 10;
    usage[key] = today;

    const keptDays = Object.keys(usage).sort().slice(-LIGHTING_USAGE_DAYS);
    const lightingUsage = Object.fromEntries(keptDays.map(day => [day, usage[day]]));
    const onSeconds = keptDays.reduce((total, day) => total + lightingUsage[day].onSeconds, 0);
    const offSeconds = keptDays.reduce((total, day) => total + lightingUsage[day].offSeconds, 0);
    const avgHoursOn = Math.round(((24 * onSeconds) / (onSeconds + offSeconds)) * 10) / 10;

    return {
        lightingUsage,
        "lightingConfig.avgHoursOn": avgHoursOn,
        "lightingConfig.avgHoursOff": Math.round((24 - avgHoursOn) * 10) / 10,
    };
}

// ---------- Route ----------

router.post("/:aquariumId/telemetry", async (req, res) => {
    const { currentTemp, heaterStatus, ledStatus, feederStatus } = req.body;
    if (!Number.isFinite(currentTemp) || currentTemp < -10 || currentTemp > 60) {
        return res.status(400).json({ message: "currentTemp must be a finite Celsius value between -10 and 60." });
    }
    if (
        !["ON", "OFF"].includes(heaterStatus) ||
        !["ON", "OFF"].includes(ledStatus) ||
        !["Idle", "Active"].includes(feederStatus)
    ) {
        return res.status(400).json({ message: "Device statuses are invalid." });
    }

    const aquarium = await findAquarium(req.params.aquariumId);
    if (!aquarium) return res.status(404).json(NOT_FOUND);

    const now = new Date();
    const batch = db.batch();
    batch.update(aquarium.reference, {
        "realtimeState.currentTemp": currentTemp,
        "realtimeState.heaterStatus": heaterStatus,
        "realtimeState.ledStatus": ledStatus,
        "realtimeState.feederStatus": feederStatus,
        "realtimeState.lastUpdated": FieldValue.serverTimestamp(),
        ...lightingUsageUpdate(aquarium.data, now),
    });
    batch.set(aquarium.reference.collection("telemetry_history").doc(), {
        userId: null,
        aquariumId: AQUARIUM_ID,
        timestamp: FieldValue.serverTimestamp(),
        temp: currentTemp,
        heaterState: heaterStatus,
        ledState: ledStatus,
        feederState: feederStatus,
        event: typeof req.body.event === "string" ? req.body.event.slice(0, 160) : "Telemetry update",
    });

    // Alert hanya saat suhu baru keluar dari batas, bukan di setiap pembacaan
    const { minTempThreshold: min, maxTempThreshold: max } = aquarium.data.tempConfig || {};
    const previousTemp = aquarium.data.realtimeState?.currentTemp;
    const wasOutOfRange = Number.isFinite(previousTemp) && isOutOfRange(previousTemp, min, max);
    if (isOutOfRange(currentTemp, min, max) && !wasOutOfRange) {
        const isLow = currentTemp < min;
        batch.set(
            notificationsRef().doc(),
            sharedNotification({
                actorName: "Aquarium hardware",
                title: "Temperature Alert",
                message: `Water temperature is ${isLow ? "below" : "above"} the configured threshold of ${isLow ? min : max}°C (${currentTemp}°C).`,
                type: "alert",
            }),
        );
    }

    await batch.commit();
    return res.status(201).json({ status: "received", timestamp: now.toISOString() });
});

router.get("/:aquariumId/config", async (req, res) => {
    const aquarium = await findAquarium(req.params.aquariumId);
    if (!aquarium) return res.status(404).json(NOT_FOUND);
    const { tempConfig, lightingConfig, feederConfig, systemConfig } = aquarium.data;
    return res.json(
        serializeFirestore({
            tempConfig,
            lightingConfig,
            feederConfig,
            systemConfig: { pollFrequency: systemConfig?.pollFrequency, timezone: systemConfig?.timezone },
        }),
    );
});

export default router;
