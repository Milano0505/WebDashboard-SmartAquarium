// Aturan validasi PATCH config. Tiap aturan memeriksa satu field dan mengembalikan nilai
// yang disimpan; input tidak valid melempar error 400
import { badRequest } from "./errors.js";

const MODES = ["AUTOMATIC", "MANUAL"];
const SWITCH_STATES = ["ON", "OFF"];
const UNITS = ["Celsius", "Fahrenheit"];
const TIME_PATTERN = /^(0[1-9]|1[0-2]):([0-5]\d) (AM|PM)$/; // contoh: "08:00 AM"
const MAX_FEEDING_TIMES = 12;

// ---------- Validator dasar ----------

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function oneOf(field, allowed) {
    return value => {
        if (!allowed.includes(value)) throw badRequest(`${field} must be one of: ${allowed.join(", ")}.`);
        return value;
    };
}

function numberBetween(field, min, max, { integer = false } = {}) {
    return value => {
        if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
            throw badRequest(`${field} must be ${integer ? "an integer" : "a number"} between ${min} and ${max}.`);
        }
        return value;
    };
}

function boolean(field) {
    return value => {
        if (typeof value !== "boolean") throw badRequest(`${field} must be true or false.`);
        return value;
    };
}

function time(field) {
    return value => {
        if (typeof value !== "string" || !TIME_PATTERN.test(value)) {
            throw badRequest(`${field} must use the hh:mm AM/PM format, for example 08:00 AM.`);
        }
        return value;
    };
}

function timezone(value) {
    if (typeof value !== "string" || !value) throw badRequest("timezone must be an IANA timezone name.");
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
    } catch {
        throw badRequest("timezone must be an IANA timezone name.");
    }
    return value;
}

// ---------- Jadwal ----------

export function minutesOfDay(value) {
    const [, hour, minute, period] = TIME_PATTERN.exec(value);
    return ((Number(hour) % 12) + (period === "PM" ? 12 : 0)) * 60 + Number(minute);
}

export function scheduleDurationHours(startTime, endTime) {
    const minutes = (minutesOfDay(endTime) - minutesOfDay(startTime) + 1440) % 1440;
    return Math.round((minutes / 60) * 100) / 100;
}

function lightingSchedule(value) {
    if (!isPlainObject(value)) throw badRequest("schedule must be an object.");
    const unsupported = Object.keys(value).filter(
        key => !["startTime", "endTime", "isActive", "durationHours"].includes(key),
    );
    if (unsupported.length > 0) throw badRequest("schedule contains unsupported fields.");
    const startTime = time("schedule.startTime")(value.startTime);
    const endTime = time("schedule.endTime")(value.endTime);
    if (startTime === endTime) throw badRequest("schedule.startTime and schedule.endTime must differ.");
    // durationHours selalu dihitung dari jam mulai dan selesai
    return {
        startTime,
        endTime,
        durationHours: scheduleDurationHours(startTime, endTime),
        isActive: boolean("schedule.isActive")(value.isActive),
    };
}

function feederSchedules(value) {
    if (!Array.isArray(value) || value.length > MAX_FEEDING_TIMES) {
        throw badRequest(`schedules must be an array of at most ${MAX_FEEDING_TIMES} feeding times.`);
    }
    const seen = new Set();
    return value.map((entry, index) => {
        if (!isPlainObject(entry)) throw badRequest(`schedules[${index}] must be an object.`);
        const entryTime = time(`schedules[${index}].time`)(entry.time);
        if (seen.has(entryTime)) throw badRequest("Feeding times must be unique.");
        seen.add(entryTime);
        return { time: entryTime, isActive: boolean(`schedules[${index}].isActive`)(entry.isActive) };
    });
}

// ---------- Aturan per bagian config ----------

export const configRules = {
    tempConfig: {
        unit: oneOf("unit", UNITS),
        targetTemp: numberBetween("targetTemp", 10, 35),
        minTempThreshold: numberBetween("minTempThreshold", 0, 40),
        maxTempThreshold: numberBetween("maxTempThreshold", 0, 40),
        mode: oneOf("mode", MODES),
        manualControlState: oneOf("manualControlState", SWITCH_STATES),
    },
    lightingConfig: {
        mode: oneOf("mode", MODES),
        manualControlState: oneOf("manualControlState", SWITCH_STATES),
        schedule: lightingSchedule,
    },
    feederConfig: {
        mode: oneOf("mode", MODES),
        schedules: feederSchedules,
    },
    systemConfig: {
        unit: oneOf("unit", UNITS),
        pollFrequency: numberBetween("pollFrequency", 1, 60, { integer: true }),
        timezone,
    },
};

export function validateTemperatureRange(tempConfig) {
    const { minTempThreshold, maxTempThreshold } = tempConfig;
    if (
        Number.isFinite(minTempThreshold) &&
        Number.isFinite(maxTempThreshold) &&
        minTempThreshold >= maxTempThreshold
    ) {
        throw badRequest("minTempThreshold must be lower than maxTempThreshold.");
    }
}
