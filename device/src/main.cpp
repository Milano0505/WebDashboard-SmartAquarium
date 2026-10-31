// Firmware ESP32

#include <Arduino.h>
#include <ArduinoJson.h>
#include <DallasTemperature.h>
#include <HTTPClient.h>
#include <esp_system.h>
#include <esp_task_wdt.h>
#include <OneWire.h>
#include <Preferences.h>
#include <WiFi.h>
#include <time.h>
#include "secrets.h" // kredensial

// ===== Pin =====

constexpr uint8_t PIN_TEMP_SENSOR_DATA = 4; // DS18B20 data
constexpr uint8_t PIN_RELAY_HEATER = 18;    // relay heater
constexpr uint8_t PIN_RELAY_LAMP = 19;      // relay lampu
constexpr uint8_t PIN_BUZZER = 5;           // buzzer alarm

// ===== Level relay =====

constexpr uint8_t RELAY_LEVEL_ON = LOW;   // aktif LOW
constexpr uint8_t RELAY_LEVEL_OFF = HIGH; // relay mati

// ===== Konstanta =====

constexpr float HEATER_HYSTERESIS_C = 0.5;                    // selisih nyala/mati
constexpr float HEATER_CUTOFF_C = 36.0;                       // cutoff heater
constexpr uint32_t TEMP_READ_INTERVAL_MS = 5000;              // ms
constexpr uint32_t TEMP_SENSOR_CONVERSION_MS = 800;           // ms
constexpr uint32_t LAMP_SCHEDULE_CHECK_INTERVAL_MS = 1000;    // ms
constexpr uint32_t CONFIG_RETRY_DELAY_MS = 3000;              // ms
constexpr uint32_t TELEMETRY_LOOP_INTERVAL_MS = 500;          // ms
constexpr uint32_t TELEMETRY_RETRY_MS = 3000;                 // ms
constexpr size_t BACKLOG_MAX_READINGS = 120;                  // kapasitas antrean
constexpr uint32_t BACKLOG_MIN_INTERVAL_S = 60;               // detik
constexpr size_t BACKLOG_BATCH_SIZE = 20;                     // per request
constexpr uint32_t CONFIG_LONG_POLL_WAIT_S = 20;              // detik
constexpr uint32_t CONFIG_LONG_POLL_TIMEOUT_MS = (CONFIG_LONG_POLL_WAIT_S + 5) * 1000; // ms
constexpr uint32_t HTTP_DEFAULT_TIMEOUT_MS = 5000;            // ms
constexpr uint32_t NETWORK_TASK_STALL_TIMEOUT_MS = 120000;    // ms
constexpr uint32_t BOOT_REPORT_NTP_WAIT_MS = 60000;           // ms
constexpr uint32_t CONFIG_APPLY_TIMEOUT_MS = 4000;            // ms
constexpr time_t MIN_VALID_EPOCH_S = 1700000000;              // NTP sinkron
constexpr float TEMP_VALID_MIN_C = -10;                       // batas backend
constexpr float TEMP_VALID_MAX_C = 60;                        // batas backend
constexpr float DS18B20_POWER_ON_VALUE_C = 85.0;              // nilai awal

// ===== Struct data =====

// Config dashboard
struct DashboardConfig {
    bool heaterAuto;       // heater auto
    bool heaterManualOn;   // heater manual
    float targetTemp;      // C
    float minTemp;         // C, alarm
    float maxTemp;         // C, alarm
    bool lampAuto;         // lampu auto
    bool lampManualOn;     // lampu manual
    bool lampScheduleOn;   // jadwal aktif
    int16_t lampStartMin;  // menit mulai
    int16_t lampEndMin;    // menit akhir
    uint8_t pollFrequency; // detik
    char timezone[40];     // nama IANA
};

// Status perangkat
struct DeviceStatus {
    float temperature; // celsius
    bool heaterOn;     // status heater
    bool lampOn;       // status lampu
    char event[40];    // alasan alarm
};

