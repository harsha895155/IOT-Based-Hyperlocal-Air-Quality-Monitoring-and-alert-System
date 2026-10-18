<div align="center">

# 🌍 AirGuard — IoT-Based Hyperlocal Air Quality Monitoring & Alert System

**Real-Time Street-Level Environmental Telemetry, Smart Anti-Spam Alerts & Cloud Intelligence**

[![Live Deployment](https://img.shields.io/badge/Live%20Web%20App-airguard--hyperlocal.vercel.app-0284c7?style=for-the-badge&logo=vercel)](https://airguard-hyperlocal.vercel.app)
[![Contact Email](https://img.shields.io/badge/Contact-airguard396%40gmail.com-10b981?style=for-the-badge&logo=gmail)](mailto:airguard396@gmail.com)
[![Status](https://img.shields.io/badge/System%20Status-All%20Systems%20Operational-10b981?style=for-the-badge)](https://airguard-hyperlocal.vercel.app)
[![License](https://img.shields.io/badge/License-MIT%20%2F%20Academic-blue?style=for-the-badge)](#-license--attribution)

<p align="center">
  <a href="https://airguard-hyperlocal.vercel.app"><strong>Explore Live Web App ➔</strong></a> •
  <a href="https://airguard-hyperlocal.vercel.app/dashboard"><strong>Instant Guest Mode</strong></a> •
  <a href="#-core-modules--capabilities"><strong>Platform Modules</strong></a> •
  <a href="#-hardware-schematics--pinouts"><strong>Hardware Wiring</strong></a> •
  <a href="#-research-paper--citation"><strong>Paper Citation</strong></a> •
  <a href="#-contact--engineering-support"><strong>Contact Support</strong></a>
</p>

</div>

---

## 📺 Live Platform Walkthrough & Interactive Demo

> **Watch AirGuard in Action:** Real-time 0–500 EPA AQI circular dial gauge, Google Weather atmospheric forecasts, multi-node IoT hardware registry, interactive micro-zones, automated compliance audits, and full daylight/obsidian theme switching with on-screen guided explanations.

https://github.com/user-attachments/assets/42682190-1afa-4212-b2b9-7430ea732d7b

<br />

<div align="center">
  <p align="center">
    <a href="https://airguard-hyperlocal.vercel.app">
      <img src="https://img.shields.io/badge/🚀%20Live%20Web%20App-10b981?style=for-the-badge&logo=vercel" alt="Live Platform" />
    </a>
    &nbsp;
    <a href="mailto:airguard396@gmail.com">
      <img src="https://img.shields.io/badge/✉️%20Email%20airguard396%40gmail.com-ea580c?style=for-the-badge&logo=gmail" alt="Email Us" />
    </a>
    &nbsp;
    <a href="https://github.com/harsha895155/IOT-Based-Hyperlocal-Air-Quality-Monitoring-and-alert-System/raw/main/docs/airguard-demo.mp4">
      <img src="https://img.shields.io/badge/💾%20Download%20MP4%20(1.6%20MB)-0284c7?style=for-the-badge" alt="Download MP4" />
    </a>
  </p>

  <p align="center">
    <sub>🎬 <em>Native video player with full interactive controls (<strong>Play/Pause</strong>, <strong>Timeline Seek Scrubber</strong>, <strong>Timestamp</strong>, and <strong>Fullscreen</strong>) embedded above.</em></sub>
  </p>
</div>


<details open>
<summary><strong>🔍 Video Chapter Breakdown & Detailed Scene Explanations (Click to collapse)</strong></summary>

<br />

| Scene | Chapter Badge | On-Screen Feature | In-Depth Engineering & Website Detail |
| :---: | :--- | :--- | :--- |
| **01** | `OVERVIEW` | **Hero Banner & Live Metrics** | Showcases sub-500ms round-trip latency, full-duplex Socket.IO streaming, 0–500 EPA standard AQI scale, and 30-minute anti-spam deduplication. |
| **02** | `HYPERLOCAL SENSING` | **Street-Level vs City Stations** | Explains the hyperlocal problem: city-wide weather stations miss local spikes. Demonstrates ESP32 nodes with automated Wi-Fi reconnect backoff buffers. |
| **03** | `MODULES DIRECTORY` | **9 Integrated Core Modules** | Navigates the full website directory: Real-Time Dashboard, IoT Hardware Registry, Micro-Zones, Analytics, Historical Telemetry, Smart Alerts, Compliance Audits, Onboarding Wizard, and Diagnostics. |
| **04** | `IEEE ARCHITECTURE` | **5-Layer End-to-End Pipeline** | Traces real-time data from MQ-135/DHT22 hardware transducers through ESP32 Edge, Express.js Gateway, MongoDB Atlas cloud, and WebSocket broadcasts. |
| **05** | `OFFICIAL CONTACT` | **Direct Mailbox: `airguard396@gmail.com`** | Highlights dedicated engineering support for university researchers, sensor deployment queries, and IEEE citation requests. |
| **06** | `INTERACTION` | **1-Click Copy Email & Mailto** | Demonstrates the interactive clipboard copy button with verified `✓ Copied!` toast notification and direct email launch. |
| **07** | `MODULE 01: DASHBOARD` | **Real-Time 0–500 EPA AQI Dial** | Displays the ambient EPA air quality gauge with live pollutant breakdown: PM2.5, PM10, CO, NO2, SO2, O3, Gas PPM, temperature, and relative humidity. |
| **08** | `ATMOSPHERIC WEATHER` | **24h Timeline & 7-Day Forecast** | Showcases Google Weather-inspired ambient atmospheric telemetry: hourly timeline curves, 7-day environmental predictions, wind compass, UV index, and solar celestial arcs. |
| **09** | `DUAL THEMES` | **Daylight Light & Obsidian Dark** | Demonstrates universal CSS custom tokens switching instantaneously between high-contrast Frosted Daylight mode and deep Obsidian Dark preset without page reloads. |
| **10** | `MODULE 02: HARDWARE` | **IoT Node Registry & Heartbeats** | Live hardware node list displaying active heartbeat tracking, dynamic online/standby/offline derivation based on `lastSeen` timestamps, and packet hex inspection. |
| **11** | `MODULE 03: GEO-SPATIAL` | **Campus Micro-Zones & Hotspots** | Geo-spatial sensor distribution across campus laboratories and facilities with localized AQI hotspot averages and Google-style search autocomplete. |
| **12** | `MODULE 04: ANALYTICS` | **MongoDB $group & Correlations** | Server-side aggregation pipelines computing 24-hour distribution spectrums, classification percentage breakups, and Pearson correlation between humidity/temp and pollutant spikes. |
| **13** | `MODULE 05: SMART ALERTS` | **30-Min Anti-Spam Threshold Alerts** | Intelligent alert engine preventing notification spam by incrementing occurrence counters (`seenCount`) and dispatching health advisories for sensitive groups. |
| **14** | `MODULE 06: COMPLIANCE` | **Regulatory NAAQS/EPA Audits** | Formal environmental compliance audits measuring NAAQS and EPA air quality standard compliance percentages across 24h, 7d, and 30d with RFC 4180 streaming CSV export. |
| **15** | `AIRGUARD PLATFORM` | **System Finale & Live Access** | Final summary and live link: [airguard-hyperlocal.vercel.app](https://airguard-hyperlocal.vercel.app) with support email [airguard396@gmail.com](mailto:airguard396@gmail.com). |

</details>

---

## 📑 Table of Contents
- [Project Overview](#-project-overview)
- [System Architecture & 5-Layer Pipeline](#-system-architecture--5-layer-pipeline)
- [Core Modules & Capabilities](#-core-modules--capabilities)
- [Hardware Schematics & Pinouts](#-hardware-schematics--pinouts)
- [Repository Structure](#-repository-structure)
- [Quick Start Guide](#-quick-start-guide)
  - [1. Backend & Live Simulator](#1-backend--live-simulator)
  - [2. React Web Dashboard](#2-react-web-dashboard)
  - [3. Flutter Mobile Application](#3-flutter-mobile-application)
  - [4. ESP32 NodeMCU Firmware](#4-esp32-nodemcu-firmware)
- [REST API Reference](#-rest-api-reference)
- [Comprehensive Verification Suite](#-comprehensive-verification-suite)
- [Environment Configuration](#-environment-configuration)
- [Research Paper & Citation](#-research-paper--citation)
- [Contact & Engineering Support](#-contact--engineering-support)
- [License & Attribution](#-license--attribution)

---

## 🔬 Project Overview

City-wide meteorological monitoring stations are typically spaced tens of kilometers apart and cannot detect dangerous, localized pollutant spikes caused by vehicular congestion, manufacturing exhaust, or indoor buildup. 

**AirGuard** solves the hyperlocal monitoring challenge by marrying edge sensor intelligence with high-throughput cloud streaming:
- **< 500ms End-to-End Latency:** Analog sensor voltages are sampled, calibrated, converted into EPA AQI, and rendered on client dashboards in under half a second.
- **Smart 30-Minute Deduplication:** Prevents alarm fatigue by aggregating persistent threshold exceedances into incrementing occurrence counters (`seenCount`) with targeted health recommendations.
- **Dual Visual Engines:** Features a Google Weather-inspired atmospheric interface with 24-hour micro-timelines, 7-day environmental forecasts, wind compasses, UV indexes, celestial arcs, and tailored Light/Dark themes.

---

## 🏗️ System Architecture & 5-Layer Pipeline

Data flows continuously from edge silicon to client screens across five hardened tiers:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        01. SENSING & TRANSDUCERS                       │
│      MQ-135 Gas Chamber (GPIO 34 ADC1) • DHT22 Climate (GPIO 27)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Analog Voltage & Pulse Streams
┌───────────────────────────────────▼────────────────────────────────────┐
│                       02. ESP32 EDGE PROCESSING                        │
│   Humidity Compensation Curve • WiFi Reconnect Buffer • API Key Auth   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Authenticated HTTPS / REST Ingestion
┌───────────────────────────────────▼────────────────────────────────────┐
│                    03. EXPRESS.JS GATEWAY & COMPUTATION                │
│   EPA AQI Breakpoint Math • Range Validation • Node Status Derivation   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Persist & Aggregate Pipeline
┌───────────────────────────────────▼────────────────────────────────────┐
│                      04. MONGODB ATLAS CLOUD DATA                      │
│   $group Spectrums • Time-Series Indexing • Exceedance Incident Logs   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Sub-50ms WebSocket Broadcast
┌───────────────────────────────────▼────────────────────────────────────┐
│                     05. REAL-TIME CLIENT APPLICATIONS                  │
│    React 18 / Vite Web Dashboard      •      Flutter Native Mobile     │
│   (Recharts Trends, Weather Console)  •      (Android APK & iOS App)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Core Modules & Capabilities

| Module | Icon | Primary Capability | Technical Highlights |
| :--- | :---: | :--- | :--- |
| **Real-Time Dashboard** | 📊 | Ambient Air & Weather Telemetry | Circular 0–500 EPA AQI dial gauge, PM2.5, PM10, CO, NO2, SO2, O3, Gas PPM, 24h timeline, 7-day forecast. |
| **IoT Node Registry** | 📡 | Multi-Station Hardware Management | Auto-discovery, dynamic online/standby/offline derivation based on `lastSeen`, raw packet hex inspector. |
| **Locations & Micro-Zones** | 📍 | Geo-Spatial Clustering | Campus zone grouping, localized AQI averages, Google-style autocomplete search, saved favorites. |
| **Server-Side Analytics** | 📈 | Advanced Statistical Modeling | MongoDB `$group` aggregation, Pearson correlation between humidity/temp and gas, distribution spectrums. |
| **Historical Telemetry** | 📜 | Audit Log & Data Export | Paginated sensor records, multi-parameter date range filters, one-click streaming RFC 4180 CSV export. |
| **Smart Alerts Engine** | 🚨 | Threshold Protection | 30-minute anti-spam cooldown, incident deduplication counters, tailored health advisories for sensitive groups. |
| **Regulatory Reports** | 📋 | Environmental Compliance | Formal NAAQS & EPA standard compliance percentage calculations over 24-hour, 7-day, and 30-day windows. |
| **Consumer Onboarding** | 🔌 | 8-Step Hardware Wizard | Serial COM port detection, Wi-Fi credential provisioning, hardware wiring guide, and live telemetry verification. |
| **System Diagnostics** | 🩺 | Infrastructure & Security | Administrator console monitoring Node.js heap memory, database latency, connected WebSocket clients, and JWT auth. |

---

## 🔌 Hardware Schematics & Pinouts

### Component Wiring Diagram
| Transducer / Component | ESP32 NodeMCU Pin | Interface | Electrical Specification | Functional Purpose |
| :--- | :---: | :---: | :---: | :--- |
| **MQ-135 Gas Sensor** | `GPIO 34` | Analog (ADC1) | 5V VCC, Analog Out via Divider | Detects NH3, NOx, Alcohol, Benzene, Smoke & CO2 |
| **DHT22 / DHT11** | `GPIO 27` | Digital 1-Wire | 3.3V VCC, 10kΩ Pull-Up | Samples ambient temperature (-40°C to 80°C) and relative humidity |
| **Status Telemetry LED** | `GPIO 2` | Digital Output | 3.3V Logic, 220Ω Resistor | Blinks on sensor read; solid glow during Wi-Fi transmission |
| **Power Supply** | `VIN / GND` | Micro-USB / DC | 5V DC @ 1A regulated | Powers ESP32 microcontroller, heating coil, and transducers |

> **⚠️ Engineering Note:** The MQ-135 sensor internal heater draws ~150mA at 5V. Ensure your power supply provides at least 1A to prevent ESP32 Wi-Fi brownout resets during transmission bursts.

---

## 📂 Repository Structure

```text
AirQuality-Project/
├── Arduino/
│   └── AirQualityNode/            # ESP32 firmware (C++ / Arduino IDE)
│       ├── AirQualityNode.ino     # Sensor acquisition loop & Wi-Fi retry logic
│       └── config.h               # Wi-Fi credentials, API endpoint & calibration parameters
├── Backend/                       # Node.js / Express REST API & Socket.IO server
│   ├── config/                    # MongoDB Atlas & security configuration
│   ├── models/                    # Mongoose schemas (Reading, Device, Alert, User)
│   ├── routes/                    # REST endpoints (auth, readings, devices, alerts, reports)
│   ├── scripts/                   # Automated E2E test suites and database seeders
│   ├── simulator/                 # Hardware telemetry generator for stress testing
│   └── server.js                  # Gateway entry point & WebSocket dispatcher
├── Frontend/                      # React 18 / Vite Single Page Application
│   ├── src/
│   │   ├── components/            # TopNav, Sidebar, StatCards, AddDeviceWizard, AQIHero
│   │   ├── context/               # AuthContext, ThemeContext, SocketContext
│   │   ├── pages/                 # Dashboard, Devices, Locations, Analytics, Reports, Welcome
│   │   └── styles/                # Universal CSS design tokens (Daylight & Obsidian)
│   ├── index.html                 # SEO meta tags, OpenGraph, JSON-LD schema
│   └── vite.config.js             # Vite production bundling configuration
├── Flutter/                       # Native mobile application for Android & iOS
│   ├── lib/                       # Dart mobile controllers, views & Bluetooth utilities
│   └── pubspec.yaml               # Flutter package dependencies
├── docs/                          # Architecture assets & animated walkthroughs
│   └── airguard-demo.gif          # 14-scene live demo video loop
└── tools/                         # Hardware COM port diagnostic utilities
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MongoDB Atlas** database URI (or local MongoDB daemon)
- **Git**

### 1. Backend & Live Simulator

```bash
# Clone the repository
git clone https://github.com/harsha895155/IOT-Based-Hyperlocal-Air-Quality-Monitoring-and-alert-System.git
cd IOT-Based-Hyperlocal-Air-Quality-Monitoring-and-alert-System/Backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your MONGO_URI, JWT_SECRET, and PORT

# Start development API server (Port 5001)
npm run dev

# (Optional) Launch live multi-node telemetry simulator in a separate terminal:
npm run simulate
```

### 2. React Web Dashboard

```bash
cd ../Frontend

# Install dependencies
npm install

# Start local development server
npm run dev
```
Open **`http://localhost:5173`** in your browser to explore the dashboard.

### 3. Flutter Mobile Application

```bash
cd ../Flutter

# Get dependencies
flutter pub get

# Run on connected device or emulator
flutter run

# To build release Android APK:
flutter build apk --release
```

### 4. ESP32 NodeMCU Firmware

1. Open `Arduino/AirQualityNode/AirQualityNode.ino` in the Arduino IDE.
2. Under **Tools -> Board**, select **ESP32 Dev Module**.
3. Configure your local Wi-Fi SSID and Password in `config.h`.
4. Set `serverUrl` to your backend endpoint (e.g., `http://<your-lan-ip>:5001/api/readings` or your cloud URL).
5. Connect your ESP32 board via USB data cable and flash at **115200 baud**.

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth Required |
| :---: | :--- | :--- | :---: |
| `POST` | `/api/readings` | Ingest real-time sensor packet from ESP32 | `x-api-key` |
| `GET` | `/api/readings/latest` | Retrieve latest recorded readings across all nodes | Public |
| `GET` | `/api/readings/history` | Paginated historical telemetry with date/device filters | Optional |
| `GET` | `/api/readings/export/csv` | Stream RFC 4180 compliant CSV export file | Optional |
| `GET` | `/api/devices` | List registered IoT stations and live heartbeat status | Optional |
| `POST` | `/api/devices` | Register a new hardware node | JWT Bearer |
| `GET` | `/api/alerts` | Retrieve active and historical threshold alerts | Optional |
| `POST` | `/api/alerts/:id/ack` | Acknowledge a specific alert incident | JWT Bearer |
| `GET` | `/api/reports/compliance` | Compute NAAQS/EPA compliance audits over 24h, 7d, 30d | Public |
| `GET` | `/api/analytics/distribution` | Compute 24-hour pollutant distribution buckets | Public |
| `GET` | `/api/analytics/correlation` | Compute Pearson correlation coefficients | Public |
| `GET` | `/api/health` | Diagnostic ping (database latency, uptime, clients) | Public |

---

## 🧪 Comprehensive Verification Suite

AirGuard includes an end-to-end audit runner verifying authentication lifecycles, database transactions, calculation accuracy, and WebSocket broadcasts:

```bash
cd Backend
node scripts/audit_e2e_verification.js
```

---

## ⚙️ Environment Configuration

### Backend (`Backend/.env`)
```ini
PORT=5001
NODE_ENV=production
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/airguard
JWT_SECRET=your_ultra_secure_jwt_secret_key_here
API_KEY=your_esp32_shared_ingestion_api_key
GOOGLE_WEATHER_API_KEY=your_google_maps_geocoding_key
```

### Frontend (`Frontend/.env`)
```ini
VITE_API_URL=https://airguard-backend.onrender.com
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

---

## 📄 Research Paper & Citation

This open-source platform is the reference software and hardware implementation of the academic paper:

> **Title:** *IoT-Based Hyperlocal Air Quality Monitoring and Alert System with Cloud Integration*  
> **Published:** IEEE Research Proceedings  
> **Authors:** Harsha et al.  
> **Domain:** Embedded Systems, Cloud Computing, Environmental Intelligence

### BibTeX Citation
```bibtex
@article{airguard2026hyperlocal,
  title={IoT-Based Hyperlocal Air Quality Monitoring and Alert System with Cloud Integration},
  author={Harsha and Contributors},
  journal={IEEE Environmental Informatics & IoT Systems},
  year={2026},
  url={https://airguard-hyperlocal.vercel.app}
}
```

---

## 📬 Contact & Engineering Support

Have questions regarding sensor calibration transfer functions, institutional deployments, or developer API integrations? Reach out directly:

- **Official Project Email**: [`airguard396@gmail.com`](mailto:airguard396@gmail.com)
- **Live Deployment**: [airguard-hyperlocal.vercel.app](https://airguard-hyperlocal.vercel.app)
- **Lead Developer**: Harsha ([harsha895155@gmail.com](mailto:harsha895155@gmail.com))
- **Response Window**: Typical response within 24 hours on business days for research, sensor queries, and deployment assistance.

---

## 📜 License & Attribution

Distributed under the **MIT License**. Free for academic, university research, and civic environmental monitoring purposes. When referencing this system in academic literature or software derivatives, please include attribution to the original IEEE paper.

<div align="center">
  <sub>Built with ❤️ for cleaner air and healthier communities.</sub>
</div>
