// Komponen UI dasar yang dipakai semua halaman
import { useEffect, useState } from "react";

// ---------- Tampilan ----------

// Jam dan tanggal sesuai timezone akuarium, update tiap detik
export function LiveClock({ timezone = "Asia/Manila" }) {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    let datePart;
    let timePart;
    try {
        datePart = now.toLocaleDateString("en-PH", {
            timeZone: timezone,
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
        timePart = now.toLocaleTimeString("en-PH", {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        });
    } catch {
        datePart = now.toLocaleDateString();
        timePart = now.toLocaleTimeString();
    }

    return (
        <div className="flex flex-col items-end leading-tight">
            <span className="text-xs font-semibold text-slate-500 tabular-nums">{timePart}</span>
            <span className="text-[10px] text-slate-400">{datePart}</span>
        </div>
    );
}

export function Toggle({ checked, onChange, disabled = false, label }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                checked ? "bg-blue-500" : "bg-slate-300"
            }`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    checked ? "translate-x-6" : "translate-x-1"
                }`}
            />
        </button>
    );
}

export function StatusBadge({ status }) {
    const on = status === "ON" || status === "Active" || status === "Running";
    return (
        <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                on ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
            }`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${on ? "bg-green-500" : "bg-slate-400"}`} />
            {status ?? "--"}
        </span>
    );
}

export function InfoField({ label, value }) {
    return (
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="text-xs text-slate-400 mb-0.5">{label}</div>
            <div className="text-sm font-semibold text-slate-800">
                {value === null || value === undefined || value === "" ? "--" : value}
            </div>
        </div>
    );
}

export function Card({ children, className = "" }) {
    return <div className={`bg-white rounded-2xl border border-slate-200 p-4 ${className}`}>{children}</div>;
}

// ---------- Tombol & input ----------

export function PrimaryBtn({ children, onClick, disabled, className = "", type = "button" }) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`w-full py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 active:bg-blue-700 transition-colors disabled:opacity-60 text-sm ${className}`}
        >
            {children}
        </button>
    );
}

export function InputField({
    label,
    icon: Icon,
    type = "text",
    value,
    onChange,
    placeholder,
    right,
    required,
    readOnly = false,
    hint,
}) {
    return (
        <div>
            {label && (
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {label}
                    {required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <Icon />
                    </span>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    readOnly={readOnly}
                    className={`w-full ${Icon ? "pl-10" : "pl-3"} ${
                        right ? "pr-10" : "pr-3"
                    } py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                        readOnly ? "bg-slate-50 text-slate-500 cursor-not-allowed" : "bg-white"
                    }`}
                />
                {right && <span className="absolute right-3 top-1/2 -translate-y-1/2">{right}</span>}
            </div>
            {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
        </div>
    );
}

// Slider berlabel; track terisi sampai nilai saat ini
export function RangeSlider({
    label,
    valueLabel,
    value,
    min,
    max,
    step = 1,
    onChange,
    color = "#3b7cf4",
    minLabel,
    maxLabel,
    disabled,
}) {
    const percent = Number.isFinite(value) ? ((value - min) / (max - min)) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between mb-1">
                <span className="text-xs font-semibold text-slate-600">{label}</span>
                <span className="text-xs font-bold" style={{ color }}>
                    {valueLabel}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={Number.isFinite(value) ? value : min}
                disabled={disabled}
                onChange={event => onChange(Number(event.target.value))}
                className="w-full"
                style={{ background: `linear-gradient(to right, ${color} ${percent}%, #e2e8f0 ${percent}%)` }}
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>{minLabel}</span>
                <span>{maxLabel}</span>
            </div>
        </div>
    );
}

// Pilihan mode Manual / Automatic untuk heater, LED, dan feeder
export function ModeSelector({ mode, onMode }) {
    return (
        <div className="flex gap-2">
            {["manual", "automatic"].map(m => (
                <button
                    key={m}
                    onClick={() => onMode(m)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        mode === m
                            ? "bg-blue-500 text-white shadow-sm"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                >
                    {m === "manual" ? "⚙️ Manual" : "🤖 Automatic"}
                </button>
            ))}
        </div>
    );
}

// ---------- Pesan & layout ----------

export function ErrorAlert({ message }) {
    if (!message) return null;
    return (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            <span className="flex-shrink-0">⚠️</span>
            {message}
        </div>
    );
}

export function SuccessAlert({ message }) {
    if (!message) return null;
    return (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            <span className="flex-shrink-0">✅</span>
            {message}
        </div>
    );
}

export function PageHeader({ title, subtitle, right, timezone }) {
    return (
        <div className="flex items-start justify-between mb-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 leading-tight">{title}</h1>
                {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                {timezone && <LiveClock timezone={timezone} />}
                {right && <div>{right}</div>}
            </div>
        </div>
    );
}

export function Spinner() {
    return (
        <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
}
