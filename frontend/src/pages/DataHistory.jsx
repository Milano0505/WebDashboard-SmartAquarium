import { useEffect, useState } from "react";
import { AQUARIUM_ID, exportTelemetry, getAquarium, getTelemetry } from "../api/service";
import { ChevronLeft, ChevronRight, Download, Search } from "../components/Icons";
import { Card, ErrorAlert, PageHeader, Spinner, StatusBadge } from "../components/ui";

const PER_PAGE = 10;

// Calendar helpers
function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}
function dateKey(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Table view
function TableTab({ allData, aquariumId }) {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState("");

    const filtered = allData.filter(r => {
        const q = search.toLowerCase();
        const matchSearch = q === "" || Object.values(r).some(v => String(v).toLowerCase().includes(q));
        const matchFilter = filter === "all" || (r.event || "").toLowerCase().includes(filter);
        return matchSearch && matchFilter;
    });

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const stats = [
        { label: "Records", value: allData.length || "No Data", icon: "📊" },
        {
            label: "Avg Temp",
            value: allData.length ? `${(allData.reduce((a, r) => a + r.temp, 0) / allData.length).toFixed(1)}°C` : "--",
            icon: "🌡️",
        },
        {
            label: "Heater ON",
            value: allData.length ? allData.filter(r => r.heaterState === "ON").length : "--",
            icon: "🔥",
        },
        {
            label: "Feedings",
            value: allData.length ? allData.filter(r => r.feederState === "Active").length : "--",
            icon: "🐠",
        },
    ];

    return (
        <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stats.map(s => (
                    <Card key={s.label} className="p-3">
                        <div className="text-xl mb-0.5">{s.icon}</div>
                        <div className="text-xl font-bold text-slate-800">{s.value}</div>
                        <div className="text-xs text-slate-400">{s.label}</div>
                    </Card>
                ))}
            </div>

            {/* Search + filters */}
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search />
                </span>
                <input
                    value={search}
                    onChange={e => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    placeholder="Search records…"
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {["all", "heater", "led", "feeder", "temp", "system"].map(f => (
                    <button
                        key={f}
                        onClick={() => {
                            setFilter(f);
                            setPage(1);
                        }}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                            filter === f ? "bg-blue-500 text-white" : "bg-white border border-slate-200 text-slate-600"
                        }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            {["#", "Timestamp", "Temp", "Heater", "LED", "Feeder", "Event"].map(h => (
                                <th
                                    key={h}
                                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                                    No records found.
                                </td>
                            </tr>
                        ) : (
                            rows.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-xs font-mono text-slate-400">#{r.id}</td>
                                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                                        {new Date(r.timestamp).toLocaleString("en-PH", {
                                            dateStyle: "short",
                                            timeStyle: "short",
                                        })}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-blue-600 whitespace-nowrap">{r.temp}°C</td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={r.heaterState} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={r.ledState} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={r.feederState} />
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px] truncate">
                                        {r.event}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
                {rows.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">No records found.</div>
                ) : (
                    rows.map(r => (
                        <Card key={r.id} className="p-4">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <div className="text-xs font-mono text-slate-400">#{r.id}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        {new Date(r.timestamp).toLocaleString("en-PH", {
                                            dateStyle: "short",
                                            timeStyle: "short",
                                        })}
                                    </div>
                                </div>
                                <div className="text-lg font-bold text-blue-600">{r.temp}°C</div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                <span className="text-xs text-slate-500">Heater:</span>
                                <StatusBadge status={r.heaterState} />
                                <span className="text-xs text-slate-500 ml-1">LED:</span>
                                <StatusBadge status={r.ledState} />
                                <span className="text-xs text-slate-500 ml-1">Feeder:</span>
                                <StatusBadge status={r.feederState} />
                            </div>
                            <div className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2 py-1.5">
                                📋 {r.event}
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3">
                    <span className="text-xs text-slate-500">
                        {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                        >
                            <ChevronLeft />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => Math.abs(p - page) <= 1)
                            .map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                                        p === page ? "bg-blue-500 text-white" : "text-slate-600 hover:bg-slate-100"
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                        >
                            <ChevronRight />
                        </button>
                    </div>
                </div>
            )}

            <ErrorAlert message={exportError} />
            <button
                onClick={async () => {
                    let downloadUrl;
                    let link;
                    setExportError("");
                    setExporting(true);
                    try {
                        const { csv, filename } = await exportTelemetry(aquariumId);
                        downloadUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                        link = document.createElement("a");
                        link.href = downloadUrl;
                        link.download = filename;
                        document.body.appendChild(link);
                        link.click();
                    } catch (error) {
                        setExportError(error instanceof Error ? error.message : "Could not export telemetry data.");
                    } finally {
                        link?.remove();
                        if (downloadUrl) {
                            window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
                        }
                        setExporting(false);
                    }
                }}
                disabled={exporting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-900 transition-colors disabled:opacity-60"
            >
                <Download /> {exporting ? "Exporting…" : "Export CSV"}
            </button>
        </div>
    );
}

// Calendar view
const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarTab({ allData }) {
    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const [selectedDate, setSelectedDate] = useState(null);
    const dataByDate = new Map();
    allData.forEach(record => {
        const timestamp = new Date(record.timestamp);
        if (!Number.isFinite(timestamp.getTime())) return;
        const key = dateKey(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());
        dataByDate.set(key, [...(dataByDate.get(key) || []), record]);
    });

    const totalDays = daysInMonth(viewYear, viewMonth);
    const startDay = firstDayOfMonth(viewYear, viewMonth);

    const prevMonth = () => {
        if (viewMonth === 0) {
            setViewYear(y => y - 1);
            setViewMonth(11);
        } else setViewMonth(m => m - 1);
        setSelectedDate(null);
    };
    const nextMonth = () => {
        if (viewYear === now.getFullYear() && viewMonth === now.getMonth()) return;
        if (viewMonth === 11) {
            setViewYear(y => y + 1);
            setViewMonth(0);
        } else setViewMonth(m => m + 1);
        setSelectedDate(null);
    };

    const selectDay = day => {
        const key = dateKey(viewYear, viewMonth, day);
        setSelectedDate(key);
    };

    const isToday = day => {
        return day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
    };
    const isFuture = day => {
        const d = new Date(viewYear, viewMonth, day);
        return d > now;
    };

    const cells = Array(startDay)
        .fill(null)
        .concat(Array.from({ length: totalDays }, (_, i) => i + 1));
    const dayData = selectedDate ? dataByDate.get(selectedDate) || [] : [];

    return (
        <div className="space-y-4">
            {/* Calendar card */}
            <Card>
                {/* Month nav */}
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={prevMonth}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
                    >
                        <ChevronLeft />
                    </button>
                    <span className="text-sm font-bold text-slate-800">
                        {MONTHS[viewMonth]} {viewYear}
                    </span>
                    <button
                        onClick={nextMonth}
                        disabled={viewYear === now.getFullYear() && viewMonth === now.getMonth()}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight />
                    </button>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 mb-1">
                    {WEEKDAYS.map(d => (
                        <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-y-1">
                    {cells.map((day, idx) => {
                        if (!day) return <div key={`e-${idx}`} />;
                        const key = dateKey(viewYear, viewMonth, day);
                        const hasData = dataByDate.has(key);
                        const isSelected = selectedDate === key;
                        const future = isFuture(day);
                        const today = isToday(day);
                        return (
                            <button
                                key={key}
                                onClick={() => !future && selectDay(day)}
                                disabled={future}
                                className={`relative flex flex-col items-center justify-center rounded-xl py-2 mx-0.5 transition-all text-sm font-semibold
                  ${future ? "text-slate-300 cursor-not-allowed" : "cursor-pointer"}
                  ${
                      isSelected
                          ? "bg-blue-500 text-white shadow-md"
                          : today
                            ? "bg-blue-50 text-blue-600"
                            : future
                              ? ""
                              : "hover:bg-slate-100 text-slate-700"
                  }
                `}
                            >
                                {day}
                                {hasData && !future && (
                                    <span
                                        className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                                            isSelected ? "bg-white/70" : "bg-blue-400"
                                        }`}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-50 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                        Has data
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded-lg bg-blue-50 inline-block border border-blue-200" />
                        Today
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded-lg bg-blue-500 inline-block" />
                        Selected
                    </span>
                </div>
            </Card>

            {/* Results for selected date */}
            {selectedDate && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-sm font-bold text-slate-800">
                                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-PH", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </p>
                            <p className="text-xs text-slate-400">
                                {dayData.length} record{dayData.length !== 1 ? "s" : ""} found
                            </p>
                        </div>
                    </div>

                    {dayData.length === 0 ? (
                        <Card className="flex flex-col items-center py-10 text-slate-400">
                            <div className="text-3xl mb-2">📭</div>
                            <p className="text-sm">No data recorded on this day.</p>
                        </Card>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100 mb-4">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50">
                                            {["Time", "Temp", "Heater", "LED", "Feeder", "Event"].map(h => (
                                                <th
                                                    key={h}
                                                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {dayData.map(r => (
                                            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                                                    {r.timestamp.split("T")[1]?.slice(0, 5)}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-blue-600">{r.temp}°C</td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge status={r.heaterState} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge status={r.ledState} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge status={r.feederState} />
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-600">{r.event}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile cards */}
                            <div className="md:hidden space-y-3">
                                {dayData.map(r => (
                                    <Card key={r.id} className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="text-xs text-slate-500">
                                                {r.timestamp.split("T")[1]?.slice(0, 5)}
                                            </div>
                                            <div className="text-lg font-bold text-blue-600">{r.temp}°C</div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            <span className="text-xs text-slate-500">Heater:</span>
                                            <StatusBadge status={r.heaterState} />
                                            <span className="text-xs text-slate-500 ml-1">LED:</span>
                                            <StatusBadge status={r.ledState} />
                                            <span className="text-xs text-slate-500 ml-1">Feeder:</span>
                                            <StatusBadge status={r.feederState} />
                                        </div>
                                        <div className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2 py-1.5">
                                            📋 {r.event}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {!selectedDate && (
                <Card className="flex flex-col items-center py-8 text-slate-400">
                    <div className="text-3xl mb-2">📅</div>
                    <p className="text-sm">Select a date to view recorded data.</p>
                    <p className="text-xs mt-1">Days with a blue dot have sensor records.</p>
                </Card>
            )}
        </div>
    );
}

// History page
const PAGE_TABS = [
    { id: "table", label: "📋 Table" },
    { id: "calendar", label: "📅 Calendar" },
];

export default function DataHistoryPage() {
    const aquariumId = AQUARIUM_ID;
    const [allData, setAllData] = useState([]);
    const [timezone, setTimezone] = useState("Asia/Manila");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [activeTab, setActiveTab] = useState("table");

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setLoadError("");

        const loadHistory = async () => {
            try {
                const [{ telemetryRecords }, aquarium] = await Promise.all([
                    getTelemetry(aquariumId, { limit: 500 }),
                    getAquarium(aquariumId),
                ]);
                if (!isMounted) return;
                setAllData(telemetryRecords);
                setTimezone(aquarium?.systemConfig?.timezone || "Asia/Manila");
            } catch (error) {
                if (isMounted)
                    setLoadError(error instanceof Error ? error.message : "Could not load telemetry history.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadHistory();
        return () => {
            isMounted = false;
        };
    }, [aquariumId]);

    if (loading)
        return (
            <div className="px-4 py-5">
                <PageHeader title="Data History" />
                <Spinner />
            </div>
        );
    if (loadError)
        return (
            <div className="px-4 py-5">
                <PageHeader title="Data History" />
                <ErrorAlert message={loadError} />
            </div>
        );

    return (
        <div className="px-4 py-5">
            <PageHeader
                title="Data History"
                subtitle={allData.length ? `${allData.length} total records` : "No Data"}
                timezone={timezone}
            />

            {/* Tabs */}
            <div className="flex gap-2 mb-5">
                {PAGE_TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
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

            {activeTab === "table" && <TableTab allData={allData} aquariumId={aquariumId} />}
            {activeTab === "calendar" && <CalendarTab allData={allData} />}
        </div>
    );
}
