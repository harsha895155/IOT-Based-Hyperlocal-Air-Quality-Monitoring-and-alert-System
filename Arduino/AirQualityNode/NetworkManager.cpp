#include "NetworkManager.h"
#include "config.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Preferences.h>
#include <WebServer.h>
#include <DNSServer.h>

void NodeNetworkManager::saveWiFiCredentials(const String &ssid, const String &password) {
  Preferences prefs;
  if (prefs.begin("airguard", false)) {
    prefs.putString("wifi_ssid", ssid);
    prefs.putString("wifi_pass", password);
    prefs.end();
    Serial.printf("[NVS] Wi-Fi credentials permanently saved to flash for SSID: \"%s\"\n", ssid.c_str());
  }
}

String NodeNetworkManager::getSavedSSID() {
  Preferences prefs;
  String ssid = WIFI_SSID;
  if (prefs.begin("airguard", true)) {
    ssid = prefs.getString("wifi_ssid", WIFI_SSID);
    prefs.end();
  }
  return ssid;
}

bool NodeNetworkManager::startCaptivePortal(unsigned long timeoutMs) {
  Serial.println("\n==============================================");
  Serial.println("  AirGuard — Mobile Phone Hotspot Activated   ");
  Serial.println("  Connect phone Wi-Fi to: AirGuard-Setup      ");
  Serial.println("  Portal URL: http://192.168.4.1 (Auto-Popup) ");
  Serial.println("==============================================");  // Scan local 2.4GHz networks before enabling AP
  WiFi.mode(WIFI_AP_STA);
  WiFi.disconnect();
  delay(200);
  int n = WiFi.scanNetworks(false, true);
  if (n <= 0) {
    delay(300);
    n = WiFi.scanNetworks(false, true);
  }
  
  String networkOptions = "";
  for (int i = 0; i < n; ++i) {
    String net = WiFi.SSID(i);
    if (net.length() > 0) {
      networkOptions += "<option value=\"" + net + "\">" + net + " (" + String(WiFi.RSSI(i)) + " dBm)</option>";
    }
  }
  WiFi.scanDelete();

  IPAddress apIP(192, 168, 4, 1);
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));
  WiFi.softAP("AirGuard-Setup");

  DNSServer dnsServer;
  dnsServer.start(53, "*", apIP);

  WebServer webServer(80);

  bool configReceived = false;
  String newSsid = "";
  String newPass = "";

  auto getPortalHtml = [&]() -> String {
    String html = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">";
    html += "<title>AirGuard Wi-Fi Setup</title><style>";
    html += "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0b1120;color:#f8fafc;margin:0;padding:20px;display:flex;justify-content:center;align-items:center;min-height:90vh;}";
    html += ".card{background:#131d33;border:1px solid #1e293b;border-radius:20px;padding:24px;max-width:380px;width:100%;box-shadow:0 20px 40px rgba(0,0,0,0.5);}";
    html += ".logo{font-size:2.4rem;text-align:center;margin-bottom:8px;}";
    html += "h2{font-size:1.35rem;margin:0 0 6px 0;text-align:center;color:#38bdf8;}";
    html += "p{font-size:0.86rem;color:#94a3b8;text-align:center;margin:0 0 16px 0;line-height:1.4;}";
    html += "label{font-size:0.78rem;font-weight:700;color:#cbd5e1;display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em;}";
    html += "select,input{width:100%;box-sizing:border-box;background:#0f172a;border:1px solid #334155;border-radius:12px;padding:12px 14px;font-size:0.95rem;color:#f8fafc;margin-bottom:16px;outline:none;}";
    html += "select:focus,input:focus{border-color:#00d2b4;}";
    html += "button{width:100%;background:linear-gradient(135deg,#0284c7 0%,#00d2b4 100%);border:none;border-radius:12px;padding:14px;font-size:1rem;font-weight:700;color:#ffffff;cursor:pointer;box-shadow:0 4px 14px rgba(0,210,180,0.3);}";
    html += ".footer{font-size:0.75rem;color:#64748b;text-align:center;margin-top:16px;}";
    html += "</style></head><body><div class=\"card\"><div class=\"logo\">📡</div><h2>AirGuard Wi-Fi Setup</h2>";
    html += "<p>Connect this sensing node to your home or office 2.4 GHz Wi-Fi network.</p>";
    html += "<form action=\"/save\" method=\"POST\"><label>Select Wi-Fi Network</label>";
    html += "<select name=\"ssid\" id=\"ssid\" onchange=\"updateManual();\">";
    html += networkOptions;
    html += "<option value=\"__custom__\"" + String(networkOptions.length() == 0 ? " selected" : "") + ">-- Enter Wi-Fi Name Manually --</option></select>";
    html += "<input type=\"text\" name=\"manual_ssid\" id=\"manual\" placeholder=\"Enter your 2.4 GHz Wi-Fi Name (SSID)\" style=\"" + String(networkOptions.length() == 0 ? "display:block;" : "display:none;") + "\">";
    html += "<label>Wi-Fi Password</label><input type=\"password\" name=\"password\" placeholder=\"Enter Wi-Fi Password\" required>";
    html += "<button type=\"submit\">Save & Connect Node</button></form>";
    html += "<script>function updateManual(){var s=document.getElementById('ssid');var m=document.getElementById('manual');if(!s||s.value==='__custom__'){m.style.display='block';m.required=true;}else{m.style.display='none';m.required=false;}}updateManual();</script>";
    html += "<div class=\"footer\">AirGuard IoT Sensing Node &bull; Hyperlocal Monitor</div></div></body></html>";
    return html;
  };

  webServer.on("/", [&]() {
    webServer.send(200, "text/html", getPortalHtml());
  });

  webServer.on("/hotspot-detect.html", [&]() {
    webServer.send(200, "text/html", getPortalHtml());
  });

  webServer.on("/generate_204", [&]() {
    webServer.send(200, "text/html", getPortalHtml());
  });

  webServer.on("/gen_204", [&]() {
    webServer.send(200, "text/html", getPortalHtml());
  });

  webServer.on("/save", HTTP_POST, [&]() {
    String chosenSsid = webServer.arg("ssid");
    if (chosenSsid == "__custom__" || chosenSsid.length() == 0) {
      chosenSsid = webServer.arg("manual_ssid");
    }
    String chosenPass = webServer.arg("password");

    if (chosenSsid.length() > 0) {
      newSsid = chosenSsid;
      newPass = chosenPass;
      configReceived = true;

      String successHtml = "<!DOCTYPE html><html><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">";
      successHtml += "<title>AirGuard - Saved</title><style>";
      successHtml += "body{font-family:sans-serif;background:#0b1120;color:#f8fafc;display:flex;justify-content:center;align-items:center;min-height:90vh;padding:20px;}";
      successHtml += ".card{background:#131d33;border:1px solid #10b981;border-radius:20px;padding:28px;max-width:380px;text-align:center;}";
      successHtml += "h2{color:#10b981;margin:0 0 10px 0;}";
      successHtml += "p{color:#cbd5e1;line-height:1.5;font-size:0.92rem;}";
      successHtml += "</style></head><body><div class=\"card\">";
      successHtml += "<div style=\"font-size:3rem;margin-bottom:10px;\">✓</div>";
      successHtml += "<h2>Wi-Fi Credentials Saved!</h2>";
      successHtml += "<p>AirGuard is now connecting to <strong>" + chosenSsid + "</strong>.</p>";
      successHtml += "<p>You can now disconnect from <strong>AirGuard-Setup</strong> and view your dashboard.</p>";
      successHtml += "</div></body></html>";

      webServer.send(200, "text/html", successHtml);
    } else {
      webServer.send(400, "text/plain", "Invalid Wi-Fi SSID provided.");
    }
  });

  webServer.onNotFound([&]() {
    webServer.send(200, "text/html", getPortalHtml());
  });

  webServer.begin();

  unsigned long startTime = millis();
  unsigned long lastBlink = 0;
  bool ledState = false;

  while (!configReceived && (millis() - startTime < timeoutMs)) {
    dnsServer.processNextRequest();
    webServer.handleClient();

    // Fast blinking LED while captive portal is active
    if (millis() - lastBlink > 250) {
      lastBlink = millis();
      ledState = !ledState;
      digitalWrite(STATUS_LED_PIN, ledState ? HIGH : LOW);
    }

    delay(10);
  }

  digitalWrite(STATUS_LED_PIN, LOW);
  webServer.stop();
  dnsServer.stop();
  WiFi.softAPdisconnect(true);
  WiFi.mode(WIFI_STA);
  delay(500);

  if (configReceived && newSsid.length() > 0) {
    saveWiFiCredentials(newSsid, newPass);
    return true;
  }

  Serial.println("[Portal] Hotspot closed with no phone configuration.");
  return false;
}

