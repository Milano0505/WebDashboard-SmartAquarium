import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    AQUARIUM_ID,
    getAquarium,
    getNotifications,
    getTelemetry,
    getTemperatureChart,
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
    RangeSlider,
    Spinner,
    StatusBadge,
    Toggle,
} from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { formatTemp, formatTempValue, relativeTime, tempUnitSymbol } from "../utils/format";

const TABS = [
    { id: "overview", label: "Overview" },
    { id: "temperature", label: "Temperature" },
    { id: "lighting", label: "Lighting" },
    { id: "feeder", label: "Feeder" },
];

const NOTIFICATION_COLORS = {
    alert: { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700" },
    info: { dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
    success: { dot: "bg-green-500", bg: "bg-green-50", text: "text-green-700" },
};

const EMPTY_STATE = {
    currentTemp: null,
    heaterStatus: "OFF",
    ledStatus: "OFF",
    feederStatus: "Idle",
    lastUpdated: null,
};
const DEFAULT_TARGET_TEMP = 24;
const MIN_REFRESH_SECONDS = 5;

// Format jam jadwal "hh:mm AM/PM" sesuai API
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

function minutesOfDay(time) {
    const [clock, period] = time.split(" ");
    const [hour, minute] = clock.split(":").map(Number);
    return ((hour % 12) + (period === "PM" ? 12 : 0)) * 60 + minute;
}

// Sama dengan server: jam selesai < jam mulai berarti melewati tengah malam
function scheduleDuration(startTime, endTime) {
    return Math.round((((minutesOfDay(endTime) - minutesOfDay(startTime) + 1440) % 1440) / 60) * 100) / 100;
}

const formatHours = hours => (Number.isFinite(hours) ? `${hours} hrs` : "--");
const modeLabel = mode => (mode === "MANUAL" ? "Manual" : "Automatic");
const toTime = value => (value ? new Date(value).getTime() : NaN);

// Sama dengan server: offline jika tidak ada telemetry > 3x poll interval (min. 120 detik)
function isDeviceOnline(lastUpdated, pollFrequency) {
    const last = toTime(lastUpdated);
    if (!Number.isFinite(last)) return false;
    return Date.now() - last <= Math.max(120, 3 * (pollFrequency || 5)) * 1000;
}

// Feed Now dianggap selesai setelah ada telemetry yang lebih baru dari trigger
function isFeedPending(lastTriggeredAt, lastUpdated) {
    const triggered = toTime(lastTriggeredAt);
    if (!Number.isFinite(triggered)) return false;
    const updated = toTime(lastUpdated);
    return !Number.isFinite(updated) || triggered > updated;
}

// ---------- Komponen bersama ----------

function TimeSelect({ label, value, onChange }) {
    const [clock, period] = value.split(" ");
    const [hour, minute] = clock.split(":");
    const minuteOptions = MINUTES.includes(minute) ? MINUTES : [...MINUTES, minute].sort();
    const selectClass =
        "flex-1 min-w-0 py-2 text-center text-sm font-semibold text-slate-800 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400";
    const selects = [
        ["hour", hour, HOURS, next => `${next}:${minute} ${period}`],
        ["minute", minute, minuteOptions, next => `${hour}:${next} ${period}`],
        ["period", period, ["AM", "PM"], next => `${hour}:${minute} ${next}`],
    ];
    return (
        <div>
            <div className="text-xs text-slate-400 mb-1">{label}</div>
            <div className="flex items-center gap-1">
                {selects.map(([part, current, options, build]) => (
                    <select
                        key={part}
                        aria-label={`${label} ${part}`}
                        value={current}
                        onChange={event => onChange(build(event.target.value))}
                        className={selectClass}
                    >
                        {options.map(option => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                ))}
            </div>
        </div>
    );
}

function AddTimeModal({ onAdd, onClose }) {
    const [hour, setHour] = useState("08");
    const [minute, setMinute] = useState("00");
    const [period, setPeriod] = useState("AM");
    const overlayRef = useRef();
    const bigSelectClass =
        "flex-1 py-4 text-center text-2xl font-bold text-slate-800 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400";

    const handleAdd = () => {
        onAdd(`${hour}:${minute} ${period}`);
        onClose();
    };

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={event => event.target === overlayRef.current && onClose()}
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
                    <select value={hour} onChange={event => setHour(event.target.value)} className={bigSelectClass}>
                        {HOURS.map(h => (
                            <option key={h} value={h}>
                                {h}
                            </option>
                        ))}
                    </select>
                    <span className="text-2xl font-bold text-slate-400">:</span>
                    <select value={minute} onChange={event => setMinute(event.target.value)} className={bigSelectClass}>
                        {MINUTES.map(m => (
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

function DeviceBadge({ online, lastUpdated }) {
    return (
        <span
            title={`Last update: ${relativeTime(lastUpdated)}`}
            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                online ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"
            }`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-green-500" : "bg-slate-400"}`} />
            {online ? "Device online" : lastUpdated ? "Device offline" : "No device data"}
        </span>
    );
}

// Tombol Turn On / Turn Off, aktif hanya di mode Manual. Tanpa `onOff` hanya satu tombol.
// `pending` = perintah sudah disimpan tapi belum dijalankan perangkat
function ManualControl({ state, control, manual, busy, pending, online, onOn, onOff, onLabel = "Turn On" }) {
    const disabled = !manual || busy;
    const buttonClass = primary =>
        `py-3 rounded-xl text-sm font-semibold transition-colors ${
            disabled
                ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                : primary
                  ? "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100"
        }`;
    return (
        <div>
            <div className="grid grid-cols-2 gap-2 mb-3">
                <InfoField label="Current State" value={state} />
                <InfoField label="Control" value={control} />
            </div>
            {!manual && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                    Switch to Manual mode to control this device manually.
                </p>
            )}
            {manual && pending && (
                <p
                    className={`text-xs rounded-lg px-3 py-2 mb-3 border ${
                        online
                            ? "text-blue-600 bg-blue-50 border-blue-200"
                            : "text-amber-600 bg-amber-50 border-amber-200"
                    }`}
                >
                    {online
                        ? "⏳ Waiting for the device to apply this command…"
                        : "⚠️ Device is offline. The command will run when it reconnects."}
                </p>
            )}
            <div className={`grid gap-2 ${onOff ? "grid-cols-2" : "grid-cols-1"}`}>
                <button onClick={onOn} disabled={disabled} className={buttonClass(true)}>
                    {onLabel}
                </button>
                {onOff && (
                    <button onClick={onOff} disabled={disabled} className={buttonClass(false)}>
                        Turn Off
                    </button>
                )}
            </div>
        </div>
    );
}

// ---------- Tab Overview ----------

function OverviewTab({ aquarium, realtimeState, chartData, recentTelemetry, recentNotifications }) {
    const navigate = useNavigate();
    const { unit } = aquarium.tempConfig;
    const hasTemp = realtimeState.currentTemp !== null && realtimeState.currentTemp !== undefined;
    const chartTemps = chartData.map(point => point.temp);

    return (
        <div className="space-y-4">
            <Card>
                <p className="text-xs font-semibold text-slate-500 mb-1">Real-time water temperature</p>
                <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-5xl font-bold text-blue-600">
                        {formatTempValue(realtimeState.currentTemp, unit)}
                    </span>
                    {hasTemp && <span className="text-xl text-blue-400 font-semibold">{tempUnitSymbol(unit)}</span>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <InfoField label="Target temperature" value={formatTemp(aquarium.tempConfig.targetTemp, unit)} />
                    <InfoField label="Last update" value={relativeTime(realtimeState.lastUpdated)} />
                </div>
            </Card>

            <Card>
                <p className="text-sm font-semibold text-slate-700 mb-3">System Status</p>
                <div className="space-y-2.5">
                    {[
                        ["Heater", "🌡️", realtimeState.heaterStatus],
                        ["Aquarium LED", "💡", realtimeState.ledStatus],
                        ["Auto Feeder", "🐟", realtimeState.feederStatus],
                    ].map(([label, icon, status]) => (
                        <div
                            key={label}
                            className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0"
                        >
                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                <span>{icon}</span>
                                {label}
                            </div>
                            <StatusBadge status={status} />
                        </div>
                    ))}
                </div>
            </Card>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-baseline justify-between px-4 pt-4 pb-2">
                    <div>
                        <p className="text-xs font-semibold text-slate-500">Temperature Monitor · Last 12 readings</p>
                        <span className="text-3xl font-bold text-blue-600">
                            {formatTempValue(realtimeState.currentTemp, unit)}{" "}
                            {hasTemp && <span className="text-base text-blue-400">{tempUnitSymbol(unit)}</span>}
                        </span>
                    </div>
                    {chartData.length > 0 && (
                        <div className="grid grid-cols-3 gap-3 text-center">
                            {[
                                ["High", Math.max(...chartTemps)],
                                ["Low", Math.min(...chartTemps)],
                                ["Avg", chartTemps.reduce((sum, temp) => sum + temp, 0) / chartTemps.length],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <div className="text-xs font-bold text-blue-500">
                                        {formatTemp(+value.toFixed(1), unit)}
                                    </div>
                                    <div className="text-[10px] text-slate-400">{label}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <AreaChart data={chartData} height={220} />
            </div>

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
                        {recentTelemetry.map(record => (
                            <div
                                key={record.id}
                                className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                            >
                                <div className="min-w-0">
                                    <div className="text-xs font-semibold text-slate-700 truncate">{record.event}</div>
                                    <div className="text-[10px] text-slate-400">{relativeTime(record.timestamp)}</div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                    <span className="text-sm font-bold text-blue-600">
                                        {formatTemp(record.temp, unit)}
                                    </span>
                                    <StatusBadge status={record.heaterState} />
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
                        {recentNotifications.length === 0 && <p className="text-xs text-slate-400">No Data</p>}
                        {recentNotifications.map(notification => {
                            const colors = NOTIFICATION_COLORS[notification.type] || NOTIFICATION_COLORS.info;
                            return (
                                <div
                                    key={notification.id}
                                    className="flex items-start gap-2 py-2 border-b border-slate-50 last:border-0"
                                >
                                    <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1 flex-wrap">
                                            <span className="text-xs font-semibold text-slate-700 truncate">
                                                {notification.title}
                                            </span>
                                            {!notification.isRead && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                            )}
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                            {relativeTime(notification.timestamp)}
                                        </div>
                                    </div>
                                    <span
                                        className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
                                    >
                                        {notification.type}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
        </div>
    );
}

// ---------- Tab Temperature ----------

function TemperatureTab({ aquarium, realtimeState, deviceOnline, patchAquarium, saving }) {
    const { tempConfig, hardwareInfo } = aquarium;
    const isManual = tempConfig.mode === "MANUAL";
    // Draft lokal agar auto-refresh tidak menimpa slider yang sedang digeser
    const [targetDraft, setTargetDraft] = useState(null);
    const targetTemp = targetDraft ?? tempConfig.targetTemp;
    const saveTemperature = patch => patchAquarium("tempConfig", patch, updateTemperatureConfig);
    const saveTarget = async () => {
        if (await saveTemperature({ targetTemp })) setTargetDraft(null);
    };

    return (
        <div className="space-y-4">
            <Card>
                <p className="text-xs font-semibold text-slate-500 mb-1">Live Water Temperature</p>
                <div className="text-4xl font-bold text-blue-600 mb-3">
                    {formatTemp(realtimeState.currentTemp, tempConfig.unit)}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <InfoField label="Last Update" value={relativeTime(realtimeState.lastUpdated)} />
                    <InfoField label="Sensor" value={hardwareInfo?.tempSensor} />
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
                    <InfoField label="Mode" value={modeLabel(tempConfig.mode)} />
                    <InfoField label="Last Update" value={relativeTime(realtimeState.lastUpdated)} />
                </div>
            </Card>

            <Card>
                <p className="text-sm font-semibold text-slate-700 mb-3">Target Temperature</p>
                <RangeSlider
                    label="Target"
                    valueLabel={formatTemp(targetTemp, tempConfig.unit)}
                    value={targetTemp}
                    min={18}
                    max={30}
                    step={0.5}
                    minLabel={formatTemp(18, tempConfig.unit)}
                    maxLabel={formatTemp(30, tempConfig.unit)}
                    disabled={!Number.isFinite(targetTemp)}
                    onChange={setTargetDraft}
                />
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={saveTarget}
                        disabled={!Number.isFinite(targetTemp) || targetTemp === tempConfig.targetTemp || saving}
                        className="flex-1 py-3 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-60"
                    >
                        Save
                    </button>
                    <button
                        onClick={() => setTargetDraft(DEFAULT_TARGET_TEMP)}
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
                    onMode={mode => saveTemperature({ mode: mode.toUpperCase() })}
                />
            </Card>

            <Card>
                <p className="text-sm font-semibold text-slate-700 mb-3">Manual Control</p>
                <ManualControl
                    state={realtimeState.heaterStatus === "ON" ? "Running" : "Idle"}
                    control={modeLabel(tempConfig.mode)}
                    manual={isManual}
                    busy={saving}
                    pending={tempConfig.manualControlState !== realtimeState.heaterStatus}
                    online={deviceOnline}
                    onOn={() => saveTemperature({ manualControlState: "ON" })}
                    onOff={() => saveTemperature({ manualControlState: "OFF" })}
                />
            </Card>
        </div>
    );
}

// ---------- Tab Lighting ----------

function LightingScheduleCard({ schedule, disabled, onSave }) {
    const [draft, setDraft] = useState({
        startTime: schedule.startTime || "08:00 AM",
        endTime: schedule.endTime || "10:00 PM",
        isActive: Boolean(schedule.isActive),
    });
    const sameTime = draft.startTime === draft.endTime;
    const changed =
        draft.startTime !== schedule.startTime ||
        draft.endTime !== schedule.endTime ||
        draft.isActive !== Boolean(schedule.isActive);

    return (
        <Card>
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-700">Schedule</p>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                        {draft.isActive ? "Active" : "Inactive"}
                    </span>
                    <Toggle
                        checked={draft.isActive}
                        label="Lighting schedule active"
                        onChange={isActive => setDraft(current => ({ ...current, isActive }))}
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <TimeSelect
                    label="Start Time"
                    value={draft.startTime}
                    onChange={startTime => setDraft(current => ({ ...current, startTime }))}
                />
                <TimeSelect
                    label="End Time"
                    value={draft.endTime}
                    onChange={endTime => setDraft(current => ({ ...current, endTime }))}
                />
            </div>
            <p className={`text-xs mb-3 ${sameTime ? "text-red-500" : "text-slate-400"}`}>
                {sameTime
                    ? "Start and end time must differ."
                    : `The LED stays on for ${scheduleDuration(draft.startTime, draft.endTime)} hrs in Automatic mode.`}
            </p>
            <button
                onClick={() => onSave({ ...draft, durationHours: scheduleDuration(draft.startTime, draft.endTime) })}
                disabled={disabled || sameTime || !changed}
                className="w-full py-3 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
                Save Schedule
            </button>
        </Card>
    );
}

function LightingTab({ aquarium, realtimeState, deviceOnline, patchAquarium, saving }) {
    const { lightingConfig } = aquarium;
    const { schedule } = lightingConfig;
    const saveLighting = patch => patchAquarium("lightingConfig", patch, updateLightingConfig);

    return (
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
                {/* Dihitung server dari telemetry 7 hari terakhir */}
                <div className="grid grid-cols-2 gap-2">
                    <InfoField label="Avg. Hours ON" value={formatHours(lightingConfig.avgHoursOn)} />
                    <InfoField label="Avg. Hours OFF" value={formatHours(lightingConfig.avgHoursOff)} />
                </div>
            </Card>

            {/* key: form di-reset hanya jika jadwal di server berubah */}
            <LightingScheduleCard
                key={`${schedule.startTime}-${schedule.endTime}-${schedule.isActive}`}
                schedule={schedule}
                disabled={saving}
                onSave={nextSchedule => saveLighting({ schedule: nextSchedule })}
            />

            <Card>
                <p className="text-sm font-semibold text-slate-700 mb-3">Schedule Summary</p>
                <div className="grid grid-cols-3 gap-2 mb-2">
                    <InfoField label="Start" value={schedule.startTime} />
                    <InfoField label="End" value={schedule.endTime} />
                    <InfoField label="Duration" value={formatHours(schedule.durationHours)} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <InfoField label="Mode" value={modeLabel(lightingConfig.mode)} />
                    <InfoField label="State" value={realtimeState.ledStatus} />
                    <InfoField label="Schedule" value={schedule.isActive ? "Active" : "Off"} />
                </div>
            </Card>

            <Card>
                <p className="text-sm font-semibold text-slate-700 mb-3">LED Mode</p>
                <ModeSelector
                    mode={lightingConfig.mode.toLowerCase()}
                    onMode={mode => saveLighting({ mode: mode.toUpperCase() })}
                />
            </Card>

            <Card>
                <p className="text-sm font-semibold text-slate-700 mb-3">Manual Control</p>
                <ManualControl
                    state={realtimeState.ledStatus === "ON" ? "Running" : "Idle"}
                    control={modeLabel(lightingConfig.mode)}
                    manual={lightingConfig.mode === "MANUAL"}
                    busy={saving}
                    pending={lightingConfig.manualControlState !== realtimeState.ledStatus}
                    online={deviceOnline}
                    onOn={() => saveLighting({ manualControlState: "ON" })}
                    onOff={() => saveLighting({ manualControlState: "OFF" })}
                />
            </Card>
        </div>
    );
}

// ---------- Tab Feeder ----------

function FeederTab({ aquarium, realtimeState, deviceOnline, patchAquarium, saving, onFeedNow }) {
    const { feederConfig } = aquarium;
    const feedPending = isFeedPending(feederConfig.lastTriggeredAt, realtimeState.lastUpdated);
    const [showAddTime, setShowAddTime] = useState(false);
    const saveSchedules = schedules => patchAquarium("feederConfig", { schedules }, updateFeederConfig);

    return (
        <div className="space-y-4">
            {showAddTime && (
                <AddTimeModal
                    onAdd={time => saveSchedules([...feederConfig.schedules, { time, isActive: true }])}
                    onClose={() => setShowAddTime(false)}
                />
            )}

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
                    onMode={mode => patchAquarium("feederConfig", { mode: mode.toUpperCase() }, updateFeederConfig)}
                />
            </Card>

            <Card>
                <p className="text-sm font-semibold text-slate-700 mb-3">Manual Control</p>
                <ManualControl
                    state={realtimeState.feederStatus}
                    control={modeLabel(feederConfig.mode)}
                    manual={feederConfig.mode === "MANUAL"}
                    busy={saving || feedPending}
                    pending={feedPending}
                    online={deviceOnline}
                    onLabel="Feed Now"
                    onOn={onFeedNow}
                />
            </Card>

            <Card>
                <p className="text-sm font-semibold text-slate-700 mb-3">Feeding Schedule</p>
                <div className="space-y-3">
                    {feederConfig.schedules.map((entry, index) => (
                        <div
                            key={entry.time}
                            className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                        >
                            <span className="text-sm text-slate-700 font-medium">{entry.time}</span>
                            <div className="flex items-center gap-3">
                                <Toggle
                                    checked={entry.isActive}
                                    label={`Feeding at ${entry.time}`}
                                    onChange={() =>
                                        saveSchedules(
                                            feederConfig.schedules.map((item, i) =>
                                                i === index ? { ...item, isActive: !item.isActive } : item,
                                            ),
                                        )
                                    }
                                />
                                <button
                                    onClick={() => saveSchedules(feederConfig.schedules.filter((_, i) => i !== index))}
                                    aria-label={`Delete feeding time ${entry.time}`}
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
    );
}

// ---------- Halaman ----------

export default function DashboardPage({ onSystemChange }) {
    const { tab = "overview" } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [aquarium, setAquarium] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [recentTelemetry, setRecentTelemetry] = useState([]);
    const [recentNotifications, setRecentNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [actionError, setActionError] = useState("");
    const [saving, setSaving] = useState(false);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Ambil config, status perangkat, grafik, dan data terbaru sekaligus
    const refresh = useCallback(async () => {
        const [aquariumData, chart, telemetry, notifications] = await Promise.all([
            getAquarium(AQUARIUM_ID),
            getTemperatureChart(AQUARIUM_ID),
            getTelemetry(AQUARIUM_ID, { limit: 5 }),
            getNotifications(AQUARIUM_ID, { limit: 5 }),
        ]);
        if (!isMounted.current) return;
        setAquarium(aquariumData);
        setChartData(chart);
        setRecentTelemetry(telemetry.telemetryRecords.slice(0, 5));
        setRecentNotifications(notifications.notificationRecords.slice(0, 5));
    }, []);

    useEffect(() => {
        refresh()
            .catch(error => isMounted.current && setLoadError(error.message || "Could not load the dashboard."))
            .finally(() => isMounted.current && setLoading(false));
    }, [refresh]);

    // Auto-refresh mengikuti poll interval perangkat (min. 5 detik), dijeda saat tab browser tidak aktif
    const pollFrequency = aquarium?.systemConfig?.pollFrequency;
    useEffect(() => {
        if (!pollFrequency) return undefined;
        const intervalId = window.setInterval(
            () => {
                if (document.visibilityState !== "visible") return;
                refresh().catch(error => console.warn("Unable to refresh the dashboard.", error));
            },
            Math.max(MIN_REFRESH_SECONDS, pollFrequency) * 1000,
        );
        return () => window.clearInterval(intervalId);
    }, [pollFrequency, refresh]);

    // Jalankan aksi API, tampilkan toast, lalu muat ulang data. Mengembalikan true jika berhasil
    const runAction = async (action, successMessage, failureMessage) => {
        setActionError("");
        setSaving(true);
        try {
            await action();
            onSystemChange?.(successMessage);
            await refresh().catch(error => console.warn("Unable to refresh the dashboard.", error));
            return true;
        } catch (error) {
            setActionError(error.message || failureMessage);
            return false;
        } finally {
            setSaving(false);
        }
    };

    // Simpan config; state lokal langsung disamakan sebelum data dimuat ulang
    const patchAquarium = (section, patch, apiCall) =>
        runAction(
            async () => {
                await apiCall(AQUARIUM_ID, patch);
                setAquarium(current => ({ ...current, [section]: { ...current[section], ...patch } }));
            },
            "Aquarium configuration updated successfully.",
            "Could not update the aquarium setting.",
        );

    const handleFeedNow = () =>
        runAction(
            () => triggerFeeder(AQUARIUM_ID),
            "Feed command sent to the device.",
            "Could not trigger the feeder.",
        );

    if (loading || loadError || !aquarium) {
        return (
            <div className="px-4 py-6">
                <PageHeader title="Dashboard" subtitle={user?.fullName && `Welcome, ${user.fullName}`} />
                {loading ? (
                    <Spinner />
                ) : loadError ? (
                    <ErrorAlert message={loadError} />
                ) : (
                    <Card className="text-center text-slate-500">No Data</Card>
                )}
            </div>
        );
    }

    // Status aktual perangkat; hanya diisi telemetry ESP32
    const realtimeState = { ...EMPTY_STATE, ...aquarium.realtimeState };
    const deviceOnline = isDeviceOnline(realtimeState.lastUpdated, pollFrequency);
    const activeTab = TABS.some(item => item.id === tab) ? tab : "overview";
    const tabProps = { aquarium, realtimeState, deviceOnline, patchAquarium, saving };

    return (
        <div className="px-4 py-5">
            <div className="text-xs text-slate-400 mb-0.5">Welcome, {user?.fullName}</div>
            <ErrorAlert message={actionError} />
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-800">
                        {TABS.find(item => item.id === activeTab).label}
                    </h1>
                    <DeviceBadge online={deviceOnline} lastUpdated={realtimeState.lastUpdated} />
                </div>
                <LiveClock timezone={aquarium.systemConfig.timezone} />
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 mb-5 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                {TABS.map(item => (
                    <button
                        key={item.id}
                        onClick={() =>
                            navigate(item.id === "overview" ? "/dashboard" : `/dashboard/${item.id}`, { replace: true })
                        }
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                            activeTab === item.id
                                ? "bg-blue-500 text-white shadow-sm"
                                : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {activeTab === "overview" && (
                <OverviewTab
                    aquarium={aquarium}
                    realtimeState={realtimeState}
                    chartData={chartData}
                    recentTelemetry={recentTelemetry}
                    recentNotifications={recentNotifications}
                />
            )}
            {activeTab === "temperature" && <TemperatureTab {...tabProps} />}
            {activeTab === "lighting" && <LightingTab {...tabProps} />}
            {activeTab === "feeder" && <FeederTab {...tabProps} onFeedNow={handleFeedNow} />}
        </div>
    );
}
