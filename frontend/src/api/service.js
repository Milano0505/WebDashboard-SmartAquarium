// Client REST API. Semua request lewat `request` yang menambahkan access token Supabase dan mengubah error
// menjadi Error berisi pesan API dan status HTTP
import { auth } from "../supabase";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

// ---------- Token sesi ----------

// Access token berlaku 1 jam; SDK memperbaruinya otomatis dari refresh token yang disimpan di browser
async function getToken() {
    const { data } = await auth.getSession();
    return data.session?.access_token ?? null;
}

// Selama login/register berjalan, AuthContext tidak boleh memuat sesi sendiri (menghindari balapan)
let authBusy = false;
export const isAuthBusy = () => authBusy;

async function whileBusy(task) {
    authBusy = true;
    try {
        return await task();
    } finally {
        authBusy = false;
    }
}

// ---------- Fungsi bantu request ----------

function aquariumPath(aquariumId) {
    if (!aquariumId) throw new Error("No aquarium is selected.");
    return `/api/aquariums/${encodeURIComponent(aquariumId)}`;
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
    const token = await getToken();
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
        if (response.status === 401) window.dispatchEvent(new Event("sa:unauthorized"));
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

// Pesan Supabase dipetakan berdasarkan isi teksnya (kode error tidak selalu ada)
const AUTH_ERRORS = [
    [/invalid login credentials/i, "Invalid email or password."],
    [/already registered|already been registered/i, "An account with this email already exists."],
    [/password.*(at least|should be|weak)/i, "Password must be at least 6 characters."],
    [/valid email|invalid.*email/i, "Enter a valid email address."],
    [/rate limit|too many/i, "Too many attempts. Please try again later."],
    [/email not confirmed/i, "Confirm your email first. Check your inbox for the confirmation link."],
    [/failed to fetch|network/i, "Unable to reach Supabase. Check your connection."],
];

// Supabase mengembalikan { error } alih-alih melempar; ubah menjadi Error dengan pesan yang mudah dibaca
function authFailure(error) {
    const match = AUTH_ERRORS.find(([pattern]) => pattern.test(error.message || ""));
    return new Error(match ? match[1] : error.message || "Authentication failed.");
}

// Membuat profil di backend (jika belum ada) dan mengembalikannya
export const startSession = (payload = {}) => send("POST", "/api/auth/session", payload);

export const login = (email, password) =>
    whileBusy(async () => {
        const { error } = await auth.signInWithPassword({ email, password });
        if (error) throw authFailure(error);
        return startSession();
    });

// Profil dibuat trigger database dari full_name. Jika proyek mewajibkan konfirmasi email, signUp tidak
// mengembalikan sesi: hasilnya { needsConfirmation: true } dan user harus mengonfirmasi lewat email dulu
export const register = ({ fullName, email, password, photoUrl }) =>
    whileBusy(async () => {
        const { data, error } = await auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
        });
        if (error) throw authFailure(error);
        if (!data.session) return { userProfile: null, needsConfirmation: true };
        return startSession({ fullName, photoUrl });
    });

// Password lama diverifikasi dengan login ulang sebelum diganti
export async function changePassword({ currentPassword, newPassword }) {
    const { data } = await auth.getUser();
    const email = data.user?.email;
    if (!email) throw new Error("You are not signed in.");

    const { error: verifyError } = await auth.signInWithPassword({ email, password: currentPassword });
    if (verifyError) throw new Error("Current password is incorrect.");

    const { error } = await auth.updateUser({ password: newPassword });
    if (error) throw authFailure(error);
    await send("POST", "/api/auth/password-changed");
    return { message: "Password updated successfully." };
}

export const logout = async () => {
    await auth.signOut();
};

// ---------- Profil user ----------

export const getUserProfile = userId => apiFetch(`/api/users/${encodeURIComponent(userId)}`);

export const updateUserProfile = (userId, { fullName, photoUrl }) =>
    send("PUT", `/api/users/${encodeURIComponent(userId)}`, { fullName, photoUrl });

