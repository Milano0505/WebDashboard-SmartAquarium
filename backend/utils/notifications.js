import { aquariumRef, aquariumsRef } from "../config/aquarium.js";
import { admin } from "../config/firebase.js";
import { createCache } from "./cache.js";

export const notificationsRef = aquariumId => aquariumRef(aquariumId).collection("notifications");

// ---------- Cache daftar notifikasi ----------

// Halaman Alerts, badge unread, dan notifikasi browser memanggil daftar ini terus-menerus. Daftar terbaru per
// akuarium disimpan di memori dan hanya dibaca ulang setelah ada perubahan (invalidateNotifications dipanggil
// SETELAH setiap penulisan berhasil). Jendela 300 dokumen terbaru; yang lebih lama tidak ikut ditampilkan
const NOTIFICATION_WINDOW = 300;
const notificationCache = createCache({ ttlMs: 600_000, maxEntries: 100 });

export const invalidateNotifications = aquariumId => notificationCache.delete(aquariumId);

// Notifikasi terbaru (terbaru dulu) dari semua cakupan; penyaringan per user dilakukan pemanggil
export const recentNotifications = aquariumId =>
    notificationCache.load(aquariumId, async () => {
        const snapshot = await notificationsRef(aquariumId)
            .orderBy("timestamp", "desc")
            .limit(NOTIFICATION_WINDOW)
            .get();
        return snapshot.docs.map(document => ({ id: document.id, ...document.data() }));
    });

// Notifikasi bersama: terlihat semua anggota akuarium, status baca/hapus per user di readBy/dismissedBy
export function sharedNotification({ aquariumId, actorId = null, actorName, title, message, type = "info" }) {
    return {
        userid: null,
        userId: actorId,
        aquariumId,
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
export function privateNotification(userId, aquariumId, title, message) {
    return {
        userid: userId,
        userId,
        aquariumId,
        scope: "user",
        title,
        message,
        type: "info",
        isRead: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };
}

// Tambahkan notifikasi privat ke batch, satu per akuarium tempat user menjadi anggota
// (halaman Alerts membaca notifikasi per akuarium). Mengembalikan ID akuarium yang terpengaruh;
// pemanggil wajib memanggil invalidateNotifications untuk tiap ID setelah batch.commit()
export async function addPrivateNotifications(batch, userId, title, message) {
    const snapshot = await aquariumsRef().where("memberIds", "array-contains", userId).get();
    return snapshot.docs.map(document => {
        batch.create(notificationsRef(document.id).doc(), privateNotification(userId, document.id, title, message));
        return document.id;
    });
}
