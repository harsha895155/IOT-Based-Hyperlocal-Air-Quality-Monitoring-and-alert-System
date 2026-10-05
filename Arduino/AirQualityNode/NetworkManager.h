#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <Arduino.h>
#include "SensorManager.h"

class NodeNetworkManager {
  public:
    // Connects to Wi-Fi, blocking up to WIFI_CONNECT_TIMEOUT_MS.
    // Returns true on success. Safe to call again to reconnect.
    bool connectWiFi();

    bool isConnected();

    // Serializes a SensorReading to JSON and POSTs it to the backend's
    // /api/readings endpoint. Returns true on HTTP 2xx.
    bool sendReading(const SensorReading &reading);

  private:
    unsigned long lastReconnectAttempt = 0;
};

#endif // NETWORK_MANAGER_H
