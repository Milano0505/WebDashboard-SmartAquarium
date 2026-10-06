import { AQUARIUM_ID, aquariumRef } from "../config/aquarium.js";
import { admin } from "../config/firebase.js";

export const notificationsRef = () => aquariumRef().collection("notifications");

// Notifikasi bersama: terlihat semua user, status baca/hapus per user di readBy/dismissedBy
export function sharedNotification({ actorId = null, actorName, title, message, type = "info" }) {
    return {
        userid: null,
        userId: actorId,
        aquariumId: AQUARIUM_ID,
        actorName,
        scope: "aquarium",
        title,
        message,
        type,
        isRead: false,
        readBy: [],
        dismissedBy: [],
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };
}

// Notifikasi privat: hanya untuk penerima di `userid` (perubahan profil/password)
export function privateNotification(userId, title, message) {
    return {
        userid: userId,
        userId,
        aquariumId: AQUARIUM_ID,
        scope: "user",
        title,
        message,
        type: "info",
        isRead: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };
}
