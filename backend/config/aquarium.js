import { query } from "./db.js";
import { forbidden } from "../utils/errors.js";
import { hasRole, isValidAquariumId } from "../utils/access.js";

const AQUARIUM_COLUMNS = `
    a.*,
    ds.current_temp, ds.heater_status, ds.led_status, ds.feeder_status, ds.last_updated,
    ds.offline_notified, ds.sensor_error_notified, ds.last_history_at`;

// Ambil akuarium tanpa pemeriksaan akses (dipakai perangkat dan proses internal); null jika tidak ada
export async function getAquarium(aquariumId, client = { query }) {
    if (!isValidAquariumId(aquariumId)) return null;
    const { rows } = await client.query(
        `select ${AQUARIUM_COLUMNS}
         from aquariums a left join device_state ds on ds.aquarium_id = a.id
         where a.id = $1`,
        [aquariumId],
    );
    return rows[0] ? { id: rows[0].id, row: rows[0] } : null;
}

// Ambil akuarium untuk user yang login sekaligus memeriksa perannya.
// Peran: admin, owner/member (keanggotaan), atau viewer (user tanpa keanggotaan apa pun pada akuarium publik).
// null = akuarium tidak ada (404); user tanpa akses atau perannya kurang ditolak dengan 403.
// lock: kunci baris akuarium sampai transaksi selesai (untuk baca-ubah-tulis config)
export async function findAquarium(
    aquariumId,
    auth,
    minimumRole = "viewer",
    { client = { query }, lock = false } = {},
) {
    if (!isValidAquariumId(aquariumId)) return null;
    const { rows } = await client.query(
        `select ${AQUARIUM_COLUMNS}, m.role as member_role,
                (a.monitoring_public and not exists (select 1 from aquarium_members x where x.user_id = $2)) as viewer_access
         from aquariums a
         left join device_state ds on ds.aquarium_id = a.id
         left join aquarium_members m on m.aquarium_id = a.id and m.user_id = $2
         where a.id = $1
         ${lock ? "for update of a" : ""}`,
        [aquariumId, auth.userId],
    );
    const row = rows[0];
    if (!row) return null;

    const role = auth.role === "admin" ? "admin" : (row.member_role ?? (row.viewer_access ? "viewer" : null));
    if (!role) throw forbidden("You do not have access to this aquarium.");
    if (!hasRole(role, minimumRole)) throw forbidden(`This action requires the ${minimumRole} role.`);
    return { id: row.id, row, role };
}

// Rata-rata jam lampu ON dan OFF per hari dari pemakaian 7 hari terakhir (null jika belum ada data)
export async function lightingAverages(aquariumId, client = { query }) {
    const { rows } = await client.query(
        `select coalesce(sum(on_seconds), 0) as on_seconds, coalesce(sum(off_seconds), 0) as off_seconds
         from (select on_seconds, off_seconds from lighting_usage where aquarium_id = $1 order by day desc limit 7) recent`,
        [aquariumId],
    );
    const { on_seconds: onSeconds, off_seconds: offSeconds } = rows[0];
    if (onSeconds + offSeconds <= 0) return { avgHoursOn: null, avgHoursOff: null };
    const avgHoursOn = Math.round(((24 * onSeconds) / (onSeconds + offSeconds)) * 10) / 10;
    return { avgHoursOn, avgHoursOff: Math.round((24 - avgHoursOn) * 10) / 10 };
}

// Bagian config sebagai objek yang sama dengan bentuk API: { tempConfig, lightingConfig, feederConfig, systemConfig }
export function configSections(row) {
    return {
        tempConfig: row.temp_config,
        lightingConfig: row.lighting_config,
        feederConfig: { ...row.feeder_config, lastTriggeredAt: row.feeder_last_triggered_at },
        systemConfig: row.system_config,
    };
}

// Bentuk respons akuarium untuk dashboard
export async function aquariumResponse(aquarium) {
    const { row, role } = aquarium;
    const sections = configSections(row);
    const averages = await lightingAverages(row.id);
    return {
        id: row.id,
        name: row.name,
        role,
        monitoringPublic: row.monitoring_public,
        hardwareInfo: row.hardware_info,
        realtimeState: {
            currentTemp: row.current_temp,
            heaterStatus: row.heater_status,
            ledStatus: row.led_status,
            feederStatus: row.feeder_status,
            lastUpdated: row.last_updated,
        },
        tempConfig: sections.tempConfig,
        lightingConfig: { ...sections.lightingConfig, ...averages },
        feederConfig: sections.feederConfig,
        systemConfig: {
            pollFrequency: sections.systemConfig?.pollFrequency,
            timezone: sections.systemConfig?.timezone,
        },
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