// antrean offline
struct BacklogReading {
    uint32_t measuredAt; // epoch detik
    float temperature;   // C
    bool heaterOn;       // status heater
    bool lampOn;         // status lampu
    char event[40];      // alasan alarm
};

// ===== Data bersama =====

static portMUX_TYPE sharedDataLock = portMUX_INITIALIZER_UNLOCKED; // kunci core
static volatile bool configApplyPending = false;                  // config pending

static volatile uint32_t networkTaskHeartbeatAt = 0; // heartbeat telemetry
static volatile uint32_t configTaskHeartbeatAt = 0;  // heartbeat config

static const char* pendingBootReason = nullptr;      // alasan restart
static volatile bool bootReportPending = false;      // laporan pending
static uint32_t bootEpochS = 0;                      // waktu boot

constexpr uint32_t STALL_RESTART_MARKER = 0xA5C3A5C3; // penanda macet
static RTC_NOINIT_ATTR uint32_t stallRestartMarker;   // tahan restart

static DashboardConfig currentConfig = {false, false, 24.0, 20.0, 30.0, false, false, false, -1, -1, 5, "Asia/Jakarta"}; // semua mati
static DeviceStatus currentStatus = {NAN, false, false, ""}; // status sekarang

// critical section
template <typename F> void runLocked(F action) {
    portENTER_CRITICAL(&sharedDataLock);
    action();
    portEXIT_CRITICAL(&sharedDataLock);
}

// Salinan config
DashboardConfig getConfigSnapshot() {
    DashboardConfig copy;
    runLocked([&] { copy = currentConfig; });
    return copy;
}

// Salinan status
DeviceStatus getStatusSnapshot() {
    DeviceStatus copy;
    runLocked([&] { copy = currentStatus; });
    return copy;
}

// simpan config
bool storeConfigAndSaveToFlash(const DashboardConfig& newConfig) {
    bool changed = memcmp(&currentConfig, &newConfig, sizeof(newConfig)) != 0; // memset memcmp
    runLocked([&] { currentConfig = newConfig; });
    configApplyPending = true;
    if (!changed) return false;
    Preferences prefs;
    prefs.begin("aquarium", false);
    prefs.putBytes("config", &newConfig, sizeof(newConfig));
    prefs.end();
    return true;
}

// muat config
void loadConfigFromFlash() {
    Preferences prefs;
    prefs.begin("aquarium", false);
    DashboardConfig saved;
    bool found = prefs.getBytesLength("config") == sizeof(saved) && prefs.getBytes("config", &saved, sizeof(saved));
    prefs.end();

    saved.timezone[sizeof(saved.timezone) - 1] = '\0';
    if (!found || saved.pollFrequency < 1 || saved.pollFrequency > 60) {
        Serial.println("[CFG] No saved config, all outputs stay OFF until the backend answers.");
        return;
    }
    currentConfig = saved;
    Serial.println("[CFG] Restored the last config from flash.");
}

// ===== Relay alarm =====

// init relay
void initRelayPin(uint8_t pin) {
    digitalWrite(pin, RELAY_LEVEL_OFF);
    pinMode(pin, OUTPUT);
    digitalWrite(pin, RELAY_LEVEL_OFF);
}

static bool alarmIsActive = false; // alarm aktif

// set alarm
void setAlarmEvent(const char* eventText) {
    bool active = eventText[0] != '\0';
    if (active != alarmIsActive) Serial.printf("[ALARM] %s\n", active ? eventText : "Back to normal.");
    alarmIsActive = active;
    runLocked([&] { strlcpy(currentStatus.event, eventText, sizeof(currentStatus.event)); });
}

// Bunyi buzzer
void updateBuzzer() {
    digitalWrite(PIN_BUZZER, alarmIsActive && (millis() % 1000) < 150 ? HIGH : LOW);
}

// ===== Waktu NTP =====

static char appliedTimezoneName[40] = ""; // zona aktif
static bool ntpTimeSynced = false;        // NTP sinkron

