import { Router } from "express";
import { configSections, getAquarium } from "../config/aquarium.js";
import { query, transaction } from "../config/db.js";
import { requireDeviceKey, requireOwnAquarium } from "../middleware/auth.js";
import { configVersion, waitForConfigChange } from "../utils/config-events.js";
import { offlineThresholdSeconds, recordTelemetry } from "../utils/device-status.js";
import { addAquariumNotification } from "../utils/notifications.js";

const router = Router();
// Kunci perangkat hanya berlaku untuk akuarium yang terdaftar bersamanya
router.use(requireDeviceKey);
router.use("/:aquariumId", requireOwnAquarium);

const NOT_FOUND = { message: "Aquarium was not found." };
const LIGHTING_USAGE_DAYS = 7;
const HISTORY_INTERVAL_SECONDS = 60;
const LIVE_MEASURED_MAX_AGE_MS = 5 * 60_000; // measuredAt telemetry biasa: hanya dipercaya jika dekat dengan waktu server
const BACKLOG_MEASURED_MAX_AGE_MS = 7 * 24 * 3_600_000; // Data antrean dari perangkat yang lama offline
const MEASURED_FUTURE_TOLERANCE_MS = 5 * 60_000;
const MAX_BACKLOG_READINGS = 50;
const BOOT_REPORT_MAX_AGE_MS = 24 * 3_600_000;
const HISTORY_SLACK_SECONDS = 5; // Jeda antar-telemetry tidak presisi; tanpa ini riwayat bisa lompat ke siklus berikutnya

// Penyebab restart abnormal yang dilaporkan firmware (nilai lain diabaikan) beserta penjelasan untuk pengguna
const BOOT_REASONS = {
    "task watchdog": "The control program stopped responding and was restarted by the watchdog.",
    "interrupt watchdog": "The control program stopped responding and was restarted by the watchdog.",
    "other watchdog": "The control program stopped responding and was restarted by the watchdog.",
    "crash (panic)": "The firmware crashed and restarted.",
    "brownout (power dip)": "The power supply dipped below the safe level. Check the power adapter and wiring.",
    "network task stalled": "The network connection stopped responding and the device restarted itself.",
};

const isOnOff = value => value === "ON" || value === "OFF";
const isFeederStatus = value => value === "Idle" || value === "Active";

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

// Waktu pengukuran dari perangkat (detik sejak 1970, UTC dari NTP). Perangkat tanpa NTP tidak mengirimnya.
// Nilai di luar jendela yang wajar (jam salah) diabaikan, dan server memakai waktu terima
function parseMeasuredAt(value, now, maxAgeMs) {
    if (!Number.isInteger(value)) return null;
    const milliseconds = value * 1000;
    if (milliseconds > now.getTime() + MEASURED_FUTURE_TOLERANCE_MS) return null;
    if (milliseconds < now.getTime() - maxAgeMs) return null;
    return new Date(milliseconds);
}

