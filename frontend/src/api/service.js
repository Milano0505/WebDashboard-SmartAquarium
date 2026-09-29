const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export const getToken = () => {
    try {
        return localStorage.getItem("sa_token");
    } catch (error) {
        console.warn("Unable to read the saved session token.", error);

        return null;
    }
};

export const setToken = token => localStorage.setItem("sa_token", token);

export const clearToken = () => localStorage.removeItem("sa_token");

function getAquariumId(aquariumId) {
    try {
        const user = JSON.parse(localStorage.getItem("sa_user") || "null");
        const resolvedId = aquariumId || user?.aquariumId;
        if (resolvedId) return resolvedId;
    } catch {
        if (aquariumId) return aquariumId;
    }

    throw new Error("No aquarium is linked to the signed-in account.");
}

function aquariumPath(aquariumId) {
    return `/api/aquariums/${encodeURIComponent(getAquariumId(aquariumId))}`;
}

async function request(path, options = {}) {
    let response;

    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,

            headers: {
                Accept: "application/json",

                ...(options.body ? { "Content-Type": "application/json" } : {}),

                ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),

                ...options.headers,
            },
        });
    } catch {
        throw new Error("Unable to connect to the API. Check that the backend is running.");
    }

    const contentType = response.headers.get("content-type") || "";

    const body = contentType.includes("application/json")
        ? await response.json().catch(() => null)
        : await response.text();

    if (!response.ok) {
        if (response.status === 401) {
            try {
                clearToken();
                localStorage.removeItem("sa_user");
            } catch {
                // Keep the API error even when browser storage is unavailable.
            }
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("sa:unauthorized"));
            }
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

function jsonBody(value) {
    return JSON.stringify(value);
}

export function relativeTime(value) {
    if (value === null || value === undefined || value === "") return "--";
    const timestamp = new Date(value).getTime();

    if (!Number.isFinite(timestamp)) return "Unknown time";

    const minutes = Math.floor((Date.now() - timestamp) / 60000);

    if (minutes < 1) return "Just now";

    if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

    const hours = Math.floor(minutes / 60);

    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

    const days = Math.floor(hours / 24);

    if (days === 1) return "Yesterday";

    return `${days} days ago`;
}

export async function login(email, password) {
    const result = await apiFetch("/api/auth/login", {
        method: "POST",

        body: jsonBody({ email, password }),
    });

    setToken(result.token);

    return result;
}

export async function register(data) {
    const result = await apiFetch("/api/auth/register", {
        method: "POST",

        body: jsonBody(data),
    });

    setToken(result.token);

    return result;
}

export async function changePassword({ currentPassword, newPassword }) {
    return apiFetch("/api/auth/change-password", {
        method: "POST",

        body: jsonBody({ currentPassword, newPassword }),
    });
}

export async function logout() {
    clearToken();
}

export async function getUserProfile(userId) {
    return apiFetch(`/api/users/${encodeURIComponent(userId)}`);
}

export async function updateUserProfile(userId, { fullName, photoUrl }) {
    return apiFetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: "PUT",

        body: jsonBody({ fullName, photoUrl }),
    });
}

export async function getAquarium(aquariumId) {
    try {
        return await apiFetch(aquariumPath(aquariumId));
    } catch (error) {
        if (error.status === 404) return null;
        throw error;
    }
}

export async function updateTemperatureConfig(aquariumId, payload) {
    return apiFetch(`${aquariumPath(aquariumId)}/temperature-config`, {
        method: "PATCH",

        body: jsonBody(payload),
    });
}

export async function updateLightingConfig(aquariumId, payload) {
    return apiFetch(`${aquariumPath(aquariumId)}/lighting-config`, {
        method: "PATCH",

        body: jsonBody(payload),
    });
}

export async function updateFeederConfig(aquariumId, payload) {
    return apiFetch(`${aquariumPath(aquariumId)}/feeder-config`, {
        method: "PATCH",

        body: jsonBody(payload),
    });
}

export async function triggerFeeder(aquariumId) {
    return apiFetch(`${aquariumPath(aquariumId)}/feeder/trigger`, {
        method: "POST",
    });
}

export async function updateSystemConfig(aquariumId, payload) {
    return apiFetch(`${aquariumPath(aquariumId)}/system-config`, {
        method: "PATCH",

        body: jsonBody(payload),
    });
}

function queryString(parameters) {
    const query = new URLSearchParams();

    Object.entries(parameters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
    });

    const serialized = query.toString();

    return serialized ? `?${serialized}` : "";
}

export async function getTelemetry(aquariumId, { startDate, endDate, limit = 40 } = {}) {
    try {
        return await apiFetch(`${aquariumPath(aquariumId)}/telemetry${queryString({ startDate, endDate, limit })}`);
    } catch (error) {
        if (error.status === 404) return { telemetryRecords: [], total: 0 };
        throw error;
    }
}

export async function exportTelemetry(aquariumId, { startDate, endDate, format = "csv" } = {}) {
    const { response, body } = await request(
        `${aquariumPath(aquariumId)}/telemetry/export${queryString({ startDate, endDate, format })}`,
    );

    const disposition = response.headers.get("content-disposition") || "";

    const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || "telemetry.csv";

    return { csv: body, filename };
}

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

export async function getNotifications(aquariumId, { limit, readStatus } = {}) {
    try {
        return await apiFetch(`${aquariumPath(aquariumId)}/notifications${queryString({ limit, readStatus })}`);
    } catch (error) {
        if (error.status === 404) return { notificationRecords: [] };
        throw error;
    }
}

export async function markNotificationRead(aquariumId, notificationId) {
    return apiFetch(`${aquariumPath(aquariumId)}/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: "PATCH",
    });
}

export async function markAllNotificationsRead(aquariumId) {
    return apiFetch(`${aquariumPath(aquariumId)}/notifications/read-all`, {
        method: "PATCH",
    });
}

export async function deleteNotification(aquariumId, notificationId) {
    return apiFetch(`${aquariumPath(aquariumId)}/notifications/${encodeURIComponent(notificationId)}`, {
        method: "DELETE",
    });
}
