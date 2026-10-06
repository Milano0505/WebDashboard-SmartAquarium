import { useEffect, useState } from "react";
import { AQUARIUM_ID, getNotifications } from "../api/service";

const REFRESH_INTERVAL_MS = 10_000;

// Jumlah unread untuk badge Alerts. Refresh tiap 10 detik dan saat event
// "sa:notifications-changed" dikirim setelah sebuah aksi
export default function useUnreadCount(userId) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!userId) {
            setCount(0);
            return undefined;
        }

        let isActive = true;
        const refresh = async () => {
            try {
                const { notificationRecords } = await getNotifications(AQUARIUM_ID, { limit: 500 });
                if (isActive) setCount(notificationRecords.filter(record => !record.isRead).length);
            } catch (error) {
                console.warn("Unable to refresh the alert count.", error);
            }
        };

        refresh();
        window.addEventListener("sa:notifications-changed", refresh);
        const intervalId = window.setInterval(refresh, REFRESH_INTERVAL_MS);
        return () => {
            isActive = false;
            window.removeEventListener("sa:notifications-changed", refresh);
            window.clearInterval(intervalId);
        };
    }, [userId]);

    return [count, setCount];
}
