import { useEffect, useState } from "react";
import { getNotifications } from "../api/service";

const REFRESH_INTERVAL_MS = 10_000;

// Jumlah unread untuk badge Alerts. Refresh tiap 10 detik dan saat event
// "sa:notifications-changed" dikirim setelah sebuah aksi
export default function useUnreadCount(userId, aquariumId) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!userId || !aquariumId) {
            setCount(0);
            return undefined;
        }

        let isActive = true;
        const refresh = async () => {
            try {
                const { notificationRecords } = await getNotifications(aquariumId, { limit: 500 });
                if (isActive) setCount(notificationRecords.filter(record => !record.isRead).length);
            } catch (error) {
                console.warn("Unable to refresh the alert count.", error);
            }
        };

        // Tab yang tersembunyi tidak perlu menghitung badge; saat tab aktif lagi, segera disegarkan
        const refreshIfVisible = () => {
            if (document.visibilityState === "visible") refresh();
        };

        refresh();
        window.addEventListener("sa:notifications-changed", refresh);
        document.addEventListener("visibilitychange", refreshIfVisible);
        const intervalId = window.setInterval(refreshIfVisible, REFRESH_INTERVAL_MS);
        return () => {
            isActive = false;
            window.removeEventListener("sa:notifications-changed", refresh);
            document.removeEventListener("visibilitychange", refreshIfVisible);
            window.clearInterval(intervalId);
        };
    }, [userId, aquariumId]);

    return [count, setCount];
}
