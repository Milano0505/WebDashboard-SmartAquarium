// Client REST API. Semua request lewat `request` yang menambahkan JWT dan mengubah error
// menjadi Error berisi pesan API dan status HTTP

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
// Harus sama dengan SHARED_AQUARIUM_ID di backend
export const AQUARIUM_ID = import.meta.env.VITE_AQUARIUM_ID || "aquarium-001";

const TOKEN_KEY = "sa_token";

// ---------- Token sesi ----------

export const getToken = () => {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch (error) {
        console.warn("Unable to read the saved session token.", error);
        return null;
    }
};

export const setToken = token => localStorage.setItem(TOKEN_KEY, token);

export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// ---------- Fungsi bantu request ----------

function aquariumPath(aquariumId) {
    if (aquariumId && aquariumId !== AQUARIUM_ID) throw new Error("This installation is configured for one aquarium.");
    return `/api/aquariums/${encodeURIComponent(AQUARIUM_ID)}`;
}

function queryString(parameters) {
    const query = new URLSearchParams();
    Object.entries(parameters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
    });
    const serialized = query.toString();
    return serialized ? `?${serialized}` : "";
}

async function request(path, options = {}) {
    const token = getToken();
    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: {
                Accept: "application/json",
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...options.headers,
            },
        });
    } catch {
        throw new Error("Unable to connect to the API. Check that the backend is running.");
    }

    const isJson = (response.headers.get("content-type") || "").includes("application/json");
    const body = isJson ? await response.json().catch(() => null) : await response.text();

    if (!response.ok) {
        // Sesi tidak valid: logout otomatis (event didengarkan AuthContext)
        if (response.status === 401) {
            try {
                clearToken();
                localStorage.removeItem("sa_user");
            } catch {
                // Storage bisa tidak tersedia; event di bawah tetap mengeluarkan user
            }
            window.dispatchEvent(new Event("sa:unauthorized"));
        }
        const error = new Error(body?.message || response.statusText || "Request failed.");
        error.status = response.status;
        throw error;
    }

    return { response, body };
}

async function apiFetch(path, options = {}) {
    const { body } = await request(path, options);
    return body;
}

const send = (method, path, payload) =>
    apiFetch(path, { method, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });

// GET yang mengembalikan `fallback` jika akuarium belum ada (404)
async function getOrFallback(path, fallback) {
    try {
        return await apiFetch(path);
    } catch (error) {
        if (error.status === 404) return fallback;
        throw error;
    }
}

// ---------- Autentikasi ----------

export async function login(email, password) {
    const result = await send("POST", "/api/auth/login", { email, password });
    setToken(result.token);
    return result;
}

export async function register(data) {
    const result = await send("POST", "/api/auth/register", data);
    setToken(result.token);
    return result;
}

export const changePassword = ({ currentPassword, newPassword }) =>
    send("POST", "/api/auth/change-password", { currentPassword, newPassword });

export async function logout() {
    clearToken();
}

// ---------- Profil user ----------

export const getUserProfile = userId => apiFetch(`/api/users/${encodeURIComponent(userId)}`);

export const updateUserProfile = (userId, { fullName, photoUrl }) =>
    send("PUT", `/api/users/${encodeURIComponent(userId)}`, { fullName, photoUrl });

// ---------- Konfigurasi akuarium ----------

export const getAquarium = aquariumId => getOrFallback(aquariumPath(aquariumId), null);

export const updateTemperatureConfig = (aquariumId, payload) =>
    send("PATCH", `${aquariumPath(aquariumId)}/temperature-config`, payload);

export const updateLightingConfig = (aquariumId, payload) =>
    send("PATCH", `${aquariumPath(aquariumId)}/lighting-config`, payload);

export const updateFeederConfig = (aquariumId, payload) =>
    send("PATCH", `${aquariumPath(aquariumId)}/feeder-config`, payload);

export const updateSystemConfig = (aquariumId, payload) =>
    send("PATCH", `${aquariumPath(aquariumId)}/system-config`, payload);

export const triggerFeeder = aquariumId => send("POST", `${aquariumPath(aquariumId)}/feeder/trigger`);

// ---------- Telemetry ----------

export const getTelemetry = (aquariumId, { startDate, endDate, limit = 40 } = {}) =>
    getOrFallback(`${aquariumPath(aquariumId)}/telemetry${queryString({ startDate, endDate, limit })}`, {
        telemetryRecords: [],
        total: 0,
    });

export async function exportTelemetry(aquariumId, { startDate, endDate, format = "csv" } = {}) {
    const { response, body } = await request(
        `${aquariumPath(aquariumId)}/telemetry/export${queryString({ startDate, endDate, format })}`,
    );
    const disposition = response.headers.get("content-disposition") || "";
    const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || "telemetry.csv";
    return { csv: body, filename };
}

// 12 pembacaan terakhir (terlama dulu) untuk <AreaChart>
export async function getTemperatureChart(aquariumId) {
    const { telemetryRecords } = await getTelemetry(aquariumId, { limit: 12 });
    return telemetryRecords
        .filter(record => Number.isFinite(new Date(record.timestamp).getTime()))
        .reverse()
        .map(record => ({
            time: new Date(record.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            }),
            temp: record.temp,
        }));
}

// ---------- Notifikasi ----------

export const getNotifications = (aquariumId, { limit, readStatus } = {}) =>
    getOrFallback(`${aquariumPath(aquariumId)}/notifications${queryString({ limit, readStatus })}`, {
        notificationRecords: [],
    });

export const markNotificationRead = (aquariumId, notificationId) =>
    send("PATCH", `${aquariumPath(aquariumId)}/notifications/${encodeURIComponent(notificationId)}/read`);

export const markAllNotificationsRead = aquariumId =>
    send("PATCH", `${aquariumPath(aquariumId)}/notifications/read-all`);

export const deleteNotification = (aquariumId, notificationId) =>
    send("DELETE", `${aquariumPath(aquariumId)}/notifications/${encodeURIComponent(notificationId)}`);
