import { Router } from "express";
import { getAquarium, invalidateAquarium } from "../config/aquarium.js";
import { admin, db } from "../config/firebase.js";
import { requireDeviceKey, requireOwnAquarium } from "../middleware/auth.js";
import { offlineThresholdSeconds, recordTelemetry } from "../utils/device-status.js";
import { serializeFirestore } from "../utils/firestore.js";
import { invalidateNotifications, notificationsRef, sharedNotification } from "../utils/notifications.js";
import { invalidateTelemetry } from "../utils/telemetry-cache.js";

const router = Router();
// Kunci perangkat hanya berlaku untuk akuarium yang terdaftar bersamanya
router.use(requireDeviceKey);
router.use("/:aquariumId", requireOwnAquarium);

const { FieldValue } = admin.firestore;
const NOT_FOUND = { message: "Aquarium was not found." };
const LIGHTING_USAGE_DAYS = 7;
const HISTORY_INTERVAL_SECONDS = 60;
const HISTORY_SLACK_SECONDS = 5; // Jeda antar-telemetry tidak presisi; tanpa ini riwayat bisa lompat ke siklus berikutnya

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
    const maxGapSeconds = offlineThresholdSeconds(aquarium.systemConfig?.pollFrequency);
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
    const event = typeof req.body.event === "string" ? req.body.event.trim().slice(0, 160) : "";
    // Laporan sensor gagal: tanpa currentTemp tetapi dengan event (alasannya)
    const sensorFault = (currentTemp === undefined || currentTemp === null) && event !== "";
    if (!sensorFault && (!Number.isFinite(currentTemp) || currentTemp < -10 || currentTemp > 60)) {
        return res.status(400).json({
            message:
                "currentTemp must be a finite Celsius value between -10 and 60 (omit it only to report a sensor fault with an event).",
        });
    }
    if (
        !["ON", "OFF"].includes(heaterStatus) ||
        !["ON", "OFF"].includes(ledStatus) ||
        !["Idle", "Active"].includes(feederStatus)
    ) {
        return res.status(400).json({ message: "Device statuses are invalid." });
    }

    const aquarium = await getAquarium(req.params.aquariumId);
    if (!aquarium) return res.status(404).json(NOT_FOUND);

    const now = new Date();
    const cameBackOnline = aquarium.data.deviceMonitor?.offlineNotified === true;
    const sensorErrorNotified = aquarium.data.deviceMonitor?.sensorErrorNotified === true;

    // Riwayat dicatat saat status berubah, suhu baru keluar batas, atau tiap HISTORY_INTERVAL_SECONDS.
    // realtimeState tetap diperbarui di setiap telemetry
    const { minTempThreshold: min, maxTempThreshold: max } = aquarium.data.tempConfig || {};
    const previous = aquarium.data.realtimeState || {};
    const wasOutOfRange = Number.isFinite(previous.currentTemp) && isOutOfRange(previous.currentTemp, min, max);
    const crossedLimit = !sensorFault && isOutOfRange(currentTemp, min, max) && !wasOutOfRange;
    const statusChanged =
        previous.heaterStatus !== heaterStatus ||
        previous.ledStatus !== ledStatus ||
        previous.feederStatus !== feederStatus;
    const lastHistoryAt = aquarium.data.deviceMonitor?.lastHistoryAt?.toDate?.();
    const historyDue =
        !lastHistoryAt ||
        (now.getTime() - lastHistoryAt.getTime()) / 1000 >= HISTORY_INTERVAL_SECONDS - HISTORY_SLACK_SECONDS;
    const saveHistory = !sensorFault && (statusChanged || crossedLimit || historyDue);

    const batch = db.batch();
    batch.update(aquarium.reference, {
        // Sensor gagal: suhu dikosongkan agar dashboard tidak menampilkan suhu lama
        "realtimeState.currentTemp": sensorFault ? null : currentTemp,
        "realtimeState.heaterStatus": heaterStatus,
        "realtimeState.ledStatus": ledStatus,
        "realtimeState.feederStatus": feederStatus,
        "realtimeState.lastUpdated": FieldValue.serverTimestamp(),
        ...(cameBackOnline && { "deviceMonitor.offlineNotified": false }),
        ...(sensorFault && !sensorErrorNotified && { "deviceMonitor.sensorErrorNotified": true }),
        ...(!sensorFault && sensorErrorNotified && { "deviceMonitor.sensorErrorNotified": false }),
        ...(saveHistory && { "deviceMonitor.lastHistoryAt": FieldValue.serverTimestamp() }),
        ...lightingUsageUpdate(aquarium.data, now),
    });

    if (sensorFault) {
        // Notifikasi hanya sekali sampai pembacaan sensor normal kembali
        if (!sensorErrorNotified) {
            batch.set(
                notificationsRef(aquarium.reference.id).doc(),
                sharedNotification({
                    aquariumId: aquarium.reference.id,
                    actorName: "Aquarium hardware",
                    title: "Sensor Error",
                    message: `The temperature sensor is not returning a valid reading (${event}). Check the sensor wiring.`,
                    type: "alert",
                }),
            );
        }
    } else {
        if (saveHistory) {
            batch.set(aquarium.reference.collection("telemetry_history").doc(), {
                userId: null,
                aquariumId: aquarium.reference.id,
                timestamp: FieldValue.serverTimestamp(),
                temp: currentTemp,
                heaterState: heaterStatus,
                ledState: ledStatus,
                feederState: feederStatus,
                event: event || "Telemetry update",
            });
        }

        // Alert hanya saat suhu baru keluar dari batas, bukan di setiap pembacaan
        if (crossedLimit) {
            const isLow = currentTemp < min;
            batch.set(
                notificationsRef(aquarium.reference.id).doc(),
                sharedNotification({
                    aquariumId: aquarium.reference.id,
                    actorName: "Aquarium hardware",
                    title: "Temperature Alert",
                    message: `Water temperature is ${isLow ? "below" : "above"} the configured threshold of ${isLow ? min : max}°C (${currentTemp}°C).`,
                    type: "alert",
                }),
            );
        }
    }

    if (cameBackOnline) {
        batch.set(
            notificationsRef(aquarium.reference.id).doc(),
            sharedNotification({
                aquariumId: aquarium.reference.id,
                actorName: "Aquarium hardware",
                title: "Device Back Online",
                message: "The aquarium hardware is sending data again.",
                type: "success",
            }),
        );
    }

    await batch.commit();

    // Cache dibatalkan setelah penulisan berhasil agar pembaca berikutnya mendapat data terbaru
    const aquariumId = aquarium.reference.id;
    invalidateAquarium(aquariumId);
    if (saveHistory) invalidateTelemetry(aquariumId);
    if ((sensorFault && !sensorErrorNotified) || (!sensorFault && crossedLimit) || cameBackOnline) {
        invalidateNotifications(aquariumId);
    }
    recordTelemetry(aquariumId, aquarium.data.systemConfig?.pollFrequency);
    return res.status(201).json({ status: "received", timestamp: now.toISOString() });
});

router.get("/:aquariumId/config", async (req, res) => {
    const aquarium = await getAquarium(req.params.aquariumId);
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
