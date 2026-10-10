# AirGuard Mobile — Flutter Cross-Platform Client

Official mobile application for the **IoT-Based Hyperlocal Air Quality Monitoring and Alert System with Cloud Integration**.

Designed and built in Flutter as the mobile companion to the React Web Dashboard, sharing the exact same Node.js/Express backend, MongoDB Atlas database, and ESP32 hardware telemetry stream.

---

## 🏗️ System Architecture

```text
                  AIRGUARD SYSTEM
                         │
                ┌────────┴────────┐
                │                 │
             WEB APP          MOBILE APP
          (React / Vite)       (Flutter)
                │                 │
                └────────┬────────┘
                         │
             Node.js / Express REST API
                         │
                  MongoDB Atlas
                         │
               Socket.IO Real-Time
                         │
           ESP32 + MQ-135 + DHT22 Hardware
```

---

## 📱 Features

- **Real-Time Telemetry**: Real-time push stream over Socket.IO (`reading`, `alert`, `device_status`).
- **EPA Breakpoint Engine**: Piecewise-linear classification (Good, Moderate, Unhealthy SG, Unhealthy, Very Unhealthy, Hazardous) with health recommendations matching Table I of the base paper.
- **Fleet Monitoring**: Real-time multi-node inspection (AIRGUARD-001, AIRGUARD-002, AIRGUARD-003) with live online/offline heartbeat status.
- **Hardware Diagnostics**: Node pinout specifications (GPIO 34 ADC1 for MQ-135, GPIO 27 for DHT22) with in-app **Echo Ping** latency tests.
- **Diurnal Analytics & Reports**: 24-hour patterns, statistical aggregations, compliance thresholds (NAAQS, US-EPA, WHO).
- **Alert Subsystem**: Instant notifications on hazardous air shifts with individual and bulk acknowledgment.
- **Role-Based Auth & Guest Mode**: Seamless guest monitoring with protected account routes for researchers.

---

## 🚀 Getting Started

### 1. Prerequisites
- [Flutter SDK](https://flutter.dev/docs/get-started/install) (version `>=3.0.0`)
- Android Studio / VS Code with Flutter extension
- Android device or Android Emulator

### 2. Install Dependencies
```bash
cd Flutter
flutter pub get
```

### 3. Configure API Endpoint
In `lib/core/constants.dart` or directly in the app's **Settings Screen**, select your active target:
- **Android Emulator**: `http://10.0.2.2:5001`
- **Physical Phone (Same Wi-Fi)**: `http://192.168.1.6:5001` (Replace with your computer's LAN IP)
- **Production Cloud**: `https://iot-based-hyperlocal-air-quality.onrender.com`

### 4. Run the Mobile App
```bash
flutter run
```

### 5. Build Android Release APK
```bash
flutter build apk --release
```
The compiled APK will be generated at:
```text
build/app/outputs/flutter-apk/app-release.apk
```
