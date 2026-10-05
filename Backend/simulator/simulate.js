/**
 * simulate.js
 * -----------------------------------------------------------------
 * Emits realistic sensor readings on the exact same schema the ESP32
 * firmware posts, at the same interval, against the backend's own
 * /api/readings endpoint. Lets the dashboard, mobile app, and alert
 * engine be developed and tested well before physical hardware is
 * wired up (see paper, Section VII-A).
 *
 * Usage:
 *   node simulator/simulate.js
 *   npm run simulate
 *
 * Env vars (optional, read from ../.env if present):
 *   SIM_BACKEND_URL   default http://localhost:5000
 *   SIM_DEVICE_ID     default esp32-node-01
 *   SIM_INTERVAL_MS   default 15000
 *   API_KEY           must match the backend's API_KEY
 * -----------------------------------------------------------------
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const BACKEND_URL = process.env.SIM_BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
const DEVICE_ID = process.env.SIM_DEVICE_ID || 'esp32-node-01';
const INTERVAL_MS = parseInt(process.env.SIM_INTERVAL_MS, 10) || 15000;
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error('[Simulator] API_KEY is not set in .env — the backend will reject every reading.');
  process.exit(1);
}

// Simple stateful random walk so charts look like real sensor data
// (smooth drift with occasional spikes) instead of white noise.
let state = {
  temperature: 27,
  humidity: 55,
  gasPPM: 380, // ~background CO2-equivalent
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function randomWalk(value, step, min, max) {
  return clamp(value + (Math.random() - 0.5) * step, min, max);
}

// Occasionally simulate a pollution spike so the alert pipeline gets
// exercised during development, not just calm-weather data.
function maybeSpike(gasPPM) {
  const spikeChance = 0.05; // 5% of cycles
  if (Math.random() < spikeChance) {
    return clamp(gasPPM + 300 + Math.random() * 900, 0, 3000);
  }
  return gasPPM;
}

function computeAQI(gasPPM, humidity) {
  const table = [
    { ppmLow: 0, ppmHigh: 400, aqiLow: 0, aqiHigh: 50 },
    { ppmLow: 400, ppmHigh: 700, aqiLow: 51, aqiHigh: 100 },
    { ppmLow: 700, ppmHigh: 1000, aqiLow: 101, aqiHigh: 150 },
    { ppmLow: 1000, ppmHigh: 1500, aqiLow: 151, aqiHigh: 200 },
    { ppmLow: 1500, ppmHigh: 2000, aqiLow: 201, aqiHigh: 300 },
    { ppmLow: 2000, ppmHigh: 5000, aqiLow: 301, aqiHigh: 500 },
  ];

  let aqi = 500;
  for (const bp of table) {
    if (gasPPM <= bp.ppmHigh) {
      const frac = clamp((gasPPM - bp.ppmLow) / (bp.ppmHigh - bp.ppmLow), 0, 1);
      aqi = Math.round(bp.aqiLow + frac * (bp.aqiHigh - bp.aqiLow));
      break;
    }
  }

  if (humidity > 70) aqi += Math.round((humidity - 70) * 0.3);
  return clamp(aqi, 0, 500);
}

async function tick() {
  state.temperature = randomWalk(state.temperature, 0.6, 18, 38);
  state.humidity = randomWalk(state.humidity, 2, 25, 85);
  state.gasPPM = maybeSpike(randomWalk(state.gasPPM, 40, 350, 900));

  const airQuality = computeAQI(state.gasPPM, state.humidity);

  const payload = {
    deviceId: DEVICE_ID,
    temperature: Number(state.temperature.toFixed(2)),
    humidity: Number(state.humidity.toFixed(2)),
    gasPPM: Number(state.gasPPM.toFixed(2)),
    airQuality,
  };

  try {
    const res = await fetch(`${BACKEND_URL}/api/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[Simulator] Backend rejected reading (${res.status}): ${body}`);
      return;
    }

    console.log(
      `[Simulator] T=${payload.temperature}C H=${payload.humidity}% Gas=${payload.gasPPM}ppm AQI=${airQuality}`
    );
  } catch (err) {
    console.error('[Simulator] Failed to reach backend:', err.message);
  }
}

console.log(`[Simulator] Posting simulated readings to ${BACKEND_URL}/api/readings every ${INTERVAL_MS}ms as "${DEVICE_ID}". Ctrl+C to stop.`);
tick();
setInterval(tick, INTERVAL_MS);
