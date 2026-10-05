# AirQuality Backend

Node.js / Express / MongoDB backend for the IoT-Based Hyperlocal Air
Quality Monitoring and Alert System. Ingests readings from the ESP32
(or the built-in simulator), persists them to MongoDB Atlas, raises
alerts on threshold crossings, and serves both the React dashboard and
Flutter app from one shared REST + Socket.IO API.

## Folder structure

```
Backend/
├── server.js              # entry point — Express + Socket.IO setup
├── config/db.js           # MongoDB connection
├── models/                # Mongoose schemas: Reading, Alert, User
├── controllers/           # request handlers
├── routes/                # route definitions + per-route rate limits
├── middleware/             # auth.js (JWT), apiKey.js (device auth), errorHandler.js
├── utils/aqi.js           # shared AQI breakpoint/category logic (Table I)
├── simulator/simulate.js  # emits fake readings for frontend development
└── .env.example
```

## 1. Setup

```bash
cd Backend
npm install
cp .env.example .env
```

Edit `.env`:
- `MONGO_URI` — get this from MongoDB Atlas → Database → Connect → Drivers
- `JWT_SECRET` — any long random string (e.g. `openssl rand -hex 32`)
- `API_KEY` — any string; must match `DEVICE_API_KEY` in the Arduino firmware's `config.h`
- `CORS_ORIGINS` — the frontend dev URL (`http://localhost:5173` for Vite's default)

## 2. Run

```bash
npm run dev      # nodemon, auto-restarts on file changes
# or
npm start        # plain node
```

You should see:
```
[DB] MongoDB connected: cluster0-shard-...
[Server] Listening on port 5000 (development)
```

## 3. Develop without hardware — run the simulator

While the server is running, in a second terminal:

```bash
npm run simulate
```

This posts realistic, slowly-drifting readings (with an occasional
simulated pollution spike) to `/api/readings` every 15 seconds — the
same schema and endpoint the ESP32 uses — so the dashboard and alert
pipeline can be built and tested before hardware is wired up.

## 4. API Reference

All endpoints are prefixed with `/api`.

### Auth

| Method | Path | Auth | Body | Purpose |
|---|---|---|---|---|
| POST | `/auth/register` | none | `{ name, email, password, role? }` | Create a dashboard account |
| POST | `/auth/login` | none | `{ email, password }` | Returns `{ user, token }` |

### Readings

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/readings` | `x-api-key` header | Device ingestion (ESP32 / simulator) |
| GET | `/readings/latest?deviceId=` | Bearer JWT | Most recent reading |
| GET | `/readings/history?deviceId=&from=&to=&page=&limit=` | Bearer JWT | Paginated historical data |

### Alerts

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/alerts?deviceId=&acknowledged=` | Bearer JWT | List alerts |
| PATCH | `/alerts/:id/acknowledge` | Bearer JWT | Mark an alert as acknowledged |

### Health

`GET /api/health` → `{ status: "ok", timestamp }` — unauthenticated, used to verify the server + LAN reachability from the ESP32 (`curl http://<host>:<port>/api/health`).

### Real-time

The server also runs Socket.IO on the same port. Clients that connect
receive `reading` and `alert` events pushed live as new data arrives —
this is what lets the dashboard update without polling.

## 5. Authentication model

Two separate schemes, deliberately not shared:
- **Dashboard/mobile users** authenticate with a JWT (`Authorization: Bearer <token>`), obtained from `/auth/login`.
- **The ESP32 device** authenticates with a static shared secret in the `x-api-key` header — it has no user account and can't reasonably manage a rotating JWT.

## 6. Testing the API manually

```bash
# Register a dashboard user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Harsha","email":"harsha@example.com","password":"password123"}'

# Log in, grab the token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"harsha@example.com","password":"password123"}'

# Post a simulated reading (replace CHANGE_ME with your .env API_KEY)
curl -X POST http://localhost:5000/api/readings \
  -H "Content-Type: application/json" \
  -H "x-api-key: CHANGE_ME" \
  -d '{"deviceId":"esp32-node-01","temperature":28.4,"humidity":58,"gasPPM":410,"airQuality":112}'

# Fetch the latest reading (replace TOKEN with the JWT from login)
curl http://localhost:5000/api/readings/latest \
  -H "Authorization: Bearer TOKEN"
```

## 7. Common errors & fixes

| Symptom | Fix |
|---|---|
| `MONGO_URI is not set` | Copy `.env.example` to `.env` and fill it in |
| `MongoDB connection failed` | Check Atlas → Network Access allows your IP (or `0.0.0.0/0` for development); check username/password in the URI are URL-encoded |
| `401` on `/readings` POST | `x-api-key` header missing or doesn't match `API_KEY` in `.env` |
| `401` on `/readings/latest` or `/alerts` | Missing/expired `Authorization: Bearer <token>` — log in again |
| CORS error in browser console | Add the frontend's exact origin (protocol + host + port) to `CORS_ORIGINS` in `.env` |
| ESP32 can't reach the server | Confirm `BACKEND_HOST` in the firmware is your machine's **LAN IP**, not `localhost`; confirm both devices are on the same Wi-Fi network; check your OS firewall allows inbound connections on `PORT` |

## 8. Production notes

- Set `NODE_ENV=production` — this switches Morgan to combined log format.
- Put the server behind a reverse proxy (Nginx) terminating HTTPS; Helmet's defaults assume TLS is handled upstream.
- Restrict `CORS_ORIGINS` to your real deployed frontend URL(s) — never leave it wildcarded in production.
- Rotate `JWT_SECRET` and `API_KEY` before going live; the values in `.env.example` are placeholders only.