// ---------- Konfigurasi akuarium ----------

// Semua fungsi per-akuarium bertipe async: id yang kosong menghasilkan promise yang ditolak (bisa ditangkap .catch),
// bukan error sinkron yang menjatuhkan seluruh aplikasi di dalam useEffect

export const getAquariums = () => apiFetch("/api/aquariums");

export const getAquarium = async aquariumId => getOrFallback(aquariumPath(aquariumId), null);

export const updateTemperatureConfig = async (aquariumId, payload) =>
    send("PATCH", `${aquariumPath(aquariumId)}/temperature-config`, payload);

export const updateLightingConfig = async (aquariumId, payload) =>
    send("PATCH", `${aquariumPath(aquariumId)}/lighting-config`, payload);

export const updateFeederConfig = async (aquariumId, payload) =>
    send("PATCH", `${aquariumPath(aquariumId)}/feeder-config`, payload);

export const updateSystemConfig = async (aquariumId, payload) =>
    send("PATCH", `${aquariumPath(aquariumId)}/system-config`, payload);

export const triggerFeeder = async aquariumId => send("POST", `${aquariumPath(aquariumId)}/feeder/trigger`);

// ---------- Telemetry ----------

export const getTelemetry = async (aquariumId, { startDate, endDate, limit = 40 } = {}) =>
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

// Data <AreaChart> dari record telemetry (terbaru dulu): hasilnya terlama dulu
export function toChartData(telemetryRecords) {
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

export const getNotifications = async (aquariumId, { limit, readStatus } = {}) =>
    getOrFallback(`${aquariumPath(aquariumId)}/notifications${queryString({ limit, readStatus })}`, {
        notificationRecords: [],
    });

export const markNotificationRead = async (aquariumId, notificationId) =>
    send("PATCH", `${aquariumPath(aquariumId)}/notifications/${encodeURIComponent(notificationId)}/read`);

export const markAllNotificationsRead = async aquariumId =>
    send("PATCH", `${aquariumPath(aquariumId)}/notifications/read-all`);

export const deleteNotification = async (aquariumId, notificationId) =>
    send("DELETE", `${aquariumPath(aquariumId)}/notifications/${encodeURIComponent(notificationId)}`);

// ---------- Anggota akuarium (owner dan admin) ----------

export const getMembers = async aquariumId => apiFetch(`${aquariumPath(aquariumId)}/members`);

// User yang belum menjadi anggota akuarium ini dan boleh diberi peran
export const getCandidates = async aquariumId => apiFetch(`${aquariumPath(aquariumId)}/candidates`);

export const saveMember = async (aquariumId, { userId, role }) =>
    send("PUT", `${aquariumPath(aquariumId)}/members`, { userId, role });

export const removeMember = async (aquariumId, userId) =>
    send("DELETE", `${aquariumPath(aquariumId)}/members/${encodeURIComponent(userId)}`);

// ---------- Admin ----------

export const adminGetUsers = () => apiFetch("/api/admin/users");

export const adminSetUserRole = (userId, role) =>
    send("PATCH", `/api/admin/users/${encodeURIComponent(userId)}`, { role });

export const adminGetAquariums = () => apiFetch("/api/admin/aquariums");

export const adminCreateAquarium = ({ name, id, ownerId }) =>
    send("POST", "/api/admin/aquariums", { name, id, ownerId });

export const adminUpdateAquarium = async (aquariumId, payload) =>
    send("PATCH", `/api/admin/aquariums/${encodeURIComponent(aquariumId)}`, payload);

export const adminGetDevices = async aquariumId =>
    apiFetch(`/api/admin/aquariums/${encodeURIComponent(aquariumId)}/devices`);

export const adminCreateDevice = async (aquariumId, name) =>
    send("POST", `/api/admin/aquariums/${encodeURIComponent(aquariumId)}/devices`, { name });

export const adminRevokeDevice = deviceId => send("DELETE", `/api/admin/devices/${encodeURIComponent(deviceId)}`);
