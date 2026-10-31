import { useEffect, useRef, useState } from "react";
import { getNotifications } from "../api/backendApi";

// poll interval
const NEW_NOTIFICATION_POLL_INTERVAL_MS = 15_000;

// permission
function getNotificationPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return window.Notification.permission;
}

// store preference
function storeBrowserNotificationPreference(key, isEnabled) {
    try {
        if (key) localStorage.setItem(key, String(isEnabled));
    } catch (error) {
        console.warn("Unable to save browser notification preferences.", error);
    }
}

// browser notifications
export default function useBrowserNotifications(userId, aquariumId) {
    // state
    const [permission, setPermission] = useState(getNotificationPermission);
    const [isEnabled, setIsEnabled] = useState(false);
    const knownNotificationIds = useRef(null);
    const preferenceKey = userId ? `sa_browser_notifications:${userId}` : null;

    // restore preference
    useEffect(() => {
        try {
            setIsEnabled(
                Boolean(
                    preferenceKey &&
                    localStorage.getItem(preferenceKey) === "true" &&
                    getNotificationPermission() === "granted",
                ),
            );
        } catch {
            setIsEnabled(false);
        }
    }, [preferenceKey]);

    // toggle notifications
    const setBrowserNotificationsEnabled = async shouldEnable => {
        if (!shouldEnable) {
            setIsEnabled(false);
            storeBrowserNotificationPreference(preferenceKey, false);
            return "disabled";
        }
        if (getNotificationPermission() === "unsupported") return "unsupported";

        let permissionResult = window.Notification.permission;
        try {
            if (permissionResult === "default") permissionResult = await window.Notification.requestPermission();
        } catch (error) {
            console.warn("Unable to request browser notification permission.", error);
            return "denied";
        }
        setPermission(permissionResult);
        setIsEnabled(permissionResult === "granted");
        storeBrowserNotificationPreference(preferenceKey, permissionResult === "granted");
        return permissionResult;
    };

    // poll notifications
    useEffect(() => {
        knownNotificationIds.current = null;
        if (!isEnabled || permission !== "granted" || !userId || !aquariumId) return undefined;

        let isActive = true;
        // check new
        const checkForNewNotifications = async () => {
            try {
                const { notificationRecords } = await getNotifications(aquariumId, { limit: 100 });
                if (!isActive) return;

                if (knownNotificationIds.current) {
                    notificationRecords
                        .filter(record => record.id && !knownNotificationIds.current.has(record.id))
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
                knownNotificationIds.current = new Set(notificationRecords.map(record => record.id));
            } catch (error) {
                console.warn("Unable to check for new browser notifications.", error);
            }
        };

        checkForNewNotifications();
        const intervalId = window.setInterval(checkForNewNotifications, NEW_NOTIFICATION_POLL_INTERVAL_MS);
        return () => {
            isActive = false;
            window.clearInterval(intervalId);
        };
    }, [isEnabled, permission, userId, aquariumId]);

    return {
        permission,
        isEnabled,
        isSupported: permission !== "unsupported",
        setBrowserNotificationsEnabled,
    };
}
