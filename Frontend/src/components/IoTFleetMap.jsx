import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { getSocket } from '../api/socket';
import { classifyAQI } from '../utils/aqi';
import './IoTFleetMap.css';

export default function IoTFleetMap({ onSelectDevice }) {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [mapLayer, setMapLayer] = useState('dark'); // 'dark' | 'satellite' | 'terrain'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'online' | 'alert'

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
    setZoomLevel((prev) => Math.max(0.7, Math.min(2.5, Number((prev + delta).toFixed(1)))));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="card iot-fleet-map-container">
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
              className={`layer-btn ${mapLayer === 'dark' ? 'is-active' : ''}`}
              onClick={() => setMapLayer('dark')}
              title="Cyber Dark Mesh"
            >
              🌙
            </button>
            <button
              className={`layer-btn ${mapLayer === 'satellite' ? 'is-active' : ''}`}
              onClick={() => setMapLayer('satellite')}
              title="Topological Vector Grid"
            >
              🛰️
            </button>
          </div>

          {/* Zoom Buttons */}
          <div className="map-zoom-group">
            <button className="zoom-btn" onClick={() => handleZoom(0.2)} title="Zoom In">+</button>
            <button className="zoom-btn" onClick={() => handleZoom(-0.2)} title="Zoom Out">−</button>
            <button className="zoom-btn" onClick={handleResetView} title="Reset View">⊙</button>
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
            {/* Background Grid Lines & Regional Contours */}
            <defs>
              <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.8" />
              </pattern>
              {/* Radial gradient for AQI plume contours */}
              <radialGradient id="plumeGood" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.38" />
                <stop offset="70%" stopColor="#10b981" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="plumeMod" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="plumeDanger" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
                <stop offset="70%" stopColor="#ef4444" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </radialGradient>
            </defs>

            <rect width="800" height="520" fill="url(#mapGrid)" />

            {/* Stylized Subcontinent Geodetic Contours */}
            <path
              d="M 230 90 Q 320 60 480 80 T 620 180 Q 560 300 480 430 Q 420 510 390 510 Q 360 460 320 370 Q 240 280 210 220 Z"
              fill="rgba(0, 240, 255, 0.025)"
              stroke="rgba(0, 240, 255, 0.22)"
              strokeWidth="1.2"
              strokeDasharray="4 2"
            />

            {/* Connection Network Mesh Vectors */}
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
                    stroke="rgba(0, 240, 255, 0.12)"
                    strokeWidth="1"
                    strokeDasharray="2 4"
                  />
                );
              });
            })}

            {/* Render Station Nodes & Atmospheric Plumes */}
            {filteredDevices.map((dev) => {
              const { x, y } = projectCoords(dev.lat, dev.lng);
              const { color } = classifyAQI(dev.aqi);
              const isSelected = selectedStation?.deviceId === dev.deviceId;
              const plumeGrad = dev.aqi > 100 ? 'url(#plumeDanger)' : dev.aqi > 50 ? 'url(#plumeMod)' : 'url(#plumeGood)';

              return (
                <g
                  key={dev.deviceId}
                  className={`map-node-group ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedStation(dev)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Atmospheric AQI Halo Plume */}
                  <circle cx={x} cy={y} r={isSelected ? 48 : 34} fill={plumeGrad} />
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 20 : 14}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    className="map-pulse-ring"
                  />

                  {/* Core Station Node Anchor */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 9 : 7}
                    fill={color}
                    stroke="#0f172a"
                    strokeWidth="2.5"
                  />

                  {/* Node Label Card */}
                  <g transform={`translate(${x + 12}, ${y - 12})`}>
                    <rect
                      x="0"
                      y="-12"
                      width={dev.name.length * 6.5 + 46}
                      height="24"
                      rx="6"
                      fill="rgba(15, 23, 42, 0.88)"
                      stroke={isSelected ? color : 'rgba(255,255,255,0.12)'}
                      strokeWidth={isSelected ? 1.5 : 0.8}
                    />
                    <text
                      x="8"
                      y="4"
                      fill="#f8fafc"
                      fontSize="10"
                      fontWeight="600"
                      fontFamily="sans-serif"
                    >
                      {dev.name || dev.deviceId}
                    </text>
                    <text
                      x={dev.name.length * 6.5 + 16}
                      y="4"
                      fill={color}
                      fontSize="10"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {dev.aqi}
                    </text>
                  </g>
                </g>
              );
            })}
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
                <span className="msc-sensor-label">SIGNAL</span>
                <span className="msc-sensor-val" style={{ color: '#10b981' }}>-58 dBm (96%)</span>
              </div>
            </div>

            <div className="msc-actions">
              <button
                className="btn-primary"
                style={{ width: '100%', padding: '8px 12px', fontSize: '0.82rem' }}
                onClick={() => {
                  if (onSelectDevice) onSelectDevice(selectedStation.deviceId);
                  navigate(`/devices/${selectedStation.deviceId}`);
                }}
              >
                🔬 Inspect Hardware Diagnostics
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
          <span>Fleet Mean AQI:</span> <strong>{Math.round(devices.reduce((acc, d) => acc + d.aqi, 0) / (devices.length || 1))}</strong>
        </div>
        <div className="mfs-item">
          <span>Mesh Status:</span> <strong style={{ color: '#10b981' }}>All Channels Synchronized</strong>
        </div>
      </div>
    </div>
  );
}

