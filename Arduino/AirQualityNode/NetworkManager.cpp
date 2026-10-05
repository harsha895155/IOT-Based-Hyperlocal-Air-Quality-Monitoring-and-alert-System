#include "NetworkManager.h"
#include "config.h"
#include <WiFi.h>
#include <HTTPClient.h>

bool NodeNetworkManager::connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  Serial.printf("[WiFi] Connecting to \"%s\"...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - start > WIFI_CONNECT_TIMEOUT_MS) {
      Serial.println("[WiFi] Connection timed out.");
      return false;
    }
    delay(300);
    Serial.print(".");
  }

  Serial.println();
  Serial.printf("[WiFi] Connected. IP: %s\n", WiFi.localIP().toString().c_str());
  return true;
}

bool NodeNetworkManager::isConnected() {
  return WiFi.status() == WL_CONNECTED;
}

bool NodeNetworkManager::sendReading(const SensorReading &reading) {
  if (!isConnected()) {
    // Reconnect logic: don't hammer WiFi.begin() every loop — retry on
    // a cooldown so a flaky access point doesn't stall the whole node.
    if (millis() - lastReconnectAttempt > WIFI_RETRY_DELAY_MS) {
      lastReconnectAttempt = millis();
      connectWiFi();
    }
    return false;
  }

  HTTPClient http;
  String url = String("http://") + BACKEND_HOST + ":" + BACKEND_PORT + READINGS_PATH;

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", DEVICE_API_KEY);
  http.setTimeout(HTTP_TIMEOUT_MS);

  // Build JSON manually — avoids pulling in ArduinoJson for a payload
  // this small and keeps flash usage down.
  String payload = "{";
  payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"temperature\":" + String(reading.temperature, 2) + ",";
  payload += "\"humidity\":" + String(reading.humidity, 2) + ",";
  payload += "\"gasPPM\":" + String(reading.gasPPM, 2) + ",";
  payload += "\"airQuality\":" + String(reading.aqi);
  payload += "}";

  int statusCode = http.POST(payload);

  bool ok = (statusCode >= 200 && statusCode < 300);
  if (ok) {
    Serial.printf("[HTTP] Sent reading. Status: %d\n", statusCode);
  } else {
    Serial.printf("[HTTP] Send failed. Status: %d, Response: %s\n",
                  statusCode, http.getString().c_str());
  }

  http.end();
  return ok;
}
