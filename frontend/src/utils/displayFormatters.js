// to fahrenheit
const celsiusToFahrenheit = celsius => +((celsius * 9) / 5 + 32).toFixed(1);
// numeric check
const isNumericValue = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));

// unit symbol
export function getTemperatureUnitSymbol(unit) {
    return unit === "Fahrenheit" ? "°F" : "°C";
}

// temperature value
export function formatTemperatureValue(celsius, unit) {
    if (!isNumericValue(celsius)) return "--";
    return unit === "Fahrenheit" ? celsiusToFahrenheit(celsius) : celsius;
}

// temperature text
export function formatTemperature(celsius, unit) {
    if (!isNumericValue(celsius)) return "--";
    return `${formatTemperatureValue(celsius, unit)}${getTemperatureUnitSymbol(unit)}`;
}

// initials
export function getInitials(name, fallback = "?") {
    const initials = (name || "")
        .split(" ")
        .filter(Boolean)
        .map(word => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    return initials || fallback;
}

// relative time
export function formatRelativeTime(value) {
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
