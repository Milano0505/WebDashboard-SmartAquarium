import { badRequestError } from "./http-errors.js";

// mode kontrol
const CONTROL_MODES = ["AUTOMATIC", "MANUAL"];
// status saklar
const SWITCH_STATES = ["ON", "OFF"];
// satuan suhu
const TEMPERATURE_UNITS = ["Celsius", "Fahrenheit"];
const TIME_PATTERN = /^(0[1-9]|1[0-2]):([0-5]\d) (AM|PM)$/; // format jam
// maks pakan
const MAX_FEEDING_TIMES = 12;

// cek objek
function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

// validasi pilihan
function oneOfAllowed(field, allowed) {
    return value => {
        if (!allowed.includes(value)) throw badRequestError(`${field} must be one of: ${allowed.join(", ")}.`);
        return value;
    };
}

// validasi rentang
function numberInRange(field, min, max, { integer = false } = {}) {
    return value => {
        if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
            throw badRequestError(`${field} must be ${integer ? "an integer" : "a number"} between ${min} and ${max}.`);
        }
        return value;
    };
}

// validasi boolean
function booleanField(field) {
    return value => {
        if (typeof value !== "boolean") throw badRequestError(`${field} must be true or false.`);
        return value;
    };
}

// validasi jam
function timeField(field) {
    return value => {
        if (typeof value !== "string" || !TIME_PATTERN.test(value)) {
            throw badRequestError(`${field} must use the hh:mm AM/PM format, for example 08:00 AM.`);
        }
        return value;
    };
}

// validasi timezone
function validateTimezone(value) {
    if (typeof value !== "string" || !value) throw badRequestError("timezone must be an IANA timezone name.");
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
    } catch {
        throw badRequestError("timezone must be an IANA timezone name.");
    }
    return value;
}

// menit hari
export function parseMinutesOfDay(value) {
    const [, hour, minute, period] = TIME_PATTERN.exec(value);
    return ((Number(hour) % 12) + (period === "PM" ? 12 : 0)) * 60 + Number(minute);
}

// durasi jadwal
export function calculateScheduleDurationHours(startTime, endTime) {
    const minutes = (parseMinutesOfDay(endTime) - parseMinutesOfDay(startTime) + 1440) % 1440;
    return Math.round((minutes / 60) * 100) / 100;
}

// validasi lampu
function validateLightingSchedule(value) {
    if (!isPlainObject(value)) throw badRequestError("schedule must be an object.");
    const unsupportedKeys = Object.keys(value).filter(
        key => !["startTime", "endTime", "isActive", "durationHours"].includes(key),
    );
    if (unsupportedKeys.length > 0) throw badRequestError("schedule contains unsupported fields.");
    const startTime = timeField("schedule.startTime")(value.startTime);
    const endTime = timeField("schedule.endTime")(value.endTime);
    if (startTime === endTime) throw badRequestError("schedule.startTime and schedule.endTime must differ.");
    return {
        startTime,
        endTime,
        durationHours: calculateScheduleDurationHours(startTime, endTime),
        isActive: booleanField("schedule.isActive")(value.isActive),
    };
}

// validasi pakan
function validateFeederSchedules(value) {
    if (!Array.isArray(value) || value.length > MAX_FEEDING_TIMES) {
        throw badRequestError(`schedules must be an array of at most ${MAX_FEEDING_TIMES} feeding times.`);
    }
    const seenTimes = new Set();
    return value.map((entry, index) => {
        if (!isPlainObject(entry)) throw badRequestError(`schedules[${index}] must be an object.`);
        const entryTime = timeField(`schedules[${index}].time`)(entry.time);
        if (seenTimes.has(entryTime)) throw badRequestError("Feeding times must be unique.");
        seenTimes.add(entryTime);
        return { time: entryTime, isActive: booleanField(`schedules[${index}].isActive`)(entry.isActive) };
    });
}

// aturan field
export const configFieldRules = {
    tempConfig: {
        unit: oneOfAllowed("unit", TEMPERATURE_UNITS),
        targetTemp: numberInRange("targetTemp", 10, 35),
        minTempThreshold: numberInRange("minTempThreshold", 0, 40),
        maxTempThreshold: numberInRange("maxTempThreshold", 0, 40),
        mode: oneOfAllowed("mode", CONTROL_MODES),
        manualControlState: oneOfAllowed("manualControlState", SWITCH_STATES),
    },
    lightingConfig: {
        mode: oneOfAllowed("mode", CONTROL_MODES),
        manualControlState: oneOfAllowed("manualControlState", SWITCH_STATES),
        schedule: validateLightingSchedule,
    },
    feederConfig: {
        mode: oneOfAllowed("mode", CONTROL_MODES),
        schedules: validateFeederSchedules,
    },
    systemConfig: {
        unit: oneOfAllowed("unit", TEMPERATURE_UNITS),
        pollFrequency: numberInRange("pollFrequency", 1, 60, { integer: true }),
        timezone: validateTimezone,
    },
};

// validasi suhu
export function validateTemperatureThresholds(tempConfig) {
    const { minTempThreshold, maxTempThreshold } = tempConfig;
    if (
        Number.isFinite(minTempThreshold) &&
        Number.isFinite(maxTempThreshold) &&
        minTempThreshold >= maxTempThreshold
    ) {
        throw badRequestError("minTempThreshold must be lower than maxTempThreshold.");
    }
}