// tabel zona
static const char* const TIMEZONE_POSIX_TABLE[][2] = {
    {"Asia/Manila", "PST-8"},
    {"Asia/Jakarta", "WIB-7"},
    {"Asia/Makassar", "WITA-8"},
    {"Asia/Jayapura", "WIT-9"},
    {"Asia/Singapore", "<+08>-8"},
    {"Asia/Bangkok", "<+07>-7"},
    {"Asia/Kuala_Lumpur", "<+08>-8"},
    {"Asia/Ho_Chi_Minh", "<+07>-7"},
    {"Asia/Tokyo", "JST-9"},
    {"Asia/Shanghai", "CST-8"},
    {"Asia/Seoul", "KST-9"},
    {"Asia/Kolkata", "IST-5:30"},
    {"Asia/Dhaka", "<+06>-6"},
    {"Asia/Dubai", "<+04>-4"},
    {"Asia/Riyadh", "<+03>-3"},
    {"Europe/London", "GMT0BST,M3.5.0/1,M10.5.0"},
    {"Europe/Paris", "CET-1CEST,M3.5.0,M10.5.0/3"},
    {"Europe/Berlin", "CET-1CEST,M3.5.0,M10.5.0/3"},
    {"America/New_York", "EST5EDT,M3.2.0,M11.1.0"},
    {"America/Chicago", "CST6CDT,M3.2.0,M11.1.0"},
    {"America/Los_Angeles", "PST8PDT,M3.2.0,M11.1.0"},
    {"America/Sao_Paulo", "<-03>3"},
    {"UTC", "UTC0"},
    {"Pacific/Auckland", "NZST-12NZDT,M9.5.0,M4.1.0/3"},
    {"Australia/Sydney", "AEST-10AEDT,M10.1.0,M4.1.0/3"},
};

// atur zona
void applyTimezone(const char* ianaName) {
    if (strcmp(ianaName, appliedTimezoneName) == 0) return;
    strlcpy(appliedTimezoneName, ianaName, sizeof(appliedTimezoneName));

    for (auto& zone : TIMEZONE_POSIX_TABLE) {
        if (strcmp(zone[0], ianaName) != 0) continue;
        configTzTime(zone[1], "pool.ntp.org", "time.google.com");
        Serial.printf("[TIME] Timezone %s, syncing with NTP.\n", ianaName);
        return;
    }
    Serial.printf("[TIME] Timezone %s is not in the firmware list, time is unknown.\n", ianaName);
}

// menit lokal
int getLocalMinuteOfDay() {
    time_t now = time(nullptr);
    if (now < MIN_VALID_EPOCH_S) return -1;
    tm localTime;
    localtime_r(&now, &localTime);
    if (!ntpTimeSynced) Serial.printf("[TIME] NTP synced: %02d:%02d\n", localTime.tm_hour, localTime.tm_min);
    ntpTimeSynced = true;
    return localTime.tm_hour * 60 + localTime.tm_min;
}

// epoch detik
uint32_t getEpochSeconds() {
    time_t now = time(nullptr);
    return now < MIN_VALID_EPOCH_S ? 0 : (uint32_t)now;
}

// ===== Heater =====

static OneWire oneWireBus(PIN_TEMP_SENSOR_DATA);   // bus DS18B20
static DallasTemperature tempSensor(&oneWireBus);  // sensor suhu

static bool heaterRelayOn = false;                 // relay heater
static bool tempConversionInProgress = false;      // konversi sensor
static bool tempReadAttempted = false;             // sudah baca
static uint32_t nextTempReadAt = 0;                // millis berikutnya
static uint32_t tempConversionStartedAt = 0;       // mulai konversi

// Nyalakan/matikan heater
void setHeaterRelay(bool on) {
    if (on == heaterRelayOn) return;
    digitalWrite(PIN_RELAY_HEATER, on ? RELAY_LEVEL_ON : RELAY_LEVEL_OFF);
    heaterRelayOn = on;
    runLocked([&] { currentStatus.heaterOn = on; });
    Serial.printf("[HEATER] %s\n", on ? "ON" : "OFF");
}

