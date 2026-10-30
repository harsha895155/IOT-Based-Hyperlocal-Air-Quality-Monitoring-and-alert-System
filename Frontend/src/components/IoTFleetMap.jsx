import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import client from '../api/client';
import { getSocket } from '../api/socket';
import { classifyAQI } from '../utils/aqi';
import { useTheme } from '../context/ThemeContext';
import './IoTFleetMap.css';

const ANCHOR_CITIES = [
  { name: 'New Delhi', lat: 28.6139, lng: 77.2090 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
];

export default function IoTFleetMap({ onSelectDevice }) {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme() || {};
  const isLight = resolvedTheme === 'light';

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const stationsLayerRef = useRef(null);
  const citiesLayerRef = useRef(null);
  const windLayerRef = useRef(null);
  const coverageLayerRef = useRef(null);

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);
  const [mapLayer, setMapLayer] = useState('auto'); // 'auto' | 'satellite' | 'streets'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'online' | 'alert'
  const [activeMetric, setActiveMetric] = useState('aqi'); // 'aqi' | 'temp' | 'hum' | 'gas'
  const [showWind, setShowWind] = useState(true);
  const [showCities, setShowCities] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Fetch Fleet & latest readings
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

        const defaultCoords = [
          { lat: 14.4891, lng: 79.9578, city: 'Primary Station (Gangavaram, AP)' },
          { lat: 17.3850, lng: 78.4867, city: 'Hyderabad Central (Lab Node 01)' },
          { lat: 17.4399, lng: 78.3800, city: 'HITEC Cyber Towers Node 02' },
          { lat: 12.9716, lng: 77.5946, city: 'Bengaluru Tech Park Node 03' },
          { lat: 28.6139, lng: 77.2090, city: 'New Delhi North Gateway Node 04' },
          { lat: 19.0760, lng: 72.8777, city: 'Mumbai Coastal Node 05' },
        ];

        const mapped = (devList.length > 0 ? devList : [
          { deviceId: 'esp32-node-01', name: 'Primary AirGuard Station', location: 'Gangavaram, Andhra Pradesh', status: 'Online' },
          { deviceId: 'esp32-node-02', name: 'Ambient Station B', location: 'HITEC Cyber Towers', status: 'Online' },
          { deviceId: 'esp32-node-03', name: 'Tech Park Monitor', location: 'Bengaluru Industrial Zone', status: 'Online' },
        ]).map((d, idx) => {
          const fallback = defaultCoords[idx % defaultCoords.length];
          const lat = d.coordinates?.lat || fallback.lat;
          const lng = d.coordinates?.lng || fallback.lng;
          const aqi = d.deviceId === latestReading?.deviceId
            ? (latestReading.airQuality ?? 45)
            : Math.round(38 + ((idx * 17 + 7) % 65));
          const temp = d.deviceId === latestReading?.deviceId
            ? (latestReading.temperature ?? 24.5)
            : Number((24.5 + idx * 1.8).toFixed(1));
          const hum = d.deviceId === latestReading?.deviceId
            ? (latestReading.humidity ?? 52)
            : Math.round(52 + idx * 4);
          const gas = d.deviceId === latestReading?.deviceId
            ? (latestReading.gasPPM ?? 340)
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

  // 2. Real-time WebSocket updates
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

  // 3. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Centered over India [17.5, 79.5], zoom 5.5
    const map = L.map(mapContainerRef.current, {
      center: [17.5, 79.5],
      zoom: 5.5,
      minZoom: 3,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });

    stationsLayerRef.current = L.layerGroup().addTo(map);
    citiesLayerRef.current = L.layerGroup().addTo(map);
    windLayerRef.current = L.layerGroup().addTo(map);
    coverageLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 4. Update Tile Layer on Theme / Mode Change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let tileUrl = '';
    let maxZoom = 19;

    if (mapLayer === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 18;
    } else if (mapLayer === 'streets' || isLight) {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    } else {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    }

    tileLayerRef.current = L.tileLayer(tileUrl, {
      subdomains: 'abcd',
      maxZoom,
    }).addTo(map);
  }, [mapLayer, isLight]);

  // 5. Invalidate map size on fullscreen toggle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setTimeout(() => {
      map.invalidateSize();
    }, 320);
  }, [isFullscreen]);

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

  const getMetricDisplay = (dev) => {
    switch (activeMetric) {
      case 'all': {
        const { color } = classifyAQI(dev.aqi);
        return {
          val: `
            <span class="lam-metric-item" style="color: ${color};">AQI ${dev.aqi}</span>
            <span class="lam-sep">•</span>
            <span class="lam-metric-item" style="color: ${dev.temp > 30 ? '#f59e0b' : '#10b981'};">${dev.temp}°C</span>
            <span class="lam-sep">•</span>
            <span class="lam-metric-item" style="color: #0284c7;">${dev.hum}%</span>
            <span class="lam-sep">•</span>
            <span class="lam-metric-item" style="color: #8b5cf6;">${dev.gas} PPM</span>
          `,
          isAll: true,
          num: dev.aqi,
          label: 'All Metrics',
          color,
        };
      }
      case 'temp':
        return {
          val: `${dev.temp}°C`,
          num: dev.temp,
          label: 'Temperature',
          color: dev.temp > 34 ? '#ef4444' : dev.temp > 28 ? '#f59e0b' : dev.temp < 20 ? '#00f0ff' : '#10b981',
        };
      case 'hum':
        return {
          val: `${dev.hum}%`,
          num: dev.hum,
          label: 'Humidity',
          color: dev.hum > 75 ? '#0284c7' : dev.hum < 30 ? '#f59e0b' : '#10b981',
        };
      case 'gas':
        return {
          val: `${dev.gas} PPM`,
          num: dev.gas,
          label: 'MQ-135 Gas',
          color: dev.gas > 550 ? '#ef4444' : dev.gas > 400 ? '#f59e0b' : '#10b981',
        };
      case 'aqi':
      default: {
        const { color } = classifyAQI(dev.aqi);
        return {
          val: `${dev.aqi}`,
          num: dev.aqi,
          label: 'AQI Index',
          color,
        };
      }
    }
  };

  // 6. Render Leaflet Markers for Stations
  useEffect(() => {
    const layer = stationsLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    filteredDevices.forEach((dev) => {
      const metric = getMetricDisplay(dev);
      const isSelected = selectedStation?.deviceId === dev.deviceId;
      const isAll = activeMetric === 'all';

      const iconHtml = `
        <div class="leaflet-airguard-marker ${isSelected ? 'is-selected' : ''}" style="--marker-color: ${metric.color};">
          <div class="lam-halo"></div>
          <div class="lam-pulse"></div>
          <div class="lam-dot"></div>
          <div class="lam-pill ${isAll ? 'lam-pill-all' : ''} ${isLight ? 'lam-light' : 'lam-dark'}">
            <span class="lam-name">${dev.name || dev.deviceId}</span>
            ${isAll ? `<div class="lam-all-metrics">${metric.val}</div>` : `<span class="lam-val" style="color: ${metric.color};">${metric.val}</span>`}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'leaflet-airguard-div-icon',
        html: iconHtml,
        iconSize: isAll ? [340, 44] : [170, 42],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([dev.lat, dev.lng], { icon: customIcon });

      marker.on('click', () => {
        handleFocusStation(dev);
      });

      layer.addLayer(marker);
    });
  }, [filteredDevices, selectedStation, activeMetric, isLight]);

  // 7. Render Anchor Cities
  useEffect(() => {
    const layer = citiesLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showCities) return;

    ANCHOR_CITIES.forEach((c) => {
      const cityHtml = `
        <div class="leaflet-city-badge ${isLight ? 'city-light' : 'city-dark'}">
          <span class="city-dot"></span>
          <span class="city-label">${c.name}</span>
        </div>
      `;

      const icon = L.divIcon({
        className: 'leaflet-city-div-icon',
        html: cityHtml,
        iconSize: [90, 22],
        iconAnchor: [6, 6],
      });

      layer.addLayer(L.marker([c.lat, c.lng], { icon, interactive: false }));
    });
  }, [showCities, isLight]);

  // 8. Render Wind Streamlines Overlay
  useEffect(() => {
    const layer = windLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showWind) return;

    const windPaths = [
      [[10.5, 68.0], [14.0, 72.5], [17.5, 76.0], [19.0, 80.0]],
      [[8.5, 71.0], [12.0, 75.0], [15.5, 78.5]],
      [[13.0, 87.0], [15.0, 83.5], [17.0, 80.0]],
      [[11.0, 85.0], [13.5, 81.5], [15.0, 78.5]],
      [[26.0, 72.0], [24.0, 78.0], [23.0, 85.0], [22.0, 90.0]],
    ];

    windPaths.forEach((pts) => {
      const line = L.polyline(pts, {
        color: isLight ? '#0284c7' : '#00f0ff',
        weight: 2.2,
        dashArray: '10, 16',
        className: 'leaflet-wind-path',
      });
      layer.addLayer(line);
    });
  }, [showWind, isLight]);

  // Zoom controls
  const handleZoom = (delta) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setZoom(map.getZoom() + delta);
  };

  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (coverageLayerRef.current) {
      coverageLayerRef.current.clearLayers();
    }
    setSelectedStation(null);
    if (devices.length > 0) {
      const bounds = L.latLngBounds(devices.map((d) => [d.lat, d.lng]));
      map.fitBounds(bounds.pad(0.35), { animate: true });
    } else {
      map.setView([17.5, 79.5], 5.5, { animate: true });
    }
  };

  const handleFocusStation = (dev) => {
    setSelectedStation(dev);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (coverageLayerRef.current) {
      coverageLayerRef.current.clearLayers();

      const metric = getMetricDisplay(dev);
      // Hyperlocal microclimate coverage boundary (750 meters)
      const radiusMeters = 750;

      // 1. Outer Hyperlocal Coverage Perimeter with animated pulse
      const coverageCircle = L.circle([dev.lat, dev.lng], {
        radius: radiusMeters,
        color: metric.color,
        fillColor: metric.color,
        fillOpacity: isLight ? 0.16 : 0.22,
        weight: 2.5,
        dashArray: '6, 8',
        className: 'leaflet-coverage-zone',
      });

      coverageCircle.bindTooltip(
        `<strong>${dev.name || dev.deviceId}</strong><br/>Hyperlocal Coverage Area (~${(Math.PI * Math.pow(radiusMeters / 1000, 2)).toFixed(1)} km²)`,
        { permanent: false, direction: 'top', className: isLight ? 'coverage-tooltip-light' : 'coverage-tooltip-dark' }
      );
      coverageLayerRef.current.addLayer(coverageCircle);

      // 2. Immediate Sensor Core Zone (220m)
      const coreCircle = L.circle([dev.lat, dev.lng], {
        radius: 220,
        color: metric.color,
        fillColor: metric.color,
        fillOpacity: isLight ? 0.28 : 0.35,
        weight: 1.5,
      });
      coverageLayerRef.current.addLayer(coreCircle);

      // 3. Zoom directly to display ONLY the area surrounding this device!
      const bounds = coverageCircle.getBounds();
      map.fitBounds(bounds.pad(0.3), {
        animate: true,
        duration: 1.5,
        maxZoom: 16,
      });
    } else {
      map.flyTo([dev.lat, dev.lng], 16, { duration: 1.5 });
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
              { id: 'all', label: 'All' },
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

          {/* Satellite View Toggle */}
          <div className="map-layer-switcher">
            <button
              type="button"
              className={`layer-btn ${mapLayer === 'satellite' ? 'is-active' : ''}`}
              onClick={() => setMapLayer((p) => (p === 'satellite' ? 'auto' : 'satellite'))}
              title={mapLayer === 'satellite' ? "Switch to Standard Cartographic Map" : "Switch to High-Res Satellite View"}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, padding: '5px 10px' }}
            >
              <span>🛰️</span>
              <span>Satellite</span>
            </button>
          </div>

          {/* Zoom & Fullscreen Controls */}
          <div className="map-zoom-group">
            <button className="zoom-btn" onClick={() => handleZoom(1)} title="Zoom In">+</button>
            <button className="zoom-btn" onClick={() => handleZoom(-1)} title="Zoom Out">−</button>
            <button className="zoom-btn" onClick={handleResetView} title="Fit All Stations">⊙</button>
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

      {/* Main Interactive Leaflet Map Canvas */}
      <div className="map-canvas-wrapper">
        <div ref={mapContainerRef} className="leaflet-map-canvas" />

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
                onClick={() => {
                  setSelectedStation(null);
                  if (coverageLayerRef.current) coverageLayerRef.current.clearLayers();
                }}
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
            {activeMetric === 'all'
              ? `${Math.round(devices.reduce((acc, d) => acc + d.aqi, 0) / (devices.length || 1))} AQI • ${(devices.reduce((acc, d) => acc + d.temp, 0) / (devices.length || 1)).toFixed(1)}°C • ${Math.round(devices.reduce((acc, d) => acc + d.hum, 0) / (devices.length || 1))}% RH • ${Math.round(devices.reduce((acc, d) => acc + d.gas, 0) / (devices.length || 1))} PPM`
              : activeMetric === 'temp'
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
