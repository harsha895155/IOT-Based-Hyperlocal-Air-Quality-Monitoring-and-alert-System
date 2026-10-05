#ifndef CONFIG_H
#define CONFIG_H

// ============================================================
// AirQualityNode — config.h
// All deployment-specific settings live here so the rest of the
// firmware never needs to be touched between installs.
// ============================================================

// ---- Wi-Fi credentials ----
#define WIFI_SSID "Airtel_Wifi_first floor"
#define WIFI_PASSWORD "Firstfloor@1"

// ---- Backend endpoint ----
// Live Cloud Deployment (Render):
#define BACKEND_URL "https://iot-based-hyperlocal-air-quality.onrender.com/api/readings"

// Local alternative (if testing on local LAN):
// #define BACKEND_URL "http://192.168.1.6:5001/api/readings"

// Device identity — must be unique per node once you scale to
// multiple sensing nodes.
#define DEVICE_ID "esp32-node-01"

// Shared secret sent as an API key header; must match API_KEY in
// the backend's .env. Keeps random devices from posting fake data.
#define DEVICE_API_KEY "CHANGE_ME_SHARED_SECRET"

// ---- Pin assignments ----
#define MQ135_PIN 34     // analog-capable ADC1 pin
#define DHT11_PIN 27     // digital pin
#define STATUS_LED_PIN 2 // onboard LED on most ESP32 dev boards

// ---- Timing ----
#define SAMPLE_INTERVAL_MS 15000UL // read + transmit every 15s
#define WIFI_RETRY_DELAY_MS 5000UL
#define WIFI_CONNECT_TIMEOUT_MS 20000UL
#define HTTP_TIMEOUT_MS 8000UL

// ---- MQ135 calibration ----
// RL = load resistance on the sensor breakout board (kOhm, usually 20)
// R0 = sensor resistance in clean air, obtained via calibration sketch
// (see README.md, "Calibrating the MQ135"). Placeholder must be
// replaced with your own measured value before deployment.
#define MQ135_RL_KOHM 20.0f
#define MQ135_R0_KOHM 76.63f

#endif // CONFIG_H