// kontrol heater
void applyHeaterControl() {
    if (!tempReadAttempted) return;

    DashboardConfig config = getConfigSnapshot();
    float temperatureC = getStatusSnapshot().temperature;

    // fail-safe sensor/panas
    if (isnan(temperatureC) || temperatureC >= HEATER_CUTOFF_C) {
        setHeaterRelay(false);
        setAlarmEvent(isnan(temperatureC) ? "Sensor error" : "Temperature too high");
        return;
    }

    // manual otomatis
    if (!config.heaterAuto) setHeaterRelay(config.heaterManualOn);
    else if (temperatureC < config.targetTemp - HEATER_HYSTERESIS_C) setHeaterRelay(true);
    else if (temperatureC >= config.targetTemp + HEATER_HYSTERESIS_C) setHeaterRelay(false);

    // alarm suhu
    setAlarmEvent(temperatureC > config.maxTemp ? "Temperature too high" : temperatureC < config.minTemp ? "Temperature too low" : "");
}

// baca suhu
void updateTempSensorAndHeater() {
    uint32_t now = millis();

    if (!tempConversionInProgress) {
        if ((int32_t)(now - nextTempReadAt) < 0) return;
        tempSensor.requestTemperatures();
        tempConversionInProgress = true;
        tempConversionStartedAt = now;
        return;
    }
    if (now - tempConversionStartedAt < TEMP_SENSOR_CONVERSION_MS) return;

    tempConversionInProgress = false;
    nextTempReadAt = now + TEMP_READ_INTERVAL_MS;
    tempReadAttempted = true;

    // nilai invalid
    float temperatureC = tempSensor.getTempCByIndex(0);
    if (temperatureC == DEVICE_DISCONNECTED_C || temperatureC == DS18B20_POWER_ON_VALUE_C) temperatureC = NAN;
    if (isnan(temperatureC)) Serial.println("[TEMP] Sensor read failed.");
    else Serial.printf("[TEMP] %.2f C\n", temperatureC);
    runLocked([&] { currentStatus.temperature = temperatureC; });
    applyHeaterControl();
}

// ===== Lampu =====

static bool lampRelayOn = false;            // relay lampu
static uint32_t nextLampScheduleCheckAt = 0; // millis berikutnya

// Nyalakan/matikan lampu
void setLampRelay(bool on) {
    if (on == lampRelayOn) return;
    digitalWrite(PIN_RELAY_LAMP, on ? RELAY_LEVEL_ON : RELAY_LEVEL_OFF);
    lampRelayOn = on;
    runLocked([&] { currentStatus.lampOn = on; });
    Serial.printf("[LAMP] %s\n", on ? "ON" : "OFF");
}

// cek jadwal
bool isMinuteInSchedule(int nowMinute, int startMinute, int endMinute) {
    if (nowMinute < 0 || startMinute < 0 || endMinute < 0 || startMinute == endMinute) return false;
    if (startMinute < endMinute) return nowMinute >= startMinute && nowMinute < endMinute;
    return nowMinute >= startMinute || nowMinute < endMinute; // tengah malam
}

// Kontrol lampu
void applyLampControl() {
    DashboardConfig config = getConfigSnapshot();
    setLampRelay(config.lampAuto
                     ? config.lampScheduleOn && isMinuteInSchedule(getLocalMinuteOfDay(), config.lampStartMin, config.lampEndMin)
                     : config.lampManualOn);
}

// ===== HTTP backend =====

// URL endpoint
String buildApiUrl(const char* path) {
    return String(API_BASE_URL) + "/api/hardware/" + AQUARIUM_ID + path;
}

// kirim HTTP
int sendHttpRequest(const char* path, const String& body, String& response, uint32_t timeoutMs = HTTP_DEFAULT_TIMEOUT_MS) {
    HTTPClient http;
    http.setTimeout(timeoutMs);
    http.begin(buildApiUrl(path));
    http.addHeader("x-device-key", DEVICE_KEY);
    if (body.length()) http.addHeader("Content-Type", "application/json");
    int code = body.length() ? http.POST(body) : http.GET();
    response = code > 0 ? http.getString() : HTTPClient::errorToString(code);
    http.end();
    // log IP
    if (code <= 0) Serial.printf("[API] %s from %s -> %s\n", path, WiFi.localIP().toString().c_str(), buildApiUrl(path).c_str());
    return code;
}

