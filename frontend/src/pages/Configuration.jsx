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
import {
    Card,
    ErrorAlert,
    InputField,
    PageHeader,
    PrimaryBtn,
    RangeSlider,
    Spinner,
    SuccessAlert,
    Toggle,
} from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { formatTemp, initialsOf } from "../utils/format";
import { createProfilePhotoDataUrl } from "../utils/profilePhoto";

const TABS = [
    { id: "profile", label: "👤 Profile" },
    { id: "system", label: "⚙️ System" },
    { id: "alerts", label: "🔔 Alerts" },
    { id: "about", label: "ℹ️ About" },
];

const TIMEZONES = [
    {
        group: "Southeast Asia",
        zones: [
            ["Asia/Manila", "Asia/Manila — Philippines (GMT+8)"],
            ["Asia/Jakarta", "Asia/Jakarta — WIB Indonesia (GMT+7)"],
            ["Asia/Makassar", "Asia/Makassar — WITA Indonesia (GMT+8)"],
            ["Asia/Jayapura", "Asia/Jayapura — WIT Indonesia (GMT+9)"],
            ["Asia/Singapore", "Asia/Singapore (GMT+8)"],
            ["Asia/Bangkok", "Asia/Bangkok — Thailand (GMT+7)"],
            ["Asia/Kuala_Lumpur", "Asia/Kuala_Lumpur — Malaysia (GMT+8)"],
            ["Asia/Ho_Chi_Minh", "Asia/Ho_Chi_Minh — Vietnam (GMT+7)"],
        ],
    },
    {
        group: "East Asia",
        zones: [
            ["Asia/Tokyo", "Asia/Tokyo — Japan (GMT+9)"],
            ["Asia/Shanghai", "Asia/Shanghai — China (GMT+8)"],
            ["Asia/Seoul", "Asia/Seoul — Korea (GMT+9)"],
        ],
    },
    {
        group: "South Asia",
        zones: [
            ["Asia/Kolkata", "Asia/Kolkata — India (GMT+5:30)"],
            ["Asia/Dhaka", "Asia/Dhaka — Bangladesh (GMT+6)"],
        ],
    },
    {
        group: "Middle East",
        zones: [
            ["Asia/Dubai", "Asia/Dubai — UAE (GMT+4)"],
            ["Asia/Riyadh", "Asia/Riyadh — Saudi Arabia (GMT+3)"],
        ],
    },
    {
        group: "Europe",
        zones: [
            ["Europe/London", "Europe/London (GMT+0/+1)"],
            ["Europe/Paris", "Europe/Paris — CET (GMT+1/+2)"],
            ["Europe/Berlin", "Europe/Berlin — CET (GMT+1/+2)"],
        ],
    },
    {
        group: "Americas",
        zones: [
            ["America/New_York", "America/New_York — EST (GMT-5/-4)"],
            ["America/Chicago", "America/Chicago — CST (GMT-6/-5)"],
            ["America/Los_Angeles", "America/Los_Angeles — PST (GMT-8/-7)"],
            ["America/Sao_Paulo", "America/Sao_Paulo — BRT (GMT-3)"],
        ],
    },
    {
        group: "Pacific / Other",
        zones: [
            ["UTC", "UTC (GMT+0)"],
            ["Pacific/Auckland", "Pacific/Auckland — NZST (GMT+12/+13)"],
            ["Australia/Sydney", "Australia/Sydney — AEST (GMT+10/+11)"],
        ],
    },
];

// Isi tab About (samakan dengan fitur di README.md)
const FEATURES = [
    ["🌡️", "Temperature monitoring"],
    ["🔥", "Heater control"],
    ["💡", "Lighting control"],
    ["🐟", "Feeding control"],
];

const TECH_STACK = [
    ["Frontend", "React 19 + Tailwind CSS 4"],
    ["Build Tool", "Vite 8"],
    ["Routing", "React Router 7"],
    ["Backend", "Node.js + Express 5"],
    ["Database", "Firebase Firestore"],
    ["Authentication", "JWT + bcrypt"],
    ["Device API", "HTTP REST API"],
];

function InfoRows({ rows }) {
    return rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4 py-3">
            <span className="text-xs text-slate-500">{label}</span>
            <span className="text-xs font-semibold text-slate-700 text-right">{value}</span>
        </div>
    ));
}

// ---------- Tab Profile ----------

