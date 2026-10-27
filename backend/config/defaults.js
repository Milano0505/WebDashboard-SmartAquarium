// Data awal akuarium yang dibuat admin. `members` memetakan userId ke "owner" atau "member";
// `memberIds` salinan kuncinya untuk query array-contains.
// hardwareInfo dan realtimeState nanti diisi oleh ESP32
export function createDefaultAquarium({ name, createdBy, ownerId = null }) {
    return {
        name,
        createdBy,
        members: ownerId ? { [ownerId]: "owner" } : {},
        memberIds: ownerId ? [ownerId] : [],
        hardwareInfo: {
            microcontroller: null,
            tempSensor: null,
            lighting: null,
            feeder: null,
            firmwareVersion: null,
        },
        realtimeState: {
            currentTemp: null,
            heaterStatus: "OFF",
            ledStatus: "OFF",
            feederStatus: "Idle",
            lastUpdated: null,
        },
        tempConfig: {
            unit: "Celsius",
            targetTemp: 24,
            minTempThreshold: 20,
            maxTempThreshold: 30,
            mode: "MANUAL",
            manualControlState: "OFF",
        },
        lightingConfig: {
            mode: "MANUAL",
            manualControlState: "OFF",
            schedule: {
                startTime: null,
                endTime: null,
                durationHours: null,
                isActive: false,
            },
            avgHoursOn: null,
            avgHoursOff: null,
        },
        feederConfig: {
            mode: "MANUAL",
            schedules: [],
            lastTriggeredAt: null,
        },
        systemConfig: {
            pollFrequency: 30,
            timezone: "Asia/Jakarta",
        },
        lightingUsage: {},
    };
}
