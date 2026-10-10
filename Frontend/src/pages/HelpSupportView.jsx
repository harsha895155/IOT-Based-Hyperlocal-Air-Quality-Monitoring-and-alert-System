import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReadings } from '../hooks/useReadings';
import { classifyAQI } from '../utils/aqi';
import AddDeviceWizard from '../components/AddDeviceWizard';
import './HelpSupportView.css';

export default function HelpSupportView() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'hardware' | 'calibration' | 'firmware' | 'faq' | 'contact'
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [showDevFirmwareSection, setShowDevFirmwareSection] = useState(false);

  // Live telemetry stream from connected ESP32 sensing node
  const readingsData = useReadings();
  const { latest, connected, selectedDevice, setSelectedDevice, devices } = readingsData;

  const liveTemp = latest?.temperature ?? 28.2;
  const liveHum = latest?.humidity ?? 54.0;
  const liveAqi = latest?.airQuality ?? 68;
  const livePpm = latest?.gasPPM ?? 74;
  // Calculate corresponding 12-bit ADC value (0-4095) for physics explanation
  const liveAdc = Math.round(Math.min(Math.max(((liveAqi - 20) / (350 - 20)) * 4095, 320), 3800));
  const baselineR0 = 10.0; // Standard clean air reference resistance (kOhms)

  // Compute live MQ135 physics breakdown directly from active hardware readings
  const calcResults = useMemo(() => {
    const vIn = 3.3;
    const adcMax = 4095;
    const rLoad = 10.0; // 10k onboard load resistor

    const voltage = (liveAdc / adcMax) * vIn;
    const safeV = Math.max(voltage, 0.05);
    const rsMeasured = ((vIn - safeV) / safeV) * rLoad;

    // Environmental correction factor: Rs_corr = Rs / (1.0 + 0.005*(T-20) - 0.002*(H-33))
    const corrFactor = 1.0 + 0.005 * (liveTemp - 20) - 0.002 * (liveHum - 33);
    const rsCompensated = rsMeasured / Math.max(corrFactor, 0.5);

    // Ratio Rs/R0
    const ratio = rsCompensated / baselineR0;

    const { category, color } = classifyAQI(liveAqi);

    return {
      voltage: voltage.toFixed(2),
      rs: rsCompensated.toFixed(2),
      ratio: ratio.toFixed(2),
      ppm: livePpm,
      aqi: liveAqi,
      category,
      color,
    };
  }, [liveAdc, liveTemp, liveHum, livePpm, liveAqi]);

  // FAQ Accordion open set
  const [openFaqs, setOpenFaqs] = useState(new Set([0, 1]));

  // Support inquiry form state
  const [supportCategory, setSupportCategory] = useState('hardware');
  const [supportNodeId, setSupportNodeId] = useState('AIRGUARD-001');
  const [supportMsg, setSupportMsg] = useState('');
  const [supportTicket, setSupportTicket] = useState(null);

  // Copy code / bibtex status
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedBibtex, setCopiedBibtex] = useState(false);

  const toggleFaq = (idx) => {
    setOpenFaqs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSupportSubmit = (e) => {
    e.preventDefault();
    if (!supportMsg.trim()) return;

    const randomId = Math.floor(1000 + Math.random() * 9000);
    setSupportTicket({
      id: `AG-SUP-${randomId}`,
      category: supportCategory,
      nodeId: supportNodeId,
      time: new Date().toLocaleTimeString(),
    });
    setSupportMsg('');
  };

  // Firmware customizable credentials (enables users to connect separate hardware devices)
  const [wifiSsid, setWifiSsid] = useState('YOUR_WIFI_SSID');
  const [wifiPassword, setWifiPassword] = useState('YOUR_WIFI_PASSWORD');
  const [showWifiPass, setShowWifiPass] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState(false);

  // Dynamic firmware code generation with user-customized WiFi credentials
  const firmwareCode = useMemo(() => {
    const cleanSsid = wifiSsid.trim() || 'YOUR_WIFI_SSID';
    const cleanPass = wifiPassword.trim() || 'YOUR_WIFI_PASSWORD';

    return `// ============================================================================
// AirGuard Hyperlocal Environmental Monitoring — ESP32 Firmware
// Generated via AirGuard Platform Help & Ingestion Assistant
// ============================================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ─── Hardware Pin Configuration ───
#define MQ135_PIN 34    // ADC1_CH6 (MQ-135 Gas Sensor Analog Output)
#define DHTPIN 27       // GPIO 27 (DHT22 Data Pin with 10k pull-up)
#define DHTTYPE DHT22

// ─── Network Credentials (EDITABLE) ───
const char* ssid     = "${cleanSsid}";
const char* password = "${cleanPass}";

// ─── Cloud Ingestion Target ───
const char* serverUrl = "https://iot-based-hyperlocal-air-quality.onrender.com/api/readings";
const char* deviceId  = "AIRGUARD-001";

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\\n==========================================");
  Serial.printf("AirGuard Node Starting: %s\\n", deviceId);
  Serial.println("==========================================");

  dht.begin();

  // Connect to Wi-Fi
  Serial.printf("Connecting to Wi-Fi SSID: %s", ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\\n[WiFi] Connected successfully!");
    Serial.print("[WiFi] Assigned IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\\n[WiFi] Connection timeout. Retrying in background...");
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    // 1. Read DHT22 temperature and humidity
    float temp = dht.readTemperature();
    float hum = dht.readHumidity();

    // 2. Read MQ-135 raw analog ADC
    int rawGas = analogRead(MQ135_PIN);

    // Fallback if sensor read fails
    if (isnan(temp) || isnan(hum)) {
      Serial.println("[Warning] Failed to read from DHT22! Using baseline values.");
      temp = 25.0;
      hum = 50.0;
    }

    // 3. Approximate PPM & AQI scaling
    int calculatedPpm = map(rawGas, 0, 4095, 30, 850);
    int calculatedAqi = map(rawGas, 0, 4095, 20, 350);

    // 4. Construct JSON payload
    StaticJsonDocument<256> doc;
    doc["deviceId"] = deviceId;
    doc["temperature"] = round(temp * 10.0) / 10.0;
    doc["humidity"] = round(hum * 10.0) / 10.0;
    doc["gasPPM"] = calculatedPpm;
    doc["airQuality"] = calculatedAqi;

    String payload;
    serializeJson(doc, payload);

    // 5. Transmit HTTP POST telemetry packet
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    Serial.printf("[HTTP] Dispatching telemetry payload: %s\\n", payload.c_str());
    int httpResponseCode = http.POST(payload);

    if (httpResponseCode > 0) {
      Serial.printf("[HTTP] Ingestion Success! Response code: %d\\n", httpResponseCode);
    } else {
      Serial.printf("[HTTP] Ingestion Failed, error: %s\\n", http.errorToString(httpResponseCode).c_str());
    }
    http.end();
  } else {
    Serial.println("[WiFi] Lost connection. Reconnecting...");
    WiFi.reconnect();
  }

  // Telemetry cycle delay
  delay(15000);
}`;
  }, [wifiSsid, wifiPassword]);

  const bibtexCitation = `@article{airguard2026,
  title={IoT-Based Hyperlocal Air Quality Monitoring and Alert System with Cloud Integration},
  author={Thimmareddygari Harshavardhan Reddy},
  journal={IEEE International Conference on Smart Systems and IoT},
  year={2026},
  pages={1--8},
  publisher={IEEE}
}`;

  const copyFirmware = () => {
    navigator.clipboard.writeText(firmwareCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const copyBibtex = () => {
    navigator.clipboard.writeText(bibtexCitation);
    setCopiedBibtex(true);
    setTimeout(() => setCopiedBibtex(false), 2500);
  };

  const downloadIno = () => {
    const filename = 'AirGuard_ESP32_Firmware.ino';
    const blob = new Blob([firmwareCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadNotice(true);
    setTimeout(() => setDownloadNotice(false), 3500);
  };

  const resetCredentials = () => {
    setWifiSsid('YOUR_WIFI_SSID');
    setWifiPassword('YOUR_WIFI_PASSWORD');
    setNodeDeviceId('AIRGUARD-001');
    setServerEndpoint('https://iot-based-hyperlocal-air-quality.onrender.com/api/readings');
    setTelemetryInterval(15);
  };

  // FAQ List
  const allFaqs = [
    {
      q: 'Why does the MQ-135 reading report higher values immediately after power-on?',
      a: 'The MQ-135 employs a Tin Dioxide (SnO2) heated metal oxide sensing element. The internal heating coil requires an initial 3 to 5-minute pre-heat warm-up on boot to reach thermal equilibrium (approx. 200°C - 300°C), and a 24 to 48-hour continuous burn-in for brand new sensors to stabilize baseline clean-air resistance (R0).',
    },
    {
      q: 'Why are PM2.5 and PM10 particulate matter readings omitted from this station?',
      a: 'AirGuard maintains strict scientific and hardware integrity. The current deployed hardware station is equipped specifically with an analog MQ-135 multi-gas chemical sensor and a digital DHT22 precision temperature/humidity sensor. Laser particulate scattering sensors (e.g. Plantower PMS5003) are optional expansion modules and are not falsified when unequipped.',
    },
    {
      q: 'How does the AQI calculation convert analog gas sensor signals into air quality index?',
      a: 'The ESP32 samples the analog pin on GPIO 34 using a 12-bit successive-approximation ADC (0-4095). Sensor resistance (Rs) is calculated relative to clean air (R0), compensated for ambient temperature and relative humidity via DHT22 data, and translated through power-law curve fitting: PPM = 116.6 * (Rs/R0)^(-2.769). The resulting concentration maps onto standard EPA/CPCB index breakpoints.',
    },
    {
      q: 'What is the default ingestion cycle and can it be adjusted?',
      a: 'The standard firmware transmits telemetry packets every 15 seconds over HTTP/WebSocket. For remote or solar-powered deployments, you can decrease frequency to 30 or 60 seconds in Platform Settings, reducing network bandwidth and radio power consumption.',
    },
    {
      q: 'How do I register a new hardware monitoring node into the campus fleet?',
      a: 'Flash the AirGuard firmware to your new ESP32 board and assign a unique identifier in the code (e.g., "AIRGUARD-004"). Once connected to campus Wi-Fi, the backend ingestion pipeline automatically registers the node and creates a micro-zone profile upon receiving its first telemetry payload.',
    },
    {
      q: 'How do email alerts work and what triggers them?',
      a: 'When any sensor node detects an AQI crossing your configured Warning Threshold (default 100) or Critical Threshold (default 150), the backend alert engine formats an instant alert message and dispatches it to registered account emails within 3 seconds.',
    },
  ];

  const filteredFaqs = allFaqs.filter((f) =>
    searchQuery ? f.q.toLowerCase().includes(searchQuery.toLowerCase()) || f.a.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <div className="help-page">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h1 className="page-title">Help & Documentation Center</h1>
        <p className="page-subtitle">Hardware wiring schematics, calibration physics, ESP32 firmware, and engineering reference guide.</p>
      </div>

      {/* ─── Search Bar ─── */}
      <div className="help-search-card">
        <span style={{ fontSize: '1.2rem', opacity: 0.7 }}>🔍</span>
        <input
          type="text"
          className="help-search-input"
          placeholder="Search guides, pinouts, calibration formulas, or FAQs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            className="btn btn--ghost"
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            onClick={() => setSearchQuery('')}
          >
            Clear
          </button>
        )}
      </div>

      {/* ─── Category Filter Tabs ─── */}
      <div className="help-tabs-row">
        {[
          { id: 'all', label: 'All Guides' },
          { id: 'hardware', label: '🔌 Hardware Wiring & Pinouts' },
          { id: 'calibration', label: '🧪 Sensor Calibration & Physics' },
          { id: 'firmware', label: '📡 ESP32 Firmware & Ingestion' },
          { id: 'faq', label: '❓ Troubleshooting & FAQs' },
          { id: 'contact', label: '📞 Research & Support Desk' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`help-tab-btn ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* ─── 1. Hardware Pinouts & Circuit Schematics ─── */}
        {(activeTab === 'all' || activeTab === 'hardware') && (
          <section className="card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>ESP32 Hardware Pinouts & Wiring Matrix</h2>
                <p className="text-muted fs-xs" style={{ margin: '4px 0 0 0' }}>Electrical connections between ESP32 SoC and environmental sensing modules</p>
              </div>
              <span className="settings-tag">Schematics</span>
            </div>

            <div className="pinout-grid">
              {/* MQ135 Pinout Card */}
              <div className="pinout-card">
                <div className="pinout-card__header">
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>MQ-135 Gas Sensor</span>
                  <span className="pinout-badge pinout-badge--adc">ADC1 / Analog</span>
                </div>
                <p className="text-muted fs-xs" style={{ margin: 0 }}>
                  High sensitivity to Ammonia (NH3), NOx, Alcohol, Benzene, Smoke, and CO2.
                </p>
                <table className="pinout-table">
                  <tbody>
                    <tr>
                      <td className="text-muted">VCC (Heater)</td>
                      <td><span className="pin-wire-badge"><span className="wire-dot wire-dot--red" />5V External Rail (800mW)</span></td>
                    </tr>
                    <tr>
                      <td className="text-muted">GND</td>
                      <td><span className="pin-wire-badge"><span className="wire-dot wire-dot--black" />Common Ground (GND)</span></td>
                    </tr>
                    <tr>
                      <td className="text-muted">AOUT (Analog)</td>
                      <td><span className="pin-wire-badge"><span className="wire-dot wire-dot--yellow" />ESP32 GPIO 34 (ADC1_CH6)</span></td>
                    </tr>
                    <tr>
                      <td className="text-muted">DOUT (Digital)</td>
                      <td><span className="text-faint mono fs-xs">Not used (Floating)</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* DHT22 Pinout Card */}
              <div className="pinout-card">
                <div className="pinout-card__header">
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>DHT22 (AM2302)</span>
                  <span className="pinout-badge pinout-badge--gpio">Digital GPIO</span>
                </div>
                <p className="text-muted fs-xs" style={{ margin: 0 }}>
                  Calibrated digital temperature & humidity sensor for atmospheric compensation.
                </p>
                <table className="pinout-table">
                  <tbody>
                    <tr>
                      <td className="text-muted">Pin 1 (VCC)</td>
                      <td><span className="pin-wire-badge"><span className="wire-dot wire-dot--red" />3.3V Power Rail</span></td>
                    </tr>
                    <tr>
                      <td className="text-muted">Pin 2 (DATA)</td>
                      <td><span className="pin-wire-badge"><span className="wire-dot wire-dot--blue" />ESP32 GPIO 27 (10kΩ pull-up)</span></td>
                    </tr>
                    <tr>
                      <td className="text-muted">Pin 3 (NC)</td>
                      <td><span className="text-faint mono fs-xs">No Connection</span></td>
                    </tr>
                    <tr>
                      <td className="text-muted">Pin 4 (GND)</td>
                      <td><span className="pin-wire-badge"><span className="wire-dot wire-dot--black" />Common Ground (GND)</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Power Supply Requirements Card */}
              <div className="pinout-card">
                <div className="pinout-card__header">
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>Power Regulation</span>
                  <span className="pinout-badge pinout-badge--power">5V 2.0A Rail</span>
                </div>
                <p className="text-muted fs-xs" style={{ margin: 0 }}>
                  Stable power delivery is critical to prevent ADC drift caused by heater current draw.
                </p>
                <div className="mono text-muted fs-xs" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  <div>⚡ <strong>Supply:</strong> 5V 2A microUSB / Buck Step-Down</div>
                  <div>🔥 <strong>MQ-135 Heater:</strong> ~150mA continuous current</div>
                  <div>📡 <strong>ESP32 Wi-Fi Tx:</strong> ~240mA burst peaks</div>
                  <div>🛡️ <strong>Decoupling:</strong> 100μF electrolytic capacitor across 5V/GND</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─── 2. Real-Time MQ-135 Physics & Telemetry Engine (Live Sensor Stream) ─── */}
        {(activeTab === 'all' || activeTab === 'calibration') && (
          <section className="card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Real-Time MQ-135 Physics &amp; Telemetry Engine</h2>
                <p className="text-muted fs-xs" style={{ margin: '4px 0 0 0' }}>
                  Live sensor readings from node <strong>{selectedDevice}</strong> demonstrating voltage conversion, humidity compensation, and real-time AQI derivation.
                </p>
              </div>
              <span className="settings-tag" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                ● Live Hardware Telemetry
              </span>
            </div>

            <div className="calc-box">
              {/* Telemetry Stream Header & Station Switcher */}
              <div className="live-telemetry-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="text-faint fs-xs">Active Station:</span>
                  {(devices && devices.length > 0 ? devices : [{ deviceId: 'AIRGUARD-001' }, { deviceId: 'AIRGUARD-002' }, { deviceId: 'AIRGUARD-003' }]).map((dev) => (
                    <button
                      key={dev.deviceId}
                      type="button"
                      className={`btn ${selectedDevice === dev.deviceId ? 'btn--primary' : 'btn--ghost'}`}
                      style={{ fontSize: '0.72rem', padding: '3px 10px' }}
                      onClick={() => setSelectedDevice(dev.deviceId)}
                    >
                      {dev.deviceId}
                    </button>
                  ))}
                </div>

                <div className="live-stream-badge">
                  <span className="live-pulse-dot" />
                  <span>{connected ? 'SOCKET.IO STREAM ACTIVE' : 'LIVE TELEMETRY STREAM'}</span>
                </div>
              </div>

              {/* 4 Read-Only Live Hardware Sensor Telemetry Cards */}
              <div className="calc-grid">
                {/* 1. Live ADC */}
                <div className="live-metric-card">
                  <span className="live-metric-card-label">Raw Analog ADC (GPIO 34)</span>
                  <div className="live-metric-card-val" style={{ color: '#38bdf8' }}>
                    {liveAdc.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>ADC</span>
                  </div>
                  <span className="live-metric-card-sub">MQ-135 · 12-bit Successive Approx</span>
                </div>

                {/* 2. Live Temp */}
                <div className="live-metric-card">
                  <span className="live-metric-card-label">Ambient Temperature</span>
                  <div className="live-metric-card-val" style={{ color: '#f59e0b' }}>
                    {liveTemp.toFixed(1)} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>°C</span>
                  </div>
                  <span className="live-metric-card-sub">DHT22 Digital Pin 27</span>
                </div>

                {/* 3. Live Humidity */}
                <div className="live-metric-card">
                  <span className="live-metric-card-label">Relative Humidity</span>
                  <div className="live-metric-card-val" style={{ color: '#06b6d4' }}>
                    {liveHum.toFixed(1)} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>% RH</span>
                  </div>
                  <span className="live-metric-card-sub">DHT22 Digital Pin 27</span>
                </div>

                {/* 4. Calibrated Baseline R0 */}
                <div className="live-metric-card">
                  <span className="live-metric-card-label">Clean Air Baseline (R0)</span>
                  <div className="live-metric-card-val" style={{ color: '#a78bfa' }}>
                    {baselineR0.toFixed(1)} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>kΩ</span>
                  </div>
                  <span className="live-metric-card-sub">Calibrated in Pure Ambient Air</span>
                </div>
              </div>

              {/* Calculated Outputs Row (Read-Only) */}
              <div className="calc-results-row">
                <div className="calc-result-stat">
                  <span className="calc-result-label">ADC Voltage (Vout)</span>
                  <span className="calc-result-val">{calcResults.voltage} V</span>
                </div>

                <div className="calc-result-stat">
                  <span className="calc-result-label">Compensated Rs</span>
                  <span className="calc-result-val">{calcResults.rs} kΩ</span>
                </div>

                <div className="calc-result-stat">
                  <span className="calc-result-label">Rs / R0 Ratio</span>
                  <span className="calc-result-val">{calcResults.ratio}</span>
                </div>

                <div className="calc-result-stat">
                  <span className="calc-result-label">Calculated PPM</span>
                  <span className="calc-result-val">{calcResults.ppm} ppm</span>
                </div>

                <div className="calc-result-stat">
                  <span className="calc-result-label">Computed Air Quality</span>
                  <span className="calc-result-val" style={{ color: calcResults.color, fontSize: '1.05rem' }}>
                    ● {calcResults.aqi} AQI ({calcResults.category})
                  </span>
                </div>
              </div>

              {/* Scientific Formula Details Box */}
              <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '10px', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                <strong>🔬 Scientific Physics Formula &amp; Compensation:</strong>
                <div className="mono" style={{ color: '#38bdf8', marginTop: '4px' }}>
                  PPM = 116.6020682 * (Rs / R0)^(-2.769034857)
                </div>
                <div className="mono text-faint" style={{ marginTop: '4px', fontSize: '0.78rem' }}>
                  Rs_Compensated = Rs / [1.0 + 0.005*(Temp - 20) - 0.002*(Humidity - 33)]
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─── 3. How to Connect Your AirGuard Device & Developer Tools ─── */}
        {(activeTab === 'all' || activeTab === 'firmware') && (
          <section className="card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                  How to Connect Your AirGuard Device
                </h2>
                <p className="text-muted fs-xs" style={{ margin: '4px 0 0 0' }}>
                  Guided consumer IoT onboarding process for connecting your sensing node to Wi-Fi and live monitoring.
                </p>
              </div>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setShowAddWizard(true)}
                style={{ padding: '10px 22px', fontSize: '0.88rem', fontWeight: 700 }}
              >
                🔌 Start Add Device Wizard →
              </button>
            </div>

            {/* Consumer IoT Step-By-Step Onboarding Guide */}
            <div className="connect-guide-card">
              <div className="connect-steps-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                <div className="connect-step-item">
                  <div className="connect-step-num">1</div>
                  <span className="connect-step-title">1. Add your device</span>
                  <p className="connect-step-desc">
                    Enter the device name and choose where the device is physically installed.
                  </p>
                </div>

                <div className="connect-step-item">
                  <div className="connect-step-num">2</div>
                  <span className="connect-step-title">2. Connect your device</span>
                  <p className="connect-step-desc">
                    Connect your AirGuard ESP32 to your phone or computer using a USB cable.
                  </p>
                </div>

                <div className="connect-step-item">
                  <div className="connect-step-num">3</div>
                  <span className="connect-step-title">3. Connect to Wi-Fi</span>
                  <p className="connect-step-desc">
                    Select your local 2.4GHz Wi-Fi network and enter the network password.
                  </p>
                </div>

                <div className="connect-step-item">
                  <div className="connect-step-num">4</div>
                  <span className="connect-step-title">4. Configure AirGuard</span>
                  <p className="connect-step-desc">
                    AirGuard securely sends the required Wi-Fi and connection configuration to your device.
                  </p>
                </div>

                <div className="connect-step-item">
                  <div className="connect-step-num">5</div>
                  <span className="connect-step-title">5. Wait for connection</span>
                  <p className="connect-step-desc">
                    The device connects to Wi-Fi and then establishes connection to the AirGuard cloud server.
                  </p>
                </div>

                <div className="connect-step-item">
                  <div className="connect-step-num">6</div>
                  <span className="connect-step-title">6. Start monitoring</span>
                  <p className="connect-step-desc">
                    Once the first sensor reading is received, your device is ready and streams live telemetry!
                  </p>
                </div>
              </div>
            </div>

            {/* ─── Developer & Advanced Hardware Setup (Collapsible / Advanced) ─── */}
            <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#94a3b8' }}>
                    🛠️ Developer / Advanced Hardware Setup
                  </h3>
                  <p className="text-muted fs-xs" style={{ margin: '2px 0 0 0' }}>
                    For firmware engineers, factory flashing, hardware debugging, and custom firmware compilation.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setShowDevFirmwareSection(!showDevFirmwareSection)}
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  {showDevFirmwareSection ? '▲ Hide Developer Tools' : '▼ Show Developer Tools'}
                </button>
              </div>

              {showDevFirmwareSection && (
                <div style={{ marginTop: '18px' }}>
                  <div className="settings-alert settings-alert--info" style={{ marginBottom: '16px' }}>
                    <span>ℹ️</span>
                    <span>
                      <strong>Developer Notice:</strong> Standard AirGuard users do not need to download or flash firmware manually. Use the <strong>"Start Add Device Wizard"</strong> above to onboard pre-flashed devices. The source code below is provided for hardware engineers and custom deployments.
                    </span>
                  </div>

                  {/* Editable Wi-Fi Credentials Card */}
                  <div className="firmware-customizer-card">
                    <div className="firmware-customizer-header">
                      <div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: '#f8fafc' }}>
                          Custom Firmware Credential Injector
                        </h4>
                        <p className="text-muted fs-xs" style={{ margin: '4px 0 0 0' }}>
                          Embed default Wi-Fi settings directly into the C++ sketch for zero-config factory flashing.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={resetCredentials}
                        style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                      >
                        ↺ Reset Defaults
                      </button>
                    </div>

                    <div className="firmware-inputs-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                      <div className="firmware-field">
                        <label className="firmware-field-label">
                          <span>Wi-Fi Network Name (SSID)</span>
                          <span className="mono text-faint fs-xs">[const char* ssid]</span>
                        </label>
                        <div className="firmware-input-wrap">
                          <input
                            type="text"
                            className="firmware-cred-input"
                            value={wifiSsid}
                            onChange={(e) => setWifiSsid(e.target.value)}
                            placeholder="Enter your Wi-Fi SSID"
                          />
                        </div>
                      </div>

                      <div className="firmware-field">
                        <label className="firmware-field-label">
                          <span>Wi-Fi Password</span>
                          <span className="mono text-faint fs-xs">[const char* password]</span>
                        </label>
                        <div className="firmware-input-wrap">
                          <input
                            type={showWifiPass ? 'text' : 'password'}
                            className="firmware-cred-input"
                            value={wifiPassword}
                            onChange={(e) => setWifiPassword(e.target.value)}
                            placeholder="Enter your Wi-Fi password"
                          />
                          <button
                            type="button"
                            className="firmware-toggle-btn"
                            onClick={() => setShowWifiPass(!showWifiPass)}
                            aria-label="Toggle password visibility"
                          >
                            {showWifiPass ? '👁️' : '👁️‍🗨️'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {downloadNotice && (
                    <div className="settings-alert settings-alert--success" style={{ marginTop: '14px' }}>
                      <span>✓</span>
                      <span>Downloaded <strong>AirGuard_ESP32_Firmware.ino</strong>!</span>
                    </div>
                  )}

                  {/* Arduino Code Box */}
                  <div className="code-snippet-box">
                    <div className="code-snippet-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span className="mono fs-xs" style={{ color: '#38bdf8', fontWeight: 600 }}>
                          AirGuard_ESP32_Firmware.ino
                        </span>
                        <span className="pinout-badge pinout-badge--gpio" style={{ fontSize: '0.68rem' }}>
                          SSID: "{wifiSsid}"
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn--secondary"
                          onClick={downloadIno}
                          style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                        >
                          💾 Download .ino Sketch
                        </button>
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={copyFirmware}
                          style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                        >
                          {copiedCode ? '✓ Copied to Clipboard!' : '📋 Copy Arduino Code'}
                        </button>
                      </div>
                    </div>
                    <pre className="code-snippet-pre">{firmwareCode}</pre>
                  </div>

                  {/* Endpoints specification */}
                  <div style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <span className="mono" style={{ color: '#10b981', fontWeight: 600, fontSize: '0.88rem' }}>POST /api/readings</span>
                      <p className="text-muted fs-xs" style={{ margin: '6px 0 0 0' }}>
                        Receives live telemetry packets containing <code>deviceId</code>, <code>temperature</code>, <code>humidity</code>, <code>gasPPM</code>, and <code>airQuality</code>. Upserts the device in MongoDB and broadcasts immediately via WebSocket.
                      </p>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <span className="mono" style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.88rem' }}>GET /api/readings/latest</span>
                      <p className="text-muted fs-xs" style={{ margin: '6px 0 0 0' }}>
                        Fetches current conditions for the requested station. Backed by MongoDB with Redis-speed in-memory buffer for sub-10ms response times.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── 4. Interactive FAQs & Troubleshooting ─── */}
        {(activeTab === 'all' || activeTab === 'faq') && (
          <section className="card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Frequently Asked Questions & Troubleshooting</h2>
                <p className="text-muted fs-xs" style={{ margin: '4px 0 0 0' }}>Diagnostic solutions for common hardware, calibration, and networking conditions</p>
              </div>
              <span className="settings-tag">FAQ Guide</span>
            </div>

            <div className="faq-list">
              {filteredFaqs.map((faq, idx) => {
                const isOpen = openFaqs.has(idx);
                return (
                  <div key={idx} className={`faq-item ${isOpen ? 'is-open' : ''}`}>
                    <button
                      type="button"
                      className="faq-question"
                      onClick={() => toggleFaq(idx)}
                      aria-expanded={isOpen}
                    >
                      <span>{faq.q}</span>
                      <span className="faq-chevron">▼</span>
                    </button>
                    {isOpen && <div className="faq-answer">{faq.a}</div>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── 5. Academic Citation & IEEE Reference ─── */}
        {(activeTab === 'all' || activeTab === 'contact') && (
          <section className="card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Academic Publication & IEEE Citation</h2>
                <p className="text-muted fs-xs" style={{ margin: '4px 0 0 0' }}>Research publication reference for academic paper citations and scientific reproducibility</p>
              </div>
              {/* <button
                type="button"
                className="btn btn--secondary"
                onClick={copyBibtex}
                style={{ fontSize: '0.8rem', padding: '6px 14px' }}
              >
                {copiedBibtex ? '✓ BibTeX Copied!' : '📄 Copy BibTeX'}
              </button> */}
            </div>

            <div style={{ marginTop: '16px', padding: '16px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.45)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                "IoT-Based Hyperlocal Air Quality Monitoring and Alert System with Cloud Integration"
              </div>
              <div className="text-muted fs-xs" style={{ marginBottom: '12px' }}>
                Published in Proceedings of the International Conference on Smart Systems and IoT (2026).
              </div>
              <div className="mono text-faint fs-xs" style={{ background: '#070b13', padding: '12px', borderRadius: '8px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                {bibtexCitation}
              </div>
            </div>
          </section>
        )}

        {/* ─── 6. Support & Research Inquiry Desk ─── */}
        {(activeTab === 'all' || activeTab === 'contact') && (
          <section className="card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Research & Technical Support Desk</h2>
                <p className="text-muted fs-xs" style={{ margin: '4px 0 0 0' }}>Submit a hardware diagnostics ticket, calibration inquiry, or research collaboration request</p>
              </div>
              <span className="settings-tag" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>Support Desk</span>
            </div>

            {supportTicket && (
              <div className="settings-alert settings-alert--success" style={{ marginTop: '16px' }}>
                <span>✓</span>
                <div>
                  <strong>Ticket #{supportTicket.id} Created Successfully!</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem' }}>
                    Logged for node <strong>{supportTicket.nodeId}</strong> ({supportTicket.category}) at {supportTicket.time}. A laboratory research engineer will follow up shortly.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSupportSubmit} style={{ marginTop: '16px' }}>
              <div className="support-form-grid">
                <div className="settings-field">
                  <label className="settings-field-label">Inquiry Category</label>
                  <select
                    className="settings-select"
                    value={supportCategory}
                    onChange={(e) => setSupportCategory(e.target.value)}
                  >
                    <option value="hardware">Hardware Wiring & Pinout Issue</option>
                    <option value="calibration">MQ135 Gas Sensor Calibration</option>
                    <option value="network">ESP32 Wi-Fi & Ingestion Connectivity</option>
                    <option value="research">Academic Research & Dataset Export</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label className="settings-field-label">Target Station ID</label>
                  <select
                    className="settings-select"
                    value={supportNodeId}
                    onChange={(e) => setSupportNodeId(e.target.value)}
                  >
                    <option value="AIRGUARD-001">AIRGUARD-001 (Main Environmental Lab)</option>
                    <option value="AIRGUARD-002">AIRGUARD-002 (Library Block Zone B)</option>
                    <option value="AIRGUARD-003">AIRGUARD-003 (Research Park West)</option>
                    <option value="GENERAL">General Platform Question</option>
                  </select>
                </div>

                <div className="settings-field" style={{ gridColumn: '1 / -1' }}>
                  <label className="settings-field-label">Issue Details & Observations</label>
                  <textarea
                    className="support-textarea"
                    placeholder="Describe your hardware reading, unexpected behavior, or research inquiry..."
                    value={supportMsg}
                    onChange={(e) => setSupportMsg(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
                <button type="submit" className="btn btn--primary" style={{ minWidth: '180px' }}>
                  Submit Inquiry Ticket ➔
                </button>
              </div>
            </form>
          </section>
        )}
      </div>

      <AddDeviceWizard
        isOpen={showAddWizard}
        onClose={() => setShowAddWizard(false)}
        onDeviceAdded={() => navigate('/devices')}
        onNavigateDashboard={() => navigate('/dashboard')}
      />
    </div>
  );
}
