// Client REST API. Semua request lewat `request` yang menambahkan Firebase ID token dan mengubah error
// menjadi Error berisi pesan API dan status HTTP
import {
    EmailAuthProvider,
    createUserWithEmailAndPassword,
    reauthenticateWithCredential,
    signInWithEmailAndPassword,
    signOut,
    updatePassword,
} from "firebase/auth";
import { auth } from "../firebase";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

// ---------- Token sesi ----------

// ID token berlaku 1 jam; SDK memperbaruinya otomatis dari refresh token yang disimpan Firebase
const getToken = () => (auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(null));

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

const AUTH_ERRORS = {
    "auth/invalid-credential": "Invalid email or password.",
    "auth/wrong-password": "Invalid email or password.",
    "auth/user-not-found": "Invalid email or password.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Unable to reach Firebase. Check your connection.",
};

// Ubah error Firebase menjadi pesan yang mudah dibaca
async function firebaseAction(action) {
    try {
        return await action();
    } catch (error) {
        throw new Error(AUTH_ERRORS[error.code] || error.message || "Authentication failed.");
    }
}

// Membuat profil di backend (jika belum ada) dan mengembalikannya
export const startSession = (payload = {}) => send("POST", "/api/auth/session", payload);

export const login = (email, password) =>
    whileBusy(async () => {
        await firebaseAction(() => signInWithEmailAndPassword(auth, email, password));
        return startSession();
    });

export const register = ({ fullName, email, password, photoUrl }) =>
    whileBusy(async () => {
        await firebaseAction(() => createUserWithEmailAndPassword(auth, email, password));
        return startSession({ fullName, photoUrl });
    });

// Firebase meminta login ulang sebelum mengganti password, jadi password lama diverifikasi lebih dulu
export async function changePassword({ currentPassword, newPassword }) {
    const user = auth.currentUser;
    if (!user?.email) throw new Error("You are not signed in.");
    try {
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
    } catch {
        throw new Error("Current password is incorrect.");
    }
    await firebaseAction(() => updatePassword(user, newPassword));
    await send("POST", "/api/auth/password-changed");
    return { message: "Password updated successfully." };
}

export const logout = () => signOut(auth);

// ---------- Profil user ----------

export const getUserProfile = userId => apiFetch(`/api/users/${encodeURIComponent(userId)}`);

export const updateUserProfile = (userId, { fullName, photoUrl }) =>
    send("PUT", `/api/users/${encodeURIComponent(userId)}`, { fullName, photoUrl });

// ---------- Konfigurasi akuarium ----------

export const getAquariums = () => apiFetch("/api/aquariums");

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

// ---------- Anggota akuarium (owner dan admin) ----------

export const getMembers = aquariumId => apiFetch(`${aquariumPath(aquariumId)}/members`);

export const saveMember = (aquariumId, { email, role }) =>
    send("PUT", `${aquariumPath(aquariumId)}/members`, { email, role });

export const removeMember = (aquariumId, userId) =>
    send("DELETE", `${aquariumPath(aquariumId)}/members/${encodeURIComponent(userId)}`);

// ---------- Admin ----------

export const adminGetUsers = () => apiFetch("/api/admin/users");

export const adminSetUserRole = (userId, role) =>
    send("PATCH", `/api/admin/users/${encodeURIComponent(userId)}`, { role });

export const adminCreateAquarium = ({ name, ownerEmail }) => send("POST", "/api/admin/aquariums", { name, ownerEmail });

export const adminGetDevices = aquariumId => apiFetch(`/api/admin/aquariums/${encodeURIComponent(aquariumId)}/devices`);

export const adminCreateDevice = (aquariumId, name) =>
    send("POST", `/api/admin/aquariums/${encodeURIComponent(aquariumId)}/devices`, { name });

export const adminRevokeDevice = deviceId => send("DELETE", `/api/admin/devices/${encodeURIComponent(deviceId)}`);