// Tambahan pemakaian lampu sejak telemetry sebelumnya: durasi dihitung ke status LED sebelumnya.
// Jeda > 3x poll interval (min. 120 detik) dianggap offline dan tidak dihitung
function lightingUsageDelta(state, now) {
    const previousLed = state.led_status;
    const elapsedSeconds = state.last_updated ? (now.getTime() - state.last_updated.getTime()) / 1000 : 0;
    const maxGapSeconds = offlineThresholdSeconds(state.system_config?.pollFrequency);
    if (!isOnOff(previousLed) || elapsedSeconds <= 0 || elapsedSeconds > maxGapSeconds) return null;
    return {
        day: dayKey(now, state.system_config?.timezone),
        column: previousLed === "ON" ? "on_seconds" : "off_seconds",
        seconds: Math.round(elapsedSeconds * 10) / 10,
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
    if (!isOnOff(heaterStatus) || !isOnOff(ledStatus) || !isFeederStatus(feederStatus)) {
        return res.status(400).json({ message: "Device statuses are invalid." });
    }

    const aquariumId = req.params.aquariumId;
    const now = new Date();
    const measuredAt = parseMeasuredAt(req.body.measuredAt, now, LIVE_MEASURED_MAX_AGE_MS);
    // Laporan restart abnormal: dikirim sekali oleh firmware pada telemetry pertama setelah menyala
    const bootReason =
        typeof req.body.bootReason === "string" && Object.hasOwn(BOOT_REASONS, req.body.bootReason)
            ? req.body.bootReason
            : null;
    const bootedAt = parseMeasuredAt(req.body.bootedAt, now, BOOT_REPORT_MAX_AGE_MS);

    // Satu transaksi dengan baris device_state terkunci: telemetry dari perangkat yang sama tidak saling menimpa
    const pollFrequency = await transaction(async client => {
        const { rows } = await client.query(
            `select a.temp_config, a.system_config,
                    ds.current_temp, ds.heater_status, ds.led_status, ds.feeder_status, ds.last_updated,
                    ds.offline_notified, ds.sensor_error_notified, ds.last_history_at
             from aquariums a join device_state ds on ds.aquarium_id = a.id
             where a.id = $1
             for update of ds`,
            [aquariumId],
        );
        const state = rows[0];
        if (!state) return null;

        const cameBackOnline = state.offline_notified;
        const sensorErrorNotified = state.sensor_error_notified;

        // Riwayat dicatat saat status berubah, suhu baru keluar batas, atau tiap HISTORY_INTERVAL_SECONDS.
        // device_state tetap diperbarui di setiap telemetry
        const { minTempThreshold: min, maxTempThreshold: max } = state.temp_config || {};
        const wasOutOfRange = Number.isFinite(state.current_temp) && isOutOfRange(state.current_temp, min, max);
        const crossedLimit = !sensorFault && isOutOfRange(currentTemp, min, max) && !wasOutOfRange;
        const statusChanged =
            state.heater_status !== heaterStatus ||
            state.led_status !== ledStatus ||
            state.feeder_status !== feederStatus;
        const historyDue =
            !state.last_history_at ||
            (now.getTime() - state.last_history_at.getTime()) / 1000 >=
                HISTORY_INTERVAL_SECONDS - HISTORY_SLACK_SECONDS;
        const saveHistory = !sensorFault && (statusChanged || crossedLimit || historyDue);

        const usage = lightingUsageDelta(state, now);

        await client.query(
            `update device_state set
                 current_temp = $2, heater_status = $3, led_status = $4, feeder_status = $5,
                 last_updated = now(), offline_notified = false, sensor_error_notified = $6,
                 last_history_at = case when $7 then now() else last_history_at end
             where aquarium_id = $1`,
            [
                aquariumId,
                sensorFault ? null : currentTemp,
                heaterStatus,
                ledStatus,
                feederStatus,
                sensorFault,
                saveHistory,
            ],
        );

        if (usage) {
            // Kolom dari daftar tetap di lightingUsageDelta, bukan dari input
            await client.query(
                `insert into lighting_usage (aquarium_id, day, ${usage.column}) values ($1, $2, $3)
                 on conflict (aquarium_id, day) do update
                 set ${usage.column} = lighting_usage.${usage.column} + excluded.${usage.column}`,
                [aquariumId, usage.day, usage.seconds],
            );
            // Simpan hanya LIGHTING_USAGE_DAYS hari terakhir
            await client.query("delete from lighting_usage where aquarium_id = $1 and day < $2::date - $3::int", [
                aquariumId,
                usage.day,
                LIGHTING_USAGE_DAYS - 1,
            ]);
        }

        if (saveHistory) {
            // Dengan measuredAt, pengiriman ulang pembacaan yang sama tidak menambah baris (unik per akuarium dan waktu)
            await client.query(
                `insert into telemetry_history (aquarium_id, recorded_at, temp, heater_state, led_state, feeder_state, event)
                 values ($1, coalesce($2, now()), $3, $4, $5, $6, $7)
                 on conflict (aquarium_id, recorded_at) do nothing`,
                [
                    aquariumId,
                    measuredAt,
                    currentTemp,
                    heaterStatus,
                    ledStatus,
                    feederStatus,
                    event || "Telemetry update",
                ],
            );
        }

        const notify = notification =>
            addAquariumNotification(client, { aquariumId, actorName: "Aquarium hardware", ...notification });

        if (bootReason) {
            await notify({
                title: "Device Restarted",
                message: `${BOOT_REASONS[bootReason]} Heater and lamp were switched off during the restart and resumed with the last saved settings.`,
                type: "alert",
                // Tetap untuk satu kali menyala, jadi laporan yang dikirim ulang tidak membuat notifikasi ganda
                dedupeKey: bootedAt ? `boot-${Math.floor(bootedAt.getTime() / 1000)}` : null,
            });
        }

        if (sensorFault) {
            // Notifikasi hanya sekali sampai pembacaan sensor normal kembali
            if (!sensorErrorNotified) {
                await notify({
                    title: "Sensor Error",
                    message: `The temperature sensor is not returning a valid reading (${event}). Check the sensor wiring.`,
                    type: "alert",
                });
            }
        } else if (crossedLimit) {
            // Alert hanya saat suhu baru keluar dari batas, bukan di setiap pembacaan
            const isLow = currentTemp < min;
            await notify({
                title: "Temperature Alert",
                message: `Water temperature is ${isLow ? "below" : "above"} the configured threshold of ${isLow ? min : max}°C (${currentTemp}°C).`,
                type: "alert",
            });
        }

        if (cameBackOnline) {
            await notify({
                title: "Device Back Online",
                message: "The aquarium hardware is sending data again.",
                type: "success",
            });
        }

        return state.system_config?.pollFrequency;
    });

    if (pollFrequency === null) return res.status(404).json(NOT_FOUND);
    recordTelemetry(aquariumId, pollFrequency);
    return res.status(201).json({ status: "received", timestamp: now.toISOString() });
});

