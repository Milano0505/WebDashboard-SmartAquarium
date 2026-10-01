import { admin } from "../config/firebase.js";

export function toIsoString(value) {
    if (value instanceof Date) return value.toISOString();
    if (value && typeof value.toDate === "function") return value.toDate().toISOString();
    return value ?? null;
}

export function serializeFirestore(value) {
    if (value instanceof Date || value instanceof admin.firestore.Timestamp) {
        return value.toDate ? value.toDate().toISOString() : value.toISOString();
    }
    if (Array.isArray(value)) return value.map(serializeFirestore);
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serializeFirestore(entry)]));
    }
    return value;
}
