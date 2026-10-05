# AirQualityNode — ESP32 Firmware

Reference firmware for the sensing node: reads an MQ135 gas sensor and a
DHT22 temperature/humidity sensor on a timer, computes a local AQI
estimate, and POSTs each reading to the backend as JSON.

## Files

| File | Purpose |
|---|---|
| `AirQualityNode.ino` | Entry point — `setup()`/`loop()`, sampling timer, retry/backoff logic, status LED |
| `config.h` | All deployment settings: Wi-Fi, backend host, pins, calibration constants |
| `SensorManager.h/.cpp` | Reads MQ135 + DHT22, converts raw ADC to ppm, computes AQI |
| `NetworkManager.h/.cpp` | Wi-Fi connect/reconnect, HTTP POST to the backend |

## 1. Requirements

- Arduino IDE 2.x with the **ESP32 board package** installed (Boards Manager → search "esp32" → install by Espressif Systems)
- Libraries (Library Manager → search and install):
  - `DHT sensor library` (Adafruit)
  - `Adafruit Unified Sensor` (dependency of the above)
- Board setting: **Tools → Board → ESP32 Dev Module**

## 2. Wiring

| Sensor | Pin | ESP32 Pin |
|---|---|---|
| MQ135 | AOUT | GPIO34 (ADC1 — input-only, do not use ADC2 pins, they conflict with Wi-Fi) |
| MQ135 | VCC / GND | 5V / GND |
| DHT22 | DATA | GPIO27 (add a 10kΩ pull-up resistor between DATA and 3.3V) |
| DHT22 | VCC / GND | 3.3V / GND |

## 3. Configure `config.h`

Before uploading, edit these values:

```cpp
#define WIFI_SSID        "YOUR_WIFI_SSID"
#define WIFI_PASSWORD    "YOUR_WIFI_PASSWORD"
#define BACKEND_HOST     "192.168.1.42"   // your backend machine's LAN IP
#define DEVICE_API_KEY   "CHANGE_ME_SHARED_SECRET"  // must match Backend/.env API_KEY
```

`BACKEND_HOST` must be a **LAN IP address**, not `localhost` — the ESP32
is a separate device on the network and can't resolve your computer's
loopback address. Find your machine's IP with `ipconfig` (Windows) or
`ifconfig`/`ip addr` (macOS/Linux).

## 4. Calibrating the MQ135

The MQ135 ships uncalibrated; `MQ135_R0_KOHM` in `config.h` is a
placeholder. To calibrate:

1. Power the sensor in clean, well-ventilated outdoor air for **24–48
   hours** of burn-in (metal-oxide sensors drift heavily when new).
2. Upload a minimal sketch that just prints `analogRead(MQ135_PIN)` in
   a loop, or temporarily add `Serial.println(analogRead(MQ135_PIN));`
   inside `SensorManager::readMQ135PPM()`.
3. In clean outdoor air, compute the resistance ratio at atmospheric
   CO2 baseline (~400ppm) and solve for R0 using the datasheet curve,
   or use the simplified approach: average ~50 raw ADC readings, then
   `R0 = Rs / 3.6` (3.6 is the MQ135's typical clean-air Rs/R0 ratio).
4. Replace `MQ135_R0_KOHM` in `config.h` with your measured value.

Skipping calibration still produces a usable *relative* index for
demo/development purposes — absolute ppm values just won't be accurate
until you calibrate.

## 5. Upload

1. Connect the ESP32 via USB.
2. Select the correct **Port** under Tools.
3. Click **Upload**.
4. Open **Tools → Serial Monitor** at **115200 baud** to watch boot
   logs, Wi-Fi connection status, and each reading as it's sent.

## 6. Status LED reference

| Pattern | Meaning |
|---|---|
| 2 quick blinks at boot | Wi-Fi connected successfully |
| 5 fast blinks at boot | Wi-Fi failed to connect (will keep retrying in `loop()`) |
| 1 short blink per cycle | Reading sent successfully |
| No blink, error in Serial Monitor | Reading failed to send (check backend is running and reachable) |

## 7. Common errors & fixes

| Symptom | Fix |
|---|---|
| `[WiFi] Connection timed out.` | Double-check SSID/password; ESP32 only supports 2.4GHz networks, not 5GHz |
| DHT22 reads always fail (`isnan`) | Check the 10kΩ pull-up resistor is present; DHT22 needs ≥2s between reads (already handled) |
| HTTP status `401` in Serial Monitor | `DEVICE_API_KEY` doesn't match `API_KEY` in the backend's `.env` |
| HTTP status `-1` or connection refused | Backend isn't running, or `BACKEND_HOST`/`BACKEND_PORT` is wrong — confirm with `curl http://<host>:<port>/api/health` from your computer |
| MQ135 readings pinned at 0 or max | Check wiring polarity and that AOUT is on an ADC1 pin (GPIO32-39), not ADC2 |

## 8. Power optimization (for battery/solar deployments)

The current loop uses `delay()`-based timing for simplicity. For a
battery-powered node, replace the sampling loop with
`esp_sleep_enable_timer_wakeup()` + `esp_deep_sleep_start()` between
samples — this cuts idle current from ~80mA to a few µA. Not enabled
by default since it resets `millis()`-based state on every wake.
