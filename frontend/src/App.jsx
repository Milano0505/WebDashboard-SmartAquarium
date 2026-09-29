import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { getNotifications } from "./api/service";
import Layout from "./components/Layout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ConfigurationPage from "./pages/Configuration";
import DashboardPage from "./pages/Dashboard";
import DataHistoryPage from "./pages/DataHistory";
import LoginPage from "./pages/Login";
import NotificationsPage from "./pages/Notifications";
import RegisterPage from "./pages/Register";

function getBrowserNotificationPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return window.Notification.permission;
}

function ProtectedRoute({ children }) {
    const { isAuthenticated, isAuthLoading } = useAuth();
    if (isAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
                Checking session…
            </div>
        );
    }
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
    const { user } = useAuth();
    const [notifCount, setNotifCount] = useState(0);
    const [systemNotice, setSystemNotice] = useState("");
    const [browserNotificationPermission, setBrowserNotificationPermission] = useState(
        getBrowserNotificationPermission,
    );
    const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
    const knownNotificationIds = useRef(null);
    const userId = user?.id || user?.userId;
    const notificationPreferenceKey = userId ? `sa_browser_notifications:${userId}` : null;

    useEffect(() => {
        if (!systemNotice) return undefined;
        const timeoutId = window.setTimeout(() => setSystemNotice(""), 5000);
        return () => window.clearTimeout(timeoutId);
    }, [systemNotice]);

    const notifySystemChange = message => setSystemNotice(message);

    useEffect(() => {
        try {
            setBrowserNotificationsEnabled(
                Boolean(
                    notificationPreferenceKey &&
                    localStorage.getItem(notificationPreferenceKey) === "true" &&
                    getBrowserNotificationPermission() === "granted",
                ),
            );
        } catch {
            setBrowserNotificationsEnabled(false);
        }
    }, [notificationPreferenceKey]);

    const updateBrowserNotifications = async enabled => {
        if (!enabled) {
            setBrowserNotificationsEnabled(false);
            try {
                if (notificationPreferenceKey) localStorage.setItem(notificationPreferenceKey, "false");
            } catch (error) {
                console.warn("Unable to save browser notification preferences.", error);
            }
            return "disabled";
        }

        if (getBrowserNotificationPermission() === "unsupported") return "unsupported";

        let permission = window.Notification.permission;
        try {
            if (permission === "default") permission = await window.Notification.requestPermission();
        } catch (error) {
            console.warn("Unable to request browser notification permission.", error);
            return "denied";
        }
        setBrowserNotificationPermission(permission);
        const enabledByPermission = permission === "granted";
        setBrowserNotificationsEnabled(enabledByPermission);
        try {
            if (notificationPreferenceKey) {
                localStorage.setItem(notificationPreferenceKey, String(enabledByPermission));
            }
        } catch (error) {
            console.warn("Unable to save browser notification preferences.", error);
        }
        return permission;
    };

    useEffect(() => {
        knownNotificationIds.current = null;
        if (!browserNotificationsEnabled || browserNotificationPermission !== "granted" || !user?.aquariumId) {
            return undefined;
        }

        let isActive = true;
        const checkForNotifications = async () => {
            try {
                const { notificationRecords } = await getNotifications(user.aquariumId, { limit: 100 });
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

        checkForNotifications();
        const intervalId = window.setInterval(checkForNotifications, 15_000);
        return () => {
            isActive = false;
            window.clearInterval(intervalId);
        };
    }, [browserNotificationPermission, browserNotificationsEnabled, user?.aquariumId]);

    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
                path="/*"
                element={
                    <ProtectedRoute>
                        <Layout
                            notifCount={notifCount}
                            systemNotice={systemNotice}
                            onDismissSystemNotice={() => setSystemNotice("")}
                        >
                            <Routes>
                                <Route
                                    path="/dashboard"
                                    element={<DashboardPage onSystemChange={notifySystemChange} />}
                                />
                                <Route
                                    path="/dashboard/:tab"
                                    element={<DashboardPage onSystemChange={notifySystemChange} />}
                                />
                                <Route path="/history" element={<DataHistoryPage />} />
                                <Route
                                    path="/notifications"
                                    element={
                                        <NotificationsPage
                                            onCountChange={setNotifCount}
                                            onSystemChange={notifySystemChange}
                                        />
                                    }
                                />
                                <Route
                                    path="/configuration"
                                    element={
                                        <ConfigurationPage
                                            browserNotificationPermission={browserNotificationPermission}
                                            browserNotificationsEnabled={browserNotificationsEnabled}
                                            browserNotificationsSupported={
                                                browserNotificationPermission !== "unsupported"
                                            }
                                            onBrowserNotificationsChange={updateBrowserNotifications}
                                            onSystemChange={notifySystemChange}
                                        />
                                    }
                                />
                                <Route path="*" element={<Navigate to="/dashboard" replace />} />
                            </Routes>
                        </Layout>
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}