// Pembacaan lama yang tertahan di perangkat saat Wi-Fi atau backend mati (paling lama 7 hari). Hanya menambah
// riwayat: status realtime, notifikasi, dan pemakaian lampu tidak disentuh karena sudah tidak aktual.
// Pembacaan yang tidak valid dilewati; perangkat menghapus paketnya begitu dibalas 201
router.post("/:aquariumId/telemetry/backlog", async (req, res) => {
    const { readings } = req.body;
    if (!Array.isArray(readings) || readings.length === 0 || readings.length > MAX_BACKLOG_READINGS) {
        return res.status(400).json({ message: `readings must be a list of 1 to ${MAX_BACKLOG_READINGS} items.` });
    }

    const aquarium = await getAquarium(req.params.aquariumId);
    if (!aquarium) return res.status(404).json(NOT_FOUND);

    const now = new Date();
    const valid = readings
        .map(reading => ({
            reading: reading || {},
            measuredAt: parseMeasuredAt(reading?.measuredAt, now, BACKLOG_MEASURED_MAX_AGE_MS),
        }))
        .filter(({ reading, measuredAt }) => {
            const { currentTemp, heaterStatus, ledStatus, feederStatus } = reading;
            return (
                measuredAt &&
                Number.isFinite(currentTemp) &&
                currentTemp >= -10 &&
                currentTemp <= 60 &&
                isOnOff(heaterStatus) &&
                isOnOff(ledStatus) &&
                isFeederStatus(feederStatus)
            );
        });

    if (valid.length > 0) {
        const events = valid.map(({ reading }) =>
            typeof reading.event === "string" && reading.event.trim()
                ? reading.event.trim().slice(0, 160)
                : "Telemetry update",
        );
        // Sekali insert untuk semua pembacaan; yang waktunya sudah ada dilewati (pengiriman ulang)
        await query(
            `insert into telemetry_history (aquarium_id, recorded_at, temp, heater_state, led_state, feeder_state, event)
             select $1, * from unnest($2::timestamptz[], $3::numeric[], $4::text[], $5::text[], $6::text[], $7::text[])
             on conflict (aquarium_id, recorded_at) do nothing`,
            [
                aquarium.id,
                valid.map(({ measuredAt }) => measuredAt),
                valid.map(({ reading }) => reading.currentTemp),
                valid.map(({ reading }) => reading.heaterStatus),
                valid.map(({ reading }) => reading.ledStatus),
                valid.map(({ reading }) => reading.feederStatus),
                events,
            ],
        );
    }
    return res.status(201).json({ accepted: valid.length, skipped: readings.length - valid.length });
});

// Long polling: dengan ?wait=<detik>&v=<configVersion> permintaan ditahan sampai config berubah (atau waktu habis),
// lalu dibalas penuh. Tanpa parameter tersebut dibalas langsung seperti biasa (firmware lama tetap jalan)
const MAX_CONFIG_WAIT_SECONDS = 25;

router.get("/:aquariumId/config", async (req, res) => {
    const { aquariumId } = req.params;
    const waitSeconds = Math.min(Math.max(Number(req.query.wait) || 0, 0), MAX_CONFIG_WAIT_SECONDS);
    const knownVersion = typeof req.query.v === "string" ? req.query.v : "";
    if (waitSeconds > 0 && knownVersion) {
        await waitForConfigChange(aquariumId, knownVersion, waitSeconds * 1000, res);
        if (res.destroyed) return undefined; // Perangkat sudah memutus koneksi
    }

    // Versi dibaca sebelum data: data yang dikirim paling tidak sebaru versinya
    const version = configVersion(aquariumId);
    const aquarium = await getAquarium(aquariumId);
    if (!aquarium) return res.status(404).json(NOT_FOUND);
    const { tempConfig, lightingConfig, feederConfig, systemConfig } = configSections(aquarium.row);
    return res.json({
        configVersion: version,
        tempConfig,
        lightingConfig,
        feederConfig,
        systemConfig: { pollFrequency: systemConfig?.pollFrequency, timezone: systemConfig?.timezone },
    });
});

export default router;
