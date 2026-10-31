import { useEffect, useState } from "react";
import { getNotifications } from "../api/backendApi";

// refresh interval
const UNREAD_REFRESH_INTERVAL_MS = 10_000;

// unread count
export default function useUnreadNotificationCount(userId, aquariumId) {
    // state
    const [unreadCount, setUnreadCount] = useState(0);

    // fetch count
    useEffect(() => {
        if (!userId || !aquariumId) {
            setUnreadCount(0);
            return undefined;
        }

        let isActive = true;
        // refresh count
        const refreshUnreadCount = async () => {
            try {
                const { notificationRecords } = await getNotifications(aquariumId, { limit: 500 });
                if (isActive) setUnreadCount(notificationRecords.filter(record => !record.isRead).length);
            } catch (error) {
                console.warn("Unable to refresh the alert count.", error);
            }
        };

        // refresh visible
        const refreshWhenTabVisible = () => {
            if (document.visibilityState === "visible") refreshUnreadCount();
        };

        refreshUnreadCount();
        window.addEventListener("sa:notifications-changed", refreshUnreadCount);
        document.addEventListener("visibilitychange", refreshWhenTabVisible);
        const intervalId = window.setInterval(refreshWhenTabVisible, UNREAD_REFRESH_INTERVAL_MS);
        return () => {
            isActive = false;
            window.removeEventListener("sa:notifications-changed", refreshUnreadCount);
            document.removeEventListener("visibilitychange", refreshWhenTabVisible);
            window.clearInterval(intervalId);
        };
    }, [userId, aquariumId]);

    return [unreadCount, setUnreadCount];
}
