import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    AQUARIUM_ID,
    changePassword,
    getAquarium,
    updateSystemConfig,
    updateTemperatureConfig,
    updateUserProfile,
} from "../api/service";
import { Camera, Eye, EyeOff, Lock, Logout, Mail, User } from "../components/Icons";
import { Card, ErrorAlert, InputField, PageHeader, PrimaryBtn, Spinner, SuccessAlert, Toggle } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { createProfilePhotoDataUrl } from "../utils/profilePhoto";

const toF = c => +((c * 9) / 5 + 32).toFixed(1);
function fmtTemp(c, unit) {
    if (unit === "Fahrenheit") return `${toF(c)}°F`;
    return `${c}°C`;
}

const TABS = [
    { id: "profile", label: "👤 Profile" },
    { id: "system", label: "⚙️ System" },
    { id: "alerts", label: "🔔 Alerts" },
    { id: "about", label: "ℹ️ About" },
];

export default function ConfigurationPage({
    browserNotificationPermission,
    browserNotificationsEnabled,
    browserNotificationsSupported,
    onBrowserNotificationsChange,
}) {
    const { user, setUser, signOut } = useAuth();
    const navigate = useNavigate();
    const aqId = AQUARIUM_ID;

    const [tab, setTab] = useState("profile");
    const [aquarium, setAquarium] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [form, setForm] = useState({
        fullName: user?.fullName || user?.name || "",
        email: user?.email || "",
    });
    const [photoUrl, setPhotoUrl] = useState(() => {
        const savedPhoto = user?.photoUrl || user?.avatar || null;
        return savedPhoto?.startsWith("blob:") ? null : savedPhoto;
    });
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
    const [showPw, setShowPw] = useState(false);
    const [profileSaved, setProfileSaved] = useState("");
    const [profileError, setProfileError] = useState("");
    const [pwSaved, setPwSaved] = useState("");
    const [pwError, setPwError] = useState("");
    const [saving, setSaving] = useState(false);
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [settingsError, setSettingsError] = useState("");
    const [settingsSaved, setSettingsSaved] = useState("");
    const fileRef = useRef();

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setLoadError("");

        const loadConfiguration = async () => {
            try {
                const aquariumData = await getAquarium(aqId);
                if (isMounted) setAquarium(aquariumData);
            } catch (error) {
                if (isMounted) setLoadError(error instanceof Error ? error.message : "Could not load configuration.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadConfiguration();
        return () => {
            isMounted = false;
        };
    }, [aqId]);

    useEffect(
        () => () => {
            if (photoUrl?.startsWith("blob:")) URL.revokeObjectURL(photoUrl);
        },
        [photoUrl],
    );

    const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

    const handleAvatar = e => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            setPhotoUrl(URL.createObjectURL(file));
            setSelectedPhoto(file);
            setProfileError("");
        } catch (error) {
            setProfileError(error instanceof Error ? error.message : "Could not load the selected photo.");
        }
    };

    const handleSaveProfile = async () => {
        setProfileError("");
        setProfileSaved("");
        setSaving(true);
        try {
            const savedPhotoUrl = selectedPhoto ? await createProfilePhotoDataUrl(selectedPhoto) : photoUrl;
            await updateUserProfile(user?.id || "user-001", {
                fullName: form.fullName,
                photoUrl: savedPhotoUrl,
            });
            setUser({
                ...user,
                fullName: form.fullName,
                name: form.fullName,
                email: form.email,
                photoUrl: savedPhotoUrl,
            });
            setPhotoUrl(savedPhotoUrl);
            setSelectedPhoto(null);
            setProfileSaved("Profile updated successfully.");
            window.dispatchEvent(new Event("sa:notifications-changed"));
        } catch (err) {
            setProfileError(err instanceof Error ? err.message : "Could not save profile.");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        setPwError("");
        setPwSaved("");
        if (!pwForm.current || !pwForm.next) {
            setPwError("Please fill in all fields.");
            return;
        }
        if (pwForm.next !== pwForm.confirm) {
            setPwError("New passwords do not match.");
            return;
        }
        if (pwForm.next.length < 6) {
            setPwError("Password must be at least 6 characters.");
            return;
        }
        setSaving(true);
        try {
            await changePassword({
                currentPassword: pwForm.current,
                newPassword: pwForm.next,
            });
            setPwSaved("Password updated successfully.");
            window.dispatchEvent(new Event("sa:notifications-changed"));
            setPwForm({ current: "", next: "", confirm: "" });
        } catch (err) {
            setPwError(err instanceof Error ? err.message : "Could not change password.");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSystem = async () => {
        setSettingsError("");
        setSettingsSaved("");
        setSettingsSaving(true);
        try {
            const { pollFrequency, timezone } = aquarium.systemConfig;
            const unit = aquarium.tempConfig.unit;
            await updateSystemConfig(aqId, { unit, pollFrequency, timezone });
            setSettingsSaved("System settings saved successfully.");
            window.dispatchEvent(new Event("sa:notifications-changed"));
        } catch (error) {
            setSettingsError(error instanceof Error ? error.message : "Could not save system settings.");
        } finally {
            setSettingsSaving(false);
        }
    };

    const handleSaveAlerts = async () => {
        setSettingsError("");
        setSettingsSaved("");
        setSettingsSaving(true);
        try {
            await updateTemperatureConfig(aqId, {
                minTempThreshold: aquarium.tempConfig.minTempThreshold,
                maxTempThreshold: aquarium.tempConfig.maxTempThreshold,
            });
            setSettingsSaved("Alert settings saved successfully.");
            window.dispatchEvent(new Event("sa:notifications-changed"));
        } catch (error) {
            setSettingsError(error instanceof Error ? error.message : "Could not save alert settings.");
        } finally {
            setSettingsSaving(false);
        }
    };

    const handleBrowserNotificationsChange = async enabled => {
        setSettingsError("");
        setSettingsSaved("");
        try {
            const permission = await onBrowserNotificationsChange(enabled);
            if (permission === "unsupported") {
                setSettingsError("This browser does not support browser notifications.");
            } else if (permission === "denied") {
                setSettingsError("Notifications are blocked for this site. Allow them in your browser settings.");
            } else {
                setSettingsSaved(enabled ? "Browser notifications enabled." : "Browser notifications disabled.");
            }
        } catch (error) {
            setSettingsError(error instanceof Error ? error.message : "Could not update browser notifications.");
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            console.warn("Sign out completed with a storage error.", error);
        } finally {
            navigate("/login", { replace: true });
        }
    };

    const initials =
        form.fullName
            .split(" ")
            .map(n => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "?";

    if (loading)
        return (
            <div className="px-4 py-5">
                <PageHeader title="Configuration" />
                <Spinner />
            </div>
        );
    if (loadError)
        return (
            <div className="px-4 py-5">
                <PageHeader title="Configuration" />
                <ErrorAlert message={loadError} />
            </div>
        );
    if (!aquarium)
        return (
            <div className="px-4 py-5">
                <PageHeader title="Configuration" />
                <p className="py-8 text-center text-sm text-slate-400">No Data</p>
            </div>
        );

    const { tempConfig, systemConfig } = aquarium;

    return (
        <div className="px-4 py-5">
            <PageHeader title="Configuration" timezone={systemConfig.timezone} />
            {(settingsError || settingsSaved) && (
                <div className="mb-4 space-y-2" aria-live="polite">
                    <ErrorAlert message={settingsError} />
                    <SuccessAlert message={settingsSaved} />
                </div>
            )}

            {/* Tab pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 mb-5" style={{ scrollbarWidth: "none" }}>
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                            tab === t.id
                                ? "bg-blue-500 text-white shadow-sm"
                                : "bg-white border border-slate-200 text-slate-600"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Profile ── */}
            {tab === "profile" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="space-y-4">
                        <Card className="flex flex-col items-center py-6">
                            <button onClick={() => fileRef.current?.click()} className="relative group mb-3">
                                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-blue-200">
                                    {photoUrl ? (
                                        <img src={photoUrl} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                                            {initials}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute inset-0 rounded-full bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera />
                                </div>
                            </button>
                            <p
                                className="text-xs text-blue-500 font-semibold cursor-pointer"
                                onClick={() => fileRef.current?.click()}
                            >
                                Change Photo
                            </p>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatar}
                                className="hidden"
                            />
                        </Card>

                        <Card className="space-y-4">
                            <p className="text-sm font-bold text-slate-700">Change Password</p>
                            <SuccessAlert message={pwSaved} />
                            <ErrorAlert message={pwError} />
                            {[
                                ["current", "Current Password"],
                                ["next", "New Password"],
                                ["confirm", "Confirm New Password"],
                            ].map(([k, lbl]) => (
                                <InputField
                                    key={k}
                                    label={lbl}
                                    type={showPw ? "text" : "password"}
                                    value={pwForm[k]}
                                    onChange={e => setPwForm(f => ({ ...f, [k]: e.target.value }))}
                                    placeholder="••••••••"
                                    icon={Lock}
                                    right={
                                        k === "current" && (
                                            <button
                                                type="button"
                                                onClick={() => setShowPw(!showPw)}
                                                className="text-slate-400 p-1"
                                            >
                                                {showPw ? <EyeOff /> : <Eye />}
                                            </button>
                                        )
                                    }
                                />
                            ))}
                            <PrimaryBtn
                                onClick={handleChangePassword}
                                disabled={saving}
                                className="bg-slate-800 hover:bg-slate-900"
                            >
                                Update Password
                            </PrimaryBtn>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <SuccessAlert message={profileSaved} />
                        <ErrorAlert message={profileError} />

                        <Card className="space-y-4">
                            <InputField
                                label="Full Name"
                                type="text"
                                value={form.fullName}
                                onChange={setF("fullName")}
                                icon={User}
                            />
                            <InputField
                                label="Email Address"
                                type="email"
                                value={form.email}
                                onChange={setF("email")}
                                icon={Mail}
                            />
                            <PrimaryBtn onClick={handleSaveProfile} disabled={saving}>
                                {saving ? "Saving…" : "Save Profile"}
                            </PrimaryBtn>
                        </Card>

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 border border-red-200 font-semibold rounded-xl hover:bg-red-100 transition-colors text-sm"
                        >
                            <Logout /> Sign Out
                        </button>
                    </div>
                </div>
            )}

            {/* ── System Settings ── */}
            {tab === "system" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <Card className="space-y-4">
                        <p className="text-sm font-bold text-slate-700">Temperature Unit</p>
                        <div className="flex gap-2">
                            {["Celsius", "Fahrenheit"].map(u => (
                                <button
                                    key={u}
                                    onClick={() =>
                                        setAquarium(a => ({
                                            ...a,
                                            tempConfig: { ...a.tempConfig, unit: u },
                                        }))
                                    }
                                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                                        tempConfig.unit === u
                                            ? "bg-blue-500 text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    {u === "Celsius" ? "°C Celsius" : "°F Fahrenheit"}
                                </button>
                            ))}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Timezone</label>
                            <select
                                value={systemConfig.timezone}
                                onChange={e =>
                                    setAquarium(a => ({
                                        ...a,
                                        systemConfig: {
                                            ...a.systemConfig,
                                            timezone: e.target.value,
                                        },
                                    }))
                                }
                                className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                            >
                                <optgroup label="Southeast Asia">
                                    <option value="Asia/Manila">Asia/Manila — Philippines (GMT+8)</option>
                                    <option value="Asia/Jakarta">Asia/Jakarta — WIB Indonesia (GMT+7)</option>
                                    <option value="Asia/Makassar">Asia/Makassar — WITA Indonesia (GMT+8)</option>
                                    <option value="Asia/Jayapura">Asia/Jayapura — WIT Indonesia (GMT+9)</option>
                                    <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                                    <option value="Asia/Bangkok">Asia/Bangkok — Thailand (GMT+7)</option>
                                    <option value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur — Malaysia (GMT+8)</option>
                                    <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh — Vietnam (GMT+7)</option>
                                </optgroup>
                                <optgroup label="East Asia">
                                    <option value="Asia/Tokyo">Asia/Tokyo — Japan (GMT+9)</option>
                                    <option value="Asia/Shanghai">Asia/Shanghai — China (GMT+8)</option>
                                    <option value="Asia/Seoul">Asia/Seoul — Korea (GMT+9)</option>
                                </optgroup>
                                <optgroup label="South Asia">
                                    <option value="Asia/Kolkata">Asia/Kolkata — India (GMT+5:30)</option>
                                    <option value="Asia/Dhaka">Asia/Dhaka — Bangladesh (GMT+6)</option>
                                </optgroup>
                                <optgroup label="Middle East">
                                    <option value="Asia/Dubai">Asia/Dubai — UAE (GMT+4)</option>
                                    <option value="Asia/Riyadh">Asia/Riyadh — Saudi Arabia (GMT+3)</option>
                                </optgroup>
                                <optgroup label="Europe">
                                    <option value="Europe/London">Europe/London (GMT+0/+1)</option>
                                    <option value="Europe/Paris">Europe/Paris — CET (GMT+1/+2)</option>
                                    <option value="Europe/Berlin">Europe/Berlin — CET (GMT+1/+2)</option>
                                </optgroup>
                                <optgroup label="Americas">
                                    <option value="America/New_York">America/New_York — EST (GMT-5/-4)</option>
                                    <option value="America/Chicago">America/Chicago — CST (GMT-6/-5)</option>
                                    <option value="America/Los_Angeles">America/Los_Angeles — PST (GMT-8/-7)</option>
                                    <option value="America/Sao_Paulo">America/Sao_Paulo — BRT (GMT-3)</option>
                                </optgroup>
                                <optgroup label="Pacific / Other">
                                    <option value="UTC">UTC (GMT+0)</option>
                                    <option value="Pacific/Auckland">Pacific/Auckland — NZST (GMT+12/+13)</option>
                                    <option value="Australia/Sydney">Australia/Sydney — AEST (GMT+10/+11)</option>
                                </optgroup>
                            </select>
                        </div>
                    </Card>

                    <Card className="space-y-4">
                        <p className="text-sm font-bold text-slate-700">Sensor Poll Frequency</p>
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-xs text-slate-500">Poll frequency</span>
                                <span className="text-xs font-bold text-slate-700">{systemConfig.pollFrequency}s</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="60"
                                value={systemConfig.pollFrequency}
                                onChange={e =>
                                    setAquarium(a => ({
                                        ...a,
                                        systemConfig: {
                                            ...a.systemConfig,
                                            pollFrequency: +e.target.value,
                                        },
                                    }))
                                }
                                className="w-full"
                                style={{
                                    background: `linear-gradient(to right, #3b7cf4 ${((systemConfig.pollFrequency - 1) / 59) * 100}%, #e2e8f0 ${((systemConfig.pollFrequency - 1) / 59) * 100}%)`,
                                }}
                            />
                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                                <span>1s</span>
                                <span>60s</span>
                            </div>
                        </div>
                        <PrimaryBtn onClick={handleSaveSystem} disabled={settingsSaving}>
                            {settingsSaving ? "Saving…" : "Save System Settings"}
                        </PrimaryBtn>
                    </Card>
                </div>
            )}

            {/* ── Alert Thresholds ── */}
            {tab === "alerts" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <Card className="space-y-5">
                        <div>
                            <p className="text-sm font-bold text-slate-700">Temperature Thresholds</p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                These Celsius limits trigger an alert when telemetry goes outside the range. They do not
                                set the heater target or control the heater.
                            </p>
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-xs font-semibold text-slate-600">Min Temperature</label>
                                <span className="text-xs font-bold text-blue-600">
                                    {fmtTemp(tempConfig.minTempThreshold, tempConfig.unit)}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="25"
                                value={tempConfig.minTempThreshold}
                                onChange={e =>
                                    setAquarium(a => ({
                                        ...a,
                                        tempConfig: {
                                            ...a.tempConfig,
                                            minTempThreshold: +e.target.value,
                                        },
                                    }))
                                }
                                className="w-full"
                                style={{
                                    background: `linear-gradient(to right, #3b7cf4 ${((tempConfig.minTempThreshold - 10) / 15) * 100}%, #e2e8f0 ${((tempConfig.minTempThreshold - 10) / 15) * 100}%)`,
                                }}
                            />
                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                                <span>{fmtTemp(10, tempConfig.unit)}</span>
                                <span>{fmtTemp(25, tempConfig.unit)}</span>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-xs font-semibold text-slate-600">Max Temperature</label>
                                <span className="text-xs font-bold text-red-500">
                                    {fmtTemp(tempConfig.maxTempThreshold, tempConfig.unit)}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="22"
                                max="35"
                                value={tempConfig.maxTempThreshold}
                                onChange={e =>
                                    setAquarium(a => ({
                                        ...a,
                                        tempConfig: {
                                            ...a.tempConfig,
                                            maxTempThreshold: +e.target.value,
                                        },
                                    }))
                                }
                                className="w-full"
                                style={{
                                    background: `linear-gradient(to right, #ef4444 ${((tempConfig.maxTempThreshold - 22) / 13) * 100}%, #e2e8f0 ${((tempConfig.maxTempThreshold - 22) / 13) * 100}%)`,
                                }}
                            />
                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                                <span>{fmtTemp(22, tempConfig.unit)}</span>
                                <span>{fmtTemp(35, tempConfig.unit)}</span>
                            </div>
                        </div>
                        <PrimaryBtn onClick={handleSaveAlerts} disabled={settingsSaving}>
                            {settingsSaving ? "Saving…" : "Save Temperature Thresholds"}
                        </PrimaryBtn>
                    </Card>

                    <Card className="space-y-4">
                        <p className="text-sm font-bold text-slate-700">Notification Channels</p>
                        <div className="flex items-center justify-between gap-4 py-3">
                            <div>
                                <div className="text-sm font-semibold text-slate-700">Browser Notifications</div>
                                <div className="text-xs text-slate-400">Show new alerts on this device</div>
                            </div>
                            <Toggle
                                checked={browserNotificationsEnabled}
                                disabled={!browserNotificationsSupported}
                                label="Browser Notifications"
                                onChange={handleBrowserNotificationsChange}
                            />
                        </div>
                        <p className="text-xs text-slate-400">
                            {!browserNotificationsSupported
                                ? "Notifications are not supported by this browser."
                                : browserNotificationPermission === "denied"
                                  ? "Permission is blocked in browser settings."
                                  : browserNotificationsEnabled
                                    ? "Enabled while the dashboard is open."
                                    : "Notifications are off."}
                        </p>
                    </Card>
                </div>
            )}

            {/* ── About ── */}
            {tab === "about" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="space-y-3">
                        <Card className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white text-xl flex-shrink-0">
                                🐟
                            </div>
                            <div>
                                <div className="font-bold text-slate-800">Smart Aquarium</div>
                                <div className="text-xs text-slate-400">Version 1.0.0 · IoT Dashboard</div>
                            </div>
                        </Card>
                        <Card className="divide-y divide-slate-50">
                            {[
                                ["Hardware", aquarium.hardwareInfo.microcontroller],
                                ["Temperature Sensor", aquarium.hardwareInfo.tempSensor],
                                ["Lighting", aquarium.hardwareInfo.lighting],
                                ["Feeder", aquarium.hardwareInfo.feeder],
                                ["Firmware", aquarium.hardwareInfo.firmwareVersion],
                            ].map(([lbl, val]) => (
                                <div key={lbl} className="flex items-center justify-between py-3">
                                    <span className="text-xs text-slate-500">{lbl}</span>
                                    <span className="text-xs font-semibold text-slate-700">{val}</span>
                                </div>
                            ))}
                        </Card>
                    </div>
                    <Card className="divide-y divide-slate-50">
                        <p className="text-sm font-bold text-slate-700 pb-3">Technology Stack</p>
                        {[
                            ["Connectivity", "Wi-Fi 802.11 b/g/n"],
                            ["Protocol", "MQTT / HTTP REST API"],
                            ["Database", "Firebase Firestore"],
                            ["Frontend", "React + Tailwind CSS v4"],
                            ["Build Tool", "Vite 8"],
                            ["Routing", "React Router v7"],
                            ["Language", "JavaScript (JSX)"],
                        ].map(([lbl, val]) => (
                            <div key={lbl} className="flex items-center justify-between py-3">
                                <span className="text-xs text-slate-500">{lbl}</span>
                                <span className="text-xs font-semibold text-slate-700">{val}</span>
                            </div>
                        ))}
                    </Card>
                </div>
            )}
        </div>
    );
}
