import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import useBrowserNotifications from "./hooks/useBrowserNotifications";
import useUnreadNotificationCount from "./hooks/useUnreadNotificationCount";
import AccessPage from "./pages/Access";
import ConfigurationPage from "./pages/Configuration";
import DashboardPage from "./pages/Dashboard";
import DataHistoryPage from "./pages/DataHistory";
import LoginPage from "./pages/Login";
import NotificationsPage from "./pages/Notifications";
import RegisterPage from "./pages/Register";

// notice duration
const NOTICE_DURATION_MS = 5000;

// protected route
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

// no aquarium
function NoAquariumNotice() {
    const { signOut } = useAuth();
    return (
        <div className="px-4 py-10 text-center">
            <h1 className="text-xl font-bold text-slate-800">No aquarium to show yet</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                Your account is ready, but there is no aquarium for it yet. Ask an admin to give you access. You can
                still update your profile in Config.
            </p>
            <button onClick={signOut} className="mt-4 text-sm font-semibold text-blue-500 hover:underline">
                Sign out
            </button>
        </div>
    );
}

// app routes
function AppRoutes() {
    const { user, activeAquariumId, isAdmin, isViewer, canOpenAccessPage } = useAuth();
    const userId = user?.id || user?.userId;
    // notification state
    const alertsAquariumId = isViewer ? null : activeAquariumId;
    const [unreadNotificationCount, setUnreadNotificationCount] = useUnreadNotificationCount(userId, alertsAquariumId);
    const browserNotifications = useBrowserNotifications(userId, alertsAquariumId);
    const [successNotice, setSystemNotice] = useState("");

    // auto dismiss
    useEffect(() => {
        if (!successNotice) return undefined;
        const timeoutId = window.setTimeout(() => setSystemNotice(""), NOTICE_DURATION_MS);
        return () => window.clearTimeout(timeoutId);
    }, [successNotice]);

    // show notice
    const showSuccessNotice = message => {
        setSystemNotice(message);
        window.dispatchEvent(new Event("sa:notifications-changed"));
    };

    const dashboardElement = <DashboardPage onSuccessNotice={showSuccessNotice} />;

    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
                path="/*"
                element={
                    <ProtectedRoute>
                        <AppLayout
                            unreadNotificationCount={unreadNotificationCount}
                            successNotice={successNotice}
                            onDismissSuccessNotice={() => setSystemNotice("")}
                        >
                            {/* page routes */}
                            <Routes key={activeAquariumId}>
                                {canOpenAccessPage && <Route path="/access" element={<AccessPage />} />}
                                <Route
                                    path="/configuration"
                                    element={<ConfigurationPage browserNotifications={browserNotifications} />}
                                />
                                {activeAquariumId ? (
                                    <>
                                        <Route path="/dashboard" element={dashboardElement} />
                                        <Route path="/dashboard/:tab" element={dashboardElement} />
                                        <Route
                                            path="/history"
                                            element={
                                                isViewer ? <Navigate to="/dashboard" replace /> : <DataHistoryPage />
                                            }
                                        />
                                        <Route
                                            path="/notifications"
                                            element={
                                                isViewer ? (
                                                    <Navigate to="/dashboard" replace />
                                                ) : (
                                                    <NotificationsPage
                                                        onUnreadCountChange={setUnreadNotificationCount}
                                                        onSuccessNotice={showSuccessNotice}
                                                    />
                                                )
                                            }
                                        />
                                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                    </>
                                ) : (
                                    <Route
                                        path="*"
                                        element={
                                            isAdmin || canOpenAccessPage ? (
                                                <Navigate to="/access" replace />
                                            ) : (
                                                <NoAquariumNotice />
                                            )
                                        }
                                    />
                                )}
                            </Routes>
                        </AppLayout>
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

// app root
export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}
