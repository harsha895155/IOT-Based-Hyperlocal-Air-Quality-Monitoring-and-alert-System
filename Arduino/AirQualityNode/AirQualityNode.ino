/**
 * AirQualityNode.ino — ESP32 Firmware Entry Point
 * 
 * Companion firmware for the IEEE paper:
 * "IoT-Based Hyperlocal Air Quality Monitoring and Alert System with Cloud Integration"
 * 
 * Samples MQ135 + DHT22 sensors, computes AQI, and POSTs readings
 * to the Express / MongoDB Atlas API over Wi-Fi.
 */

#include "config.h"
#include "SensorManager.h"
#include "NetworkManager.h"

SensorManager sensors;
NodeNetworkManager network;

unsigned long lastSampleTime = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==============================================");
  Serial.println("  AirGuard — ESP32 Sensing Node Initializing  ");
  Serial.println("==============================================");

  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  // Initialize sensors and allow warm-up
  Serial.println("[Sensors] Warming up MQ135 and initializing DHT...");
  sensors.begin();

  // Connect to Wi-Fi
  if (network.connectWiFi()) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(500);
    digitalWrite(STATUS_LED_PIN, LOW);
  } else {
    Serial.println("[WiFi] Initial connection failed. Will retry in main loop.");
  }

  Serial.println("[Node] Setup complete. Entering sampling loop.");
}

void loop() {
  unsigned long now = millis();

  // Non-blocking timer for sensor sampling and transmission
  if (now - lastSampleTime >= SAMPLE_INTERVAL_MS || lastSampleTime == 0) {
    lastSampleTime = now;

    // Visual pulse: LED on during acquisition & transmission
    digitalWrite(STATUS_LED_PIN, HIGH);

    Serial.println("\n[Node] Acquiring sensor reading...");
    SensorReading reading = sensors.read();

    if (reading.valid) {
      Serial.printf("[Sensors] T: %.2f C | H: %.2f %% | Gas: %.2f ppm | AQI: %d (%s)\n",
                    reading.temperature, reading.humidity, reading.gasPPM, reading.aqi, reading.category);

      bool sent = network.sendReading(reading);
      if (sent) {
        Serial.println("[Node] Telemetry successfully ingested by backend.");
      } else {
        Serial.println("[Node] Ingestion failed. Will retry next cycle.");
      }
    } else {
      Serial.println("[Sensors] Sensor read fault (DHT or MQ135 disconnected). Skipping transmission.");
    }

    digitalWrite(STATUS_LED_PIN, LOW);
  }

  // Brief yield for ESP32 background tasks (Wi-Fi stack, watchdog)
  delay(50);
}
