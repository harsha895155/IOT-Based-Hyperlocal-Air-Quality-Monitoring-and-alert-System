# AirGuard — IoT-Based Hyperlocal Air Quality Monitoring and Alert System

Official full-stack IoT and cloud engineering codebase accompanying the base paper:
**"IoT-Based Hyperlocal Air Quality Monitoring and Alert System with Cloud Integration"**

---

## 🏗️ System Architecture

```text
                                AIRGUARD PLATFORM
                                        │
                       ┌────────────────┴────────────────┐
                       │                                 │
              REACT WEB DASHBOARD              FLUTTER MOBILE APP
             (React 18 / Vite / Recharts)      (Android / iOS Native)
                       │                                 │
                       └────────────────┬────────────────┘
                                        │
                            Node.js / Express REST API
                                        │
                           MongoDB Atlas Cloud Database
                                        │
                           Socket.IO Real-Time Engine
                                        │
                         ESP32 Micro-Station & Transducers
                             (MQ-135 Gas + DHT22 Climate)
```

---

## 📂 Repository Structure

```text
AirQuality-Project/
├── Arduino/AirQualityNode/   ESP32 firmware — MQ-135 (GPIO 34) + DHT22 (GPIO 27) sensing node
├── Backend/                  Node.js / Express REST API, MongoDB Atlas schemas, Socket.IO
├── Frontend/                 React / Vite Web Dashboard, Recharts trends, Compliance reports
├── Flutter/                  Flutter cross-platform mobile client for Android & iOS
└── tools/                    Automated diagnostic utilities
```

---

## 🚀 Quick Start Guide

### 1. Backend & Live Simulator
```bash
cd Backend
npm install
npm run dev
# In another terminal:
npm run simulate
```

### 2. React Web Dashboard
```bash
cd Frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Flutter Mobile Client
```bash
cd Flutter
flutter pub get
flutter run
```
To build the Android release APK:
```bash
flutter build apk --release
```

### 4. Hardware Deployment (ESP32)
1. Open `Arduino/AirQualityNode/AirQualityNode.ino` in Arduino IDE.
2. Enter your Wi-Fi SSID and Password in `config.h`.
3. Set your backend IP or cloud URL in `config.h`.
4. Flash to the ESP32 board.
