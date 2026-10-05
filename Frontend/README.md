# AirGuard Frontend

React + Vite web dashboard for the IoT-Based Hyperlocal Air Quality
Monitoring and Alert System. Shows live AQI, temperature, humidity,
and gas readings, a historical trend chart, and an alerts panel — all
updated in real time over Socket.IO.

## Folder structure

```
Frontend/
├── index.html
├── src/
│   ├── main.jsx / App.jsx     # entry + auth-gated routing
│   ├── api/                   # axios client (client.js), socket.io client (socket.js)
│   ├── hooks/                 # useAuth.js, useReadings.js
│   ├── components/            # Header, AQIHero, StatCard, TrendChart, AlertsPanel, LoginForm
│   ├── pages/                 # Dashboard.jsx
│   ├── styles/                # tokens.css (design system), global.css
│   └── utils/aqi.js           # client-side AQI category/color mapping
```

## 1. Setup

```bash
cd Frontend
npm install
cp .env.example .env
```

By default `VITE_API_URL` points at `http://localhost:5000` — change
it in `.env` if your backend runs elsewhere.

**Make sure the Backend is running first** (see `../Backend/README.md`)
and that you've either started the simulator (`npm run simulate` in
`Backend/`) or have the ESP32 powered on and posting readings.

## 2. Run

```bash
npm run dev
```

Open the printed URL (default `http://localhost:5173`). You'll land on
the login screen — register a new account (there's a "Don't have an
account? Register" link), then you'll see the dashboard.

## 3. Build for production

```bash
npm run build     # outputs to dist/
npm run preview   # serve the production build locally to sanity-check it
```

Deploy the contents of `dist/` to any static host (Vercel, Netlify,
Nginx, etc). Remember to set `VITE_API_URL` to your deployed backend's
URL at build time.

## 4. Design system

The visual identity ("an instrument reading the sky") lives in
`src/styles/tokens.css` as CSS custom properties:
- **Surfaces**: deep atmospheric slate (`--bg`, `--surface`), never pure black
- **Type**: Fraunces (display/headings) + Inter (body) + IBM Plex Mono (all numeric readouts, for an instrumented feel)
- **AQI scale**: six category colors (`--aqi-good` through `--aqi-hazardous`) used only for status, never as decorative UI color
- **Signature element**: the horizon-style gradient gauge in `AQIHero.jsx` — a horizontal strip spanning the full Good→Hazardous range with a marker showing the current reading's position

Changing the palette or type pairing means editing `tokens.css` only —
no component has a hardcoded color.

## 5. Common errors & fixes

| Symptom | Fix |
|---|---|
| Blank dashboard, "Could not reach the backend" | Confirm the Backend is running on the URL in `.env`'s `VITE_API_URL` |
| Login/register fails silently | Open the browser console/network tab — usually a CORS mismatch (check `CORS_ORIGINS` in `Backend/.env` includes `http://localhost:5173`) |
| "No readings yet" on dashboard | Start the backend's simulator (`npm run simulate`) or power on the ESP32 |
| Live updates not appearing (data only updates on refresh) | Check the header status dot — if it shows OFFLINE, the Socket.IO connection isn't reaching the backend; verify `VITE_API_URL` and that no firewall is blocking the WebSocket upgrade |
| Fonts look like a fallback serif/sans | Check your network allows loading fonts from `fonts.googleapis.com`/`fonts.gstatic.com` — the fonts are loaded via `<link>` tags in `index.html`, not bundled |

## 6. Extending

- **New chart series** (e.g. humidity trend): add another `<Area>` to `TrendChart.jsx` and a matching key in the mapped `chartData`.
- **Multi-device support**: `useReadings.js` currently hardcodes `DEVICE_ID = 'esp32-node-01'` — swap this for a dropdown fed by a new `/api/devices` backend endpoint to support multiple sensing nodes.
- **CSV/PDF export**: add an export button that calls `/api/readings/history` with a wide date range and converts the response client-side (e.g. with a small CSV-writer utility), or add a dedicated backend export route.
