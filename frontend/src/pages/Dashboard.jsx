import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    AQUARIUM_ID,
    getAquarium,
    getNotifications,
    getTelemetry,
    getTemperatureChart,
    relativeTime,
    triggerFeeder,
    updateFeederConfig,
    updateLightingConfig,
    updateTemperatureConfig,
} from "../api/service";
import AreaChart from "../components/AreaChart";
import { Plus, Trash } from "../components/Icons";
import {
    Card,
    ErrorAlert,
    InfoField,
    LiveClock,
    ModeSelector,
    PageHeader,
    Spinner,
    StatusBadge,
    Toggle,
} from "../components/ui";
import { useAuth } from "../context/AuthContext";

const toF = c => +((c * 9) / 5 + 32).toFixed(1);
function fmtTemp(c, unit) {
    if (c === null || c === undefined || !Number.isFinite(Number(c))) return "--";
    if (unit === "Fahrenheit") return `${toF(c)}°F`;
    return `${c}°C`;
}
function fmtTempVal(c, unit) {
    if (c === null || c === undefined || !Number.isFinite(Number(c))) return "--";
    return unit === "Fahrenheit" ? toF(c) : c;
}
function tempUnit(unit) {
    return unit === "Fahrenheit" ? "°F" : "°C";
}

function AddTimeModal({ onAdd, onClose }) {
    const [hour, setHour] = useState("08");
    const [minute, setMinute] = useState("00");
    const [period, setPeriod] = useState("AM");
    const overlayRef = useRef();

    const handleAdd = () => {
        const label = `${hour}:${minute} ${period}`;
        onAdd(label);
        onClose();
    };

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={e => {
                if (e.target === overlayRef.current) onClose();
            }}
        >
            <div className="w-full max-w-sm bg-white rounded-t-3xl md:rounded-2xl shadow-2xl px-6 pt-6 pb-8 md:mx-4">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">Add Feeding Time</h3>
                        <p className="text-xs text-slate-400">Set a daily schedule trigger</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors text-lg font-bold"
                    >
                        ×
                    </button>
                </div>

                <div className="flex items-center justify-center gap-2 mb-6">
                    <select
                        value={hour}
                        onChange={e => setHour(e.target.value)}
                        className="flex-1 py-4 text-center text-2xl font-bold text-slate-800 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map(h => (
                            <option key={h} value={h}>
                                {h}
                            </option>
                        ))}
                    </select>
                    <span className="text-2xl font-bold text-slate-400">:</span>
                    <select
                        value={minute}
                        onChange={e => setMinute(e.target.value)}
                        className="flex-1 py-4 text-center text-2xl font-bold text-slate-800 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        {["00", "15", "30", "45"].map(m => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </select>
                    <div className="flex flex-col gap-1">
                        {["AM", "PM"].map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                                    period === p
                                        ? "bg-blue-500 text-white"
                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="text-center mb-5">
                    <span className="text-3xl font-bold text-blue-600">
                        {hour}:{minute} {period}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">Feeder will activate daily at this time</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAdd}
                        className="flex-1 py-3 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
                    >
                        Add Schedule
                    </button>
                </div>
            </div>
        </div>
    );
}

const TABS = [
    { id: "overview", label: "Overview" },
    { id: "temperature", label: "Temperature" },
    { id: "lighting", label: "Lighting" },
    { id: "feeder", label: "Feeder" },
];