// parse jam
int parseClockTimeToMinutes(const char* text) {
    int hour, minute;
    char period[3] = {0};
    if (sscanf(text, "%d:%d %2s", &hour, &minute, period) != 3) return -1;
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return -1;

    char letter = toupper(period[0]);
    if (letter != 'A' && letter != 'P') return -1;
    return (hour % 12 + (letter == 'P' ? 12 : 0)) * 60 + minute;
}

static String lastConfigVersion; // versi config

// GET config
bool fetchConfigFromBackend() {
    String path = "/config";
    if (lastConfigVersion.length()) path += "?wait=" + String(CONFIG_LONG_POLL_WAIT_S) + "&v=" + lastConfigVersion;

    String body;
    int code = sendHttpRequest(path.c_str(), "", body, CONFIG_LONG_POLL_TIMEOUT_MS);
    if (code != 200) {
        Serial.printf("[API] Read config failed (HTTP %d): %s\n", code, body.c_str());
        return false;
    }

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, body);
    if (error) {
        Serial.printf("[API] Config JSON is invalid: %s\n", error.c_str());
        return false;
    }

    lastConfigVersion = (const char*)(doc["configVersion"] | "");

    // memset memcmp
    DashboardConfig newConfig;
    memset(&newConfig, 0, sizeof(newConfig));

    JsonObject tempJson = doc["tempConfig"];
    newConfig.heaterAuto = strcmp(tempJson["mode"] | "MANUAL", "AUTOMATIC") == 0;
    newConfig.heaterManualOn = strcmp(tempJson["manualControlState"] | "OFF", "ON") == 0;
    newConfig.targetTemp = tempJson["targetTemp"] | 24.0f;
    newConfig.minTemp = tempJson["minTempThreshold"] | 20.0f;
    newConfig.maxTemp = tempJson["maxTempThreshold"] | 30.0f;

    JsonObject lightingJson = doc["lightingConfig"];
    newConfig.lampAuto = strcmp(lightingJson["mode"] | "MANUAL", "AUTOMATIC") == 0;
    newConfig.lampManualOn = strcmp(lightingJson["manualControlState"] | "OFF", "ON") == 0;
    newConfig.lampScheduleOn = lightingJson["schedule"]["isActive"] | false;
    newConfig.lampStartMin = parseClockTimeToMinutes(lightingJson["schedule"]["startTime"] | "");
    newConfig.lampEndMin = parseClockTimeToMinutes(lightingJson["schedule"]["endTime"] | "");

    newConfig.pollFrequency = constrain((int)(doc["systemConfig"]["pollFrequency"] | 30), 1, 60);
    strlcpy(newConfig.timezone, doc["systemConfig"]["timezone"] | "Asia/Jakarta", sizeof(newConfig.timezone));

    bool changed = storeConfigAndSaveToFlash(newConfig);
    applyTimezone(newConfig.timezone);

    // log config
    if (changed) {
        Serial.printf("[API] Config: heater %s/%s target %.1f C, lamp %s/%s schedule %s, poll %us\n",
                      newConfig.heaterAuto ? "AUTO" : "MANUAL", newConfig.heaterManualOn ? "ON" : "OFF", newConfig.targetTemp,
                      newConfig.lampAuto ? "AUTO" : "MANUAL", newConfig.lampManualOn ? "ON" : "OFF",
                      newConfig.lampScheduleOn ? "on" : "off", newConfig.pollFrequency);
    }
    return true;
}

