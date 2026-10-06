// Data awal akuarium, dibuat saat register/login pertama
// hardwareInfo dan realtimeState nanti diisi oleh ESP32
export function createDefaultAquarium(userId) {
    return {
        userId,
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
            pollFrequency: 5,
            timezone: "Asia/Manila",
        },
        lightingUsage: {},
    };
}