function ProfileTab() {
    const { user, setUser, signOut } = useAuth();
    const navigate = useNavigate();
    const fileRef = useRef();

    const [fullName, setFullName] = useState(user?.fullName || "");
    const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || null);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [profileStatus, setProfileStatus] = useState({ error: "", saved: "" });
    const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
    const [showPasswords, setShowPasswords] = useState(false);
    const [passwordStatus, setPasswordStatus] = useState({ error: "", saved: "" });
    const [saving, setSaving] = useState(false);

    // Lepas URL preview foto yang dipilih
    useEffect(
        () => () => {
            if (photoUrl?.startsWith("blob:")) URL.revokeObjectURL(photoUrl);
        },
        [photoUrl],
    );

    const handlePhotoSelected = event => {
        const file = event.target.files[0];
        if (!file) return;
        setPhotoUrl(URL.createObjectURL(file));
        setSelectedPhoto(file);
        setProfileStatus({ error: "", saved: "" });
    };

    const handleSaveProfile = async () => {
        setProfileStatus({ error: "", saved: "" });
        setSaving(true);
        try {
            // Foto baru dikecilkan dan dikompres jadi data URL JPEG
            const savedPhotoUrl = selectedPhoto ? await createProfilePhotoDataUrl(selectedPhoto) : photoUrl;
            await updateUserProfile(user.id, { fullName, photoUrl: savedPhotoUrl });
            setUser({ ...user, fullName, photoUrl: savedPhotoUrl });
            setPhotoUrl(savedPhotoUrl);
            setSelectedPhoto(null);
            setProfileStatus({ error: "", saved: "Profile updated successfully." });
            window.dispatchEvent(new Event("sa:notifications-changed"));
        } catch (error) {
            setProfileStatus({ error: error.message || "Could not save profile.", saved: "" });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        const fail = error => setPasswordStatus({ error, saved: "" });
        if (!passwords.current || !passwords.next) return fail("Please fill in all fields.");
        if (passwords.next !== passwords.confirm) return fail("New passwords do not match.");
        if (passwords.next.length < 6) return fail("Password must be at least 6 characters.");

        setPasswordStatus({ error: "", saved: "" });
        setSaving(true);
        try {
            await changePassword({ currentPassword: passwords.current, newPassword: passwords.next });
            setPasswords({ current: "", next: "", confirm: "" });
            setPasswordStatus({ error: "", saved: "Password updated successfully." });
            window.dispatchEvent(new Event("sa:notifications-changed"));
        } catch (error) {
            fail(error.message || "Could not change password.");
        } finally {
            setSaving(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.warn("Sign out completed with a storage error.", error);
        } finally {
            navigate("/login", { replace: true });
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div className="space-y-4">
                <Card className="flex flex-col items-center py-6">
                    <button onClick={() => fileRef.current?.click()} className="relative group mb-3">
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-blue-200">
                            {photoUrl ? (
                                <img src={photoUrl} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                                    {initialsOf(fullName)}
                                </div>
                            )}
                        </div>
                        <div className="absolute inset-0 rounded-full bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera />
                        </div>
                    </button>
                    <button
                        type="button"
                        className="text-xs text-blue-500 font-semibold"
                        onClick={() => fileRef.current?.click()}
                    >
                        Change Photo
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelected}
                        className="hidden"
                    />
                </Card>

                <Card className="space-y-4">
                    <p className="text-sm font-bold text-slate-700">Change Password</p>
                    <SuccessAlert message={passwordStatus.saved} />
                    <ErrorAlert message={passwordStatus.error} />
                    {[
                        ["current", "Current Password"],
                        ["next", "New Password"],
                        ["confirm", "Confirm New Password"],
                    ].map(([key, label]) => (
                        <InputField
                            key={key}
                            label={label}
                            type={showPasswords ? "text" : "password"}
                            value={passwords[key]}
                            onChange={event => setPasswords(current => ({ ...current, [key]: event.target.value }))}
                            placeholder="••••••••"
                            icon={Lock}
                            right={
                                key === "current" && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords(!showPasswords)}
                                        className="text-slate-400 p-1"
                                    >
                                        {showPasswords ? <EyeOff /> : <Eye />}
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
                <SuccessAlert message={profileStatus.saved} />
                <ErrorAlert message={profileStatus.error} />
                <Card className="space-y-4">
                    <InputField
                        label="Full Name"
                        value={fullName}
                        onChange={event => setFullName(event.target.value)}
                        icon={User}
                    />
                    <InputField
                        label="Email Address"
                        type="email"
                        value={user?.email || ""}
                        icon={Mail}
                        readOnly
                        hint="Email is used to sign in and cannot be changed."
                    />
                    <PrimaryBtn onClick={handleSaveProfile} disabled={saving}>
                        {saving ? "Saving…" : "Save Profile"}
                    </PrimaryBtn>
                </Card>

                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 border border-red-200 font-semibold rounded-xl hover:bg-red-100 transition-colors text-sm"
                >
                    <Logout /> Sign Out
                </button>
            </div>
        </div>
    );
}

// ---------- Tab System ----------

function SystemTab({ aquarium, updateSection, saving, onSave }) {
    const { tempConfig, systemConfig } = aquarium;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <Card className="space-y-4">
                <p className="text-sm font-bold text-slate-700">Temperature Unit</p>
                <div className="flex gap-2">
                    {["Celsius", "Fahrenheit"].map(unit => (
                        <button
                            key={unit}
                            onClick={() => updateSection("tempConfig", { unit })}
                            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                                tempConfig.unit === unit
                                    ? "bg-blue-500 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >
                            {unit === "Celsius" ? "°C Celsius" : "°F Fahrenheit"}
                        </button>
                    ))}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Timezone</label>
                    <select
                        value={systemConfig.timezone}
                        onChange={event => updateSection("systemConfig", { timezone: event.target.value })}
                        className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    >
                        {TIMEZONES.map(({ group, zones }) => (
                            <optgroup key={group} label={group}>
                                {zones.map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>
            </Card>

            <Card className="space-y-4">
                <p className="text-sm font-bold text-slate-700">Sensor Poll Frequency</p>
                <RangeSlider
                    label="Poll frequency"
                    valueLabel={`${systemConfig.pollFrequency}s`}
                    value={systemConfig.pollFrequency}
                    min={1}
                    max={60}
                    minLabel="1s"
                    maxLabel="60s"
                    onChange={pollFrequency => updateSection("systemConfig", { pollFrequency })}
                />
                <PrimaryBtn onClick={onSave} disabled={saving}>
                    {saving ? "Saving…" : "Save System Settings"}
                </PrimaryBtn>
            </Card>
        </div>
    );
}

// ---------- Tab Alerts ----------

function browserNotificationHint({ supported, permission, enabled }) {
    if (!supported) return "Notifications are not supported by this browser.";
    if (permission === "denied") return "Permission is blocked in browser settings.";
    return enabled ? "Enabled while the dashboard is open." : "Notifications are off.";
}

function AlertsTab({ aquarium, updateSection, saving, onSave, browserNotifications, onToggleBrowserNotifications }) {
    const { tempConfig } = aquarium;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <Card className="space-y-5">
                <div>
                    <p className="text-sm font-bold text-slate-700">Temperature Thresholds</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        An alert is created when the water temperature leaves this range. These limits do not set the
                        heater target or control the heater.
                    </p>
                </div>
                <RangeSlider
                    label="Min Temperature"
                    valueLabel={formatTemp(tempConfig.minTempThreshold, tempConfig.unit)}
                    value={tempConfig.minTempThreshold}
                    min={10}
                    max={25}
                    minLabel={formatTemp(10, tempConfig.unit)}
                    maxLabel={formatTemp(25, tempConfig.unit)}
                    onChange={minTempThreshold => updateSection("tempConfig", { minTempThreshold })}
                />
                <RangeSlider
                    label="Max Temperature"
                    valueLabel={formatTemp(tempConfig.maxTempThreshold, tempConfig.unit)}
                    value={tempConfig.maxTempThreshold}
                    min={22}
                    max={35}
                    color="#ef4444"
                    minLabel={formatTemp(22, tempConfig.unit)}
                    maxLabel={formatTemp(35, tempConfig.unit)}
                    onChange={maxTempThreshold => updateSection("tempConfig", { maxTempThreshold })}
                />
                <PrimaryBtn onClick={onSave} disabled={saving}>
                    {saving ? "Saving…" : "Save Temperature Thresholds"}
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
                        checked={browserNotifications.enabled}
                        disabled={!browserNotifications.supported}
                        label="Browser Notifications"
                        onChange={onToggleBrowserNotifications}
                    />
                </div>
                <p className="text-xs text-slate-400">{browserNotificationHint(browserNotifications)}</p>
            </Card>
        </div>
    );
}

// ---------- Tab About ----------

function AboutTab() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <Card className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white text-xl flex-shrink-0">
                        🐟
                    </div>
                    <div>
                        <div className="font-bold text-slate-800">Smart Aquarium</div>
                        <div className="text-xs text-slate-400">Version 1.0.0 · Web Dashboard</div>
                    </div>
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                    Web dashboard to monitor and control an ESP32-based smart aquarium.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-1 gap-2 border-t border-slate-100 pt-4">
                    {FEATURES.map(([icon, title]) => (
                        <div key={title} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <span>{icon}</span>
                            {title}
                        </div>
                    ))}
                </div>
            </Card>

            <Card className="divide-y divide-slate-50">
                <p className="text-sm font-bold text-slate-700 pb-3">Technology Stack</p>
                <InfoRows rows={TECH_STACK} />
            </Card>
        </div>
    );
}

// ---------- Halaman ----------

export default function ConfigurationPage({ browserNotifications }) {
    const [tab, setTab] = useState("profile");
    const [aquarium, setAquarium] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [settingsStatus, setSettingsStatus] = useState({ error: "", saved: "" });

    useEffect(() => {
        let isMounted = true;
        getAquarium(AQUARIUM_ID)
            .then(data => isMounted && setAquarium(data))
            .catch(error => isMounted && setLoadError(error.message || "Could not load configuration."))
            .finally(() => isMounted && setLoading(false));
        return () => {
            isMounted = false;
        };
    }, []);

    // Perubahan disimpan lokal sampai tombol Save ditekan
    const updateSection = (section, patch) =>
        setAquarium(current => ({ ...current, [section]: { ...current[section], ...patch } }));

    const saveSettings = async (save, successMessage, failureMessage) => {
        setSettingsStatus({ error: "", saved: "" });
        setSettingsSaving(true);
        try {
            await save();
            setSettingsStatus({ error: "", saved: successMessage });
            window.dispatchEvent(new Event("sa:notifications-changed"));
        } catch (error) {
            setSettingsStatus({ error: error.message || failureMessage, saved: "" });
        } finally {
            setSettingsSaving(false);
        }
    };

    const handleSaveSystem = () =>
        saveSettings(
            () =>
                updateSystemConfig(AQUARIUM_ID, {
                    unit: aquarium.tempConfig.unit,
                    pollFrequency: aquarium.systemConfig.pollFrequency,
                    timezone: aquarium.systemConfig.timezone,
                }),
            "System settings saved successfully.",
            "Could not save system settings.",
        );

    const handleSaveThresholds = () =>
        saveSettings(
            () =>
                updateTemperatureConfig(AQUARIUM_ID, {
                    minTempThreshold: aquarium.tempConfig.minTempThreshold,
                    maxTempThreshold: aquarium.tempConfig.maxTempThreshold,
                }),
            "Alert settings saved successfully.",
            "Could not save alert settings.",
        );

    const handleToggleBrowserNotifications = async enabled => {
        setSettingsStatus({ error: "", saved: "" });
        try {
            const permission = await browserNotifications.setBrowserNotifications(enabled);
            if (permission === "unsupported") {
                setSettingsStatus({ error: "This browser does not support browser notifications.", saved: "" });
            } else if (permission === "denied") {
                setSettingsStatus({
                    error: "Notifications are blocked for this site. Allow them in your browser settings.",
                    saved: "",
                });
            } else {
                setSettingsStatus({
                    error: "",
                    saved: enabled ? "Browser notifications enabled." : "Browser notifications disabled.",
                });
            }
        } catch (error) {
            setSettingsStatus({ error: error.message || "Could not update browser notifications.", saved: "" });
        }
    };

    if (loading || loadError || !aquarium) {
        return (
            <div className="px-4 py-5">
                <PageHeader title="Configuration" />
                {loading ? (
                    <Spinner />
                ) : loadError ? (
                    <ErrorAlert message={loadError} />
                ) : (
                    <p className="py-8 text-center text-sm text-slate-400">No Data</p>
                )}
            </div>
        );
    }

    return (
        <div className="px-4 py-5">
            <PageHeader title="Configuration" timezone={aquarium.systemConfig.timezone} />
            {(settingsStatus.error || settingsStatus.saved) && (
                <div className="mb-4 space-y-2" aria-live="polite">
                    <ErrorAlert message={settingsStatus.error} />
                    <SuccessAlert message={settingsStatus.saved} />
                </div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-1 mb-5" style={{ scrollbarWidth: "none" }}>
                {TABS.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setTab(item.id)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                            tab === item.id
                                ? "bg-blue-500 text-white shadow-sm"
                                : "bg-white border border-slate-200 text-slate-600"
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {tab === "profile" && <ProfileTab />}
            {tab === "system" && (
                <SystemTab
                    aquarium={aquarium}
                    updateSection={updateSection}
                    saving={settingsSaving}
                    onSave={handleSaveSystem}
                />
            )}
            {tab === "alerts" && (
                <AlertsTab
                    aquarium={aquarium}
                    updateSection={updateSection}
                    saving={settingsSaving}
                    onSave={handleSaveThresholds}
                    browserNotifications={browserNotifications}
                    onToggleBrowserNotifications={handleToggleBrowserNotifications}
                />
            )}
            {tab === "about" && <AboutTab />}
        </div>
    );
}
