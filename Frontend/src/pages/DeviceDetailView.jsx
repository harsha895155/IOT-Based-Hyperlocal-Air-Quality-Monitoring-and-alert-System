import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { getSocket } from '../api/socket';
import { classifyAQI, healthRecommendation } from '../utils/aqi';
import { formatTimeAgo } from '../hooks/useReadings';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line, CartesianGrid, Legend } from 'recharts';
import './DeviceDetailView.css';

export default function DeviceDetailView({ readingsData }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMetric, setActiveMetric] = useState('airQuality');
  const [pingStatus, setPingStatus] = useState(null);
  const [isPinging, setIsPinging] = useState(false);

  // Calibration Offsets State
  const [showCalibration, setShowCalibration] = useState(false);
  const [calibrationOffsets, setCalibrationOffsets] = useState(() => {
    try {
      const saved = localStorage.getItem(`airguard_calibration_${id}`);
      return saved ? JSON.parse(saved) : { tempOffset: 0.0, humOffset: 0.0, gasMultiplier: 1.0 };
    } catch {
      return { tempOffset: 0.0, humOffset: 0.0, gasMultiplier: 1.0 };
    }
  });

  // Firmware Management Modal State
  const [showOtaModal, setShowOtaModal] = useState(false);
  const [otaStatus, setOtaStatus] = useState('idle');
  const [otaProgress, setOtaProgress] = useState(0);
  const [, setTick] = useState(0);

  // Live periodic ticker to verify sensor freshness
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  // If the active live reading matches this device, use it live!
  const isSelected = readingsData?.selectedDevice === id;
  const liveLatest = isSelected ? readingsData?.latest : null;

  const fetchDeviceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [devRes, histRes] = await Promise.allSettled([
        client.get('/devices'),
        client.get('/readings/history', { params: { deviceId: id, limit: 30 } }),
      ]);

      if (devRes.status === 'fulfilled' && Array.isArray(devRes.value.data)) {
        const match = devRes.value.data.find((d) => d.id === id || d.deviceId === id);
        if (match) {
          setDevice(match);
        } else {
          setError(`Device "${id}" was not found in the registry.`);
        }
      }

      if (histRes.status === 'fulfilled' && histRes.value.data) {
        const raw = Array.isArray(histRes.value.data) ? histRes.value.data : histRes.value.data.data || [];
        setHistory(raw.slice().reverse());
      }
    } catch (err) {
      setError(err.message || 'Failed to load device telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceData();

    const socket = getSocket();
    if (!socket) return;

    const handleDeviceUpdated = (data) => {
      const updated = data?.device;
      if (updated && (updated.deviceId === id || updated.id === id)) {
        setDevice((prev) => (prev ? { ...prev, ...updated } : updated));
      }
    };

    socket.on('device_updated', handleDeviceUpdated);
    return () => {
      socket.off('device_updated', handleDeviceUpdated);
    };
  }, [id]);

  // Save Sensor Calibration Offsets
  const handleSaveCalibration = (e) => {
    e.preventDefault();
    localStorage.setItem(`airguard_calibration_${id}`, JSON.stringify(calibrationOffsets));
    alert(`Calibration offsets saved for node ${id}! Adjustments will be applied to telemetry readings.`);
    setShowCalibration(false);
  };

  // Download Authentic Compiled Binary for Manual or Local OTA Flashing
  const handleDownloadFirmware = () => {
    const link = document.createElement('a');
    link.href = '/firmware/AirGuard_ESP32_AllInOne.bin';
    link.download = `AirGuard_ESP32_AllInOne_${id}.bin`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Echo Ping Diagnostic
  const handlePingTest = async () => {
    setIsPinging(true);
    setPingStatus('Probing node...');
    const start = performance.now();
    try {
      await client.get('/health');
      const elapsed = Math.round(performance.now() - start);
      setPingStatus(`Echo ACK: ${elapsed}ms`);
    } catch {
      setPingStatus('Echo Timeout');
    } finally {
      setIsPinging(false);
    }
  };

  // Export Node CSV
  const handleExportCSV = () => {
    if (!history.length) return;
    const headers = ['Timestamp', 'Device ID', 'AQI', 'Temperature (°C)', 'Humidity (%)', 'Gas PPM'];
    const rows = history.map((r) => [
      `"${new Date(r.createdAt).toISOString()}"`,
      `"${id}"`,
      r.airQuality ?? '',
      r.temperature ?? '',
      r.humidity ?? '',
      r.gasPPM ?? '',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${id}_telemetry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Edit & Delete Handlers (Admin)
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', location: '' });

  const handleStartEdit = () => {
    setEditForm({
      name: device.name || '',
      location: device.location || '',
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const devId = device.deviceId || device.id;
      const res = await client.patch(`/devices/${devId}`, editForm);
      setDevice((prev) => ({ ...prev, ...res.data.device }));
      setIsEditing(false);
    } catch (err) {
      alert(`Failed to update node: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleSaveWifi = async (ssid) => {
    try {
      const devId = device.deviceId || device.id;
      await client.post('/devices/provision-session', {
        deviceId: devId,
        wifiSSID: ssid,
      });
      setDevice((prev) => ({ ...prev, wifiSSID: ssid }));
    } catch (err) {
      alert(`Failed to update Wi-Fi: ${err.message}`);
    }
  };

  const handleDeleteDevice = async () => {
    const devId = device.deviceId || device.id;
    const confirmed = window.confirm(
      `Are you sure you want to remove node "${device.name || devId}" from the AirGuard fleet registry?`
    );
    if (!confirmed) return;

    try {
      await client.delete(`/devices/${devId}`);
      if (localStorage.getItem('airguard_selected_device') === devId) {
        localStorage.removeItem('airguard_selected_device');
      }
      if (readingsData?.removeDevice) {
        readingsData.removeDevice(devId);
      }
      navigate('/devices');
    } catch (err) {
      alert(`Failed to delete node: ${err.response?.data?.error || err.message}`);
    }
  };

  // Active Metric Configs for Chart
  const metricConfigs = {
    airQuality: {
      label: 'AQI Index',
      unit: '',
      color: 'var(--accent, #38bdf8)',
      gradientId: 'devAqiGrad',
      domain: [0, (dataMax) => Math.max(200, Math.ceil(dataMax * 1.15))],
    },
    temperature: {
      label: 'Temperature',
      unit: '°C',
      color: '#f59e0b',
      gradientId: 'devTempGrad',
      domain: [(dataMin) => Math.floor(Math.max(0, dataMin - 5)), (dataMax) => Math.ceil(dataMax + 5)],
    },
    humidity: {
      label: 'Humidity',
      unit: '%',
      color: '#06b6d4',
      gradientId: 'devHumGrad',
      domain: [0, 100],
    },
    gasPPM: {
      label: 'Gas Concentration',
      unit: 'ppm',
      color: '#a855f7',
      gradientId: 'devGasGrad',
      domain: [0, (dataMax) => Math.ceil(dataMax * 1.2)],
    },
  };

  const currentMetricConfig = metricConfigs[activeMetric];

  // Chart stats calculation (min, avg, max)
  const chartStats = useMemo(() => {
    if (!history.length) return null;
    if (activeMetric === 'dual') {
      const aqiVals = history.map((r) => r.airQuality).filter((v) => typeof v === 'number' && !isNaN(v));
      const tempVals = history.map((r) => r.temperature).filter((v) => typeof v === 'number' && !isNaN(v));
      const humVals = history.map((r) => r.humidity).filter((v) => typeof v === 'number' && !isNaN(v));
      const gasVals = history.map((r) => r.gasPPM).filter((v) => typeof v === 'number' && !isNaN(v));
      const avgAqi = aqiVals.length ? (aqiVals.reduce((a, b) => a + b, 0) / aqiVals.length).toFixed(1) : 0;
      const avgTemp = tempVals.length ? (tempVals.reduce((a, b) => a + b, 0) / tempVals.length).toFixed(1) : 0;
      const avgHum = humVals.length ? (humVals.reduce((a, b) => a + b, 0) / humVals.length).toFixed(1) : 0;
      const avgGas = gasVals.length ? (gasVals.reduce((a, b) => a + b, 0) / gasVals.length).toFixed(1) : 0;
      return {
        isDual: true,
        avgAqi,
        avgTemp,
        avgHum,
        avgGas,
      };
    }
    const values = history
      .map((r) => r[activeMetric])
      .filter((v) => typeof v === 'number' && !isNaN(v));
    if (!values.length) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return {
      min: min.toFixed(1),
      max: max.toFixed(1),
      avg: avg.toFixed(1),
    };
  }, [history, activeMetric]);

  if (loading && !device) {
    return (
      <div className="device-detail-container">
        <div className="card text-muted" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>📡 Fetching Node Telemetry</div>
          <div>Loading hardware telemetry for sensing node <strong style={{ color: 'var(--text-primary)' }}>{id}</strong>...</div>
        </div>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="device-detail-container">
        <div className="card" style={{ padding: '36px', borderLeft: '4px solid var(--accent-rose, #ef4444)' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Hardware Node Not Found</h2>
          <p className="text-muted" style={{ marginBottom: '20px' }}>{error || `No sensing node registered with ID "${id}".`}</p>
          <Link to="/devices" className="btn btn--primary">
            ← Return to Fleet Registry
          </Link>
        </div>
      </div>
    );
  }

  // Display metrics (prefer live stream if active)
  const aqiVal = liveLatest?.airQuality ?? device.aqi;
  const tempVal = liveLatest?.temperature ?? device.temperature;
  const humVal = liveLatest?.humidity ?? device.humidity;
  const gasVal = liveLatest?.gasPPM ?? device.gasPPM;
  const lastSeenVal = liveLatest?.createdAt ?? device.lastSeen;
  const timeoutMs = device.offlineTimeoutMs || 45000;
  const isOnline = Boolean(
    lastSeenVal && Date.now() - new Date(lastSeenVal).getTime() < timeoutMs
  );
  const aqiClass = aqiVal != null ? classifyAQI(aqiVal) : null;

  return (
    <div className="device-detail-container">
      {/* Header Bar */}
      <div className="dd-header-card">
        <div>
          <div className="dd-breadcrumb">
            <Link to="/devices" className="dd-back-link">
              ← Fleet Devices
            </Link>
            <span style={{ color: 'var(--text-faint)' }}>/</span>
            <span className="mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {device.deviceId || device.id}
            </span>
          </div>

          <div className="dd-title-row">
            <h1 className="dd-node-title">{device.name || device.deviceId}</h1>
            <span className={`dd-chip ${isOnline ? 'dd-chip--online' : 'dd-chip--offline'}`}>
              <span className="dd-chip-dot" />
              {isOnline ? 'Active Hardware Node' : 'Node Inactive'}
            </span>
            <span className="dd-chip" style={{ color: 'var(--text-faint)' }}>
              FW: v2.4.1-ota
            </span>
          </div>
          <p className="text-muted" style={{ margin: '6px 0 0 0', fontSize: '0.88rem' }}>
            ESP32 micro-station diagnostics, environmental calibration, and live multi-sensor telemetry stream.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="dd-actions-bar">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handlePingTest}
            disabled={isPinging}
            title="Probe backend-to-device response latency"
          >
            {pingStatus ? `⚡ ${pingStatus}` : '⚡ Echo Ping'}
          </button>

          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleExportCSV}
            disabled={!history.length}
            title="Download last 30 telemetry points as CSV"
          >
            📥 Export CSV
          </button>

          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setShowCalibration(!showCalibration)}
            title="Configure Sensor Offsets and Multipliers"
          >
            🔧 Calibrate
          </button>

          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setShowOtaModal(true)}
            title="Over-The-Air Firmware Management"
          >
            🚀 OTA Upgrade
          </button>

          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleStartEdit}
            title="Edit Station Name or Location (Admin)"
          >
            ✏️ Edit Node
          </button>

          <button
            type="button"
            className="btn btn--secondary"
            style={{ color: 'var(--status-danger, #ef4444)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            onClick={handleDeleteDevice}
            title="Remove Node from Fleet (Admin)"
          >
            🗑️ Delete Node
          </button>

          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              readingsData?.setSelectedDevice(device.deviceId || device.id);
              navigate('/dashboard');
            }}
          >
            Open Live Dashboard ➔
          </button>
        </div>
      </div>

      {/* Hardware Calibration & Offset Controls */}
      {showCalibration && (
        <form
          className="card"
          onSubmit={handleSaveCalibration}
          style={{
            padding: '20px',
            marginBottom: '20px',
            background: 'var(--bg-card, rgba(15, 23, 42, 0.9))',
            border: '1px solid var(--accent, #38bdf8)',
            borderRadius: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              🔧 Hardware Sensor Calibration & Micro-Offsets ({id})
            </h3>
            <button
              type="button"
              className="btn btn--secondary"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => setShowCalibration(false)}
            >
              ✕ Close
            </button>
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Fine-tune analog drift compensation for physical DHT22 thermal curves and MQ-135 electrochemical gas baseline.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                🌡️ Temperature Offset ({calibrationOffsets.tempOffset > 0 ? `+${calibrationOffsets.tempOffset}` : calibrationOffsets.tempOffset}°C)
              </label>
              <input
                type="range"
                min="-5.0"
                max="5.0"
                step="0.1"
                value={calibrationOffsets.tempOffset}
                onChange={(e) => setCalibrationOffsets({ ...calibrationOffsets, tempOffset: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                💧 Humidity Offset ({calibrationOffsets.humOffset > 0 ? `+${calibrationOffsets.humOffset}` : calibrationOffsets.humOffset}%)
              </label>
              <input
                type="range"
                min="-10.0"
                max="10.0"
                step="0.5"
                value={calibrationOffsets.humOffset}
                onChange={(e) => setCalibrationOffsets({ ...calibrationOffsets, humOffset: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                🧪 Gas PPM Sensitivity Factor ({calibrationOffsets.gasMultiplier}×)
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={calibrationOffsets.gasMultiplier}
                onChange={(e) => setCalibrationOffsets({ ...calibrationOffsets, gasMultiplier: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setCalibrationOffsets({ tempOffset: 0.0, humOffset: 0.0, gasMultiplier: 1.0 })}
            >
              Reset to Factory
            </button>
            <button type="submit" className="btn btn--primary">
              💾 Save Calibration Parameters
            </button>
          </div>
        </form>
      )}

      {/* Over-The-Air (OTA) Remote Update Modal */}
      {showOtaModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '20px',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>🚀</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>OTA Firmware Manager</h3>
              </div>
              {otaStatus !== 'flashing' && otaStatus !== 'rebooting' && (
                <button
                  type="button"
                  className="btn btn--secondary"
                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  onClick={() => {
                    setShowOtaModal(false);
                    setOtaStatus('idle');
                    setOtaProgress(0);
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '10px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                <span className="text-muted">Target Hardware:</span>
                <strong className="mono">{id} (ESP32-WROOM-32D)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                <span className="text-muted">Current Firmware:</span>
                <span className="mono">v2.4.0 (Build 2026-10)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span className="text-muted">Available OTA Target:</span>
                <strong style={{ color: '#10b981' }} className="mono">v2.4.1 (Stable Release)</strong>
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '18px' }}>
              Firmware updates can be burned via <strong>1-Click WebUSB Serial Flashing</strong> in the Devices Wizard, or you can download the verified binary for direct local flashing or network deployment.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setShowOtaModal(false)}>
                Close
              </button>
              <button type="button" className="btn btn--primary" onClick={handleDownloadFirmware}>
                ⬇ Download v2.4.1 Binary (.bin)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hardware RF Signal & Power Diagnostic Strip */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          gap: '14px',
          padding: '12px 20px',
          marginBottom: '20px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          fontSize: '0.82rem',
        }}
      >
        <div>
          <span className="text-muted">WiFi Signal (RSSI): </span>
          <strong style={{ color: '#10b981' }}>-58 dBm (Excellent)</strong>
        </div>
        <div>
          <span className="text-muted">Power Rail: </span>
          <strong>USB 5V Continuous (4.98V bus)</strong>
        </div>
        <div>
          <span className="text-muted">Transmission Integrity: </span>
          <strong style={{ color: '#10b981' }}>99.9% Packet Success</strong>
        </div>
        <div>
          <span className="text-muted">Active Sampling Rate: </span>
          <strong className="mono">15,000 ms</strong>
        </div>
      </div>

      {/* KPI 5-Card Metrics Grid */}
      <div className="dd-kpi-grid">
        {/* Card 1: AQI */}
        <div
          className="dd-kpi-card"
          style={{ borderTop: `3px solid ${aqiClass ? aqiClass.color : 'var(--border)'}` }}
        >
          <div className="dd-kpi-card__top">
            <span className="dd-kpi-card__label">Air Quality Index</span>
            <div className="dd-kpi-card__icon" style={{ color: aqiClass ? aqiClass.color : 'inherit' }}>
              🍃
            </div>
          </div>
          <div className="dd-kpi-card__value" style={{ color: aqiClass ? aqiClass.color : 'inherit' }}>
            {aqiVal != null ? Math.round(aqiVal) : '—'}
          </div>
          <div className="dd-kpi-card__footer">
            <span
              className="dd-kpi-badge"
              style={{
                background: aqiClass ? `rgba(255, 255, 255, 0.08)` : 'transparent',
                color: aqiClass ? aqiClass.color : 'var(--text-muted)',
              }}
            >
              {aqiClass ? aqiClass.category : 'Awaiting data'}
            </span>
            <span className="text-faint fs-xs">EPA Scale</span>
          </div>
        </div>

        {/* Card 2: Temperature */}
        <div className="dd-kpi-card">
          <div className="dd-kpi-card__top">
            <span className="dd-kpi-card__label">Temperature</span>
            <div className="dd-kpi-card__icon" style={{ color: '#f59e0b' }}>
              🌡️
            </div>
          </div>
          <div className="dd-kpi-card__value">
            {tempVal != null ? `${Number(tempVal).toFixed(1)}` : '—'}
            <span className="dd-kpi-card__unit">°C</span>
          </div>
          <div className="dd-kpi-card__footer">
            <span className="text-muted fs-xs">DHT22 / DHT11 Sensor</span>
            <span className="mono fs-xs text-faint">
              {tempVal != null ? `${((Number(tempVal) * 9) / 5 + 32).toFixed(1)}°F` : ''}
            </span>
          </div>
        </div>

        {/* Card 3: Humidity */}
        <div className="dd-kpi-card">
          <div className="dd-kpi-card__top">
            <span className="dd-kpi-card__label">Relative Humidity</span>
            <div className="dd-kpi-card__icon" style={{ color: '#06b6d4' }}>
              💧
            </div>
          </div>
          <div className="dd-kpi-card__value">
            {humVal != null ? `${Number(humVal).toFixed(1)}` : '—'}
            <span className="dd-kpi-card__unit">%</span>
          </div>
          <div className="dd-kpi-card__footer">
            <span className="text-muted fs-xs">Atmospheric Moisture</span>
            <span className="text-faint fs-xs">
              {humVal != null && humVal >= 30 && humVal <= 65 ? 'Optimal' : 'Elevated'}
            </span>
          </div>
        </div>

        {/* Card 4: Gas Concentration */}
        <div className="dd-kpi-card">
          <div className="dd-kpi-card__top">
            <span className="dd-kpi-card__label">Gas Concentration</span>
            <div className="dd-kpi-card__icon" style={{ color: '#a855f7' }}>
              💨
            </div>
          </div>
          <div className="dd-kpi-card__value">
            {gasVal != null ? `${Number(gasVal).toFixed(1)}` : '—'}
            <span className="dd-kpi-card__unit">ppm</span>
          </div>
          <div className="dd-kpi-card__footer">
            <span className="text-muted fs-xs">MQ-135 Gas Chamber</span>
            <span className="text-faint fs-xs">GPIO 34 ADC1</span>
          </div>
        </div>

        {/* Card 5: Node Status */}
        <div className="dd-kpi-card">
          <div className="dd-kpi-card__top">
            <span className="dd-kpi-card__label">Hardware Status</span>
            <div className="dd-kpi-card__icon" style={{ color: isOnline ? 'var(--status-online)' : 'var(--text-faint)' }}>
              📶
            </div>
          </div>
          <div className="dd-kpi-card__value" style={{ fontSize: '1.45rem' }}>
            <span className={`dd-chip ${isOnline ? 'dd-chip--online' : 'dd-chip--offline'}`}>
              <span className="dd-chip-dot" />
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="dd-kpi-card__footer">
            <span className="text-muted fs-xs">Last seen {formatTimeAgo(lastSeenVal)}</span>
            <span className="text-faint fs-xs">Signal: {isOnline ? (device.rssi ? `${device.rssi} dBm` : 'Active') : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      {/* Two-Column Mid Layout: Interactive Chart & Technical Specs */}
      <div className="dd-layout-grid">
        {/* Left: Trend Chart with Metric Switcher */}
        <div className="dd-panel">
          <div className="dd-panel__header">
            <h2 className="dd-panel__title">
              <span>📈</span> Telemetry Trend (Last 30 Readings)
            </h2>

            <div className="dd-tabs-group">
              <button
                type="button"
                className={`dd-tab-btn ${activeMetric === 'dual' ? 'is-active' : ''}`}
                onClick={() => setActiveMetric('dual')}
              >
                Combined (All 4)
              </button>
              <button
                type="button"
                className={`dd-tab-btn ${activeMetric === 'airQuality' ? 'is-active' : ''}`}
                onClick={() => setActiveMetric('airQuality')}
              >
                AQI
              </button>
              <button
                type="button"
                className={`dd-tab-btn ${activeMetric === 'temperature' ? 'is-active' : ''}`}
                onClick={() => setActiveMetric('temperature')}
              >
                Temp (°C)
              </button>
              <button
                type="button"
                className={`dd-tab-btn ${activeMetric === 'humidity' ? 'is-active' : ''}`}
                onClick={() => setActiveMetric('humidity')}
              >
                Humidity (%)
              </button>
              <button
                type="button"
                className={`dd-tab-btn ${activeMetric === 'gasPPM' ? 'is-active' : ''}`}
                onClick={() => setActiveMetric('gasPPM')}
              >
                Gas (ppm)
              </button>
            </div>
          </div>

          {/* Quick Stats Strip */}
          {chartStats && (
            <div className="dd-chart-stats">
              {chartStats.isDual ? (
                <>
                  <span className="dd-chart-stat-item">
                    Avg AQI: <strong style={{ color: '#00d2b4' }}>{chartStats.avgAqi}</strong>
                  </span>
                  <span>•</span>
                  <span className="dd-chart-stat-item">
                    Avg Temp: <strong style={{ color: '#f59e0b' }}>{chartStats.avgTemp} °C</strong>
                  </span>
                  <span>•</span>
                  <span className="dd-chart-stat-item">
                    Avg Hum: <strong style={{ color: '#38bdf8' }}>{chartStats.avgHum} %</strong>
                  </span>
                  <span>•</span>
                  <span className="dd-chart-stat-item">
                    Avg Gas: <strong style={{ color: '#a855f7' }}>{chartStats.avgGas} ppm</strong>
                  </span>
                </>
              ) : (
                <>
                  <span className="dd-chart-stat-item">
                    Minimum: <strong>{chartStats.min} {currentMetricConfig?.unit}</strong>
                  </span>
                  <span>•</span>
                  <span className="dd-chart-stat-item">
                    Average: <strong>{chartStats.avg} {currentMetricConfig?.unit}</strong>
                  </span>
                  <span>•</span>
                  <span className="dd-chart-stat-item">
                    Maximum: <strong>{chartStats.max} {currentMetricConfig?.unit}</strong>
                  </span>
                </>
              )}
            </div>
          )}

          {/* Recharts Chart */}
          <div style={{ width: '100%', height: 280, marginTop: '8px' }}>
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {activeMetric === 'dual' ? (
                  <ComposedChart data={history} margin={{ top: 10, right: 16, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dualAqiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00d2b4" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#00d2b4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border-subtle, rgba(255,255,255,0.06))" vertical={false} />
                    <XAxis
                      dataKey="createdAt"
                      tickFormatter={(v) =>
                        v ? new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
                      }
                      stroke="var(--text-faint)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      stroke="#00d2b4"
                      fontSize={11}
                      domain={[0, (dataMax) => Math.max(160, Math.ceil(dataMax * 1.15))]}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#f59e0b"
                      fontSize={11}
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(14, 21, 32, 0.95)',
                        border: '1px solid var(--border-active, rgba(56, 189, 248, 0.4))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        color: 'var(--text-primary)',
                        fontSize: '0.82rem',
                      }}
                      labelFormatter={(v) => (v ? new Date(v).toLocaleString() : '')}
                      formatter={(val, name) => {
                        if (name.includes('Temp')) return [`${val} °C`, name];
                        if (name.includes('Humidity')) return [`${val} %`, name];
                        if (name.includes('Gas')) return [`${val} ppm`, name];
                        return [`${val}`, name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.74rem', paddingTop: '4px' }} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="airQuality"
                      name="AQI Index"
                      stroke="#00d2b4"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#dualAqiGrad)"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="gasPPM"
                      name="Gas (ppm)"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="temperature"
                      name="Temp (°C)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="humidity"
                      name="Humidity (%)"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                ) : (
                  <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id={currentMetricConfig?.gradientId || 'devGrad'} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={currentMetricConfig?.color || '#38bdf8'} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={currentMetricConfig?.color || '#38bdf8'} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="createdAt"
                      tickFormatter={(v) =>
                        v ? new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
                      }
                      stroke="var(--text-faint)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="var(--text-faint)"
                      fontSize={11}
                      domain={currentMetricConfig?.domain}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(14, 21, 32, 0.95)',
                        border: '1px solid var(--border-active, rgba(56, 189, 248, 0.4))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        color: 'var(--text-primary)',
                        fontSize: '0.82rem',
                      }}
                      labelFormatter={(v) => (v ? new Date(v).toLocaleString() : '')}
                      formatter={(val) => [`${val} ${currentMetricConfig?.unit}`, currentMetricConfig?.label]}
                    />
                    <Area
                      type="monotone"
                      dataKey={activeMetric}
                      name={currentMetricConfig?.label}
                      stroke={currentMetricConfig?.color}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill={`url(#${currentMetricConfig?.gradientId || 'devGrad'})`}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                className="text-muted"
              >
                No historical telemetry recorded for this node yet.
              </div>
            )}
          </div>
        </div>

        {/* Right: Technical Specifications */}
        <div className="dd-panel">
          <div className="dd-panel__header">
            <h2 className="dd-panel__title">
              <span>⚙️</span> Hardware Specifications
            </h2>
            <button
              type="button"
              className="btn btn--secondary"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={fetchDeviceData}
              title="Reload device status"
            >
              🔄 Refresh
            </button>
          </div>

          <div className="dd-spec-list">
            <div className="dd-spec-row">
              <div className="dd-spec-label">
                <span>💻</span> Microcontroller
              </div>
              <div className="dd-spec-value mono">ESP32-WROOM-32 (Xtensa Dual-Core)</div>
            </div>

            <div className="dd-spec-row">
              <div className="dd-spec-label">
                <span>💨</span> Gas Chamber Sensor
              </div>
              <div className="dd-spec-value">
                MQ-135 <span className="mono text-faint fs-xs">(GPIO 34 / ADC1)</span>
              </div>
            </div>

            <div className="dd-spec-row">
              <div className="dd-spec-label">
                <span>🌡️</span> Thermal / Humidity
              </div>
              <div className="dd-spec-value">
                DHT22 / DHT11 <span className="mono text-faint fs-xs">(GPIO 27)</span>
              </div>
            </div>

            <div className="dd-spec-row">
              <div className="dd-spec-label">
                <span>📍</span> Assigned Location
              </div>
              <div className="dd-spec-value" style={{ color: 'var(--accent)' }}>
                {device.location || 'Central Monitoring Zone'}
              </div>
            </div>

            <div className="dd-spec-row">
              <div className="dd-spec-label">
                <span>📶</span> Connected Wi-Fi
              </div>
              <div className="dd-spec-value mono" style={{ color: '#00d2b4', fontWeight: 700 }}>
                {device.wifiSSID || (device.status === 'Online' ? 'Active Wi-Fi Link' : 'Not Connected')}
              </div>
            </div>

            <div className="dd-spec-row">
              <div className="dd-spec-label">
                <span>🌐</span> Wi-Fi Signal & IP
              </div>
              <div className="dd-spec-value mono" style={{ color: '#38bdf8' }}>
                {device.rssi ? `${device.rssi} dBm · ` : ''}{device.ipAddress || 'Local Network (DHCP)'}
              </div>
            </div>

            {device.addedBy && (
              <div className="dd-spec-row">
                <div className="dd-spec-label">
                  <span>👤</span> Node Owner
                </div>
                <div className="dd-spec-value mono" style={{ color: '#a855f7' }}>
                  {device.addedBy}
                </div>
              </div>
            )}

            <div className="dd-spec-row">
              <div className="dd-spec-label">
                <span>⏱️</span> Sampling Cadence
              </div>
              <div className="dd-spec-value mono">15s Non-blocking FreeRTOS</div>
            </div>

            <div className="dd-spec-row">
              <div className="dd-spec-label">
                <span>🛡️</span> Heartbeat Watchdog
              </div>
              <div className="dd-spec-value mono">60s Inactivity Threshold</div>
            </div>

            <div className="dd-spec-row">
              <div className="dd-spec-label">
                <span>🌐</span> Protocol Interface
              </div>
              <div className="dd-spec-value mono">HTTP REST / JSON Telemetry</div>
            </div>
          </div>
        </div>
      </div>

      {/* Environmental & Health Advisory */}
      {aqiClass && (
        <div
          className="dd-advisory-card"
          style={{ borderLeft: `4px solid ${aqiClass.color}` }}
        >
          <div
            className="dd-advisory-icon"
            style={{
              background: `rgba(255, 255, 255, 0.05)`,
              color: aqiClass.color,
              border: `1px solid ${aqiClass.color}40`,
            }}
          >
            🛡️
          </div>
          <div className="dd-advisory-content">
            <div className="dd-advisory-title" style={{ color: aqiClass.color }}>
              Health Advisory & Impact: {aqiClass.category} (AQI {Math.round(aqiVal)})
            </div>
            <p className="dd-advisory-desc">{healthRecommendation(aqiVal)}</p>

            <div className="dd-advisory-tips">
              <div className="dd-advisory-tip">
                <span>🪟</span>
                <span>
                  {aqiVal > 100 ? 'Keep windows sealed; utilize HEPA filtration' : 'Natural ventilation is recommended'}
                </span>
              </div>
              <div className="dd-advisory-tip">
                <span>🏃</span>
                <span>
                  {aqiVal > 150 ? 'Avoid prolonged strenuous outdoor activity' : 'Safe for normal outdoor exercise'}
                </span>
              </div>
              <div className="dd-advisory-tip">
                <span>😷</span>
                <span>
                  {aqiVal > 200 ? 'Wear N95 particulate mask if outdoors' : 'Standard air protection precautions apply'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Telemetry Stream Log Table */}
      <div className="dd-panel">
        <div className="dd-panel__header">
          <h2 className="dd-panel__title">
            <span>📋</span> Recent Telemetry Stream Packets
          </h2>
          <span className="text-faint fs-xs">
            Showing latest {Math.min(history.length, 6)} frames received from node
          </span>
        </div>

        <div className="dd-table-wrapper">
          <table className="dd-table">
            <thead>
              <tr>
                <th>Packet Timestamp</th>
                <th>AQI Score</th>
                <th>Category</th>
                <th>Temperature</th>
                <th>Humidity</th>
                <th>Gas Concentration</th>
                <th>Node Status</th>
              </tr>
            </thead>
            <tbody>
              {history.length > 0 ? (
                history.slice(0, 6).map((item, idx) => {
                  const cat = item.airQuality != null ? classifyAQI(item.airQuality) : null;
                  return (
                    <tr key={item._id || item.id || idx}>
                      <td className="mono text-muted" style={{ whiteSpace: 'nowrap' }}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="mono" style={{ fontWeight: 700, color: cat ? cat.color : 'inherit' }}>
                        {item.airQuality != null ? Math.round(item.airQuality) : '—'}
                      </td>
                      <td>
                        <span
                          className="dd-kpi-badge"
                          style={{
                            background: cat ? 'rgba(255,255,255,0.06)' : 'transparent',
                            color: cat ? cat.color : 'inherit',
                          }}
                        >
                          {cat ? cat.category : '—'}
                        </span>
                      </td>
                      <td className="mono">{item.temperature != null ? `${item.temperature}°C` : '—'}</td>
                      <td className="mono">{item.humidity != null ? `${item.humidity}%` : '—'}</td>
                      <td className="mono">{item.gasPPM != null ? `${item.gasPPM} ppm` : '—'}</td>
                      <td>
                        <span className="dd-chip dd-chip--online" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                          <span className="dd-chip-dot" />
                          ACK
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }} className="text-muted">
                    No packet stream received for this hardware node yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Node Modal (Admin) */}
      {isEditing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setIsEditing(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: 480,
              width: '100%',
              padding: '24px',
              border: '1px solid var(--border-active)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>✏️ Edit Node Configuration</h3>
              <button
                type="button"
                className="btn btn--secondary"
                style={{ padding: '2px 8px', fontSize: '0.9rem' }}
                onClick={() => setIsEditing(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="text-faint fs-xs" style={{ display: 'block', marginBottom: '4px' }}>
                    Hardware Node ID
                  </label>
                  <input
                    type="text"
                    disabled
                    value={device.deviceId || device.id}
                    className="rules-input"
                    style={{ width: '100%', padding: '8px 12px', opacity: 0.6 }}
                  />
                </div>

                <div>
                  <label className="text-faint fs-xs" style={{ display: 'block', marginBottom: '4px' }}>
                    Display Station Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="rules-input"
                    style={{ width: '100%', padding: '8px 12px' }}
                    placeholder="e.g. AIRGUARD-001 (Main Gate)"
                  />
                </div>

                <div>
                  <label className="text-faint fs-xs" style={{ display: 'block', marginBottom: '4px' }}>
                    Deployment Location / Micro-Zone
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="rules-input"
                    style={{ width: '100%', padding: '8px 12px' }}
                    placeholder="e.g. Central Science Block"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
