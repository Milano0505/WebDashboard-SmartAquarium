import { useEffect, useState } from "react";
import {
    AQUARIUM_ID,
    deleteNotification,
    getAquarium,
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from "../api/service";
import { Check, Trash } from "../components/Icons";
import { ErrorAlert, PageHeader, Spinner } from "../components/ui";
import { relativeTime } from "../utils/format";

// ---------- Konstanta ----------

const TYPE_STYLES = {
    alert: { emoji: "🔴", bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700" },
    info: { emoji: "🔵", bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700" },
    success: { emoji: "🟢", bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700" },
};

const TYPE_COUNTERS = [
    ["alert", "Alerts", "bg-red-50 text-red-600 border border-red-200"],
    ["info", "Info", "bg-blue-50 text-blue-600 border border-blue-200"],
    ["success", "Success", "bg-green-50 text-green-600 border border-green-200"],
];

// ---------- Halaman ----------

export default function NotificationsPage({ onCountChange, onSystemChange }) {
    const [items, setItems] = useState([]);
    const [timezone, setTimezone] = useState("Asia/Manila");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [actionError, setActionError] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        Promise.all([getNotifications(AQUARIUM_ID, { limit: 500 }), getAquarium(AQUARIUM_ID)])
            .then(([notifications, aquarium]) => {
                if (!isMounted) return;
                setItems(notifications.notificationRecords);
                setTimezone(aquarium?.systemConfig?.timezone || "Asia/Manila");
            })
            .catch(error => isMounted && setLoadError(error.message || "Could not load notifications."))
            .finally(() => isMounted && setLoading(false));
        return () => {
            isMounted = false;
        };
    }, []);

    // Samakan badge Alerts dengan daftar ini
    const unread = items.filter(item => !item.isRead).length;
    useEffect(() => {
        onCountChange?.(unread);
    }, [unread, onCountChange]);

    // Panggil API dulu; daftar hanya diubah jika berhasil
    const runAction = async (action, updateItems, successMessage) => {
        setActionError("");
        setActionLoading(true);
        try {
            await action();
            setItems(updateItems);
            onSystemChange?.(successMessage);
        } catch (error) {
            setActionError(error.message || "Could not update notifications.");
        } finally {
            setActionLoading(false);
        }
    };

    const markOne = id =>
        runAction(
            () => markNotificationRead(AQUARIUM_ID, id),
            current => current.map(item => (item.id === id ? { ...item, isRead: true } : item)),
            "Notification marked as read.",
        );

    const markAll = () =>
        runAction(
            () => markAllNotificationsRead(AQUARIUM_ID),
            current => current.map(item => ({ ...item, isRead: true })),
            "All notifications marked as read.",
        );

    const remove = id =>
        runAction(
            () => deleteNotification(AQUARIUM_ID, id),
            current => current.filter(item => item.id !== id),
            "Notification deleted.",
        );

    if (loading || loadError) {
        return (
            <div className="px-4 py-5">
                <PageHeader title="Notifications" />
                {loading ? <Spinner /> : <ErrorAlert message={loadError} />}
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100dvh-8rem)] flex-col px-4 py-5 md:min-h-[calc(100dvh-10.5rem)] md:px-8 md:py-7">
            <PageHeader
                title="Notifications"
                subtitle={unread > 0 ? `${unread} unread` : "All caught up"}
                timezone={timezone}
                right={
                    unread > 0 && (
                        <button
                            onClick={markAll}
                            disabled={actionLoading}
                            className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 text-white text-xs font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-60"
                        >
                            <Check /> Mark all read
                        </button>
                    )
                }
            />
            <ErrorAlert message={actionError} />

            <div className="flex gap-2 mb-4">
                {TYPE_COUNTERS.map(([type, label, color]) => (
                    <span key={type} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${color}`}>
                        {items.filter(item => item.type === type).length} {label}
                    </span>
                ))}
            </div>

            {items.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center py-12 text-slate-400">
                    <div className="mb-4 text-5xl">🔔</div>
                    <p className="text-base">No notifications yet.</p>
                </div>
            )}

            <div className="space-y-3">
                {items.map(item => {
                    const style = TYPE_STYLES[item.type] || TYPE_STYLES.info;
                    return (
                        <div
                            key={item.id}
                            className={`${style.bg} border ${style.border} rounded-2xl p-4 md:p-6 transition-opacity ${
                                item.isRead ? "opacity-75" : ""
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-base mt-0.5 flex-shrink-0">{style.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-base font-bold text-slate-800">{item.title}</span>
                                        {!item.isRead && (
                                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                                        )}
                                        <span
                                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ml-auto ${style.badge}`}
                                        >
                                            {item.type}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed mb-2">{item.message}</p>
                                    <div className="text-xs text-slate-400">{relativeTime(item.timestamp)}</div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-slate-200/50">
                                {!item.isRead && (
                                    <button
                                        onClick={() => markOne(item.id)}
                                        disabled={actionLoading}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg text-xs font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors disabled:opacity-60"
                                    >
                                        <Check /> Read
                                    </button>
                                )}
                                <button
                                    onClick={() => remove(item.id)}
                                    disabled={actionLoading}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg text-xs font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-60"
                                >
                                    <Trash /> Delete
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
