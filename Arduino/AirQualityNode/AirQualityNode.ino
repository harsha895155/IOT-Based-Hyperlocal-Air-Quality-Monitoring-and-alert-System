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
  
  // Output initial JSON identification announcement for Web Serial detection
  uint64_t chipid = ESP.getEfuseMac();
  char chipHex[24];
  snprintf(chipHex, sizeof(chipHex), "%04X%08X", (uint16_t)(chipid >> 32), (uint32_t)chipid);
  String mac = WiFi.macAddress();
  Serial.printf("{\"status\":\"READY\",\"device\":\"AirGuard ESP32 Sensing Node\",\"hardwareId\":\"AG-ESP32-%s\",\"mac\":\"%s\",\"chip\":\"ESP32\",\"firmware\":\"2.2.0\"}\n", chipHex, mac.c_str());
}

// Handle Web Serial provisioning commands from browser / console
void handleSerialCommands() {
  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    if (input.length() == 0) return;

    if (input.indexOf("IDENTIFY") >= 0) {
      uint64_t chipid = ESP.getEfuseMac();
      char chipHex[24];
      snprintf(chipHex, sizeof(chipHex), "%04X%08X", (uint16_t)(chipid >> 32), (uint32_t)chipid);
      String mac = WiFi.macAddress();
      Serial.printf("{\"status\":\"OK\",\"device\":\"AirGuard ESP32 Sensing Node\",\"hardwareId\":\"AG-ESP32-%s\",\"mac\":\"%s\",\"chip\":\"ESP32\",\"revision\":%d,\"firmware\":\"2.2.0\",\"connection\":\"USB / Serial\"}\n",
                    chipHex, mac.c_str(), ESP.getChipRevision());
    } else if (input.indexOf("SCAN_WIFI") >= 0) {
      int n = WiFi.scanNetworks();
      Serial.print("{\"status\":\"OK\",\"networks\":[");
      for (int i = 0; i < n; ++i) {
        Serial.printf("\"%s\"%s", WiFi.SSID(i).c_str(), (i < n - 1) ? "," : "");
      }
      Serial.println("]}");
    } else if (input.indexOf("PROVISION") >= 0) {
      Serial.println("{\"status\":\"WIFI_CONNECTING\"}");
      int ssidStart = input.indexOf("\"ssid\":\"");
      if (ssidStart >= 0) {
        ssidStart += 8;
        int ssidEnd = input.indexOf("\"", ssidStart);
        String newSsid = input.substring(ssidStart, ssidEnd);

        int passStart = input.indexOf("\"password\":\"");
        String newPass = "";
        if (passStart >= 0) {
          passStart += 12;
          int passEnd = input.indexOf("\"", passStart);
          newPass = input.substring(passStart, passEnd);
        }

        Serial.printf("[WiFi] Provisioning new credentials: SSID \"%s\"\n", newSsid.c_str());
        WiFi.disconnect();
        WiFi.begin(newSsid.c_str(), newPass.c_str());
        unsigned long start = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
          delay(300);
          Serial.print(".");
        }
        if (WiFi.status() == WL_CONNECTED) {
          Serial.printf("\n{\"status\":\"PROVISIONED\",\"ip\":\"%s\"}\n", WiFi.localIP().toString().c_str());
        } else {
          Serial.println("\n{\"status\":\"WIFI_FAILED\",\"error\":\"Authentication timeout\"}");
        }
      }
    }
  }
}

void loop() {
  handleSerialCommands();

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
