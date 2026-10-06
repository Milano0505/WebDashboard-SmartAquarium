// Helper tampilan. Suhu selalu disimpan dalam Celsius

const toFahrenheit = celsius => +((celsius * 9) / 5 + 32).toFixed(1);
const isNumber = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));

// ---------- Suhu ----------

export function tempUnitSymbol(unit) {
    return unit === "Fahrenheit" ? "°F" : "°C";
}

// Angka saja dalam satuan tampilan: 24 -> 75.2 (Fahrenheit)
export function formatTempValue(celsius, unit) {
    if (!isNumber(celsius)) return "--";
    return unit === "Fahrenheit" ? toFahrenheit(celsius) : celsius;
}

// Angka + satuan: 24 -> "24°C" atau "75.2°F"
export function formatTemp(celsius, unit) {
    if (!isNumber(celsius)) return "--";
    return `${formatTempValue(celsius, unit)}${tempUnitSymbol(unit)}`;
}

// ---------- Teks & waktu ----------

// "John Doe" -> "JD"
export function initialsOf(name, fallback = "?") {
    const initials = (name || "")
        .split(" ")
        .filter(Boolean)
        .map(word => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    return initials || fallback;
}

// Timestamp ISO -> "Just now", "5 mins ago", "Yesterday", dst.
export function relativeTime(value) {
    if (value === null || value === undefined || value === "") return "--";
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return "Unknown time";

    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    return days === 1 ? "Yesterday" : `${days} days ago`;
}
