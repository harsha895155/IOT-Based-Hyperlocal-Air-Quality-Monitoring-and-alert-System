import React, { useState } from 'react';
import AQIHero from '../components/AQIHero';
import StatCard from '../components/StatCard';
import TrendChart from '../components/TrendChart';
import { formatTimeAgo } from '../hooks/useReadings';
import { classifyAQI } from '../utils/aqi';
import './Dashboard.css';

const ThermoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z" />
  </svg>
);

const DropletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2s7 8.5 7 13a7 7 0 0 1-14 0c0-4.5 7-13 7-13Z" />
  </svg>
);

const WindIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 8h9.5a2.5 2.5 0 1 0-2.4-3.2M3 12h13a2.5 2.5 0 1 1-2.4 3.2M3 16h7.5a2.5 2.5 0 1 1-2.4 3.2" />
  </svg>
);

export default function Dashboard({ readingsData, onNavigateTab }) {
  const {
    latest,
    trend,
    alerts,
    devices,
    selectedDevice,
    setSelectedDevice,
    activeDevicesCount,
    loading,
    loadError,
    reload,
  } = readingsData;

  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false);

  const currentDevice =
    devices.find((d) => d.id === selectedDevice || d.deviceId === selectedDevice) ||
    devices[0] || {
      id: selectedDevice,
      name: selectedDevice.toUpperCase(),
      location: 'GIST Campus',
      status: 'Offline',
    };

  const aqiVal = latest?.airQuality;
  const hasReading = typeof aqiVal === 'number';
  const { category, color } = classifyAQI(aqiVal ?? 0);
  const tempVal = latest?.temperature != null ? Number(latest.temperature).toFixed(1) : null;
  const humidityVal = latest?.humidity != null ? Math.round(latest.humidity) : null;
  const gasVal = latest?.gasPPM != null ? Math.round(latest.gasPPM) : null;
  const activeAlertsCount = alerts.filter((a) => !a.acknowledged).length;
  const timeAgo = formatTimeAgo(latest?.createdAt);

  const recentAlert = alerts[0];

  return (
    <div className="dashboard-view">
      {/* Error state banner */}
      {loadError && (
        <div className="card dashboard__banner error-banner">
          <span>{loadError}</span>
          <button className="btn-secondary btn-sm" onClick={reload}>Retry</button>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header dashboard-header">
        <div>
          <h1 className="page-title">Air Quality Overview</h1>
          <p className="page-subtitle">Real-time hyperlocal sensor telemetry and environmental intelligence.</p>
        </div>

        {/* Device selector dropdown */}
        <div className="device-picker-wrap">
          <button
            type="button"
            className="device-picker-btn"
            onClick={() => setDeviceDropdownOpen((prev) => !prev)}
            aria-expanded={deviceDropdownOpen}
          >
            <span className="device-picker-name">
              {currentDevice.name} — {currentDevice.location}
            </span>
            <svg
              className={`dropdown-chevron ${deviceDropdownOpen ? 'is-flipped' : ''}`}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {deviceDropdownOpen && (
            <div className="card device-picker-dropdown">
              {devices.length === 0 ? (
                <div className="device-picker-option text-muted">No nodes registered</div>
              ) : (
                devices.map((dev) => (
                  <button
                    key={dev.id}
                    type="button"
                    className={`device-picker-option ${dev.id === selectedDevice ? 'is-selected' : ''}`}
                    onClick={() => {
                      setSelectedDevice(dev.id);
                      setDeviceDropdownOpen(false);
                    }}
                  >
                    <span className="picker-option-name">{dev.name} — {dev.location}</span>
                    <span className={`status-indicator-sm ${dev.status === 'Online' ? 'is-online' : 'is-standby'}`}>
                      {dev.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Top 5 KPI Summary Cards (Real database counts) */}
      <div className="dashboard__kpis">
        <div className="card kpi-card">
          <span className="kpi-card__label">CURRENT AQI</span>
          <div className="kpi-card__val mono">{hasReading ? aqiVal : '—'}</div>
          <span className="kpi-card__sub" style={{ color: hasReading ? color : 'var(--text-faint)' }}>
            {hasReading ? category : 'No Data'}
          </span>
        </div>

        <div className="card kpi-card">
          <span className="kpi-card__label">TEMPERATURE</span>
          <div className="kpi-card__val mono">
            {tempVal != null ? `${tempVal} °C` : '—'}
          </div>
        </div>

        <div className="card kpi-card">
          <span className="kpi-card__label">HUMIDITY</span>
          <div className="kpi-card__val mono">
            {humidityVal != null ? `${humidityVal}%` : '—'}
          </div>
        </div>

        <div className="card kpi-card">
          <span className="kpi-card__label">ACTIVE DEVICES</span>
          <div className="kpi-card__val mono">
            {activeDevicesCount} / {devices.length || 1}
          </div>
        </div>

        <div className="card kpi-card">
          <span className="kpi-card__label">ACTIVE ALERTS</span>
          <div
            className="kpi-card__val mono"
            style={{ color: activeAlertsCount > 0 ? 'var(--badge-alert-bg)' : 'var(--text-primary)' }}
          >
            {activeAlertsCount}
          </div>
        </div>
      </div>

      {/* Loading state indicator */}
      {loading && !hasReading && (
        <div className="card dashboard-loading-card">
          <span className="pulse-loader" />
          <p>Connecting to backend and awaiting sensor stream...</p>
        </div>
      )}

      {/* Main AQI Hero Gauge Card */}
      <div className="dashboard__section">
        <AQIHero reading={latest} />
      </div>

      {/* 3 Secondary Metric Stat Cards */}
      <div className="dashboard__stats-row">
        <StatCard label="Temperature" value={tempVal} unit="°C" icon={<ThermoIcon />} />
        <StatCard label="Humidity" value={humidityVal} unit="%" icon={<DropletIcon />} />
        <StatCard label="Gas Concentration" value={gasVal} unit="ppm" icon={<WindIcon />} />
      </div>

      {/* Trend Chart (Driven by real DB history) */}
      <div className="dashboard__section">
        <TrendChart data={trend} />
      </div>

      {/* Bottom Grid: Device Status & Recent Alerts */}
      <div className="dashboard__bottom-grid">
        {/* Device Status Card */}
        <div className="card device-status-card">
          <h2 className="card-section-title">Device Status</h2>
          <div className="device-status-row">
            <div>
              <span className="device-status-name">{currentDevice.name}</span>
              <span className="device-status-loc text-muted"> · {currentDevice.location}</span>
            </div>
            <span className="status-indicator">
              <span className={`status-dot ${currentDevice.status === 'Online' ? 'is-online' : 'is-standby'}`} />
              <span className="status-label">{currentDevice.status}</span>
            </span>
          </div>
          <div className="device-status-foot text-faint fs-xs mono">
            Node ID: {currentDevice.id} · Last ping: {formatTimeAgo(currentDevice.lastSeen)}
          </div>
        </div>

        {/* Recent Alerts Card (Deduplicated R7) */}
        <div className="card recent-alerts-card">
          <h2 className="card-section-title">Recent Alerts</h2>
          {recentAlert ? (
            <div className="recent-alert-item">
              <div className="recent-alert-top">
                <span className="recent-alert-title" style={{ color: classifyAQI(recentAlert.airQuality).color }}>
                  {recentAlert.category}
                </span>
                <span className="recent-alert-time">{formatTimeAgo(recentAlert.createdAt)}</span>
              </div>
              <div className="recent-alert-sub mono">
                {recentAlert.deviceId} · AQI {recentAlert.airQuality}
                {recentAlert.seenCount > 1 && ` · seen ${recentAlert.seenCount}×`}
              </div>
              <p className="recent-alert-msg text-muted fs-xs mt-2">{recentAlert.message}</p>
            </div>
          ) : (
            <div className="recent-alert-empty text-muted">
              ✓ Normal air quality. No active alerts on record.
            </div>
          )}
          <button
            type="button"
            className="view-alerts-link"
            onClick={() => onNavigateTab('alerts')}
          >
            View All Alerts ({alerts.length})
          </button>
        </div>
      </div>

      {/* Dashboard Footer */}
      <footer className="dashboard-footer">
        <span>{currentDevice.location}</span>
        <span className="footer-sep">·</span>
        <span>{latest ? `Last telemetry packet received ${timeAgo}` : 'Waiting for device transmission'}</span>
      </footer>
    </div>
  );
}
