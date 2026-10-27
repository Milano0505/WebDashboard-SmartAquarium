import { aquariumRef, aquariumsRef, invalidateAquarium } from "../config/aquarium.js";
import { db } from "../config/firebase.js";
import { invalidateNotifications, notificationsRef, sharedNotification } from "./notifications.js";

const DEFAULT_POLL_SECONDS = 5;
const MIN_OFFLINE_SECONDS = 120;
const CHECK_INTERVAL_MS = 30_000;

// ---------- Fungsi bantu ----------

// Batas diam sebelum perangkat dianggap offline. Harus sama dengan `isDeviceOnline` di Dashboard.jsx
export function offlineThresholdSeconds(pollFrequency) {
    const poll = Number.isFinite(pollFrequency) ? pollFrequency : DEFAULT_POLL_SECONDS;
    return Math.max(MIN_OFFLINE_SECONDS, poll * 3);
}

// ---------- Status terakhir di memori ----------

// Pengecekan berkala tidak boleh membaca Firestore tiap 30 detik (2.880 baca/hari per akuarium).
// Waktu telemetry terakhir dicatat di memori; Firestore baru dibaca saat sebuah perangkat tampak terlambat
// aquariumId -> { lastSeenMs, pollFrequency, offlineNotified }
const deviceState = new Map();

// Dipanggil setiap telemetry diterima (hardware.js)
export function recordTelemetry(aquariumId, pollFrequency) {
    deviceState.set(aquariumId, { lastSeenMs: Date.now(), pollFrequency, offlineNotified: false });
}

// Isi awal saat server menyala: satu kali baca semua akuarium
async function loadInitialState() {
    const snapshot = await aquariumsRef().get();
    snapshot.docs.forEach(document => {
        const { realtimeState, deviceMonitor, systemConfig } = document.data();
        const lastUpdated = realtimeState?.lastUpdated?.toDate?.();
        if (!lastUpdated) return;
        deviceState.set(document.id, {
            lastSeenMs: lastUpdated.getTime(),
            pollFrequency: systemConfig?.pollFrequency,
            offlineNotified: Boolean(deviceMonitor?.offlineNotified),
        });
    });
}

// ---------- Pengecekan offline ----------

// Perangkat yang offline tidak mengirim request, jadi hanya pengecekan berkala ini yang bisa mendeteksinya.
// Flag `deviceMonitor.offlineNotified` mencegah notifikasi berulang; telemetry yang kembali masuk meresetnya.
// Transaksi memastikan keputusan memakai data Firestore terbaru
async function notifyOffline(aquariumId) {
    const reference = aquariumRef(aquariumId);
    let notified = false;
    await db.runTransaction(async transaction => {
        notified = false;
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) return;

        const data = snapshot.data();
        const lastUpdated = data.realtimeState?.lastUpdated?.toDate?.();
        if (!lastUpdated || data.deviceMonitor?.offlineNotified) return;

        const thresholdSeconds = offlineThresholdSeconds(data.systemConfig?.pollFrequency);
        if ((Date.now() - lastUpdated.getTime()) / 1000 <= thresholdSeconds) return;

        notified = true;
        transaction.update(reference, { "deviceMonitor.offlineNotified": true });
        transaction.set(
            notificationsRef(aquariumId).doc(),
            sharedNotification({
                aquariumId,
                actorName: "Aquarium hardware",
                title: "Device Offline",
                message: `No data has been received from the aquarium hardware for more than ${Math.floor(thresholdSeconds / 60)} minutes. Check its power and Wi-Fi connection. Commands will run when it reconnects.`,
                type: "alert",
            }),
        );
    });
    if (notified) {
        invalidateAquarium(aquariumId);
        invalidateNotifications(aquariumId);
    }
}

async function checkDevices() {
    for (const [aquariumId, state] of deviceState) {
        if (state.offlineNotified) continue;
        if ((Date.now() - state.lastSeenMs) / 1000 <= offlineThresholdSeconds(state.pollFrequency)) continue;

        await notifyOffline(aquariumId);
        // Berhenti memeriksa sampai telemetry berikutnya (recordTelemetry mengaktifkannya lagi)
        const current = deviceState.get(aquariumId);
        if (current === state) state.offlineNotified = true;
    }
}

// ---------- Penjadwalan ----------

export function startDeviceWatchdog() {
    loadInitialState().catch(error => console.error("Unable to load the device status:", error.message));
    const timer = setInterval(() => {
        checkDevices().catch(error => console.error("Device offline check failed:", error.message));
    }, CHECK_INTERVAL_MS);
    timer.unref();
}