// POST telemetry
bool sendTelemetry(const DeviceStatus& deviceStatus, uint32_t measuredAt) {
    // sensor fault
    bool sensorFault = isnan(deviceStatus.temperature) && deviceStatus.event[0] != '\0';

    // suhu invalid
    if (!sensorFault && (isnan(deviceStatus.temperature) || deviceStatus.temperature < TEMP_VALID_MIN_C || deviceStatus.temperature > TEMP_VALID_MAX_C)) {
        Serial.println("[API] Telemetry skipped: no valid temperature reading.");
        return false;
    }

    JsonDocument doc;
    if (measuredAt) doc["measuredAt"] = measuredAt; // tanpa NTP

    // laporan restart
    bool includesBootReport = bootReportPending && (bootEpochS != 0 || millis() > BOOT_REPORT_NTP_WAIT_MS);
    if (includesBootReport) {
        doc["bootReason"] = pendingBootReason;
        if (bootEpochS) doc["bootedAt"] = bootEpochS;
    }
    if (!sensorFault) doc["currentTemp"] = deviceStatus.temperature;
    doc["heaterStatus"] = deviceStatus.heaterOn ? "ON" : "OFF";
    doc["ledStatus"] = deviceStatus.lampOn ? "ON" : "OFF";
    doc["feederStatus"] = "Idle"; // stub feeder
    if (deviceStatus.event[0] != '\0') doc["event"] = deviceStatus.event;

    String body, response;
    serializeJson(doc, body);
    int code = sendHttpRequest("/telemetry", body, response);
    if (code != 201) Serial.printf("[API] Send telemetry failed (HTTP %d): %s\n", code, response.c_str());
    else Serial.printf("[API] Telemetry sent: %s\n", body.c_str());
    if (code == 201 && includesBootReport) bootReportPending = false;
    // 4xx selesai
    return code > 0 && code < 500;
}

// ===== Antrean backlog =====

// antrean melingkar
static BacklogReading backlogQueue[BACKLOG_MAX_READINGS];
static size_t backlogHeadIndex = 0; // indeks tertua
static size_t backlogSize = 0;      // jumlah terisi

// cek suhu
bool isTemperatureValid(const DeviceStatus& deviceStatus) {
    return !isnan(deviceStatus.temperature) && deviceStatus.temperature >= TEMP_VALID_MIN_C && deviceStatus.temperature <= TEMP_VALID_MAX_C;
}

// simpan antrean
void enqueueBacklogReading(const DeviceStatus& deviceStatus, uint32_t measuredAt) {
    if (measuredAt == 0 || !isTemperatureValid(deviceStatus)) return;

    if (backlogSize > 0) {
        const BacklogReading& last = backlogQueue[(backlogHeadIndex + backlogSize - 1) % BACKLOG_MAX_READINGS];
        bool sameStatus = last.heaterOn == deviceStatus.heaterOn && last.lampOn == deviceStatus.lampOn &&
                          strcmp(last.event, deviceStatus.event) == 0;
        if (sameStatus && measuredAt - last.measuredAt < BACKLOG_MIN_INTERVAL_S) return;
    }
    if (backlogSize == BACKLOG_MAX_READINGS) {
        backlogHeadIndex = (backlogHeadIndex + 1) % BACKLOG_MAX_READINGS; // buang terlama
        backlogSize--;
    }

    BacklogReading& slot = backlogQueue[(backlogHeadIndex + backlogSize) % BACKLOG_MAX_READINGS];
    slot.measuredAt = measuredAt;
    slot.temperature = deviceStatus.temperature;
    slot.heaterOn = deviceStatus.heaterOn;
    slot.lampOn = deviceStatus.lampOn;
    strlcpy(slot.event, deviceStatus.event, sizeof(slot.event));
    backlogSize++;
}