bool NodeNetworkManager::connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  Preferences prefs;
  String targetSsid = WIFI_SSID;
  String targetPass = WIFI_PASSWORD;
  if (prefs.begin("airguard", true)) {
    targetSsid = prefs.getString("wifi_ssid", WIFI_SSID);
    targetPass = prefs.getString("wifi_pass", WIFI_PASSWORD);
    prefs.end();
  }

  Serial.printf("[WiFi] Connecting to \"%s\"...\n", targetSsid.c_str());
  WiFi.mode(WIFI_STA);
  WiFi.begin(targetSsid.c_str(), targetPass.c_str());

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - start > WIFI_CONNECT_TIMEOUT_MS) {
      Serial.println("\n[WiFi] Connection timed out.");
      break;
    }
    delay(300);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.printf("[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    return true;
  }

  // Fallback: If connection failed, automatically launch mobile phone captive portal!
  Serial.println("[WiFi] Launching Mobile Phone Hotspot for setup...");
  bool configured = startCaptivePortal(180000UL); // 3-minute captive portal window
  if (configured) {
    return connectWiFi();
  }

  return false;
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

  // Build JSON manually — avoids pulling in ArduinoJson for a payload
  // this small and keeps flash usage down.
  String payload = "{";
  payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"temperature\":" + String(reading.temperature, 2) + ",";
  payload += "\"humidity\":" + String(reading.humidity, 2) + ",";
  payload += "\"gasPPM\":" + String(reading.gasPPM, 2) + ",";
  payload += "\"airQuality\":" + String(reading.aqi);
  payload += "}";

  bool ok = false;
  String targetUrl = BACKEND_URL;
  if (targetUrl.startsWith("https://")) {
    WiFiClientSecure client;
    client.setInsecure(); // Skip CA certificate check for simplicity
    HTTPClient http;
    if (http.begin(client, targetUrl)) {
      http.addHeader("Content-Type", "application/json");
      http.addHeader("x-api-key", DEVICE_API_KEY);
      http.setTimeout(HTTP_TIMEOUT_MS);
      int statusCode = http.POST(payload);
      ok = (statusCode >= 200 && statusCode < 300);
      if (ok) {
        Serial.printf("[HTTP] Sent reading. Status: %d\n", statusCode);
      } else {
        Serial.printf("[HTTP] Send failed. Status: %d, Response: %s\n",
                      statusCode, http.getString().c_str());
      }
      http.end();
    }
  } else {
    HTTPClient http;
    if (http.begin(targetUrl)) {
      http.addHeader("Content-Type", "application/json");
      http.addHeader("x-api-key", DEVICE_API_KEY);
      http.setTimeout(HTTP_TIMEOUT_MS);
      int statusCode = http.POST(payload);
      ok = (statusCode >= 200 && statusCode < 300);
      if (ok) {
        Serial.printf("[HTTP] Sent reading. Status: %d\n", statusCode);
      } else {
        Serial.printf("[HTTP] Send failed. Status: %d, Response: %s\n",
                      statusCode, http.getString().c_str());
      }
      http.end();
    }
  }

  return ok;
}
