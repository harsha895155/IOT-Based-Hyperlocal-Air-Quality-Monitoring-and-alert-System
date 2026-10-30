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
  float ppm = gasPPM < 0.0f ? 0.0f : gasPPM;
  int aqi = 35; // Standard baseline for clean ambient indoor/outdoor air

  if (ppm <= 0.5f) {
    aqi = (int)round(20.0f + ppm * 20.0f); // 20 - 30 (Clean/Excellent)
  } else if (ppm <= 5.0f) {
    // Typical normal room / outdoor ambient VOC levels (0.5 to 5 ppm) -> AQI 30 to 48 (Good)
    aqi = (int)round(30.0f + ((ppm - 0.5f) / 4.5f) * 18.0f);
  } else if (ppm <= 15.0f) {
    // Mild air pollution / stuffy room (5 to 15 ppm) -> AQI 51 to 100 (Moderate)
    aqi = (int)round(51.0f + ((ppm - 5.0f) / 10.0f) * 49.0f);
  } else if (ppm <= 30.0f) {
    // Noticeable pollution / poor ventilation -> AQI 101 to 150 (Unhealthy SG)
    aqi = (int)round(101.0f + ((ppm - 15.0f) / 15.0f) * 49.0f);
  } else if (ppm <= 60.0f) {
    // High smoke / pollutants -> AQI 151 to 200 (Unhealthy)
    aqi = (int)round(151.0f + ((ppm - 30.0f) / 30.0f) * 49.0f);
  } else if (ppm <= 150.0f) {
    // Severe pollution -> AQI 201 to 300 (Very Unhealthy)
    aqi = (int)round(201.0f + ((ppm - 60.0f) / 90.0f) * 99.0f);
  } else {
    // Extreme danger (> 150 ppm) -> AQI 301 to 500 (Hazardous)
    float extra = ((ppm - 150.0f) / 350.0f) * 199.0f;
    if (extra > 199.0f) extra = 199.0f;
    aqi = (int)round(301.0f + extra);
  }

  // Humidity & temperature contextual adjustments
  if (humidity > 70.0f) {
    aqi += (int)((humidity - 70.0f) * 0.25f);
  }
  if (temperature > 35.0f) {
    aqi += (int)((temperature - 35.0f) * 0.5f);
  }

  return constrain(aqi, 15, 500);
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
  r.dhtHardwareValid = true;

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

  // 3. Mark inactive if physical hardware pin communication fails (no fake estimates!)
  if (isnan(r.temperature) || isnan(r.humidity)) {
    r.dhtHardwareValid = false; // Physical DHT is disconnected or failed
    r.temperature = NAN;
    r.humidity    = NAN;
    Serial.printf("[Sensors WARN] Physical DHT inactive on GPIO %d! Cloud backend will supply live physical location meteorology.\n", DHT11_PIN);
  }

  r.gasPPM   = readMQ135PPM();
  // If physical DHT is active, compute local AQI; if inactive, backend will compute AQI using location weather + physical MQ-135 Gas PPM
  r.aqi      = r.dhtHardwareValid ? computeAQI(r.gasPPM, r.temperature, r.humidity) : 0;
  r.category = aqiCategory(r.aqi);
  r.valid    = true;
  return r;
}