// POST /telemetry/backlog
bool sendBacklogBatch() {
    size_t batchCount = backlogSize < BACKLOG_BATCH_SIZE ? backlogSize : BACKLOG_BATCH_SIZE;

    JsonDocument doc;
    JsonArray readings = doc["readings"].to<JsonArray>();
    for (size_t i = 0; i < batchCount; i++) {
        const BacklogReading& reading = backlogQueue[(backlogHeadIndex + i) % BACKLOG_MAX_READINGS];
        JsonObject item = readings.add<JsonObject>();
        item["measuredAt"] = reading.measuredAt;
        item["currentTemp"] = reading.temperature;
        item["heaterStatus"] = reading.heaterOn ? "ON" : "OFF";
        item["ledStatus"] = reading.lampOn ? "ON" : "OFF";
        item["feederStatus"] = "Idle";
        if (reading.event[0] != '\0') item["event"] = reading.event;
    }

    String body, response;
    serializeJson(doc, body);
    int code = sendHttpRequest("/telemetry/backlog", body, response);
    if (code != 201 && code != 400) {
        Serial.printf("[API] Send backlog failed (HTTP %d): %s\n", code, response.c_str());
        return false;
    }

    if (code == 400) Serial.printf("[API] Backlog rejected, %u readings dropped: %s\n", (unsigned)batchCount, response.c_str());
    else Serial.printf("[API] Backlog sent: %u readings, %u left\n", (unsigned)batchCount, (unsigned)(backlogSize - batchCount));
    backlogHeadIndex = (backlogHeadIndex + batchCount) % BACKLOG_MAX_READINGS;
    backlogSize -= batchCount;
    return true;
}

// ===== Task jaringan =====

// Task config
void configLongPollTask(void*) {
    for (;;) {
        configTaskHeartbeatAt = millis();
        uint32_t startedAt = millis();
        bool fetchOk = false;
        if (WiFi.status() == WL_CONNECTED) {
            fetchOk = fetchConfigFromBackend();
            if (fetchOk) {
                // tunggu loop
                uint32_t applyStartedAt = millis();
                while (configApplyPending && millis() - applyStartedAt < CONFIG_APPLY_TIMEOUT_MS) vTaskDelay(pdMS_TO_TICKS(50));
            }
        }
        // jeda retry
        if (!fetchOk || millis() - startedAt < 1000) vTaskDelay(pdMS_TO_TICKS(CONFIG_RETRY_DELAY_MS));
    }
}

// Task telemetry
void telemetryTask(void*) {
    DeviceStatus lastReportedStatus = {NAN, false, false, ""}; // status terakhir
    uint32_t nextTelemetryAt = 0;
    uint32_t nextRetryAt = 0;      // jeda retry
    bool backendReachable = false; // backend OK
    for (;;) {
        networkTaskHeartbeatAt = millis();
        if (bootReportPending && bootEpochS == 0) {
            uint32_t epochS = getEpochSeconds();
            if (epochS) bootEpochS = epochS - millis() / 1000; // sekali saja
        }
        bool wifiConnected = WiFi.status() == WL_CONNECTED;
        bool retryWaiting = (int32_t)(millis() - nextRetryAt) < 0;

        if (!configApplyPending && !retryWaiting) {
            DeviceStatus deviceStatus = getStatusSnapshot();
            bool statusChanged = deviceStatus.heaterOn != lastReportedStatus.heaterOn || deviceStatus.lampOn != lastReportedStatus.lampOn ||
                                 strcmp(deviceStatus.event, lastReportedStatus.event) != 0;
            bool telemetryDue = (int32_t)(millis() - nextTelemetryAt) >= 0;

            if (statusChanged || telemetryDue) {
                // cap waktu
                uint32_t measuredAt = getEpochSeconds();
                if (wifiConnected && sendTelemetry(deviceStatus, measuredAt)) {
                    lastReportedStatus = deviceStatus;
                    nextTelemetryAt = millis() + getConfigSnapshot().pollFrequency * 1000UL;
                    backendReachable = true;
                } else {
                    if (!wifiConnected) Serial.println("[WIFI] Not connected, waiting for auto-reconnect.");
                    enqueueBacklogReading(deviceStatus, measuredAt);
                    backendReachable = false;
                    nextRetryAt = millis() + TELEMETRY_RETRY_MS;
                }
            } else if (backendReachable && wifiConnected && backlogSize > 0) {
                // kirim batch
                if (!sendBacklogBatch()) {
                    backendReachable = false;
                    nextRetryAt = millis() + TELEMETRY_RETRY_MS;
                }
            }
        }
        vTaskDelay(pdMS_TO_TICKS(TELEMETRY_LOOP_INTERVAL_MS));
    }
}

// ===== Watchdog restart =====

