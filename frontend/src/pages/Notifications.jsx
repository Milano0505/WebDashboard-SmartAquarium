import { useEffect, useState } from "react";
import {
    deleteNotification,
    getAquariumDetail,
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from "../api/backendApi";
import { CheckIcon, TrashIcon } from "../components/Icons";
import { ErrorAlert, PageHeader, LoadingSpinner } from "../components/UiKit";
import { useAuth } from "../context/AuthContext";
import { formatRelativeTime } from "../utils/displayFormatters";

// type styles
const NOTIFICATION_TYPE_STYLES = {
    alert: { emoji: "🔴", bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700" },
    info: { emoji: "🔵", bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700" },
    success: { emoji: "🟢", bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700" },
};

// type counters
const NOTIFICATION_TYPE_COUNTERS = [
    ["alert", "Alerts", "bg-red-50 text-red-600 border border-red-200"],
    ["info", "Info", "bg-blue-50 text-blue-600 border border-blue-200"],
    ["success", "Success", "bg-green-50 text-green-600 border border-green-200"],
];

// notifications page
export default function NotificationsPage({ onUnreadCountChange, onSuccessNotice }) {
    const { activeAquariumId } = useAuth();
    // state
    const [notifications, setNotifications] = useState([]);
    const [timezone, setTimezone] = useState("Asia/Manila");
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [actionError, setActionError] = useState("");
    const [isActionLoading, setIsActionLoading] = useState(false);

    // fetch notifications
    useEffect(() => {
        let isMounted = true;
        Promise.all([getNotifications(activeAquariumId, { limit: 500 }), getAquariumDetail(activeAquariumId)])
            .then(([notificationResult, aquarium]) => {
                if (!isMounted) return;
                setNotifications(notificationResult.notificationRecords);
                setTimezone(aquarium?.systemConfig?.timezone || "Asia/Manila");
            })
            .catch(error => isMounted && setLoadError(error.message || "Could not load notifications."))
            .finally(() => isMounted && setIsLoading(false));
        return () => {
            isMounted = false;
        };
    }, []);

    // unread count
    const unreadCount = notifications.filter(notification => !notification.isRead).length;
    // sync badge
    useEffect(() => {
        onUnreadCountChange?.(unreadCount);
    }, [unreadCount, onUnreadCountChange]);

    // run action
    const runNotificationAction = async (action, updateNotifications, successMessage) => {
        setActionError("");
        setIsActionLoading(true);
        try {
            await action();
            setNotifications(updateNotifications);
            onSuccessNotice?.(successMessage);
        } catch (error) {
            setActionError(error.message || "Could not update notifications.");
        } finally {
            setIsActionLoading(false);
        }
    };

    // mark read
    const handleMarkRead = notificationId =>
        runNotificationAction(
            () => markNotificationRead(activeAquariumId, notificationId),
            current =>
                current.map(notification =>
                    notification.id === notificationId ? { ...notification, isRead: true } : notification,
                ),
            "Notification marked as read.",
        );

    // mark read
    const handleMarkAllRead = () =>
        runNotificationAction(
            () => markAllNotificationsRead(activeAquariumId),
            current => current.map(notification => ({ ...notification, isRead: true })),
            "All notifications marked as read.",
        );

    // delete
    const handleDeleteNotification = notificationId =>
        runNotificationAction(
            () => deleteNotification(activeAquariumId, notificationId),
            current => current.filter(notification => notification.id !== notificationId),
            "Notification deleted.",
        );

    if (isLoading || loadError) {
        return (
            <div className="px-4 py-5">
                <PageHeader title="Notifications" />
                {isLoading ? <LoadingSpinner /> : <ErrorAlert message={loadError} />}
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100dvh-8rem)] flex-col px-4 py-5 md:min-h-[calc(100dvh-10.5rem)] md:px-8 md:py-7">
            <PageHeader
                title="Notifications"
                subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                timezone={timezone}
                right={
                    unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            disabled={isActionLoading}
                            className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 text-white text-xs font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-60"
                        >
                            <CheckIcon /> Mark all read
                        </button>
                    )
                }
            />
            <ErrorAlert message={actionError} />

            <div className="flex gap-2 mb-4">
                {NOTIFICATION_TYPE_COUNTERS.map(([type, label, color]) => (
                    <span key={type} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${color}`}>
                        {notifications.filter(notification => notification.type === type).length} {label}
                    </span>
                ))}
            </div>

            {notifications.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center py-12 text-slate-400">
                    <div className="mb-4 text-5xl">🔔</div>
                    <p className="text-base">No notifications yet.</p>
                </div>
            )}

            <div className="space-y-3">
                {notifications.map(notification => {
                    const style = NOTIFICATION_TYPE_STYLES[notification.type] || NOTIFICATION_TYPE_STYLES.info;
                    return (
                        <div
                            key={notification.id}
                            className={`${style.bg} border ${style.border} rounded-2xl p-4 md:p-6 transition-opacity ${
                                notification.isRead ? "opacity-75" : ""
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-base mt-0.5 flex-shrink-0">{style.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-base font-bold text-slate-800">{notification.title}</span>
                                        {!notification.isRead && (
                                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                                        )}
                                        <span
                                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ml-auto ${style.badge}`}
                                        >
                                            {notification.type}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed mb-2">
                                        {notification.message}
                                    </p>
                                    <div className="text-xs text-slate-400">
                                        {formatRelativeTime(notification.timestamp)}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-slate-200/50">
                                {!notification.isRead && (
                                    <button
                                        onClick={() => handleMarkRead(notification.id)}
                                        disabled={isActionLoading}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg text-xs font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors disabled:opacity-60"
                                    >
                                        <CheckIcon /> Read
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDeleteNotification(notification.id)}
                                    disabled={isActionLoading}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg text-xs font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-60"
                                >
                                    <TrashIcon /> Delete
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
