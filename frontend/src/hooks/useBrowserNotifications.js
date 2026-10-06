import { useEffect, useRef, useState } from "react";
import { AQUARIUM_ID, getNotifications } from "../api/service";

const POLL_INTERVAL_MS = 15_000;

function currentPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return window.Notification.permission;
}

function savePreference(key, enabled) {
    try {
        if (key) localStorage.setItem(key, String(enabled));
    } catch (error) {
        console.warn("Unable to save browser notification preferences.", error);
    }
}

// Browser notification: satu-satunya kanal alert selain halaman Alerts (tanpa email/SMS).
// Saat aktif dan dashboard terbuka, notifikasi baru dicek tiap 15 detik.
// Preferensi on/off disimpan per user di localStorage
export default function useBrowserNotifications(userId) {
    const [permission, setPermission] = useState(currentPermission);
    const [enabled, setEnabled] = useState(false);
    const knownIds = useRef(null);
    const preferenceKey = userId ? `sa_browser_notifications:${userId}` : null;

    // Pulihkan preferensi user
    useEffect(() => {
        try {
            setEnabled(
                Boolean(
                    preferenceKey &&
                    localStorage.getItem(preferenceKey) === "true" &&
                    currentPermission() === "granted",
                ),
            );
        } catch {
            setEnabled(false);
        }
    }, [preferenceKey]);

    // Mengembalikan izin hasil ("granted", "denied", "unsupported") atau "disabled"
    const setBrowserNotifications = async shouldEnable => {
        if (!shouldEnable) {
            setEnabled(false);
            savePreference(preferenceKey, false);
            return "disabled";
        }
        if (currentPermission() === "unsupported") return "unsupported";

        let result = window.Notification.permission;
        try {
            if (result === "default") result = await window.Notification.requestPermission();
        } catch (error) {
            console.warn("Unable to request browser notification permission.", error);
            return "denied";
        }
        setPermission(result);
        setEnabled(result === "granted");
        savePreference(preferenceKey, result === "granted");
        return result;
    };

    useEffect(() => {
        knownIds.current = null;
        if (!enabled || permission !== "granted" || !userId) return undefined;

        let isActive = true;
        const checkForNotifications = async () => {
            try {
                const { notificationRecords } = await getNotifications(AQUARIUM_ID, { limit: 100 });
                if (!isActive) return;

                // Pengecekan pertama hanya mencatat ID agar notifikasi lama tidak muncul lagi
                if (knownIds.current) {
                    notificationRecords
                        .filter(record => record.id && !knownIds.current.has(record.id))
                        .reverse()
                        .forEach(record => {
                            const notification = new window.Notification(record.title || "Smart Aquarium", {
                                body: record.message || "You have a new aquarium notification.",
                                tag: record.id,
                            });
                            notification.onclick = () => {
                                window.focus();
                                window.location.assign("/notifications");
                                notification.close();
                            };
                        });
                }
                knownIds.current = new Set(notificationRecords.map(record => record.id));
            } catch (error) {
                console.warn("Unable to check for new browser notifications.", error);
            }
        };

        checkForNotifications();
        const intervalId = window.setInterval(checkForNotifications, POLL_INTERVAL_MS);
        return () => {
            isActive = false;
            window.clearInterval(intervalId);
        };
    }, [enabled, permission, userId]);

    return {
        permission,
        enabled,
        supported: permission !== "unsupported",
        setBrowserNotifications,
    };
}
