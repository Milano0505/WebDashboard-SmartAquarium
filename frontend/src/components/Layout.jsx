import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Bell, Dashboard, Fish, History, Logout, Settings } from "./Icons";

const NAV = [
    { path: "/dashboard", label: "Dashboard", icon: Dashboard },
    { path: "/history", label: "History", icon: History },
    { path: "/notifications", label: "Alerts", icon: Bell },
    { path: "/configuration", label: "Config", icon: Settings },
];

function ChevronLeft() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="15 18 9 12 15 6" />
        </svg>
    );
}

function ChevronRight() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );
}

export default function Layout({ children, notifCount = 0, systemNotice, onDismissSystemNotice }) {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const displayName = user?.fullName || user?.name || "Aquarist";
    const initials =
        displayName !== "Aquarist"
            ? displayName
                  .split(" ")
                  .map(n => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
            : "SA";

    const sidebarW = collapsed ? "w-16" : "w-64";
    const marginL = collapsed ? "md:ml-16" : "md:ml-64";

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.warn("Sign out completed with a storage error.", error);
        } finally {
            navigate("/login", { replace: true });
        }
    };

    const pageLabel = NAV.find(n => pathname === n.path || pathname.startsWith(n.path + "/"))?.label || "Dashboard";

    return (
        <div className="min-h-screen bg-slate-100 flex">
            {/* Sidebar */}
            <aside
                id="desktop-sidebar"
                className={`hidden md:flex flex-col ${sidebarW} fixed top-0 left-0 bottom-0 flex-shrink-0 shadow-xl z-30 overflow-hidden transition-all duration-200`}
                style={{ background: "#0d1b4b" }}
            >
                <div className="flex-shrink-0 h-16" />
                <nav
                    className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                    {NAV.map(({ path, label, icon: Icon }) => {
                        const active = pathname === path || pathname.startsWith(path + "/");
                        const isNotif = path === "/notifications";
                        return (
                            <button
                                key={path}
                                onClick={() => navigate(path)}
                                title={collapsed ? label : undefined}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
                                    collapsed ? "justify-center" : ""
                                } ${
                                    active
                                        ? "bg-blue-500 text-white shadow-md shadow-blue-500/30"
                                        : "text-blue-100/70 hover:bg-white/10 hover:text-white"
                                }`}
                            >
                                <span className="flex-shrink-0 relative">
                                    <Icon />
                                    {isNotif && notifCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                                            {notifCount > 9 ? "9+" : notifCount}
                                        </span>
                                    )}
                                </span>
                                {!collapsed && <span className="truncate">{label}</span>}
                            </button>
                        );
                    })}
                </nav>

                {/* Sign-out control */}
                <div className="px-3 py-4 border-t border-white/10 flex-shrink-0">
                    <button
                        onClick={handleSignOut}
                        title={collapsed ? "Sign Out" : undefined}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all ${
                            collapsed ? "justify-center px-3" : ""
                        }`}
                    >
                        <Logout />
                        {!collapsed && <span>Sign Out</span>}
                    </button>
                </div>
            </aside>

            <button
                type="button"
                onClick={() => setCollapsed(current => !current)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
                aria-controls="desktop-sidebar"
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className={`hidden md:flex fixed top-20 ${
                    collapsed ? "left-16" : "left-64"
                } z-40 h-10 w-6 items-center justify-center rounded-r-lg border border-l-0 border-white/20 bg-[#0d1b4b] text-white shadow-md transition-all duration-200 hover:bg-blue-700`}
            >
                {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </button>

            {/* Main area */}
            <div className={`flex-1 flex flex-col min-h-screen min-w-0 ${marginL} transition-all duration-200`}>
                {/* Fixed header */}
                <header
                    className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 md:px-6 h-14 md:h-16 shadow-sm overflow-hidden"
                    style={{ background: "#0d1b4b" }}
                >
                    {/* Header identity */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-white">
                            <Fish />
                            {!collapsed && (
                                <div className="leading-none">
                                    <div className="text-white text-sm font-bold tracking-widest leading-none">
                                        SMART
                                    </div>
                                    <div className="text-blue-300 text-[10px] font-semibold tracking-widest leading-none">
                                        AQUARIUM
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Page title */}
                        <div className="hidden md:flex items-center gap-3">
                            <span className="w-px h-6 bg-white/20" />
                            <span className="text-white/70 text-sm font-semibold">{pageLabel}</span>
                        </div>
                    </div>

                    {/* Profile control */}
                    <button
                        onClick={() => navigate("/configuration")}
                        className="flex items-center gap-2.5 flex-shrink-0"
                    >
                        {user?.photoUrl || user?.avatar ? (
                            <img
                                src={user.photoUrl || user.avatar}
                                alt={displayName}
                                className="w-8 h-8 rounded-full object-cover border-2 border-blue-400"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-blue-400">
                                {initials}
                            </div>
                        )}
                        <div className="hidden md:block text-left min-w-0">
                            <div className="text-white text-sm font-semibold leading-none truncate max-w-[140px]">
                                {displayName}
                            </div>
                            <div className="text-blue-300 text-[11px] leading-none mt-0.5 truncate max-w-[140px]">
                                {user?.email || ""}
                            </div>
                        </div>
                    </button>
                </header>

                {/* Page content */}
                <main
                    className="flex-1 overflow-y-auto scroll-area md:p-6 mt-14 md:mt-16"
                    style={{
                        paddingBottom: "calc(56px + env(safe-area-inset-bottom, 0px))",
                    }}
                >
                    <div className="mx-auto w-full max-w-[1600px]">{children}</div>
                </main>
            </div>

            {systemNotice && (
                <div
                    role="status"
                    aria-live="polite"
                    className="fixed right-4 top-20 z-50 w-[calc(100vw-2rem)] max-w-sm"
                >
                    <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 shadow-lg">
                        <span className="flex-shrink-0" aria-hidden="true">
                            ✅
                        </span>
                        <p className="flex-1">{systemNotice}</p>
                        <button
                            type="button"
                            onClick={onDismissSystemNotice}
                            aria-label="Dismiss notification"
                            className="-mr-1 -mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-green-700 hover:bg-green-100"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile navigation */}
            <nav
                className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-200 bg-white md:hidden"
                style={{
                    height: "calc(56px + env(safe-area-inset-bottom, 0px))",
                    paddingBottom: "env(safe-area-inset-bottom, 0px)",
                }}
            >
                {NAV.map(({ path, label, icon: Icon }) => {
                    const active = pathname === path || pathname.startsWith(path + "/");
                    const isNotif = path === "/notifications";
                    return (
                        <button
                            key={path}
                            onClick={() => navigate(path)}
                            className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 transition-colors ${
                                active ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                            }`}
                        >
                            <span className="relative flex-shrink-0">
                                <Icon />
                                {isNotif && notifCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                                        {notifCount > 9 ? "9+" : notifCount}
                                    </span>
                                )}
                            </span>
                            <span
                                className={`text-[10px] font-semibold leading-none ${
                                    active ? "text-blue-600" : "text-slate-400"
                                }`}
                            >
                                {label}
                            </span>
                            {active && <span className="absolute top-0 w-8 h-0.5 bg-blue-500 rounded-full" />}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
