#ifndef SENSOR_MANAGER_H
#define SENSOR_MANAGER_H

#include <Arduino.h>

// A single, fully-populated sensor sample. NaN in temperature/humidity
// means the DHT22 read failed on this cycle — callers must check
// `valid` before trusting the payload.
struct SensorReading {
  bool  valid;
  float temperature;   // deg C
  float humidity;       // % RH
  float gasPPM;          // estimated CO2-equivalent ppm from MQ135
  int   aqi;              // 0-500 computed index
  const char* category;   // human-readable AQI category
};

class SensorManager {
  public:
    void begin();

    // Blocks briefly (DHT22 needs ~250ms between reads); returns a
    // populated SensorReading, with .valid=false if a sensor faulted.
    SensorReading read();

  private:
    float readMQ135PPM();
    float mq135ResistanceRatio(int rawADC);
    int   computeAQI(float gasPPM, float temperature, float humidity);
    const char* aqiCategory(int aqi);
};

#endif // SENSOR_MANAGER_H
