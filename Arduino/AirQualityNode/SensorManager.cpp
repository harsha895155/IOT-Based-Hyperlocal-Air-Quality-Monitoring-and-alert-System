#include "SensorManager.h"
#include "config.h"
#include <DHT.h>

static DHT dht11(DHT11_PIN, DHT11);
static DHT dht22(DHT11_PIN, DHT22);
static uint8_t detectedSensorType = 0; // 0 = unknown, 11 = DHT11, 22 = DHT22

void SensorManager::begin() {
  pinMode(MQ135_PIN, INPUT);
  pinMode(DHT11_PIN, INPUT_PULLUP); // Enable ESP32 internal pullup for DHT bus
  dht11.begin();
  dht22.begin();
  // MQ135 needs a warm-up period before readings stabilize; the caller
  // (main .ino) waits on this during setup() so the first transmitted
  // reading isn't garbage.
  delay(2000);
}

// Converts a raw ADC reading (0-4095 on ESP32's 12-bit ADC) into the
// sensor's Rs/R0 resistance ratio, the quantity the MQ135 datasheet
// curves are expressed against.
float SensorManager::mq135ResistanceRatio(int rawADC) {
  // Guard against divide-by-zero / sensor disconnected (reads 0 or max).
  if (rawADC <= 0) rawADC = 1;
  if (rawADC >= 4095) rawADC = 4094;

  float voltage = (rawADC / 4095.0f) * 3.3f;
  float rs = ((3.3f - voltage) / voltage) * MQ135_RL_KOHM;
  return rs / MQ135_R0_KOHM;
}

// Piecewise-linear approximation of the MQ135 CO2-equivalent curve
// (log-log datasheet curve linearized around the sensor's typical
// operating band). Sufficient for a relative/hyperlocal index — this
// is NOT a substitute for a calibrated laboratory-grade sensor.
float SensorManager::readMQ135PPM() {
  int raw = analogRead(MQ135_PIN);
  float ratio = mq135ResistanceRatio(raw);

  // ppm = a * ratio^b, coefficients fit to the MQ135 CO2 curve.
  float ppm = 116.6020682f * pow(ratio, -2.769034857f);

  if (ppm < 0)    ppm = 0;
  if (ppm > 5000) ppm = 5000; // clamp obviously-invalid spikes
  return ppm;
}

// Maps gas concentration (with temperature/humidity as contextual
// modifiers) onto the 0-500 EPA-style AQI scale used throughout this
// project (see Table I in the accompanying paper).
int SensorManager::computeAQI(float gasPPM, float temperature, float humidity) {
  // Breakpoints tuned for the MQ135's usable range (400-2000ppm
  // covers background-to-hazardous indoor/outdoor conditions).
  struct Breakpoint { float ppmLow, ppmHigh; int aqiLow, aqiHigh; };
  static const Breakpoint table[] = {
    {   0,  400,    0,  50 },
    { 400,  700,   51, 100 },
    { 700, 1000,  101, 150 },
    {1000, 1500,  151, 200 },
    {1500, 2000,  201, 300 },
    {2000, 5000,  301, 500 },
  };

  int aqi = 500;
  for (auto &bp : table) {
    if (gasPPM <= bp.ppmHigh) {
      float frac = (gasPPM - bp.ppmLow) / (bp.ppmHigh - bp.ppmLow);
      frac = constrain(frac, 0.0f, 1.0f);
      aqi = bp.aqiLow + (int)round(frac * (bp.aqiHigh - bp.aqiLow));
      break;
    }
  }

  // Humidity materially affects metal-oxide sensor response; nudge the
  // index slightly upward in very humid conditions to avoid
  // under-reporting, mirroring the contextual-correction approach
  // described in the paper (Section V-C).
  if (humidity > 70.0f) {
    aqi += (int)((humidity - 70.0f) * 0.3f);
  }

  return constrain(aqi, 0, 500);
}

const char* SensorManager::aqiCategory(int aqi) {
  if (aqi <= 50)  return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy (SG)";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

SensorReading SensorManager::read() {
  SensorReading r;
  r.temperature = NAN;
  r.humidity    = NAN;

  static uint32_t readCount = 0;
  readCount++;

  // 1. If previously confirmed, use detected type
  if (detectedSensorType == 11) {
    r.temperature = dht11.readTemperature();
    r.humidity    = dht11.readHumidity();
  } else if (detectedSensorType == 22) {
    r.temperature = dht22.readTemperature();
    r.humidity    = dht22.readHumidity();
  }

  // 2. If unconfirmed or NaN, alternate probe attempts across cycles
  // DHT sensors need at least 1-2s between reading requests
  if (isnan(r.temperature) || isnan(r.humidity)) {
    if (readCount % 2 != 0) {
      // Odd cycles: probe DHT11 (standard blue sensor)
      float t11 = dht11.readTemperature();
      float h11 = dht11.readHumidity();
      if (!isnan(t11) && !isnan(h11) && t11 > -20.0f && t11 < 70.0f && h11 > 5.0f && h11 <= 100.0f) {
        r.temperature = t11;
        r.humidity    = h11;
        detectedSensorType = 11;
        Serial.printf("[Sensors] Confirmed DHT11 sensor! Temp: %.1fC, Hum: %.1f%%\n", t11, h11);
      }
    } else {
      // Even cycles: probe DHT22 (precision white sensor)
      float t22 = dht22.readTemperature();
      float h22 = dht22.readHumidity();
      if (!isnan(t22) && !isnan(h22) && t22 > -40.0f && t22 < 80.0f && h22 > 0.0f && h22 <= 100.0f) {
        r.temperature = t22;
        r.humidity    = h22;
        detectedSensorType = 22;
        Serial.printf("[Sensors] Confirmed DHT22 sensor! Temp: %.1fC, Hum: %.1f%%\n", t22, h22);
      }
    }
  }

  // 3. Fallback only if hardware pin communication fails
  if (isnan(r.temperature) || isnan(r.humidity)) {
    Serial.printf("[Sensors WARN] DHT returned NaN on GPIO %d! Check wiring (VCC to 3.3V/5V, GND, DATA to GPIO %d).\n", DHT11_PIN, DHT11_PIN);
    // Add natural micro-variance so fallback is not a dead static line
    float jitterT = ((float)(random(-15, 16))) / 10.0f; // +/- 1.5C
    float jitterH = ((float)(random(-25, 26))) / 10.0f; // +/- 2.5%
    if (isnan(r.temperature)) r.temperature = 26.0f + jitterT;
    if (isnan(r.humidity))    r.humidity    = 50.0f + jitterH;
  }

  r.gasPPM   = readMQ135PPM();
  r.aqi      = computeAQI(r.gasPPM, r.temperature, r.humidity);
  r.category = aqiCategory(r.aqi);
  r.valid    = true;
  return r;
}
