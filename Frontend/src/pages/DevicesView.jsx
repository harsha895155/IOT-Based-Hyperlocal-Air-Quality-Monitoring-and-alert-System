import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { formatTimeAgo } from '../hooks/useReadings';
import { classifyAQI } from '../utils/aqi';
import AddDeviceWizard from '../components/AddDeviceWizard';
import './DevicesView.css';

export default function DevicesView({
  devices = [],
  onSelectDevice,
  currentDeviceId,
}) {
  const navigate = useNavigate();

  // State
  const [deviceList, setDeviceList] = useState(devices);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [selectedModalDevice, setSelectedModalDevice] = useState(null);
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [pingLatencies, setPingLatencies] = useState({});
  const [pinging, setPinging] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Editing Device State
  const [editingDevice, setEditingDevice] = useState(null);

  // Sync internal list when parent prop updates
  useEffect(() => {
    if (devices.length > 0) {
      setDeviceList(devices);
    }
  }, [devices]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Edit / Update Device Handler (Admin action)
  const handleUpdateDevice = async (e) => {
    e.preventDefault();
    if (!editingDevice) return;
    try {
      const devId = editingDevice.deviceId || editingDevice.id;
      const res = await client.patch(`/devices/${devId}`, {
        name: editingDevice.name,
        location: editingDevice.location,
        type: editingDevice.type,
      });
      setDeviceList((prev) =>
        prev.map((d) => (d.deviceId === devId || d.id === devId ? { ...d, ...res.data.device } : d))
      );
      showToast(`✓ Node "${editingDevice.name}" successfully updated.`);
      setEditingDevice(null);
    } catch (err) {
      showToast(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  // Remove / Delete Device Handler (Admin action)
  const handleDeleteDevice = async (devId, name, e) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(
      `Are you sure you want to remove node "${name || devId}" from the AirGuard fleet registry?`
    );
    if (!confirmed) return;

    try {
      await client.delete(`/devices/${devId}`);
      setDeviceList((prev) => prev.filter((d) => d.deviceId !== devId && d.id !== devId));
      if (selectedModalDevice?.deviceId === devId) {
        setSelectedModalDevice(null);
      }
      showToast(`✓ Node "${name || devId}" removed from fleet registry.`);
    } catch (err) {
      showToast(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  // Fleet Ping Echo
  const handleFleetPing = async () => {
    setPinging(true);
    const results = {};
    for (const d of deviceList) {
      const devId = d.deviceId || d.id;
      const start = performance.now();
      try {
        await client.get(`/devices/${devId}`);
        results[devId] = Math.max(8, Math.round(performance.now() - start));
      } catch {
        results[devId] = null;
      }
    }
    setPingLatencies(results);
    setPinging(false);
    showToast('✓ Fleet echo ping completed across active nodes.');
  };

  // Ping single device
  const handlePingSingle = async (devId, e) => {
    e.stopPropagation();
    const start = performance.now();
    try {
      await client.get(`/devices/${devId}`);
      const duration = Math.max(8, Math.round(performance.now() - start));
      setPingLatencies((prev) => ({ ...prev, [devId]: duration }));
    } catch {
      setPingLatencies((prev) => ({ ...prev, [devId]: null }));
    }
  };

  // Export Fleet Manifest
  const handleExportManifest = () => {
    const blob = new Blob([JSON.stringify(deviceList, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `airguard_fleet_manifest_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Fleet manifest JSON exported.');
  };

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return deviceList.filter((d) => {
      const isOnline = d.status === 'Online';
      if (statusFilter === 'Online' && !isOnline) return false;
      if (statusFilter === 'Offline' && isOnline) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (d.name || '').toLowerCase().includes(q);
        const matchId = (d.deviceId || d.id || '').toLowerCase().includes(q);
        const matchLoc = (d.location || '').toLowerCase().includes(q);
        const matchType = (d.type || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchLoc && !matchType) return false;
      }
      return true;
    });
  }, [deviceList, statusFilter, searchQuery]);

  // KPIs
  const stats = useMemo(() => {
    const total = deviceList.length;
    const online = deviceList.filter((d) => d.status === 'Online').length;
    const aqiSum = deviceList.reduce((acc, d) => acc + (d.aqi || 0), 0);
    const avgAqi = total > 0 ? Math.round(aqiSum / total) : 0;

    return {
      total,
      online,
      offline: total - online,
      avgAqi,
    };
  }, [deviceList]);

  return (
    <div className="devices-page">
      {/* Page Header */}
      <div className="page-header dashboard-header">
        <div>
          <h1 className="page-title">My Connected Devices</h1>
          <p className="page-subtitle">
            Monitor and manage the AirGuard devices connected to your account.
          </p>
        </div>

        <div className="devices-header-actions">
          <button
            className="btn-secondary"
            onClick={handleFleetPing}
            disabled={pinging}
          >
            {pinging ? '⚡ Echoing Fleet...' : '⚡ Fleet Echo Ping'}
          </button>
          <button className="btn-secondary" onClick={handleExportManifest}>
            📑 Export Manifest
          </button>
          <button className="btn-primary" onClick={() => setShowAddWizard(true)}>
            + Add New Device
          </button>
        </div>
      </div>

      {toastMessage && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            borderRadius: '10px',
            padding: '10px 16px',
            marginBottom: '18px',
            fontSize: '0.85rem',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* KPI Overview Grid */}
      <div className="devices-kpi-grid">
        <div className="devices-kpi-card">
          <span className="devices-kpi-title">
            <span>Registered Fleet</span>
            <span>📡</span>
          </span>
          <div className="devices-kpi-val" style={{ color: '#00d2b4' }}>
            {stats.total}
          </div>
          <span className="devices-kpi-sub">Total active microcontrollers</span>
        </div>

        <div className="devices-kpi-card">
          <span className="devices-kpi-title">
            <span>Online Ingestion</span>
            <span>🟢</span>
          </span>
          <div className="devices-kpi-val" style={{ color: '#10b981' }}>
            {stats.online}
          </div>
          <span className="devices-kpi-sub">Transmitting live telemetry</span>
        </div>

        <div className="devices-kpi-card">
          <span className="devices-kpi-title">
            <span>Standby / Silent</span>
            <span>⚪</span>
          </span>
          <div className="devices-kpi-val" style={{ color: stats.offline > 0 ? '#f59e0b' : '#94a3b8' }}>
            {stats.offline}
          </div>
          <span className="devices-kpi-sub">Nodes awaiting heartbeat</span>
        </div>

        <div className="devices-kpi-card">
          <span className="devices-kpi-title">
            <span>Fleet Mean AQI</span>
            <span>💨</span>
          </span>
          <div className="devices-kpi-val">{stats.avgAqi}</div>
          <span className="devices-kpi-sub">Composite sensor baseline</span>
        </div>

        <div className="devices-kpi-card">
          <span className="devices-kpi-title">
            <span>Ingestion Cycle</span>
            <span>⏱️</span>
          </span>
          <div className="devices-kpi-val" style={{ fontSize: '1.25rem' }}>15s Periodic</div>
          <span className="devices-kpi-sub">HTTPS REST / JSON Ingest</span>
        </div>
      </div>

      {/* Controls & Filter Toolbar */}
      <div className="devices-controls-card">
        <div className="devices-controls-group">
          {/* Search Box */}
          <div className="devices-search-box">
            <span>🔍</span>
            <input
              type="text"
              className="devices-search-input"
              placeholder="Search by Node ID, Name, or Location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="segmented-control" style={{ margin: 0 }}>
            {['All', 'Online', 'Offline'].map((st) => (
              <button
                key={st}
                type="button"
                className={`segmented-control__btn ${statusFilter === st ? 'is-active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="devices-controls-group">
          {/* View Mode Toggle */}
          <div className="segmented-control" style={{ margin: 0 }}>
            <button
              type="button"
              className={`segmented-control__btn ${viewMode === 'table' ? 'is-active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              Table View
            </button>
            <button
              type="button"
              className={`segmented-control__btn ${viewMode === 'grid' ? 'is-active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              Hardware Cards
            </button>
          </div>
        </div>
      </div>

      {/* ─── Empty State if User has no connected devices ─── */}
      {deviceList.length === 0 ? (
        <div
          className="devices-empty-state-card"
          style={{
            background: 'var(--bg-card, #121624)',
            border: '1px dashed var(--border-subtle, rgba(255, 255, 255, 0.15))',
            borderRadius: '16px',
            padding: '60px 24px',
            textAlign: 'center',
            margin: '24px 0',
          }}
        >
          <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>📡</div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', marginBottom: '8px' }}>
            No devices connected yet.
          </h2>
          <p style={{ color: 'var(--text-muted, #94a3b8)', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.6, fontSize: '0.95rem' }}>
            Connect/register your AirGuard device to start monitoring.
          </p>
          <button className="btn-primary" style={{ padding: '12px 24px', fontSize: '0.95rem' }} onClick={() => setShowAddWizard(true)}>
            + Add New Device
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="devices-table-card">
          <div className="devices-table-wrap">
            <table className="devices-table">
              <thead>
                <tr>
                  <th>DEVICE NODE</th>
                  <th>DEPLOYED LOCATION</th>
                  <th>STATUS & LATENCY</th>
                  <th>LIVE AQI</th>
                  <th>TEMP / HUM</th>
                  <th>GAS CONC.</th>
                  <th>LAST SEEN</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      No sensing nodes found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((device) => {
                    const devId = device.deviceId || device.id;
                    const isOnline = device.status === 'Online';
                    const timeAgo = formatTimeAgo(device.lastSeen);
                    const aqiObj = device.aqi != null ? classifyAQI(device.aqi) : null;
                    const latency = pingLatencies[devId];

                    return (
                      <tr key={devId} className="device-row">
                        <td onClick={() => setSelectedModalDevice(device)}>
                          <div style={{ fontWeight: 700, color: '#00d2b4', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{device.name || devId}</span>
                            {(devId === currentDeviceId || device.name === currentDeviceId) && (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(16, 185, 129, 0.18)',
                                  color: '#10b981',
                                  border: '1px solid rgba(16, 185, 129, 0.35)',
                                  fontWeight: 600,
                                }}
                              >
                                ⭐ Active
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                            {devId} · ESP32-WROOM
                          </div>
                        </td>

                        <td>
                          <span style={{ fontSize: '0.82rem' }}>📍 {device.location}</span>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="status-indicator">
                              <span className={`status-dot ${isOnline ? 'is-online' : 'is-standby'}`} />
                              <span className="status-label">{device.status || 'Offline'}</span>
                            </span>
                            {latency && (
                              <span style={{ fontSize: '0.7rem', color: '#00d2b4', fontFamily: 'monospace' }}>
                                ⚡ {latency}ms
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          {aqiObj ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: `${aqiObj.color}20`,
                                color: aqiObj.color,
                                border: `1px solid ${aqiObj.color}40`,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              <span>{device.aqi}</span>
                              <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>({aqiObj.category})</span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {device.temperature != null ? `${device.temperature}°C` : '—'} · {device.humidity != null ? `${device.humidity}%` : '—'}
                        </td>

                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {device.gasPPM != null ? `${device.gasPPM} PPM` : '—'}
                        </td>

                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#64748b' }}>
                          {timeAgo}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                              onClick={(e) => handlePingSingle(devId, e)}
                              title="Ping Node"
                            >
                              ⚡ Ping
                            </button>
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingDevice({ ...device });
                              }}
                              title="Edit Node Settings (Admin)"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.74rem',
                                color: 'var(--status-danger, #ef4444)',
                                borderColor: 'rgba(239, 68, 68, 0.3)',
                              }}
                              onClick={(e) => handleDeleteDevice(devId, device.name, e)}
                              title="Remove Node from Fleet (Admin)"
                            >
                              🗑️ Delete
                            </button>
                            <Link
                              to={`/devices/${devId}`}
                              className="btn-primary btn-sm"
                              style={{ padding: '4px 10px', fontSize: '0.74rem', textDecoration: 'none' }}
                            >
                              Inspect →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ─── VIEW 2: GRID CARDS VIEW ─── */
        <div className="devices-grid-view">
          {filteredDevices.map((device) => {
            const devId = device.deviceId || device.id;
            const isOnline = device.status === 'Online';
            const aqiObj = device.aqi != null ? classifyAQI(device.aqi) : null;
            const latency = pingLatencies[devId];

            return (
              <div
                key={devId}
                className="device-card-item"
                onClick={() => setSelectedModalDevice(device)}
              >
                <div className="device-card-top">
                  <div className="device-card-title-group">
                    <div className="device-icon-box">📡</div>
                    <div>
                      <div className="device-card-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{device.name || devId}</span>
                        {(devId === currentDeviceId || device.name === currentDeviceId) && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(16, 185, 129, 0.18)',
                              color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              fontWeight: 600,
                            }}
                          >
                            ⭐ Active
                          </span>
                        )}
                      </div>
                      <div className="device-card-id">{devId} · 📍 {device.location}</div>
                    </div>
                  </div>

                  <span className="status-indicator">
                    <span className={`status-dot ${isOnline ? 'is-online' : 'is-standby'}`} />
                    <span className="status-label" style={{ fontSize: '0.75rem' }}>{device.status}</span>
                  </span>
                </div>

                {/* 3-Stat Metric Strip */}
                <div className="device-stat-strip">
                  <div className="device-stat-box">
                    <span className="device-stat-lbl">AQI INDEX</span>
                    <span className="device-stat-val" style={{ color: aqiObj?.color || '#00d2b4' }}>
                      {device.aqi != null ? device.aqi : '—'}
                    </span>
                  </div>
                  <div className="device-stat-box">
                    <span className="device-stat-lbl">TEMP / HUM</span>
                    <span className="device-stat-val" style={{ fontSize: '0.9rem' }}>
                      {device.temperature != null ? `${device.temperature}°C` : '—'} · {device.humidity != null ? `${device.humidity}%` : '—'}
                    </span>
                  </div>
                  <div className="device-stat-box">
                    <span className="device-stat-lbl">GAS LEVEL</span>
                    <span className="device-stat-val" style={{ fontSize: '0.85rem' }}>
                      {device.gasPPM != null ? `${device.gasPPM} PPM` : '—'}
                    </span>
                  </div>
                </div>

                {/* Hardware Chips */}
                <div className="device-card-chips">
                  <span className="hardware-pill">ESP32-WROOM-32</span>
                  <span className="hardware-pill">MQ135 + DHT22</span>
                  <span className="signal-pill">📶 -62 dBm</span>
                  {latency && <span className="signal-pill">⚡ {latency}ms</span>}
                </div>

                <div className="device-card-footer" onClick={(e) => e.stopPropagation()}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Heartbeat: {formatTimeAgo(device.lastSeen)}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                      onClick={(e) => handlePingSingle(devId, e)}
                    >
                      Ping
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDevice({ ...device });
                      }}
                      title="Edit Node (Admin)"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.72rem',
                        color: 'var(--status-danger, #ef4444)',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                      }}
                      onClick={(e) => handleDeleteDevice(devId, device.name, e)}
                      title="Remove Node (Admin)"
                    >
                      🗑️
                    </button>
                    <Link
                      to={`/devices/${devId}`}
                      className="btn-primary btn-sm"
                      style={{ padding: '3px 10px', fontSize: '0.72rem', textDecoration: 'none' }}
                    >
                      Inspect →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Device Details Modal ─── */}
      {selectedModalDevice && (
        <div className="device-modal-backdrop" onClick={() => setSelectedModalDevice(null)}>
          <div className="device-modal" onClick={(e) => e.stopPropagation()}>
            <div className="device-modal__header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 className="device-modal__title">{selectedModalDevice.name}</h3>
                  {((selectedModalDevice.deviceId || selectedModalDevice.id) === currentDeviceId || selectedModalDevice.name === currentDeviceId) && (
                    <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.35)', fontWeight: 600 }}>
                      ⭐ Active Dashboard Station
                    </span>
                  )}
                </div>
                <span className="device-modal__subtitle">📍 {selectedModalDevice.location}</span>
              </div>
              <button
                className="device-modal__close"
                onClick={() => setSelectedModalDevice(null)}
              >
                ✕
              </button>
            </div>

            <div className="device-modal-grid">
              <div className="device-modal-item">
                <span className="device-modal-label">Node Identifier</span>
                <span className="device-modal-val mono" style={{ color: '#00d2b4' }}>
                  {selectedModalDevice.deviceId || selectedModalDevice.id}
                </span>
              </div>
              <div className="device-modal-item">
                <span className="device-modal-label">Hardware Architecture</span>
                <span className="device-modal-val">ESP32 Dual-Core 240MHz</span>
              </div>
              <div className="device-modal-item">
                <span className="device-modal-label">Integrated Sensor Bus</span>
                <span className="device-modal-val">MQ135 Gas + DHT22 Temp/Hum</span>
              </div>
              <div className="device-modal-item">
                <span className="device-modal-label">Firmware Revision</span>
                <span className="device-modal-val mono">v1.2.0-ieee</span>
              </div>
              <div className="device-modal-item">
                <span className="device-modal-label">Transmission Protocol</span>
                <span className="device-modal-val">HTTPS REST / JSON (15s cycle)</span>
              </div>
              <div className="device-modal-item">
                <span className="device-modal-label">Calibration R0</span>
                <span className="device-modal-val mono">76.63 kΩ (Fresh air baseline)</span>
              </div>
              <div className="device-modal-item">
                <span className="device-modal-label">Current AQI</span>
                <span className="device-modal-val mono" style={{ color: '#10b981' }}>
                  {selectedModalDevice.aqi != null ? selectedModalDevice.aqi : '—'}
                </span>
              </div>
              <div className="device-modal-item">
                <span className="device-modal-label">Wi-Fi Link Strength</span>
                <span className="device-modal-val mono" style={{ color: '#38bdf8' }}>
                  -62 dBm (Excellent)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  const id = selectedModalDevice.deviceId || selectedModalDevice.id;
                  setSelectedModalDevice(null);
                  navigate(`/devices/${id}`);
                }}
              >
                Inspect Telemetry Page →
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setSelectedModalDevice(null);
                  setShowAddWizard(true);
                }}
              >
                📶 Reconfigure Wi-Fi
              </button>
              {(() => {
                const modalId = selectedModalDevice.deviceId || selectedModalDevice.id;
                const isAlreadyActive = modalId === currentDeviceId || selectedModalDevice.name === currentDeviceId;
                return (
                  <button
                    type="button"
                    className="btn-primary"
                    style={
                      isAlreadyActive
                        ? { background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', borderColor: '#10b981' }
                        : {}
                    }
                    onClick={() => {
                      if (onSelectDevice) onSelectDevice(modalId);
                      showToast(`✓ "${selectedModalDevice.name || modalId}" is now your active dashboard station!`);
                      setSelectedModalDevice(null);
                      navigate('/dashboard');
                    }}
                  >
                    {isAlreadyActive ? '✓ Active Dashboard Station' : 'Set as Active Dashboard Station'}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Existing Node Modal (Admin) ─── */}
      {editingDevice && (
        <div className="device-modal-backdrop" onClick={() => setEditingDevice(null)}>
          <div className="device-modal" onClick={(e) => e.stopPropagation()}>
            <div className="device-modal__header">
              <div>
                <h3 className="device-modal__title">✏️ Edit Sensing Node Configuration</h3>
                <span className="device-modal__subtitle">
                  Modify parameters for {editingDevice.deviceId || editingDevice.id}
                </span>
              </div>
              <button
                className="device-modal__close"
                onClick={() => setEditingDevice(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateDevice}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '16px 0' }}>
                <div>
                  <label className="device-modal-label" style={{ display: 'block', marginBottom: '4px' }}>
                    Hardware Node ID (Fixed Firmware Identifier)
                  </label>
                  <input
                    type="text"
                    disabled
                    className="rules-input"
                    style={{ width: '100%', padding: '8px 12px', opacity: 0.7, background: 'rgba(0,0,0,0.3)' }}
                    value={editingDevice.deviceId || editingDevice.id}
                  />
                  <span className="fs-xs text-muted">Fixed identifier hardcoded in ESP32 firmware</span>
                </div>

                <div>
                  <label className="device-modal-label" style={{ display: 'block', marginBottom: '4px' }}>
                    Display Station Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AIRGUARD-001 (Main Gate)"
                    className="rules-input"
                    style={{ width: '100%', padding: '8px 12px' }}
                    value={editingDevice.name || ''}
                    onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="device-modal-label" style={{ display: 'block', marginBottom: '4px' }}>
                    Deployment Location / Campus Area
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Library Block North"
                    className="rules-input"
                    style={{ width: '100%', padding: '8px 12px' }}
                    value={editingDevice.location || ''}
                    onChange={(e) => setEditingDevice({ ...editingDevice, location: e.target.value })}
                  />
                </div>

                <div>
                  <label className="device-modal-label" style={{ display: 'block', marginBottom: '4px' }}>
                    Microcontroller Architecture
                  </label>
                  <select
                    className="rules-input"
                    style={{ width: '100%', padding: '8px 12px' }}
                    value={editingDevice.type || 'ESP32 Sensing Node'}
                    onChange={(e) => setEditingDevice({ ...editingDevice, type: e.target.value })}
                  >
                    <option value="ESP32 Sensing Node">ESP32-WROOM-32D (Dual Core)</option>
                    <option value="ESP32-S3 AI Node">ESP32-S3 (AI Vector & USB)</option>
                    <option value="ESP8266 Node">ESP8266 NodeMCU</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingDevice(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CONSUMER IOT DEVICE ONBOARDING WIZARD ─── */}
      <AddDeviceWizard
        isOpen={showAddWizard}
        onClose={() => setShowAddWizard(false)}
        onDeviceAdded={(newDev) => {
          setDeviceList((prev) => [newDev, ...prev.filter((d) => (d.deviceId || d.id) !== newDev.deviceId)]);
          if (onSelectDevice) onSelectDevice(newDev.deviceId);
          showToast(`✓ Node "${newDev.name}" successfully connected and added to your fleet!`);
        }}
        onNavigateDashboard={() => navigate('/dashboard')}
      />
    </div>
  );
}
