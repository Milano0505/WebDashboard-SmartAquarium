// Config awal akuarium baru. hardwareInfo dan status realtime nanti diisi oleh ESP32 (device_state)
export function createDefaultAquarium() {
    return {
        hardwareInfo: {
            microcontroller: null,
            tempSensor: null,
            lighting: null,
            feeder: null,
            firmwareVersion: null,
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
        },
        feederConfig: {
            mode: "MANUAL",
            schedules: [],
        },
        systemConfig: {
            pollFrequency: 30,
            timezone: "Asia/Jakarta",
        },
    };
}
