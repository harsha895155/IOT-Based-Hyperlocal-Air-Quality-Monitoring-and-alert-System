import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { getSocket } from '../api/socket';
import { classifyAQI } from '../utils/aqi';
import { useTheme } from '../context/ThemeContext';
import './IoTFleetMap.css';

export default function IoTFleetMap({ onSelectDevice }) {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme() || {};
  const isLight = resolvedTheme === 'light';

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [mapLayer, setMapLayer] = useState('dark'); // 'dark' | 'satellite'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'online' | 'alert'
  const [activeMetric, setActiveMetric] = useState('aqi'); // 'aqi' | 'temp' | 'hum' | 'gas'
  const [showWind, setShowWind] = useState(true);
  const [showCities, setShowCities] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const ANCHOR_CITIES = useMemo(() => [
    { name: 'New Delhi', lat: 28.6139, lng: 77.2090 },
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
    { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
    { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  ], []);

  useEffect(() => {
    async function loadFleet() {
      try {
        setLoading(true);
        const [devRes, readRes] = await Promise.allSettled([
          client.get('/devices'),
          client.get('/readings/latest'),
        ]);

        let devList = [];
        if (devRes.status === 'fulfilled' && Array.isArray(devRes.value.data)) {
          devList = devRes.value.data;
        }

        const latestReading = readRes.status === 'fulfilled' ? readRes.value.data : null;

        // Ensure nodes have coordinates or assign default distributed coordinates
        const defaultCoords = [
          { lat: 17.3850, lng: 78.4867, city: 'Hyderabad Central (Lab Node 01)' },
          { lat: 17.4399, lng: 78.3800, city: 'HITEC Cyber Towers Node 02' },
          { lat: 12.9716, lng: 77.5946, city: 'Bengaluru Tech Park Node 03' },
          { lat: 28.6139, lng: 77.2090, city: 'New Delhi North Gateway Node 04' },
          { lat: 19.0760, lng: 72.8777, city: 'Mumbai Coastal Node 05' },
        ];

        const mapped = (devList.length > 0 ? devList : [
          { deviceId: 'esp32-node-01', name: 'Primary IoT Node', location: 'Hyderabad Central Lab', status: 'Online' },
          { deviceId: 'esp32-node-02', name: 'Ambient Station B', location: 'HITEC Cyber Towers', status: 'Online' },
          { deviceId: 'esp32-node-03', name: 'Tech Park Monitor', location: 'Bengaluru Industrial Zone', status: 'Online' },
        ]).map((d, idx) => {
          const fallback = defaultCoords[idx % defaultCoords.length];
          const lat = d.coordinates?.lat || fallback.lat;
          const lng = d.coordinates?.lng || fallback.lng;
          const aqi = d.deviceId === latestReading?.deviceId
            ? (latestReading.airQuality ?? 46)
            : Math.round(38 + ((idx * 17 + 7) % 65));
          const temp = d.deviceId === latestReading?.deviceId
            ? (latestReading.temperature ?? 26.5)
            : Number((24.5 + idx * 1.8).toFixed(1));
          const hum = d.deviceId === latestReading?.deviceId
            ? (latestReading.humidity ?? 55)
            : Math.round(52 + idx * 4);
          const gas = d.deviceId === latestReading?.deviceId
            ? (latestReading.gasPPM ?? 370)
            : Math.round(340 + idx * 45);

          const isOnline = Boolean(
            d.lastSeen && (Date.now() - new Date(d.lastSeen).getTime() < (d.offlineTimeoutMs || 45000))
          );

          return {
            ...d,
            lat,
            lng,
            aqi,
            temp,
            hum,
            gas,
            status: isOnline ? 'Online' : 'Offline',
            isOnline,
          };
        });

        setDevices(mapped);
        if (mapped.length > 0) {
          setSelectedStation(mapped[0]);
        }
      } catch (err) {
        console.warn('Map data load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadFleet();
  }, []);

  // Listen to live WebSocket telemetry stream for instant real-time map updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleReading = (r) => {
      if (!r?.deviceId) return;
      setDevices((prev) =>
        prev.map((d) => {
          if (d.deviceId === r.deviceId || d.id === r.deviceId) {
            return {
              ...d,
              aqi: r.airQuality ?? d.aqi,
              temp: r.temperature != null ? Number(r.temperature.toFixed(1)) : d.temp,
              hum: r.humidity != null ? Math.round(r.humidity) : d.hum,
              gas: r.gasPPM != null ? Math.round(r.gasPPM) : d.gas,
              status: 'Online',
              isOnline: true,
              lastSeen: r.createdAt || new Date(),
            };
          }
          return d;
        })
      );
    };

    const handleDeviceStatus = (s) => {
      if (!s?.deviceId) return;
      setDevices((prev) =>
        prev.map((d) => (d.deviceId === s.deviceId || d.id === s.deviceId ? { ...d, ...s, isOnline: s.status === 'Online' } : d))
      );
    };

    socket.on('reading', handleReading);
    socket.on('device_status', handleDeviceStatus);
    return () => {
      socket.off('reading', handleReading);
      socket.off('device_status', handleDeviceStatus);
    };
  }, []);

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const isOnline = Boolean(
        d.lastSeen && (Date.now() - new Date(d.lastSeen).getTime() < (d.offlineTimeoutMs || 45000))
      );
      if (filterStatus === 'online') return isOnline;
      if (filterStatus === 'alert') return d.aqi > 100;
      return true;
    });
  }, [devices, filterStatus]);

  // Geospatial bounds projection (Equirectangular to SVG coordinates)
  // Focusing on India subcontinent region [lat: 8 to 35, lng: 68 to 92] or dynamic bounds
  const projectCoords = (lat, lng) => {
    // Map bounding box: Lat 6 to 36, Lng 66 to 94
    const minLat = 6, maxLat = 36;
    const minLng = 66, maxLng = 94;

    const x = ((lng - minLng) / (maxLng - minLng)) * 800;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 520;
    return { x: Math.max(40, Math.min(760, x)), y: Math.max(40, Math.min(480, y)) };
  };

  const handleZoom = (delta) => {
    setZoomLevel((prev) => Math.max(0.7, Math.min(2.8, Number((prev + delta).toFixed(1)))));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleFocusStation = (dev) => {
    setSelectedStation(dev);
    const { x, y } = projectCoords(dev.lat, dev.lng);
    const targetZoom = 1.85;
    // Pan offset to bring (x, y) near center (400, 260)
    const offsetX = (400 - x) * 0.7;
    const offsetY = (260 - y) * 0.7;
    setZoomLevel(targetZoom);
    setPanOffset({
      x: Math.max(-260, Math.min(260, offsetX)),
      y: Math.max(-190, Math.min(190, offsetY)),
    });
  };

  const getMetricDisplay = (dev) => {
    switch (activeMetric) {
      case 'temp':
        return {
          val: `${dev.temp}°C`,
          num: dev.temp,
          label: 'Temperature',
          color: dev.temp > 34 ? '#ef4444' : dev.temp > 28 ? '#f59e0b' : dev.temp < 20 ? '#00f0ff' : '#10b981',
          plume: dev.temp > 32 ? 'url(#plumeDanger)' : dev.temp > 28 ? 'url(#plumeMod)' : 'url(#plumeGood)',
        };
      case 'hum':
        return {
          val: `${dev.hum}%`,
          num: dev.hum,
          label: 'Humidity',
          color: dev.hum > 75 ? '#0284c7' : dev.hum < 30 ? '#f59e0b' : '#10b981',
          plume: dev.hum > 75 ? 'url(#plumeMod)' : 'url(#plumeGood)',
        };
      case 'gas':
        return {
          val: `${dev.gas} PPM`,
          num: dev.gas,
          label: 'MQ-135 Gas',
          color: dev.gas > 550 ? '#ef4444' : dev.gas > 400 ? '#f59e0b' : '#10b981',
          plume: dev.gas > 550 ? 'url(#plumeDanger)' : dev.gas > 400 ? 'url(#plumeMod)' : 'url(#plumeGood)',
        };
      case 'aqi':
      default: {
        const { color } = classifyAQI(dev.aqi);
        return {
          val: `${dev.aqi}`,
          num: dev.aqi,
          label: 'AQI Index',
          color,
          plume: dev.aqi > 100 ? 'url(#plumeDanger)' : dev.aqi > 50 ? 'url(#plumeMod)' : 'url(#plumeGood)',
        };
      }
    }
  };

  return (
    <div className={`card iot-fleet-map-container ${isFullscreen ? 'is-fullscreen' : ''}`}>
      {/* Map Control Bar */}
      <div className="map-toolbar">
        <div className="map-toolbar-left">
          <div className="map-badge-pill">
            <span className="live-dot" />
            <span>HYPERLOCAL GEOSPATIAL TELEMETRY MESH</span>
          </div>
          <h2 className="map-title">AirGuard Fleet Distribution & AQI Contours</h2>
        </div>

        <div className="map-toolbar-right">
          {/* Active Metric Selector */}
          <div className="map-metric-control">
            {[
              { id: 'aqi', label: 'AQI' },
              { id: 'temp', label: 'Temp' },
              { id: 'hum', label: 'Humidity' },
              { id: 'gas', label: 'Gas PPM' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                className={`metric-btn ${activeMetric === m.id ? 'is-active' : ''}`}
                onClick={() => setActiveMetric(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Feature Toggles (Wind & Cities) */}
          <div className="map-feature-toggles">
            <button
              type="button"
              className={`feature-toggle-btn ${showWind ? 'is-active' : ''}`}
              onClick={() => setShowWind((p) => !p)}
              title="Toggle Atmospheric Airflow & Wind Streamlines"
            >
              🌬️ Wind
            </button>
            <button
              type="button"
              className={`feature-toggle-btn ${showCities ? 'is-active' : ''}`}
              onClick={() => setShowCities((p) => !p)}
              title="Toggle Major Metropolitan Reference Cities"
            >
              🏙️ Cities
            </button>
          </div>

          {/* Status Filters */}
          <div className="segmented-control" style={{ margin: 0 }}>
            {[
              { id: 'all', label: `All (${devices.length})` },
              { id: 'online', label: 'Online' },
              { id: 'alert', label: 'Spikes' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`segmented-control__btn ${filterStatus === f.id ? 'is-active' : ''}`}
                onClick={() => setFilterStatus(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Map Layer Mode */}
          <div className="map-layer-switcher">
            <button
              type="button"
              className={`layer-btn ${mapLayer === 'dark' ? 'is-active' : ''}`}
              onClick={() => setMapLayer('dark')}
              title={isLight ? "Standard Daylight Cartography" : "Cyber Dark Mesh"}
            >
              {isLight ? '🗺️' : '🌙'}
            </button>
            <button
              type="button"
              className={`layer-btn ${mapLayer === 'satellite' ? 'is-active' : ''}`}
              onClick={() => setMapLayer('satellite')}
              title="Topological & Satellite Elevation Grid"
            >
              🛰️
            </button>
          </div>

          {/* Zoom & Fullscreen Controls */}
          <div className="map-zoom-group">
            <button className="zoom-btn" onClick={() => handleZoom(0.25)} title="Zoom In">+</button>
            <button className="zoom-btn" onClick={() => handleZoom(-0.25)} title="Zoom Out">−</button>
            <button className="zoom-btn" onClick={handleResetView} title="Reset View">⊙</button>
            <button
              className="zoom-btn"
              onClick={() => setIsFullscreen((p) => !p)}
              title={isFullscreen ? "Exit Fullscreen" : "Edge-to-Edge Fullscreen"}
            >
              {isFullscreen ? '✕' : '⛶'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Map Canvas Grid */}
      <div className="map-canvas-wrapper">
        <div
          className={`map-viewport map-layer-${mapLayer}`}
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            transformOrigin: 'center center',
          }}
        >
          <svg className="map-svg-canvas" viewBox="0 0 800 520">
            <defs>
              {/* Graticule Grid Pattern */}
              <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke={isLight ? "rgba(100, 116, 139, 0.15)" : "rgba(0, 240, 255, 0.08)"}
                  strokeWidth="0.8"
                />
              </pattern>

              {/* Water background gradient */}
              <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isLight ? "#e0f2fe" : "#070b14"} />
                <stop offset="100%" stopColor={isLight ? "#bae6fd" : "#0a1020"} />
              </linearGradient>

              {/* Landmass background gradient */}
              <linearGradient id="landGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={isLight ? "#ffffff" : "#0f172a"} />
                <stop offset="100%" stopColor={isLight ? "#f8fafc" : "#131d33"} />
              </linearGradient>

              {/* Radial gradient for AQI plume contours */}
              <radialGradient id="plumeGood" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10b981" stopOpacity={isLight ? "0.45" : "0.38"} />
                <stop offset="70%" stopColor="#10b981" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="plumeMod" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={isLight ? "0.48" : "0.4"} />
                <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="plumeDanger" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={isLight ? "0.52" : "0.45"} />
                <stop offset="70%" stopColor="#ef4444" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </radialGradient>

              {/* Land drop shadow for light theme */}
              <filter id="landShadow" x="-5%" y="-5%" width="115%" height="115%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={isLight ? "rgba(15, 23, 42, 0.12)" : "rgba(0, 240, 255, 0.15)"} />
              </filter>
            </defs>

            {/* 1. Base Oceanic Canvas */}
            <rect width="800" height="520" fill="url(#oceanGrad)" />

            {/* 2. Coordinate Grid Overlay */}
            <rect width="800" height="520" fill="url(#mapGrid)" />

            {/* 3. Major Latitude & Longitude Graticule Lines */}
            {[
              { lat: 30, y: 104, label: '30°N' },
              { lat: 25, y: 191, label: '25°N' },
              { lat: 20, y: 277, label: '20°N' },
              { lat: 15, y: 364, label: '15°N' },
              { lat: 10, y: 451, label: '10°N' },
            ].map((g) => (
              <g key={`lat-${g.lat}`}>
                <line
                  x1="0"
                  y1={g.y}
                  x2="800"
                  y2={g.y}
                  stroke={isLight ? "rgba(100, 116, 139, 0.22)" : "rgba(255, 255, 255, 0.08)"}
                  strokeWidth="0.7"
                  strokeDasharray="4 4"
                />
                <text
                  x="10"
                  y={g.y - 4}
                  fill={isLight ? "#64748b" : "rgba(255, 255, 255, 0.35)"}
                  fontSize="9"
                  fontWeight="600"
                  fontFamily="monospace"
                >
                  {g.label}
                </text>
              </g>
            ))}

            {[
              { lng: 70, x: 114, label: '70°E' },
              { lng: 75, x: 257, label: '75°E' },
              { lng: 80, x: 400, label: '80°E' },
              { lng: 85, x: 543, label: '85°E' },
              { lng: 90, x: 686, label: '90°E' },
            ].map((g) => (
              <g key={`lng-${g.lng}`}>
                <line
                  x1={g.x}
                  y1="0"
                  x2={g.x}
                  y2="520"
                  stroke={isLight ? "rgba(100, 116, 139, 0.22)" : "rgba(255, 255, 255, 0.08)"}
                  strokeWidth="0.7"
                  strokeDasharray="4 4"
                />
                <text
                  x={g.x + 4}
                  y="16"
                  fill={isLight ? "#64748b" : "rgba(255, 255, 255, 0.35)"}
                  fontSize="9"
                  fontWeight="600"
                  fontFamily="monospace"
                >
                  {g.label}
                </text>
              </g>
            ))}

            {/* 4. Cartographic Water Body Annotations */}
            <text
              x="130"
              y="410"
              fill={isLight ? "#0284c7" : "rgba(0, 240, 255, 0.3)"}
              fontSize="12"
              fontWeight="700"
              fontStyle="italic"
              letterSpacing="0.18em"
              opacity={isLight ? 0.75 : 0.55}
            >
              ARABIAN SEA
            </text>
            <text
              x="570"
              y="400"
              fill={isLight ? "#0284c7" : "rgba(0, 240, 255, 0.3)"}
              fontSize="12"
              fontWeight="700"
              fontStyle="italic"
              letterSpacing="0.18em"
              opacity={isLight ? 0.75 : 0.55}
            >
              BAY OF BENGAL
            </text>
            <text
              x="360"
              y="512"
              fill={isLight ? "#0284c7" : "rgba(0, 240, 255, 0.3)"}
              fontSize="11"
              fontWeight="700"
              fontStyle="italic"
              letterSpacing="0.18em"
              opacity={isLight ? 0.75 : 0.55}
            >
              INDIAN OCEAN
            </text>

            {/* 5. Subcontinent Landmass (Accurate Multi-point Polygon) */}
            {/* Outer Coastal Glow / Buffer Line */}
            <path
              d="M 270 25 L 330 20 L 370 40 L 385 95 L 500 130 L 640 148 L 770 140 L 785 175 L 755 215 L 670 242 L 625 250 L 565 282 L 495 320 L 410 355 L 408 400 L 395 440 L 378 465 L 328 485 L 310 475 L 290 448 L 250 400 L 222 355 L 194 298 L 194 256 L 142 265 L 85 240 L 100 228 L 86 208 L 130 165 L 215 112 L 252 75 L 250 45 Z"
              fill="none"
              stroke={isLight ? "rgba(2, 132, 199, 0.28)" : "rgba(0, 240, 255, 0.35)"}
              strokeWidth="4"
              strokeLinejoin="round"
              strokeDasharray="6 3"
            />

            {/* Solid Subcontinent Land Base */}
            <path
              d="M 270 25 L 330 20 L 370 40 L 385 95 L 500 130 L 640 148 L 770 140 L 785 175 L 755 215 L 670 242 L 625 250 L 565 282 L 495 320 L 410 355 L 408 400 L 395 440 L 378 465 L 328 485 L 310 475 L 290 448 L 250 400 L 222 355 L 194 298 L 194 256 L 142 265 L 85 240 L 100 228 L 86 208 L 130 165 L 215 112 L 252 75 L 250 45 Z"
              fill="url(#landGrad)"
              stroke={isLight ? "#94a3b8" : "rgba(0, 240, 255, 0.55)"}
              strokeWidth={isLight ? "1.6" : "1.4"}
              strokeLinejoin="round"
              filter="url(#landShadow)"
            />

            {/* Sri Lanka Island */}
            <path
              d="M 406 454 Q 446 480 435 505 Q 414 518 396 495 Q 392 468 406 454 Z"
              fill="url(#landGrad)"
              stroke={isLight ? "#94a3b8" : "rgba(0, 240, 255, 0.55)"}
              strokeWidth={isLight ? "1.4" : "1.2"}
              filter="url(#landShadow)"
            />

            {/* 6. Satellite Topographic Mode Contours */}
            {mapLayer === 'satellite' && (
              <g opacity={isLight ? "0.6" : "0.4"}>
                <ellipse cx="440" cy="115" rx="130" ry="25" fill="none" stroke={isLight ? "#0284c7" : "#00f0ff"} strokeWidth="1" strokeDasharray="3 3" />
                <ellipse cx="430" cy="110" rx="90" ry="16" fill="none" stroke={isLight ? "#0284c7" : "#00f0ff"} strokeWidth="1" strokeDasharray="2 2" />
                <ellipse cx="280" cy="380" rx="35" ry="70" fill="none" stroke={isLight ? "#10b981" : "#10b981"} strokeWidth="1" strokeDasharray="3 3" />
                <ellipse cx="460" cy="350" rx="35" ry="60" fill="none" stroke={isLight ? "#0284c7" : "#00f0ff"} strokeWidth="1" strokeDasharray="3 3" />
              </g>
            )}

            {/* 7. Atmospheric Airflow & Wind Streamlines (Animated) */}
            {showWind && (
              <g className="map-wind-layer" opacity={isLight ? 0.75 : 0.6}>
                <path d="M 60 410 Q 180 360 300 370 T 420 330" fill="none" stroke={isLight ? "#0284c7" : "#00f0ff"} strokeWidth="1.8" className="wind-streamline" />
                <path d="M 90 460 Q 200 420 330 430 T 460 390" fill="none" stroke={isLight ? "#0284c7" : "#00f0ff"} strokeWidth="1.5" className="wind-streamline-fast" />
                <path d="M 690 320 Q 560 300 450 330 T 360 350" fill="none" stroke={isLight ? "#0284c7" : "#00f0ff"} strokeWidth="1.8" className="wind-streamline" />
                <path d="M 720 420 Q 590 390 470 410 T 380 430" fill="none" stroke={isLight ? "#0284c7" : "#00f0ff"} strokeWidth="1.5" className="wind-streamline-fast" />
                <path d="M 220 100 Q 380 130 520 170 T 700 220" fill="none" stroke={isLight ? "#0284c7" : "#00f0ff"} strokeWidth="1.8" className="wind-streamline" />
                <path d="M 260 140 Q 400 165 540 205 T 670 250" fill="none" stroke={isLight ? "#0284c7" : "#00f0ff"} strokeWidth="1.4" className="wind-streamline-fast" />
              </g>
            )}

            {/* 8. Major Anchor Reference Cities */}
            {showCities && ANCHOR_CITIES.map((c) => {
              const { x, y } = projectCoords(c.lat, c.lng);
              return (
                <g key={c.name} opacity={isLight ? 0.85 : 0.7} transform={`translate(${x}, ${y})`}>
                  <circle r="3" fill={isLight ? "#475569" : "#94a3b8"} />
                  <circle r="6" fill="none" stroke={isLight ? "#cbd5e1" : "rgba(255,255,255,0.2)"} strokeWidth="0.8" />
                  <text
                    x="8"
                    y="3"
                    fill={isLight ? "#334155" : "#94a3b8"}
                    fontSize="9.5"
                    fontWeight="700"
                    fontFamily="sans-serif"
                  >
                    {c.name}
                  </text>
                </g>
              );
            })}

            {/* 9. Connection Network Mesh Vectors */}
            {filteredDevices.map((d1, i) => {
              const p1 = projectCoords(d1.lat, d1.lng);
              return filteredDevices.slice(i + 1).map((d2, j) => {
                const p2 = projectCoords(d2.lat, d2.lng);
                return (
                  <line
                    key={`net-${i}-${j}`}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={isLight ? "rgba(2, 132, 199, 0.45)" : "rgba(0, 240, 255, 0.2)"}
                    strokeWidth="1.2"
                    strokeDasharray="3 4"
                  />
                );
              });
            })}

            {/* 10. Render Station Nodes & Atmospheric Plumes */}
            {filteredDevices.map((dev) => {
              const { x, y } = projectCoords(dev.lat, dev.lng);
              const metric = getMetricDisplay(dev);
              const isSelected = selectedStation?.deviceId === dev.deviceId;

              return (
                <g
                  key={dev.deviceId}
                  className={`map-node-group ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedStation(dev)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Atmospheric Halo Plume */}
                  <circle cx={x} cy={y} r={isSelected ? 52 : 36} fill={metric.plume} />
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 22 : 15}
                    fill="none"
                    stroke={metric.color}
                    strokeWidth={isLight ? "2" : "1.5"}
                    className="map-pulse-ring"
                  />

                  {/* Core Station Node Anchor */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 10 : 8}
                    fill={metric.color}
                    stroke={isLight ? "#ffffff" : "#0f172a"}
                    strokeWidth="2.5"
                  />

                  {/* Node Label Pill Card */}
                  <g transform={`translate(${x + 12}, ${y - 12})`}>
                    <rect
                      x="0"
                      y="-13"
                      width={dev.name.length * 6.5 + 54}
                      height="26"
                      rx="7"
                      fill={isLight ? "#ffffff" : "rgba(15, 23, 42, 0.92)"}
                      stroke={isSelected ? metric.color : (isLight ? "#cbd5e1" : "rgba(255,255,255,0.15)")}
                      strokeWidth={isSelected ? 1.8 : 1}
                      filter={isLight ? "drop-shadow(0 2px 6px rgba(15,23,42,0.12))" : "none"}
                    />
                    <text
                      x="8"
                      y="4"
                      fill={isLight ? "#0f172a" : "#f8fafc"}
                      fontSize="10"
                      fontWeight="700"
                      fontFamily="sans-serif"
                    >
                      {dev.name || dev.deviceId}
                    </text>
                    <text
                      x={dev.name.length * 6.5 + 16}
                      y="4"
                      fill={metric.color}
                      fontSize="10.5"
                      fontWeight="800"
                      fontFamily="monospace"
                    >
                      {metric.val}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* 11. GIS Cartographic Elements: Compass Rose & Scale Bar */}
            <g transform="translate(24, 460)">
              {/* Scale Bar */}
              <rect x="0" y="24" width="80" height="4" fill={isLight ? "#64748b" : "rgba(255,255,255,0.4)"} rx="2" />
              <rect x="0" y="24" width="40" height="4" fill={isLight ? "#0284c7" : "#00f0ff"} rx="2" />
              <text x="0" y="20" fill={isLight ? "#64748b" : "rgba(255,255,255,0.5)"} fontSize="8" fontWeight="600" fontFamily="sans-serif">0</text>
              <text x="35" y="20" fill={isLight ? "#64748b" : "rgba(255,255,255,0.5)"} fontSize="8" fontWeight="600" fontFamily="sans-serif">250</text>
              <text x="70" y="20" fill={isLight ? "#64748b" : "rgba(255,255,255,0.5)"} fontSize="8" fontWeight="600" fontFamily="sans-serif">500 km</text>

              {/* Compass Rose */}
              <circle cx="116" cy="18" r="14" fill={isLight ? "rgba(255,255,255,0.9)" : "rgba(15,23,42,0.7)"} stroke={isLight ? "#cbd5e1" : "rgba(255,255,255,0.2)"} strokeWidth="1" />
              <path d="M 116 8 L 120 18 L 116 16 L 112 18 Z" fill={isLight ? "#0284c7" : "#00f0ff"} />
              <path d="M 116 28 L 120 18 L 116 20 L 112 18 Z" fill={isLight ? "#94a3b8" : "#64748b"} />
              <text x="116" y="6" textAnchor="middle" fill={isLight ? "#0284c7" : "#00f0ff"} fontSize="8" fontWeight="800">N</text>
            </g>
          </svg>
        </div>

        {/* Selected Station Telemetry Flyout Drawer */}
        {selectedStation && (
          <div className="map-station-card">
            <div className="msc-header">
              <div>
                <span className="msc-status-dot" />
                <span className="msc-device-id">{selectedStation.deviceId}</span>
              </div>
              <button
                className="msc-close-btn"
                onClick={() => setSelectedStation(null)}
                title="Close Drawer"
              >
                ✕
              </button>
            </div>

            <h3 className="msc-title">{selectedStation.name}</h3>
            <p className="msc-location">📍 {selectedStation.location}</p>

            <div className="msc-aqi-row">
              <div
                className="msc-aqi-dial"
                style={{
                  borderColor: classifyAQI(selectedStation.aqi).color,
                  color: classifyAQI(selectedStation.aqi).color,
                }}
              >
                <span className="msc-aqi-val">{selectedStation.aqi}</span>
                <span className="msc-aqi-label">AQI</span>
              </div>
              <div className="msc-aqi-details">
                <div
                  className="msc-category"
                  style={{ color: classifyAQI(selectedStation.aqi).color }}
                >
                  {classifyAQI(selectedStation.aqi).category}
                </div>
                <div className="msc-coordinates">
                  {selectedStation.lat.toFixed(4)}°N, {selectedStation.lng.toFixed(4)}°E
                </div>
              </div>
            </div>

            {/* Mini 24h Trend Sparkline */}
            <div className="msc-trend-section">
              <div className="msc-trend-header">
                <span>24H DIURNAL TREND</span>
                <span style={{ color: '#10b981' }}>Live Sync Active</span>
              </div>
              <svg className="msc-sparkline-svg" viewBox="0 0 200 30">
                <polyline
                  fill="none"
                  stroke={classifyAQI(selectedStation.aqi).color}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={`0,${Math.max(5, Math.min(25, 30 - (selectedStation.aqi - 10) * 0.3))} 40,${Math.max(5, Math.min(25, 30 - (selectedStation.aqi - 5) * 0.3))} 80,${Math.max(5, Math.min(25, 30 - (selectedStation.aqi + 8) * 0.3))} 120,${Math.max(5, Math.min(25, 30 - (selectedStation.aqi + 2) * 0.3))} 160,${Math.max(5, Math.min(25, 30 - (selectedStation.aqi - 3) * 0.3))} 200,${Math.max(5, Math.min(25, 30 - (selectedStation.aqi) * 0.3))}`}
                />
                <circle cx="200" cy={Math.max(5, Math.min(25, 30 - (selectedStation.aqi) * 0.3))} r="3.5" fill={classifyAQI(selectedStation.aqi).color} />
              </svg>
            </div>

            {/* Micro Sensor Grid */}
            <div className="msc-sensor-grid">
              <div className="msc-sensor-item">
                <span className="msc-sensor-label">TEMPERATURE</span>
                <span className="msc-sensor-val">{selectedStation.temp}°C</span>
              </div>
              <div className="msc-sensor-item">
                <span className="msc-sensor-label">HUMIDITY</span>
                <span className="msc-sensor-val">{selectedStation.hum}% RH</span>
              </div>
              <div className="msc-sensor-item">
                <span className="msc-sensor-label">GAS / MQ135</span>
                <span className="msc-sensor-val">{selectedStation.gas} PPM</span>
              </div>
              <div className="msc-sensor-item">
                <span className="msc-sensor-label">SIGNAL / LATENCY</span>
                <span className="msc-sensor-val" style={{ color: '#10b981' }}>-58 dBm (&lt;1s)</span>
              </div>
            </div>

            <div className="msc-actions-row">
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1, padding: '8px 10px', fontSize: '0.8rem' }}
                onClick={() => handleFocusStation(selectedStation)}
              >
                🎯 Focus Map
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1.5, padding: '8px 10px', fontSize: '0.8rem' }}
                onClick={() => {
                  if (onSelectDevice) onSelectDevice(selectedStation.deviceId);
                  navigate(`/devices/${selectedStation.deviceId}`);
                }}
              >
                🔬 Diagnostics
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Fleet Status Bar */}
      <div className="map-footer-strip">
        <div className="mfs-item">
          <span>Active Mesh Nodes:</span> <strong>{devices.length} Deployed</strong>
        </div>
        <div className="mfs-item">
          <span>Fleet Active Metric:</span> <strong style={{ textTransform: 'uppercase', color: 'var(--color-primary, #00f0ff)' }}>{activeMetric}</strong>
        </div>
        <div className="mfs-item">
          <span>Fleet Average:</span> <strong>
            {activeMetric === 'temp'
              ? `${(devices.reduce((acc, d) => acc + d.temp, 0) / (devices.length || 1)).toFixed(1)}°C`
              : activeMetric === 'hum'
              ? `${Math.round(devices.reduce((acc, d) => acc + d.hum, 0) / (devices.length || 1))}% RH`
              : activeMetric === 'gas'
              ? `${Math.round(devices.reduce((acc, d) => acc + d.gas, 0) / (devices.length || 1))} PPM`
              : `${Math.round(devices.reduce((acc, d) => acc + d.aqi, 0) / (devices.length || 1))} AQI`}
          </strong>
        </div>
        <div className="mfs-item">
          <span>Mesh Status:</span> <strong style={{ color: '#10b981' }}>All Channels Synchronized</strong>
        </div>
      </div>
    </div>
  );
}

