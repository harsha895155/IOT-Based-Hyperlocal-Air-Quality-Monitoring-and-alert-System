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

void NodeNetworkManager::saveDeviceId(const String &devId) {
  if (devId.length() == 0) return;
  Preferences prefs;
  if (prefs.begin("airguard", false)) {
    prefs.putString("device_id", devId);
    prefs.end();
    Serial.printf("[NVS] Device ID saved to flash: \"%s\"\n", devId.c_str());
  }
}

String NodeNetworkManager::getDeviceId() {
  Preferences prefs;
  String id = DEVICE_ID;
  if (prefs.begin("airguard", true)) {
    id = prefs.getString("device_id", DEVICE_ID);
    prefs.end();
  }
  return id;
}

bool NodeNetworkManager::startCaptivePortal(unsigned long timeoutMs) {
  Serial.println("\n==============================================");
  Serial.println("  AirGuard — Mobile Phone Hotspot Activated   ");
  Serial.println("  Connect phone/PC Wi-Fi to: AirGuard-Setup   ");
  Serial.println("  Portal URL: http://192.168.4.1 (Auto-Popup) ");
  Serial.println("==============================================");

  // 1. Scan nearby 2.4 GHz networks in pure STA mode with adequate delay for radio stabilization
  WiFi.disconnect();
  delay(150);
  WiFi.mode(WIFI_STA);
  delay(300);

  Serial.println("[Portal] Scanning for nearby 2.4 GHz Wi-Fi networks...");
  int n = WiFi.scanNetworks(false, false);
  if (n <= 0) {
    delay(400);
    n = WiFi.scanNetworks(false, false);
  }
  Serial.printf("[Portal] Initial scan discovered %d Wi-Fi networks\n", n);

  String cachedNetworkOptions = "";
  if (n > 0) {
    for (int i = 0; i < n; ++i) {
      String net = WiFi.SSID(i);
      if (net.length() > 0) {
        int rssi = WiFi.RSSI(i);
        String enc = (WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? "" : " [Secured]";
        cachedNetworkOptions += "<option value=\"" + net + "\">" + net + " (" + String(rssi) + " dBm)" + enc + "</option>";
      }
    }
  }

  // 2. Launch SoftAP (AP + STA mode so STA can still scan/re-scan if needed)
  IPAddress apIP(192, 168, 4, 1);
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));
  WiFi.softAP("AirGuard-Setup");
  delay(250);

  DNSServer dnsServer;
  dnsServer.start(53, "*", apIP);

  WebServer webServer(80);

  bool configReceived = false;
  String newSsid = "";
  String newPass = "";

  auto getPortalHtml = [&]() -> String {
    String html = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">";
    html += "<title>AirGuard Wi-Fi Setup</title><style>";
    html += "*{box-sizing:border-box;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#090e1a;color:#f8fafc;margin:0;padding:16px;display:flex;justify-content:center;align-items:center;min-height:92vh;}";
    html += ".card{background:#11192e;border:1px solid #1e293b;border-radius:20px;padding:26px;max-width:400px;width:100%;box-shadow:0 24px 48px rgba(0,0,0,0.6);text-align:center;}";
    html += ".logo-wrap{display:flex;justify-content:center;margin-bottom:12px;}";
    html += ".logo-circle{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,rgba(2,132,199,0.2) 0%,rgba(0,210,180,0.2) 100%);border:1px solid rgba(0,210,180,0.35);display:flex;align-items:center;justify-content:center;}";
    html += "h2{font-size:1.4rem;margin:0 0 6px 0;color:#38bdf8;}";
    html += "p.desc{font-size:0.86rem;color:#94a3b8;margin:0 0 18px 0;line-height:1.45;}";
    html += ".field-group{text-align:left;margin-bottom:16px;}";
    html += "label{font-size:0.76rem;font-weight:700;color:#94a3b8;display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em;}";
    html += "select,input{width:100%;background:#0a0f1d;border:1px solid #334155;border-radius:12px;padding:12px 14px;font-size:0.95rem;color:#f8fafc;outline:none;transition:border-color 0.2s;}";
    html += "select:focus,input:focus{border-color:#00d2b4;box-shadow:0 0 0 2px rgba(0,210,180,0.2);}";
    html += ".rescan-btn{background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.3);color:#38bdf8;padding:4px 10px;border-radius:8px;font-size:0.75rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;}";
    html += ".rescan-btn:hover{background:rgba(56,189,248,0.2);}";
    html += "button.btn-save{width:100%;background:linear-gradient(135deg,#0284c7 0%,#00d2b4 100%);border:none;border-radius:12px;padding:14px;font-size:1rem;font-weight:700;color:#ffffff;cursor:pointer;margin-top:6px;box-shadow:0 4px 16px rgba(0,210,180,0.35);}";
    html += ".footer{font-size:0.75rem;color:#64748b;margin-top:16px;}";
    html += "</style></head><body><div class=\"card\">";
    html += "<div class=\"logo-wrap\"><div class=\"logo-circle\"><svg width=\"28\" height=\"28\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#00d2b4\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12.55a11 11 0 0 1 14.08 0\"></path><path d=\"M1.42 9a16 16 0 0 1 21.16 0\"></path><path d=\"M8.53 16.11a6 6 0 0 1 6.95 0\"></path><line x1=\"12\" y1=\"20\" x2=\"12.01\" y2=\"20\"></line></svg></div></div>";
    html += "<h2>AirGuard Wi-Fi Setup</h2>";
    html += "<p class=\"desc\">Connect this sensing node to your home or office 2.4 GHz Wi-Fi network.</p>";
    html += "<form action=\"/save\" method=\"POST\">";
    html += "<div class=\"field-group\"><div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;\"><label style=\"margin:0;\">Select Wi-Fi Network</label><button type=\"button\" class=\"rescan-btn\" onclick=\"fetchNetworks();\">&#x21bb; Rescan</button></div>";
    html += "<select name=\"ssid\" id=\"ssid\" onchange=\"updateManual();\">";
    if (cachedNetworkOptions.length() > 0) {
      html += cachedNetworkOptions;
      html += "<option value=\"__custom__\">-- Enter Wi-Fi Name Manually --</option>";
    } else {
      html += "<option value=\"\" disabled selected>Scanning Wi-Fi networks...</option>";
      html += "<option value=\"__custom__\">-- Enter Wi-Fi Name Manually --</option>";
    }
    html += "</select></div>";
    html += "<div class=\"field-group\" id=\"manual-wrap\" style=\"" + String(cachedNetworkOptions.length() == 0 ? "display:block;" : "display:none;") + "\"><label>Custom Wi-Fi Name (SSID)</label><input type=\"text\" name=\"manual_ssid\" id=\"manual\" placeholder=\"Enter your 2.4 GHz SSID\"></div>";
    html += "<div class=\"field-group\"><label>Wi-Fi Password</label><input type=\"password\" name=\"password\" placeholder=\"Enter Wi-Fi Password\" required></div>";
    html += "<div class=\"field-group\"><label>Device Station ID (Optional)</label><input type=\"text\" name=\"device_id\" placeholder=\"e.g. esp32-node-02 (Current: " + getDeviceId() + ")\"></div>";
    html += "<button type=\"submit\" class=\"btn-save\">Save & Connect Node</button></form>";
    html += "<div class=\"footer\">AirGuard IoT Sensing Node &bull; Hyperlocal Monitor</div>";
    html += "<script>";
    html += "function updateManual(){var s=document.getElementById('ssid');var mw=document.getElementById('manual-wrap');var m=document.getElementById('manual');if(!s||s.value==='__custom__'||s.value===''){mw.style.display='block';m.required=true;}else{mw.style.display='none';m.required=false;}}";
    html += "function fetchNetworks(){var s=document.getElementById('ssid');s.innerHTML='<option value=\"\" disabled selected>Scanning 2.4 GHz networks...</option><option value=\"__custom__\">-- Enter Wi-Fi Name Manually --</option>';updateManual();fetch('/scan').then(function(r){return r.json();}).then(function(nets){s.innerHTML='';if(nets&&nets.length>0){nets.forEach(function(n){var o=document.createElement('option');o.value=n.ssid;o.textContent=n.ssid+' ('+n.rssi+' dBm)';s.appendChild(o);});}var c=document.createElement('option');c.value='__custom__';c.textContent='-- Enter Wi-Fi Name Manually --';s.appendChild(c);updateManual();}).catch(function(e){console.warn('Scan error:',e);updateManual();});}";
    if (cachedNetworkOptions.length() == 0) {
      html += "setTimeout(fetchNetworks, 400);";
    }
    html += "</script></div></body></html>";
    return html;
  };

  // Captive Portal endpoints & OS Detection probes
  auto sendPortal = [&]() {
    webServer.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    webServer.send(200, "text/html; charset=utf-8", getPortalHtml());
  };

  webServer.on("/", sendPortal);
  webServer.on("/redirect", sendPortal);
  webServer.on("/connecttest.txt", sendPortal);
  webServer.on("/hotspot-detect.html", sendPortal);
  webServer.on("/generate_204", sendPortal);
  webServer.on("/gen_204", sendPortal);
  webServer.on("/ncsi.txt", sendPortal);
  webServer.on("/success.txt", sendPortal);
  webServer.on("/canonical.html", sendPortal);

  // Asynchronous JSON Wi-Fi scan endpoint
  webServer.on("/scan", [&]() {
    webServer.sendHeader("Access-Control-Allow-Origin", "*");
    int count = WiFi.scanNetworks(false, false);
    String json = "[";
    if (count > 0) {
      for (int i = 0; i < count; ++i) {
        String net = WiFi.SSID(i);
        if (net.length() > 0) {
          if (json.length() > 1) json += ",";
          json += "{\"ssid\":\"" + net + "\",\"rssi\":" + String(WiFi.RSSI(i)) + "}";
        }
      }
    }
    json += "]";
    WiFi.scanDelete();
    webServer.send(200, "application/json; charset=utf-8", json);
  });

  webServer.on("/save", HTTP_POST, [&]() {
    String chosenSsid = webServer.arg("ssid");
    if (chosenSsid == "__custom__" || chosenSsid.length() == 0) {
      chosenSsid = webServer.arg("manual_ssid");
    }
    chosenSsid.trim();
    String chosenPass = webServer.arg("password");
    String chosenDev = webServer.arg("device_id");
    chosenDev.trim();
    if (chosenDev.length() > 0) {
      saveDeviceId(chosenDev);
    }

    if (chosenSsid.length() > 0) {
      newSsid = chosenSsid;
      newPass = chosenPass;
      configReceived = true;

      String successHtml = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">";
      successHtml += "<title>AirGuard - Saved</title><style>";
      successHtml += "body{font-family:sans-serif;background:#090e1a;color:#f8fafc;display:flex;justify-content:center;align-items:center;min-height:90vh;padding:20px;text-align:center;}";
      successHtml += ".card{background:#11192e;border:1px solid #10b981;border-radius:20px;padding:32px 24px;max-width:380px;}";
      successHtml += "h2{color:#10b981;margin:0 0 10px 0;}";
      successHtml += "p{color:#cbd5e1;line-height:1.5;font-size:0.92rem;}";
      successHtml += "</style></head><body><div class=\"card\">";
      successHtml += "<div style=\"font-size:3rem;color:#10b981;margin-bottom:12px;\">&#x2713;</div>";
      successHtml += "<h2>Wi-Fi Credentials Saved!</h2>";
      successHtml += "<p>AirGuard is now connecting to <strong>" + chosenSsid + "</strong>.</p>";
      successHtml += "<p>You can now disconnect from <strong>AirGuard-Setup</strong> and view your live dashboard.</p>";
      successHtml += "</div></body></html>";

      webServer.send(200, "text/html; charset=utf-8", successHtml);
    } else {
      webServer.send(400, "text/plain; charset=utf-8", "Invalid Wi-Fi SSID provided.");
    }
  });

  webServer.onNotFound([&]() {
    String host = webServer.hostHeader();
    if (host != "192.168.4.1" && host.indexOf("192.168.4.1") < 0) {
      webServer.sendHeader("Location", "http://192.168.4.1/", true);
      webServer.send(302, "text/plain; charset=utf-8", "");
      return;
    }
    webServer.send(200, "text/html; charset=utf-8", getPortalHtml());
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
  payload += "\"deviceId\":\"" + getDeviceId() + "\",";
  payload += "\"temperature\":" + String(reading.temperature, 2) + ",";
  payload += "\"humidity\":" + String(reading.humidity, 2) + ",";
  payload += "\"dhtHardwareValid\":" + String(reading.dhtHardwareValid ? "true" : "false") + ",";
  payload += "\"gasPPM\":" + String(reading.gasPPM, 2) + ",";
  payload += "\"airQuality\":" + String(reading.aqi) + ",";
  payload += "\"wifiSSID\":\"" + WiFi.SSID() + "\",";
  payload += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  payload += "\"rssi\":" + String(WiFi.RSSI());
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
        String respBody = http.getString();
        Serial.printf("[HTTP] Sent reading. Status: %d\n", statusCode);
        if (respBody.indexOf("\"REBOOT\"") != -1) {
          Serial.println("[Command] Remote REBOOT command received from Cloud! Restarting in 2s...");
          delay(2000);
          ESP.restart();
        }
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
        String respBody = http.getString();
        Serial.printf("[HTTP] Sent reading. Status: %d\n", statusCode);
        if (respBody.indexOf("\"REBOOT\"") != -1) {
          Serial.println("[Command] Remote REBOOT command received from Cloud! Restarting in 2s...");
          delay(2000);
          ESP.restart();
        }
      } else {
        Serial.printf("[HTTP] Send failed. Status: %d, Response: %s\n",
                      statusCode, http.getString().c_str());
      }
      http.end();
    }
  }

  return ok;
}