const NOTIF_COLOR = {
    alert: { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700" },
    info: { dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
    success: { dot: "bg-green-500", bg: "bg-green-50", text: "text-green-700" },
};

function ManualControl({ state, control, onOn, onOff, disabled }) {
    return (
        <div>
            <div className="grid grid-cols-2 gap-2 mb-3">
                <InfoField label="Current State" value={state} />
                <InfoField label="Control" value={control} />
            </div>
            {disabled && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                    Switch to Manual mode to control this device manually.
                </p>
            )}
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={onOn}
                    disabled={disabled}
                    className={`py-3 rounded-xl text-sm font-semibold transition-colors ${
                        disabled
                            ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                            : "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700"
                    }`}
                >
                    Turn On
                </button>
                <button
                    onClick={onOff}
                    disabled={disabled}
                    className={`py-3 rounded-xl text-sm font-semibold transition-colors ${
                        disabled
                            ? "bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                    }`}
                >
                    Turn Off
                </button>
            </div>
        </div>
    );
}

export default function DashboardPage({ onSystemChange }) {
    const { tab = "overview" } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const aqId = AQUARIUM_ID;

    const [aquarium, setAquarium] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [recentTelemetry, setRecentTelemetry] = useState([]);
    const [recentNotifs, setRecentNotifs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [actionError, setActionError] = useState("");
    const [actionSaving, setActionSaving] = useState(false);
    const [showAddTime, setShowAddTime] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setLoadError("");

        const loadDashboard = async () => {
            try {
                const [aq, chart, telemetry, notifs] = await Promise.all([
                    getAquarium(aqId),
                    getTemperatureChart(aqId),
                    getTelemetry(aqId, { limit: 5 }),
                    getNotifications(aqId, { limit: 5 }),
                ]);
                if (!isMounted) return;
                setAquarium(aq);
                setChartData(chart);
                setRecentTelemetry(telemetry.telemetryRecords.slice(0, 5));
                setRecentNotifs(notifs.notificationRecords.slice(0, 5));
            } catch (error) {
                if (isMounted) setLoadError(error instanceof Error ? error.message : "Could not load the dashboard.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadDashboard();
        return () => {
            isMounted = false;
        };
    }, [aqId]);

    const setTab = t => navigate(`/dashboard${t === "overview" ? "" : "/" + t}`, { replace: true });

    const patchAquarium = async (section, patch, apiFn) => {
        setActionError("");
        setActionSaving(true);
        try {
            await apiFn(aqId, patch);
            setAquarium(prev => ({
                ...prev,
                [section]: { ...prev[section], ...patch },
            }));
            onSystemChange?.("Aquarium configuration updated successfully.");
        } catch (error) {
            setActionError(error instanceof Error ? error.message : "Could not update the aquarium setting.");
        } finally {
            setActionSaving(false);
        }
    };

    const handleTriggerFeeder = async () => {
        setActionError("");
        setActionSaving(true);
        try {
            await triggerFeeder(aqId);
            onSystemChange?.("Feeder activated successfully.");
        } catch (error) {
            setActionError(error instanceof Error ? error.message : "Could not trigger the feeder.");
        } finally {
            setActionSaving(false);
        }
    };

    if (loading)
        return (
            <div className="px-4 py-6">
                <div className="text-sm text-slate-400 mb-1">Welcome, {user?.fullName || user?.name}</div>
                <h1 className="text-2xl font-bold text-slate-800 mb-4">Dashboard</h1>
                <Spinner />
            </div>
        );

    if (loadError)
        return (
            <div className="px-4 py-6">
                <PageHeader title="Dashboard" />
                <ErrorAlert message={loadError} />
            </div>
        );

    if (!aquarium)
        return (
            <div className="px-4 py-6">
                <PageHeader title="Dashboard" />
                <Card className="text-center text-slate-500">No Data</Card>
            </div>
        );

    const { tempConfig, lightingConfig, feederConfig, hardwareInfo } = aquarium;
    const latestTelemetry = recentTelemetry[0];
    const realtimeState = latestTelemetry
        ? {
              currentTemp: latestTelemetry.temp,
              heaterStatus: latestTelemetry.heaterState,
              ledStatus: latestTelemetry.ledState,
              feederStatus: latestTelemetry.feederState,
              lastUpdated: latestTelemetry.timestamp,
          }
        : {
              currentTemp: null,
              heaterStatus: "OFF",
              ledStatus: "OFF",
              feederStatus: "Idle",
              lastUpdated: null,
          };
    const activeTab = TABS.find(t => t.id === tab) ? tab : "overview";

    const heaterIsManual = tempConfig.mode === "MANUAL";
    const ledIsManual = lightingConfig.mode === "MANUAL";
    const feederIsManual = feederConfig.mode === "MANUAL";

    return (
        <div className="px-4 py-5">
            <div className="text-xs text-slate-400 mb-0.5">Welcome, {user?.fullName || user?.name}</div>
            <ErrorAlert message={actionError} />
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-slate-800">
                    {TABS.find(t => t.id === activeTab)?.label || "Dashboard"}
                </h1>
                <LiveClock timezone={aquarium.systemConfig.timezone} />
            </div>

            {/* Dashboard tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 mb-5 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                            activeTab === t.id
                                ? "bg-blue-500 text-white shadow-sm"
                                : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Overview section */}
            {activeTab === "overview" && (
                <div className="space-y-4">
                    {/* Temperature summary */}
                    <Card>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Real-time water temperature</p>
                        <div className="flex items-baseline gap-1 mb-3">
                            <span className="text-5xl font-bold text-blue-600">
                                {fmtTempVal(realtimeState.currentTemp, tempConfig.unit)}
                            </span>
                            {realtimeState.currentTemp !== null && realtimeState.currentTemp !== undefined && (
                                <span className="text-xl text-blue-400 font-semibold">{tempUnit(tempConfig.unit)}</span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <InfoField
                                label="Target temperature"
                                value={fmtTemp(tempConfig.targetTemp, tempConfig.unit)}
                            />
                            <InfoField label="Last update" value={relativeTime(realtimeState.lastUpdated)} />
                        </div>
                    </Card>

                    {/* System status */}
                    <Card>
                        <p className="text-sm font-semibold text-slate-700 mb-3">System Status</p>
                        <div className="space-y-2.5">
                            {[
                                {
                                    label: "Heater",
                                    icon: "🌡️",
                                    status: realtimeState.heaterStatus,
                                },
                                {
                                    label: "Aquarium LED",
                                    icon: "💡",
                                    status: realtimeState.ledStatus,
                                },
                                {
                                    label: "Auto Feeder",
                                    icon: "🐟",
                                    status: realtimeState.feederStatus,
                                },
                            ].map(item => (
                                <div
                                    key={item.label}
                                    className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0"
                                >
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                        <span>{item.icon}</span>
                                        {item.label}
                                    </div>
                                    <StatusBadge status={item.status} />
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Temperature chart */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div className="flex items-baseline justify-between px-4 pt-4 pb-2">
                            <div>
                                <p className="text-xs font-semibold text-slate-500">Temperature Monitor · Last 12h</p>
                                <span className="text-3xl font-bold text-blue-600">
                                    {fmtTempVal(realtimeState.currentTemp, tempConfig.unit)}{" "}
                                    {realtimeState.currentTemp !== null && realtimeState.currentTemp !== undefined && (
                                        <span className="text-base text-blue-400">{tempUnit(tempConfig.unit)}</span>
                                    )}
                                </span>
                            </div>
                            {chartData.length > 0 && (
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    {[
                                        [fmtTemp(Math.max(...chartData.map(d => d.temp)), tempConfig.unit), "High"],
                                        [fmtTemp(Math.min(...chartData.map(d => d.temp)), tempConfig.unit), "Low"],
                                        [
                                            fmtTemp(
                                                chartData.reduce((a, d) => a + d.temp, 0) / chartData.length,
                                                tempConfig.unit,
                                            ),
                                            "Avg",
                                        ],
                                    ].map(([v, l]) => (
                                        <div key={l}>
                                            <div className="text-xs font-bold text-blue-500">{v}</div>
                                            <div className="text-[10px] text-slate-400">{l}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <AreaChart data={chartData} height={220} />
                    </div>

                    {/* Recent data and alerts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-semibold text-slate-700">Recent Data</p>
                                <button
                                    onClick={() => navigate("/history")}
                                    className="text-xs text-blue-500 font-semibold hover:underline"
                                >
                                    View all
                                </button>
                            </div>
                            <div className="space-y-2">
                                {recentTelemetry.length === 0 && <p className="text-xs text-slate-400">No Data</p>}
                                {recentTelemetry.map(r => (
                                    <div
                                        key={r.id}
                                        className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                                    >
                                        <div className="min-w-0">
                                            <div className="text-xs font-semibold text-slate-700 truncate">
                                                {r.event}
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                {relativeTime(r.timestamp)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                            <span className="text-sm font-bold text-blue-600">
                                                {fmtTemp(r.temp, tempConfig.unit)}
                                            </span>
                                            <StatusBadge status={r.heaterState} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-semibold text-slate-700">Recent Alerts</p>
                                <button
                                    onClick={() => navigate("/notifications")}
                                    className="text-xs text-blue-500 font-semibold hover:underline"
                                >
                                    View all
                                </button>
                            </div>
                            <div className="space-y-2">
                                {recentNotifs.length === 0 && <p className="text-xs text-slate-400">No Data</p>}
                                {recentNotifs.map(n => {
                                    const c = NOTIF_COLOR[n.type] || NOTIF_COLOR.info;
                                    return (
                                        <div
                                            key={n.id}
                                            className="flex items-start gap-2 py-2 border-b border-slate-50 last:border-0"
                                        >
                                            <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    <span className="text-xs font-semibold text-slate-700 truncate">
                                                        {n.title}
                                                    </span>
                                                    {!n.isRead && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-400">
                                                    {relativeTime(n.timestamp)}
                                                </div>
                                            </div>
                                            <span
                                                className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}
                                            >
                                                {n.type}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* Temperature section */}
            {activeTab === "temperature" && (
                <div className="space-y-4">
                    <Card>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Live Water Temperature</p>
                        <div className="flex items-baseline gap-1 mb-3">
                            <span className="text-4xl font-bold text-blue-600">
                                {fmtTemp(realtimeState.currentTemp, tempConfig.unit)}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <InfoField label="Last Update" value={relativeTime(realtimeState.lastUpdated)} />
                            <InfoField label="Sensor" value={hardwareInfo.tempSensor} />
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-slate-500">Heater Status</p>
                            <StatusBadge status={realtimeState.heaterStatus} />
                        </div>
                        <div
                            className={`text-3xl font-bold mb-3 ${
                                realtimeState.heaterStatus === "ON" ? "text-green-500" : "text-slate-300"
                            }`}
                        >
                            {realtimeState.heaterStatus}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <InfoField label="Mode" value={tempConfig.mode === "MANUAL" ? "Manual" : "Automatic"} />
                            <InfoField label="Last Update" value={relativeTime(realtimeState.lastUpdated)} />
                        </div>
                    </Card>

                    <Card>
                        <p className="text-sm font-semibold text-slate-700 mb-3">Target Temperature</p>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Target</span>
                            <span className="font-bold text-slate-700">
                                {fmtTemp(tempConfig.targetTemp, tempConfig.unit)}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="18"
                            max="30"
                            step="0.5"
                            value={Number.isFinite(tempConfig.targetTemp) ? tempConfig.targetTemp : 18}
                            disabled={!Number.isFinite(tempConfig.targetTemp)}
                            onChange={e =>
                                setAquarium(prev => ({
                                    ...prev,
                                    tempConfig: {
                                        ...prev.tempConfig,
                                        targetTemp: +e.target.value,
                                    },
                                }))
                            }
                            className="w-full mb-1"
                            style={{
                                background: Number.isFinite(tempConfig.targetTemp)
                                    ? `linear-gradient(to right, #3b7cf4 ${((tempConfig.targetTemp - 18) / 12) * 100}%, #e2e8f0 ${((tempConfig.targetTemp - 18) / 12) * 100}%)`
                                    : undefined,
                            }}
                        />
                        <div className="flex justify-between text-xs text-slate-400 mb-4">
                            <span>{fmtTemp(18, tempConfig.unit)}</span>
                            <span>{fmtTemp(30, tempConfig.unit)}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() =>
                                    patchAquarium(
                                        "tempConfig",
                                        { targetTemp: tempConfig.targetTemp },
                                        updateTemperatureConfig,
                                    )
                                }
                                className="flex-1 py-3 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors"
                                disabled={!Number.isFinite(tempConfig.targetTemp) || actionSaving}
                            >
                                Save
                            </button>
                            <button
                                onClick={() =>
                                    setAquarium(prev => ({
                                        ...prev,
                                        tempConfig: { ...prev.tempConfig, targetTemp: 24 },
                                    }))
                                }
                                className="px-5 py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Reset
                            </button>
                        </div>
                    </Card>

                    <Card>
                        <p className="text-sm font-semibold text-slate-700 mb-3">Heater Mode</p>
                        <ModeSelector
                            mode={tempConfig.mode.toLowerCase()}
                            onMode={m =>
                                patchAquarium("tempConfig", { mode: m.toUpperCase() }, updateTemperatureConfig)
                            }
                        />
                    </Card>

                    <Card>
                        <p className="text-sm font-semibold text-slate-700 mb-3">Manual Control</p>
                        <ManualControl
                            state={realtimeState.heaterStatus === "ON" ? "Running" : "Idle"}
                            control={heaterIsManual ? "Manual" : "Automatic"}
                            disabled={!heaterIsManual}
                            onOn={() =>
                                patchAquarium("tempConfig", { manualControlState: "ON" }, updateTemperatureConfig)
                            }
                            onOff={() =>
                                patchAquarium("tempConfig", { manualControlState: "OFF" }, updateTemperatureConfig)
                            }
                        />
                    </Card>
                </div>
            )}

            {/* Lighting section */}
            {activeTab === "lighting" && (
                <div className="space-y-4">
                    <Card>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-slate-500">Lighting Status</p>
                            <StatusBadge status={realtimeState.ledStatus} />
                        </div>
                        <div
                            className={`flex items-center gap-2 text-2xl font-bold mb-3 ${
                                realtimeState.ledStatus === "ON" ? "text-blue-500" : "text-slate-300"
                            }`}
                        >
                            ☀️ {realtimeState.ledStatus}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <InfoField
                                label="Avg. Hours ON"
                                value={
                                    Number.isFinite(lightingConfig.avgHoursOn)
                                        ? `${lightingConfig.avgHoursOn} hrs`
                                        : "--"
                                }
                            />
                            <InfoField
                                label="Avg. Hours OFF"
                                value={
                                    Number.isFinite(lightingConfig.avgHoursOff)
                                        ? `${lightingConfig.avgHoursOff} hrs`
                                        : "--"
                                }
                            />
                        </div>
                    </Card>

                    <Card>
                        <p className="text-sm font-semibold text-slate-700 mb-3">Schedule</p>
                        <div className="flex items-center gap-2 text-blue-500 font-bold mb-3">
                            ☀️ {lightingConfig.schedule.isActive ? "Active" : "Inactive"}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <InfoField label="Start Time" value={lightingConfig.schedule.startTime} />
                            <InfoField label="End Time" value={lightingConfig.schedule.endTime} />
                        </div>
                    </Card>

                    <Card>
                        <p className="text-sm font-semibold text-slate-700 mb-3">Schedule Summary</p>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            <InfoField label="Start" value={lightingConfig.schedule.startTime} />
                            <InfoField label="End" value={lightingConfig.schedule.endTime} />
                            <InfoField
                                label="Duration"
                                value={
                                    Number.isFinite(lightingConfig.schedule.durationHours)
                                        ? `${lightingConfig.schedule.durationHours} hrs`
                                        : "--"
                                }
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <InfoField label="Mode" value={lightingConfig.mode === "MANUAL" ? "Manual" : "Automatic"} />
                            <InfoField label="State" value={realtimeState.ledStatus} />
                            <InfoField label="Schedule" value={lightingConfig.schedule.isActive ? "Active" : "Off"} />
                        </div>
                    </Card>

                    <Card>
                        <p className="text-sm font-semibold text-slate-700 mb-3">LED Mode</p>
                        <ModeSelector
                            mode={lightingConfig.mode.toLowerCase()}
                            onMode={m =>
                                patchAquarium("lightingConfig", { mode: m.toUpperCase() }, updateLightingConfig)
                            }
                        />
                    </Card>

                    <Card>
                        <p className="text-sm font-semibold text-slate-700 mb-3">Manual Control</p>
                        <ManualControl
                            state={realtimeState.ledStatus === "ON" ? "Running" : "Idle"}
                            control={ledIsManual ? "Manual" : "Automatic"}
                            disabled={!ledIsManual}
                            onOn={() =>
                                patchAquarium("lightingConfig", { manualControlState: "ON" }, updateLightingConfig)
                            }
                            onOff={() =>
                                patchAquarium("lightingConfig", { manualControlState: "OFF" }, updateLightingConfig)
                            }
                        />
                    </Card>
                </div>
            )}

            {/* Feeding schedule modal */}
            {showAddTime && (
                <AddTimeModal
                    onAdd={t => {
                        const newSchedules = [...feederConfig.schedules, { time: t, isActive: true }];
                        patchAquarium("feederConfig", { schedules: newSchedules }, updateFeederConfig);
                    }}
                    onClose={() => setShowAddTime(false)}
                />
            )}

            {/* Feeder section */}
            {activeTab === "feeder" && (
                <div className="space-y-4">
                    <Card>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-slate-700">Feeder Status</p>
                            <StatusBadge status={realtimeState.feederStatus} />
                        </div>
                        <div
                            className={`text-2xl font-bold mb-1 ${
                                realtimeState.feederStatus === "Active" ? "text-green-500" : "text-slate-300"
                            }`}
                        >
                            🐟 {realtimeState.feederStatus}
                        </div>
                    </Card>

                    <Card>
                        <p className="text-sm font-semibold text-slate-700 mb-3">Feeder Mode</p>
                        <ModeSelector
                            mode={feederConfig.mode.toLowerCase()}
                            onMode={m => patchAquarium("feederConfig", { mode: m.toUpperCase() }, updateFeederConfig)}
                        />
                    </Card>

                    <Card>
                        <p className="text-sm font-semibold text-slate-700 mb-3">Manual Control</p>
                        <ManualControl
                            state={realtimeState.feederStatus}
                            control={feederIsManual ? "Manual" : "Automatic"}
                            disabled={!feederIsManual || actionSaving}
                            onOn={handleTriggerFeeder}
                            onOff={() => {}}
                        />
                    </Card>

                    <Card>
                        <p className="text-sm font-semibold text-slate-700 mb-3">Feeding Schedule</p>
                        <div className="space-y-3">
                            {feederConfig.schedules.map((s, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                                >
                                    <span className="text-sm text-slate-700 font-medium">{s.time}</span>
                                    <div className="flex items-center gap-3">
                                        <Toggle
                                            checked={s.isActive}
                                            onChange={() => {
                                                const updated = feederConfig.schedules.map((sc, j) =>
                                                    j === i ? { ...sc, isActive: !sc.isActive } : sc,
                                                );
                                                patchAquarium(
                                                    "feederConfig",
                                                    { schedules: updated },
                                                    updateFeederConfig,
                                                );
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                const updated = feederConfig.schedules.filter((_, j) => j !== i);
                                                patchAquarium(
                                                    "feederConfig",
                                                    { schedules: updated },
                                                    updateFeederConfig,
                                                );
                                            }}
                                            className="text-slate-300 hover:text-red-400 transition-colors p-1"
                                        >
                                            <Trash />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={() => setShowAddTime(true)}
                                className="flex items-center gap-2 text-blue-500 text-sm font-semibold hover:text-blue-600 transition-colors pt-1"
                            >
                                <Plus /> Add feeding time
                            </button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
