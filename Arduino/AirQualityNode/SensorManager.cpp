#include "SensorManager.h"
#include "config.h"
#include <DHT.h>

static DHT dht(DHT11_PIN, DHT11);

void SensorManager::begin() {
  pinMode(MQ135_PIN, INPUT);
  dht.begin();
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
  r.temperature = dht.readTemperature();
  r.humidity    = dht.readHumidity();

  if (isnan(r.temperature) || isnan(r.humidity)) {
    r.valid = false;
    r.gasPPM = 0;
    r.aqi = 0;
    r.category = "N/A";
    return r;
  }

  r.gasPPM   = readMQ135PPM();
  r.aqi      = computeAQI(r.gasPPM, r.temperature, r.humidity);
  r.category = aqiCategory(r.aqi);
  r.valid    = true;
  return r;
}
