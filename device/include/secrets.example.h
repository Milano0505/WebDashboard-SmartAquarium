// Salin file ini menjadi secrets.h lalu isi nilainya. secrets.h masuk .gitignore: jangan di-commit.
#pragma once

constexpr const char* WIFI_SSID = "NAMA_WIFI";                 // Wi-Fi 2,4 GHz
constexpr const char* WIFI_PASSWORD = "PASSWORD_WIFI";
constexpr const char* API_BASE_URL = "http://192.168.1.10:5000"; // IP laptop yang menjalankan backend, bukan localhost
constexpr const char* AQUARIUM_ID = "aquarium-001";            // Sama dengan SHARED_AQUARIUM_ID di backend
constexpr const char* DEVICE_KEY = "ISI_HARDWARE_API_KEY";     // Sama dengan HARDWARE_API_KEY di backend/.env
