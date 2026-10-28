import { query, transaction } from "../config/db.js";
import { addAquariumNotification } from "./notifications.js";

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

// Pengecekan berkala tidak perlu menanyakan database tiap 30 detik. Waktu telemetry terakhir dicatat di memori;
// database baru dibaca saat sebuah perangkat tampak terlambat
// aquariumId -> { lastSeenMs, pollFrequency, offlineNotified }
const deviceState = new Map();

// Dipanggil setiap telemetry diterima (hardware.js)
export function recordTelemetry(aquariumId, pollFrequency) {
    deviceState.set(aquariumId, { lastSeenMs: Date.now(), pollFrequency, offlineNotified: false });
}

// Isi awal saat server menyala: satu kali baca semua akuarium
async function loadInitialState() {
    const { rows } = await query(
        `select ds.aquarium_id, ds.last_updated, ds.offline_notified, a.system_config
         from device_state ds join aquariums a on a.id = ds.aquarium_id
         where ds.last_updated is not null`,
    );
    rows.forEach(row => {
        deviceState.set(row.aquarium_id, {
            lastSeenMs: row.last_updated.getTime(),
            pollFrequency: row.system_config?.pollFrequency,
            offlineNotified: row.offline_notified,
        });
    });
}

// ---------- Pengecekan offline ----------

// Perangkat yang offline tidak mengirim request, jadi hanya pengecekan berkala ini yang bisa mendeteksinya.
// Flag device_state.offline_notified mencegah notifikasi berulang; telemetry yang kembali masuk meresetnya.
// Baris dikunci agar keputusan memakai data terbaru dan tidak bentrok dengan telemetry yang sedang masuk
async function notifyOffline(aquariumId) {
    await transaction(async client => {
        const { rows } = await client.query(
            `select ds.last_updated, ds.offline_notified, a.system_config
             from device_state ds join aquariums a on a.id = ds.aquarium_id
             where ds.aquarium_id = $1
             for update of ds`,
            [aquariumId],
        );
        const state = rows[0];
        if (!state?.last_updated || state.offline_notified) return;

        const thresholdSeconds = offlineThresholdSeconds(state.system_config?.pollFrequency);
        if ((Date.now() - state.last_updated.getTime()) / 1000 <= thresholdSeconds) return;

        await client.query("update device_state set offline_notified = true where aquarium_id = $1", [aquariumId]);
        await addAquariumNotification(client, {
            aquariumId,
            actorName: "Aquarium hardware",
            title: "Device Offline",
            message: `No data has been received from the aquarium hardware for more than ${Math.floor(thresholdSeconds / 60)} minutes. Check its power and Wi-Fi connection. Commands will run when it reconnects.`,
            type: "alert",
        });
    });
}

async function checkDevices() {
    for (const [aquariumId, state] of deviceState) {
        if (state.offlineNotified) continue;
        if ((Date.now() - state.lastSeenMs) / 1000 <= offlineThresholdSeconds(state.pollFrequency)) continue;

        await notifyOffline(aquariumId);
        // Berhenti memeriksa sampai telemetry berikutnya (recordTelemetry mengaktifkannya lagi)
        if (deviceState.get(aquariumId) === state) state.offlineNotified = true;
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
