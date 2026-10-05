# AirGuard — IoT-Based Hyperlocal Air Quality Monitoring and Alert System

Companion codebase to the IEEE paper of the same name. Three
independently runnable parts:

```
AirQuality-Project/
├── Arduino/AirQualityNode/   ESP32 firmware — MQ135 + DHT22 sensing node
├── Backend/                  Node.js / Express / MongoDB Atlas API + Socket.IO
└── Frontend/                 React / Vite web dashboard
```

Each folder has its own `README.md` with full setup steps. Quick
start order:

1. **Backend** — `cd Backend && npm install`, copy `.env.example` → `.env`, fill in your MongoDB Atlas URI, `npm run dev`.
2. **Frontend** — `cd Frontend && npm install`, copy `.env.example` → `.env`, `npm run dev`. Register an account and you'll land on the live dashboard.
3. Either **run the simulator** (`npm run simulate` in `Backend/`, no hardware needed) or **flash the Arduino firmware** to a real ESP32 (see `Arduino/AirQualityNode/README.md` for wiring + calibration) — both post to the same `/api/readings` endpoint on the same schema, so the dashboard doesn't care which one is feeding it.

## How the pieces fit together

```
MQ135 + DHT22 → ESP32 → Wi-Fi (JSON/HTTPS) → Express API → MongoDB Atlas
                                                    │
                                          Socket.IO push ──→ React Dashboard
```

The backend's device-ingestion endpoint (`POST /api/readings`,
authenticated via a shared `x-api-key`) is schema-identical whether
the caller is the real ESP32 firmware or `Backend/simulator/simulate.js`
— this is what let the dashboard, alert engine, and auth flow all get
built and tested well before physical hardware was wired up (see the
paper, Section VII-A).

## What's implemented

- **Arduino**: modular firmware (separate sensor/network managers), Wi-Fi reconnect + backoff logic, MQ135 calibration workflow, status-LED diagnostics
- **Backend**: JWT auth (register/login) + role field (admin/user/technician), separate API-key auth for device ingestion, REST endpoints for readings (latest/history with pagination + date filtering) and alerts (list/acknowledge), Socket.IO real-time push, rate limiting, Helmet security headers, CORS allowlist, shared AQI breakpoint/category logic
- **Frontend**: JWT-gated login/register, live AQI hero with a horizon-gradient gauge, stat cards, historical trend chart (Recharts), real-time alerts panel with acknowledge action, a from-scratch design system (see `Frontend/README.md` §4)

## What you'll still need to do before a real deployment

- Calibrate the MQ135 against known-clean air (placeholder `R0` in `Arduino/AirQualityNode/config.h`)
- Provision a real MongoDB Atlas cluster and network-access rule
- Generate real secrets for `JWT_SECRET` and `API_KEY` (the `.env.example` files ship with placeholders only)
- Deploy the backend somewhere reachable by the ESP32 and the deployed frontend (Render/Railway/a VPS behind Nginx+HTTPS are all reasonable)
