import { useEffect, useState } from "react";

import {
    deleteNotification,
    getAquarium,
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    relativeTime,
} from "../api/service";

import { Check, Trash } from "../components/Icons";

import { ErrorAlert, PageHeader, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const TYPE = {
    alert: {
        emoji: "🔴",
        bg: "bg-red-50",
        border: "border-red-200",
        badge: "bg-red-100 text-red-700",
    },

    info: {
        emoji: "🔵",
        bg: "bg-blue-50",
        border: "border-blue-200",
        badge: "bg-blue-100 text-blue-700",
    },

    success: {
        emoji: "🟢",
        bg: "bg-green-50",
        border: "border-green-200",
        badge: "bg-green-100 text-green-700",
    },
};

export default function NotificationsPage({ onCountChange, onSystemChange }) {
    const { user } = useAuth();
    const aqId = user?.aquariumId;
    const [items, setItems] = useState([]);

    const [timezone, setTimezone] = useState("Asia/Manila");

    const [loading, setLoading] = useState(true);

    const [loadError, setLoadError] = useState("");

    const [actionError, setActionError] = useState("");

    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadNotifications = async () => {
            try {
                const [notifications, aquarium] = await Promise.all([getNotifications(aqId), getAquarium(aqId)]);

                if (!isMounted) return;

                setItems(notifications.notificationRecords);

                setTimezone(aquarium?.systemConfig?.timezone || "Asia/Manila");
            } catch (error) {
                if (isMounted) setLoadError(error instanceof Error ? error.message : "Could not load notifications.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadNotifications();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        onCountChange?.(items.filter(n => !n.isRead).length);
    }, [items, onCountChange]);

    const runAction = async (action, onSuccess, successMessage) => {
        setActionError("");

        setActionLoading(true);

        try {
            await action();

            onSuccess();
            onSystemChange?.(successMessage);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : "Could not update notifications.");
        } finally {
            setActionLoading(false);
        }
    };

    const markOne = id =>
        runAction(
            () => markNotificationRead(aqId, id),

            () => setItems(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n))),
            "Notification marked as read.",
        );

    const markAll = () =>
        runAction(
            () => markAllNotificationsRead(aqId),

            () => setItems(prev => prev.map(n => ({ ...n, isRead: true }))),
            "All notifications marked as read.",
        );

    const remove = id =>
        runAction(
            () => deleteNotification(aqId, id),

            () => setItems(prev => prev.filter(n => n.id !== id)),
            "Notification deleted.",
        );

    const unread = items.filter(n => !n.isRead).length;

    if (loading)
        return (
            <div className="px-4 py-5">
                <PageHeader title="Notifications" />
                <Spinner />
            </div>
        );

    if (loadError)
        return (
            <div className="px-4 py-5">
                <PageHeader title="Notifications" />
                <ErrorAlert message={loadError} />
            </div>
        );

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
                {[
                    {
                        label: `${items.filter(n => n.type === "alert").length} Alerts`,

                        color: "bg-red-50 text-red-600 border border-red-200",
                    },

                    {
                        label: `${items.filter(n => n.type === "info").length} Info`,

                        color: "bg-blue-50 text-blue-600 border border-blue-200",
                    },

                    {
                        label: `${items.filter(n => n.type === "success").length} Success`,

                        color: "bg-green-50 text-green-600 border border-green-200",
                    },
                ].map(c => (
                    <span key={c.label} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${c.color}`}>
                        {c.label}
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
                {items.map(n => {
                    const style = TYPE[n.type] || TYPE.info;

                    return (
                        <div
                            key={n.id}
                            className={`${style.bg} border ${style.border} rounded-2xl p-4 md:p-6 transition-opacity ${
                                n.isRead ? "opacity-75" : ""
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-base mt-0.5 flex-shrink-0">{style.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-base font-bold text-slate-800">{n.title}</span>
                                        {!n.isRead && (
                                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                                        )}
                                        <span
                                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ml-auto ${style.badge}`}
                                        >
                                            {n.type}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed mb-2">{n.message}</p>
                                    <div className="text-xs text-slate-400">{relativeTime(n.timestamp)}</div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-slate-200/50">
                                {!n.isRead && (
                                    <button
                                        onClick={() => markOne(n.id)}
                                        disabled={actionLoading}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg text-xs font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors disabled:opacity-60"
                                    >
                                        <Check /> Read
                                    </button>
                                )}
                                <button
                                    onClick={() => remove(n.id)}
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
