import { aquariumRef } from "../config/aquarium.js";
import { db } from "../config/firebase.js";
import { notificationsRef, sharedNotification } from "./notifications.js";

const DEFAULT_POLL_SECONDS = 5;
const MIN_OFFLINE_SECONDS = 120;
const CHECK_INTERVAL_MS = 30_000;

// ---------- Fungsi bantu ----------

// Batas diam sebelum perangkat dianggap offline. Harus sama dengan `isDeviceOnline` di Dashboard.jsx
export function offlineThresholdSeconds(pollFrequency) {
    const poll = Number.isFinite(pollFrequency) ? pollFrequency : DEFAULT_POLL_SECONDS;
    return Math.max(MIN_OFFLINE_SECONDS, poll * 3);
}

// Perangkat yang offline tidak mengirim request, jadi hanya pengecekan berkala ini yang bisa mendeteksinya.
// Flag `deviceMonitor.offlineNotified` mencegah notifikasi berulang; telemetry yang kembali masuk meresetnya
async function checkDeviceOffline() {
    const reference = aquariumRef();
    await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) return;

        const data = snapshot.data();
        const lastUpdated = data.realtimeState?.lastUpdated?.toDate?.();
        if (!lastUpdated || data.deviceMonitor?.offlineNotified) return;

        const thresholdSeconds = offlineThresholdSeconds(data.systemConfig?.pollFrequency);
        if ((Date.now() - lastUpdated.getTime()) / 1000 <= thresholdSeconds) return;

        transaction.update(reference, { "deviceMonitor.offlineNotified": true });
        transaction.set(
            notificationsRef().doc(),
            sharedNotification({
                actorName: "Aquarium hardware",
                title: "Device Offline",
                message: `No data has been received from the aquarium hardware for more than ${Math.floor(thresholdSeconds / 60)} minutes. Check its power and Wi-Fi connection. Commands will run when it reconnects.`,
                type: "alert",
            }),
        );
    });
}

// ---------- Penjadwalan ----------

export function startDeviceWatchdog() {
    const timer = setInterval(() => {
        checkDeviceOffline().catch(error => console.error("Device offline check failed:", error.message));
    }, CHECK_INTERVAL_MS);
    timer.unref();
}