// teks restart
const char* getResetReasonText(esp_reset_reason_t reason) {
    switch (reason) {
        case ESP_RST_POWERON: return "power on";
        case ESP_RST_SW: return "software restart";
        case ESP_RST_PANIC: return "crash (panic)";
        case ESP_RST_INT_WDT: return "interrupt watchdog";
        case ESP_RST_TASK_WDT: return "task watchdog";
        case ESP_RST_WDT: return "other watchdog";
        case ESP_RST_BROWNOUT: return "brownout (power dip)";
        default: return "other";
    }
}

// restart abnormal
const char* getAbnormalBootReason(esp_reset_reason_t reason) {
    switch (reason) {
        case ESP_RST_INT_WDT: return "interrupt watchdog";
        case ESP_RST_TASK_WDT: return "task watchdog";
        case ESP_RST_WDT: return "other watchdog";
        case ESP_RST_PANIC: return "crash (panic)";
        case ESP_RST_BROWNOUT: return "brownout (power dip)";
        case ESP_RST_SW: return stallRestartMarker == STALL_RESTART_MARKER ? "network task stalled" : nullptr;
        default: return nullptr;
    }
}

// cek macet
void restartIfNetworkTasksStalled() {
    uint32_t now = millis();
    if (now - networkTaskHeartbeatAt <= NETWORK_TASK_STALL_TIMEOUT_MS && now - configTaskHeartbeatAt <= NETWORK_TASK_STALL_TIMEOUT_MS) return;

    Serial.println("[WDT] Network task stalled, restarting.");
    Serial.flush();
    stallRestartMarker = STALL_RESTART_MARKER;
    digitalWrite(PIN_RELAY_HEATER, RELAY_LEVEL_OFF); // relay OFF
    digitalWrite(PIN_RELAY_LAMP, RELAY_LEVEL_OFF);
    ESP.restart();
}

// ===== setup loop =====

// Inisialisasi
void setup() {
    Serial.begin(115200);
    esp_reset_reason_t resetReason = esp_reset_reason();
    pendingBootReason = getAbnormalBootReason(resetReason);
    bootReportPending = pendingBootReason != nullptr;
    stallRestartMarker = 0; // dipakai sekali
    Serial.printf("[BOOT] Last reset: %s\n", pendingBootReason ? pendingBootReason : getResetReasonText(resetReason));

    // output OFF
    initRelayPin(PIN_RELAY_HEATER);
    initRelayPin(PIN_RELAY_LAMP);
    pinMode(PIN_BUZZER, OUTPUT);
    digitalWrite(PIN_BUZZER, LOW);

    tempSensor.begin();
    tempSensor.setWaitForConversion(false); // non-blocking
    Serial.printf("[TEMP] DS18B20 sensors found: %d\n", tempSensor.getDeviceCount());

    loadConfigFromFlash();
    applyTimezone(getConfigSnapshot().timezone); // NTP awal

    Serial.printf("[WIFI] Connecting to \"%s\"\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    // task jaringan
    networkTaskHeartbeatAt = configTaskHeartbeatAt = millis();
    xTaskCreatePinnedToCore(telemetryTask, "telemetry", 12288, nullptr, 1, nullptr, 0);
    xTaskCreatePinnedToCore(configLongPollTask, "configPoll", 12288, nullptr, 1, nullptr, 0);

    // watchdog loop
    enableLoopWDT();
    Serial.printf("[WDT] Loop watchdog %s\n", esp_task_wdt_status(nullptr) == ESP_OK ? "enabled" : "NOT ENABLED");
    Serial.println("=== SMART AQUARIUM READY (tanpa RTC) ===");
}

// loop utama
void loop() {
    restartIfNetworkTasksStalled();

    // config baru
    if (configApplyPending) {
        applyHeaterControl();
        applyLampControl();
        configApplyPending = false;
    }

    updateTempSensorAndHeater();
    if ((int32_t)(millis() - nextLampScheduleCheckAt) >= 0) {
        nextLampScheduleCheckAt = millis() + LAMP_SCHEDULE_CHECK_INTERVAL_MS;
        applyLampControl();
    }
    updateBuzzer();
    delay(10);
}
