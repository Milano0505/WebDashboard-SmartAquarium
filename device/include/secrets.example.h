// Salin file ini menjadi secrets.h lalu isi nilainya. secrets.h masuk .gitignore: jangan di-commit.
#pragma once

constexpr const char* WIFI_SSID = "NAMA_WIFI";                 // Wi-Fi 2,4 GHz
constexpr const char* WIFI_PASSWORD = "PASSWORD_WIFI";
constexpr const char* API_BASE_URL = "http://192.168.1.10:5000"; // IP laptop yang menjalankan backend, bukan localhost
constexpr const char* AQUARIUM_ID = "aquarium-001";            // ID akuarium tempat perangkat ini terdaftar
constexpr const char* DEVICE_KEY = "ISI_DEVICE_KEY";           // Kunci perangkat dari halaman Access (admin) di dashboard
