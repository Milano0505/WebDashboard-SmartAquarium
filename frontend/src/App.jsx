import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import useBrowserNotifications from "./hooks/useBrowserNotifications";
import useUnreadCount from "./hooks/useUnreadCount";
import ConfigurationPage from "./pages/Configuration";
import DashboardPage from "./pages/Dashboard";
import DataHistoryPage from "./pages/DataHistory";
import LoginPage from "./pages/Login";
import NotificationsPage from "./pages/Notifications";
import RegisterPage from "./pages/Register";

const NOTICE_DURATION_MS = 5000;

function ProtectedRoute({ children }) {
    const { isAuthenticated, isAuthLoading } = useAuth();
    if (isAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
                Checking session…
            </div>
        );
    }
    return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
    const { user } = useAuth();
    const userId = user?.id || user?.userId;
    const [notifCount, setNotifCount] = useUnreadCount(userId);
    const browserNotifications = useBrowserNotifications(userId);
    const [systemNotice, setSystemNotice] = useState("");

    // Toast sukses setelah aksi, hilang otomatis setelah 5 detik
    useEffect(() => {
        if (!systemNotice) return undefined;
        const timeoutId = window.setTimeout(() => setSystemNotice(""), NOTICE_DURATION_MS);
        return () => window.clearTimeout(timeoutId);
    }, [systemNotice]);

    // Aksi membuat notifikasi di server, jadi badge unread ikut di-refresh
    const notifySystemChange = message => {
        setSystemNotice(message);
        window.dispatchEvent(new Event("sa:notifications-changed"));
    };

    const dashboard = <DashboardPage onSystemChange={notifySystemChange} />;

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
                                <Route path="/dashboard" element={dashboard} />
                                <Route path="/dashboard/:tab" element={dashboard} />
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
                                    element={<ConfigurationPage browserNotifications={browserNotifications} />}
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
