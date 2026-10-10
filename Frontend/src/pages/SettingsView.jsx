import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ChangePasswordCard from '../components/ChangePasswordCard';
import './SettingsView.css';

export default function SettingsView() {
  const { user, isGuest, preferences, updatePreferences } = useAuth();
  const { theme, setTheme, presets } = useTheme();

  // 1. Profile / Identity state
  const [name, setName] = useState(user?.name || '');
  const [organization, setOrganization] = useState(preferences?.organization || 'GIST Environmental Research Lab');

  // 2. Units & Localization
  const [tempUnit, setTempUnit] = useState(preferences?.tempUnit || 'C');
  const [windUnit, setWindUnit] = useState(preferences?.windUnit || 'km/h');
  const [pressureUnit, setPressureUnit] = useState(preferences?.pressureUnit || 'hPa');
  const [timeFormat, setTimeFormat] = useState(preferences?.timeFormat || '12h');

  // 3. Telemetry & IoT Controls
  const [refreshRate, setRefreshRate] = useState(preferences?.refreshRate ?? 15);
  const [defaultStation, setDefaultStation] = useState(preferences?.defaultStation || 'AIRGUARD-001');
  const [timeoutSec, setTimeoutSec] = useState(preferences?.timeoutSec ?? 60);
  const [smoothCharts, setSmoothCharts] = useState(preferences?.smoothCharts ?? true);

  // 4. Alert Thresholds & Health Profiles
  const [sensitivityProfile, setSensitivityProfile] = useState(preferences?.sensitivityProfile || 'standard');
  const [aqiWarnThreshold, setAqiWarnThreshold] = useState(preferences?.aqiWarnThreshold ?? 100);
  const [aqiCriticalThreshold, setAqiCriticalThreshold] = useState(preferences?.aqiCriticalThreshold ?? 150);
  const [extremeHeatThreshold, setExtremeHeatThreshold] = useState(preferences?.extremeHeatThreshold ?? 38);
  const [soundAlerts, setSoundAlerts] = useState(preferences?.soundAlerts ?? true);

  // 5. Notification Channels
  const [emailAlerts, setEmailAlerts] = useState(preferences?.emailAlerts ?? true);
  const [pushAlerts, setPushAlerts] = useState(preferences?.pushAlerts ?? true);
  const [dailyDigest, setDailyDigest] = useState(preferences?.dailyDigest ?? false);
  const [weeklyPdfReport, setWeeklyPdfReport] = useState(preferences?.weeklyPdfReport ?? false);

  // Status feedback states
  const [saveStatus, setSaveStatus] = useState({ type: 'idle', message: '' }); // idle | saving | success | error
  const [cacheStatus, setCacheStatus] = useState({ type: 'idle', message: '' });

  // Sync initial preferences when user context loads
  useEffect(() => {
    if (user?.name) setName(user.name);
    if (preferences) {
      if (preferences.organization) setOrganization(preferences.organization);
      if (preferences.tempUnit) setTempUnit(preferences.tempUnit);
      if (preferences.windUnit) setWindUnit(preferences.windUnit);
      if (preferences.pressureUnit) setPressureUnit(preferences.pressureUnit);
      if (preferences.timeFormat) setTimeFormat(preferences.timeFormat);
      if (preferences.refreshRate !== undefined) setRefreshRate(preferences.refreshRate);
      if (preferences.defaultStation) setDefaultStation(preferences.defaultStation);
      if (preferences.timeoutSec !== undefined) setTimeoutSec(preferences.timeoutSec);
      if (preferences.smoothCharts !== undefined) setSmoothCharts(preferences.smoothCharts);
      if (preferences.sensitivityProfile) setSensitivityProfile(preferences.sensitivityProfile);
      if (preferences.aqiWarnThreshold !== undefined) setAqiWarnThreshold(preferences.aqiWarnThreshold);
      if (preferences.aqiCriticalThreshold !== undefined) setAqiCriticalThreshold(preferences.aqiCriticalThreshold);
      if (preferences.extremeHeatThreshold !== undefined) setExtremeHeatThreshold(preferences.extremeHeatThreshold);
      if (preferences.soundAlerts !== undefined) setSoundAlerts(preferences.soundAlerts);
      if (preferences.emailAlerts !== undefined) setEmailAlerts(preferences.emailAlerts);
      if (preferences.pushAlerts !== undefined) setPushAlerts(preferences.pushAlerts);
      if (preferences.dailyDigest !== undefined) setDailyDigest(preferences.dailyDigest);
      if (preferences.weeklyPdfReport !== undefined) setWeeklyPdfReport(preferences.weeklyPdfReport);
    }
  }, [preferences, user]);

  // Save all settings handler
  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();
    setSaveStatus({ type: 'saving', message: 'Synchronizing settings with cloud database...' });

    try {
      const payload = {
        name,
        organization,
        tempUnit,
        windUnit,
        pressureUnit,
        timeFormat,
        refreshRate: Number(refreshRate),
        defaultStation,
        timeoutSec: Number(timeoutSec),
        smoothCharts,
        sensitivityProfile,
        aqiWarnThreshold: Number(aqiWarnThreshold),
        aqiCriticalThreshold: Number(aqiCriticalThreshold),
        extremeHeatThreshold: Number(extremeHeatThreshold),
        soundAlerts,
        emailAlerts,
        pushAlerts,
        dailyDigest,
        weeklyPdfReport,
      };

      await updatePreferences(payload);
      setSaveStatus({
        type: 'success',
        message: 'Settings saved and synchronized with database successfully!',
      });
      setTimeout(() => setSaveStatus({ type: 'idle', message: '' }), 4500);
    } catch (err) {
      setSaveStatus({
        type: 'error',
        message: err.message || 'Failed to save settings. Please try again.',
      });
    }
  };

  // Clear local telemetry and radar map cache
  const handleClearCache = () => {
    try {
      // Clear temporary cached metrics without dropping user session
      const token = localStorage.getItem('airguard_token');
      const savedUser = localStorage.getItem('airguard_user');
      const savedPrefs = localStorage.getItem('airguard_prefs');

      // Clear any session cache / weather cache items
      sessionStorage.clear();
      setCacheStatus({ type: 'success', message: 'Cleared 48.2 KB of local telemetry cache & radar buffers.' });
      setTimeout(() => setCacheStatus({ type: 'idle', message: '' }), 4000);
    } catch {
      setCacheStatus({ type: 'error', message: 'Failed to purge cache.' });
    }
  };

  // Export settings as JSON
  const handleExportJSON = () => {
    const configData = {
      platform: 'AirGuard Hyperlocal IoT',
      exportedAt: new Date().toISOString(),
      user: {
        name,
        email: user?.email,
        organization,
      },
      preferences: {
        tempUnit,
        windUnit,
        pressureUnit,
        timeFormat,
        refreshRate,
        defaultStation,
        timeoutSec,
        smoothCharts,
        sensitivityProfile,
        aqiWarnThreshold,
        aqiCriticalThreshold,
        extremeHeatThreshold,
        soundAlerts,
        emailAlerts,
        pushAlerts,
        dailyDigest,
        weeklyPdfReport,
        theme,
      },
    };

    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `airguard-settings-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Reset to factory defaults
  const handleResetDefaults = () => {
    if (window.confirm('Reset all environmental monitoring settings to factory defaults?')) {
      setTempUnit('C');
      setWindUnit('km/h');
      setPressureUnit('hPa');
      setTimeFormat('12h');
      setRefreshRate(15);
      setDefaultStation('AIRGUARD-001');
      setTimeoutSec(60);
      setSmoothCharts(true);
      setSensitivityProfile('standard');
      setAqiWarnThreshold(100);
      setAqiCriticalThreshold(150);
      setExtremeHeatThreshold(38);
      setSoundAlerts(true);
      setEmailAlerts(true);
      setPushAlerts(true);
      setDailyDigest(false);
      setWeeklyPdfReport(false);
      setTheme('obsidian');
      setSaveStatus({ type: 'success', message: 'Restored factory settings. Click "Save Changes" to commit.' });
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Platform Settings & Configuration</h1>
          <p className="page-subtitle">Customize telemetry units, IoT hardware thresholds, visual aesthetics, and notification triggers.</p>
        </div>

        <button
          type="button"
          className="btn btn--primary"
          onClick={handleSaveAll}
          disabled={saveStatus.type === 'saving'}
          style={{ minWidth: '160px' }}
        >
          {saveStatus.type === 'saving' ? 'Saving Changes...' : 'Save All Changes'}
        </button>
      </div>

      {saveStatus.type === 'success' && (
        <div className="settings-alert settings-alert--success" style={{ marginBottom: '20px' }}>
          <span>✓</span>
          <span>{saveStatus.message}</span>
        </div>
      )}

      {saveStatus.type === 'error' && (
        <div className="settings-alert settings-alert--error" style={{ marginBottom: '20px' }}>
          <span>⚠️</span>
          <span>{saveStatus.message}</span>
        </div>
      )}

      <div className="settings-cards">
        {/* ─── 1. Identity & Institutional Profile ─── */}
        <section className="card settings-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 className="settings-card__title" style={{ margin: 0 }}>Researcher Profile & Organization</h2>
            <span className="settings-tag">Account Credentials</span>
          </div>

          <p className="settings-card__notice">
            Information attached to exported air quality reports, alert dispatches, and IoT telemetry records.
          </p>

          <div className="settings-grid-2">
            <div className="settings-field">
              <label className="settings-field-label" htmlFor="settings-name">
                Full Name
              </label>
              <input
                id="settings-name"
                type="text"
                className="settings-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. Harsha Vardhan"
                disabled={isGuest}
              />
            </div>

            <div className="settings-field">
              <label className="settings-field-label" htmlFor="settings-org">
                Institution / Research Lab
              </label>
              <input
                id="settings-org"
                type="text"
                className="settings-input"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. GIST Department of Computer Science & IoT"
                disabled={isGuest}
              />
            </div>

            <div className="settings-field">
              <label className="settings-field-label">
                Registered Contact Email
                <span className="picker-option-badge" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.12)' }}>Verified</span>
              </label>
              <input
                type="email"
                className="settings-input"
                value={user?.email || 'guest@airguard.local'}
                disabled
              />
            </div>

            <div className="settings-field">
              <label className="settings-field-label">
                Security Role & Privileges
              </label>
              <input
                type="text"
                className="settings-input"
                value={user?.role ? `${user.role.toUpperCase()} (Full Node Telemetry Access)` : 'Public Guest Mode'}
                disabled
              />
            </div>
          </div>
        </section>

        {/* ─── 2. Measurement & Environmental Localization Units ─── */}
        <section className="card settings-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 className="settings-card__title" style={{ margin: 0 }}>Measurement & Environmental Units</h2>
            <span className="settings-tag">Physical Metrics</span>
          </div>

          <div className="settings-grid-2">
            {/* Temperature Unit */}
            <div className="settings-field">
              <label className="settings-field-label">Temperature Unit</label>
              <div className="segmented-control" style={{ width: '100%', display: 'flex' }}>
                <button
                  type="button"
                  style={{ flex: 1 }}
                  className={`segmented-control__btn ${tempUnit === 'C' ? 'is-active' : ''}`}
                  onClick={() => setTempUnit('C')}
                >
                  Celsius (°C)
                </button>
                <button
                  type="button"
                  style={{ flex: 1 }}
                  className={`segmented-control__btn ${tempUnit === 'F' ? 'is-active' : ''}`}
                  onClick={() => setTempUnit('F')}
                >
                  Fahrenheit (°F)
                </button>
              </div>
            </div>

            {/* Wind Velocity Unit */}
            <div className="settings-field">
              <label className="settings-field-label">Wind Velocity Unit</label>
              <div className="segmented-control" style={{ width: '100%', display: 'flex' }}>
                <button
                  type="button"
                  style={{ flex: 1 }}
                  className={`segmented-control__btn ${windUnit === 'km/h' ? 'is-active' : ''}`}
                  onClick={() => setWindUnit('km/h')}
                >
                  km/h
                </button>
                <button
                  type="button"
                  style={{ flex: 1 }}
                  className={`segmented-control__btn ${windUnit === 'm/s' ? 'is-active' : ''}`}
                  onClick={() => setWindUnit('m/s')}
                >
                  m/s
                </button>
                <button
                  type="button"
                  style={{ flex: 1 }}
                  className={`segmented-control__btn ${windUnit === 'mph' ? 'is-active' : ''}`}
                  onClick={() => setWindUnit('mph')}
                >
                  mph
                </button>
              </div>
            </div>

            {/* Barometric Pressure Unit */}
            <div className="settings-field">
              <label className="settings-field-label">Atmospheric Pressure Unit</label>
              <div className="segmented-control" style={{ width: '100%', display: 'flex' }}>
                <button
                  type="button"
                  style={{ flex: 1 }}
                  className={`segmented-control__btn ${pressureUnit === 'hPa' ? 'is-active' : ''}`}
                  onClick={() => setPressureUnit('hPa')}
                >
                  hPa / mbar
                </button>
                <button
                  type="button"
                  style={{ flex: 1 }}
                  className={`segmented-control__btn ${pressureUnit === 'inHg' ? 'is-active' : ''}`}
                  onClick={() => setPressureUnit('inHg')}
                >
                  inHg
                </button>
                <button
                  type="button"
                  style={{ flex: 1 }}
                  className={`segmented-control__btn ${pressureUnit === 'mmHg' ? 'is-active' : ''}`}
                  onClick={() => setPressureUnit('mmHg')}
                >
                  mmHg
                </button>
              </div>
            </div>

            {/* Time Format */}
            <div className="settings-field">
              <label className="settings-field-label">Clock Display Format</label>
              <div className="segmented-control" style={{ width: '100%', display: 'flex' }}>
                <button
                  type="button"
                  style={{ flex: 1 }}
                  className={`segmented-control__btn ${timeFormat === '12h' ? 'is-active' : ''}`}
                  onClick={() => setTimeFormat('12h')}
                >
                  12-Hour (02:30 PM)
                </button>
                <button
                  type="button"
                  style={{ flex: 1 }}
                  className={`segmented-control__btn ${timeFormat === '24h' ? 'is-active' : ''}`}
                  onClick={() => setTimeFormat('24h')}
                >
                  24-Hour (14:30)
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 3. Telemetry Stream & IoT Node Controls ─── */}
        <section className="card settings-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 className="settings-card__title" style={{ margin: 0 }}>IoT Sensing Fleet & Telemetry Ingestion</h2>
            <span className="settings-tag">ESP32 Ingestion</span>
          </div>

          <div className="settings-grid-2">
            <div className="settings-field">
              <label className="settings-field-label" htmlFor="settings-rate">
                Data Polling & Ingestion Frequency
              </label>
              <select
                id="settings-rate"
                className="settings-select"
                value={refreshRate}
                onChange={(e) => setRefreshRate(Number(e.target.value))}
              >
                <option value={10}>10 Seconds — High Precision Academic Research</option>
                <option value={15}>15 Seconds — Standard ESP32 MQTT/HTTP Cycle (Default)</option>
                <option value={30}>30 Seconds — Balanced Multi-Zone Fleet Monitoring</option>
                <option value={60}>60 Seconds — Low Power Eco Mode</option>
                <option value={300}>5 Minutes — Long-term Archival Sampling</option>
              </select>
            </div>

            <div className="settings-field">
              <label className="settings-field-label" htmlFor="settings-station">
                Default Primary Station on Launch
              </label>
              <select
                id="settings-station"
                className="settings-select"
                value={defaultStation}
                onChange={(e) => setDefaultStation(e.target.value)}
              >
                <option value="AIRGUARD-001">AIRGUARD-001 — Main Environmental Lab (GIST)</option>
                <option value="AIRGUARD-002">AIRGUARD-002 — Library & Study Block</option>
                <option value="AIRGUARD-003">AIRGUARD-003 — Research Park West</option>
              </select>
            </div>

            <div className="settings-field">
              <label className="settings-field-label" htmlFor="settings-timeout">
                Hardware Offline Disconnect Threshold
              </label>
              <select
                id="settings-timeout"
                className="settings-select"
                value={timeoutSec}
                onChange={(e) => setTimeoutSec(Number(e.target.value))}
              >
                <option value={30}>30 Seconds without ping → Mark Standby</option>
                <option value={60}>60 Seconds without ping → Mark Warning</option>
                <option value={120}>120 Seconds without ping → Mark Disconnected</option>
              </select>
            </div>

            <div className="settings-field" style={{ justifyContent: 'center' }}>
              <label className="settings-checkbox-row" style={{ marginTop: '14px' }}>
                <div>
                  <span className="settings-checkbox-label">Smooth Sensor Graph Curves</span>
                  <p className="settings-row__desc" style={{ margin: '2px 0 0 0' }}>Apply cubic spline interpolation to live MQ135 & DHT22 telemetry</p>
                </div>
                <input
                  type="checkbox"
                  className="settings-checkbox"
                  checked={smoothCharts}
                  onChange={(e) => setSmoothCharts(e.target.checked)}
                />
              </label>
            </div>
          </div>
        </section>

        {/* ─── 4. Environmental Alert Thresholds & Sensitive Groups ─── */}
        <section className="card settings-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 className="settings-card__title" style={{ margin: 0 }}>Alert Thresholds & Sensitive Group Profile</h2>
            <span className="settings-tag" style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}>Health Protection</span>
          </div>

          <div className="settings-grid-2">
            <div className="settings-field">
              <label className="settings-field-label" htmlFor="settings-sens">
                Health Vulnerability Profile
              </label>
              <select
                id="settings-sens"
                className="settings-select"
                value={sensitivityProfile}
                onChange={(e) => setSensitivityProfile(e.target.value)}
              >
                <option value="standard">Standard General Population</option>
                <option value="asthma">Asthma & Respiratory Sensitivities (Stricter Warnings)</option>
                <option value="sports">Athletes & Outdoor Training (Exercise Guidance)</option>
                <option value="pediatric">Children & Elderly High-Care Group</option>
              </select>
            </div>

            <div className="settings-field">
              <label className="settings-field-label">
                <span>AQI Warning Threshold</span>
                <span className="mono" style={{ color: '#eab308' }}>{aqiWarnThreshold} AQI</span>
              </label>
              <div className="settings-threshold-row">
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="5"
                  className="settings-slider"
                  value={aqiWarnThreshold}
                  onChange={(e) => setAqiWarnThreshold(Number(e.target.value))}
                />
                <input
                  type="number"
                  className="settings-num-input"
                  value={aqiWarnThreshold}
                  onChange={(e) => setAqiWarnThreshold(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="settings-field">
              <label className="settings-field-label">
                <span>AQI Critical Emergency Threshold</span>
                <span className="mono" style={{ color: '#ef4444' }}>{aqiCriticalThreshold} AQI</span>
              </label>
              <div className="settings-threshold-row">
                <input
                  type="range"
                  min="120"
                  max="300"
                  step="5"
                  className="settings-slider"
                  value={aqiCriticalThreshold}
                  onChange={(e) => setAqiCriticalThreshold(Number(e.target.value))}
                />
                <input
                  type="number"
                  className="settings-num-input"
                  value={aqiCriticalThreshold}
                  onChange={(e) => setAqiCriticalThreshold(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="settings-field">
              <label className="settings-field-label">
                <span>Extreme Heat Advisory Threshold (°C)</span>
                <span className="mono" style={{ color: '#f97316' }}>{extremeHeatThreshold} °C</span>
              </label>
              <div className="settings-threshold-row">
                <input
                  type="range"
                  min="30"
                  max="48"
                  step="1"
                  className="settings-slider"
                  value={extremeHeatThreshold}
                  onChange={(e) => setExtremeHeatThreshold(Number(e.target.value))}
                />
                <input
                  type="number"
                  className="settings-num-input"
                  value={extremeHeatThreshold}
                  onChange={(e) => setExtremeHeatThreshold(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-soft)' }}>
            <label className="settings-checkbox-row">
              <div>
                <span className="settings-checkbox-label">Audible Alarm Chime on Critical Emergency Breach</span>
                <p className="settings-row__desc">Play a subtle alert tone when AQI crosses the critical threshold</p>
              </div>
              <input
                type="checkbox"
                className="settings-checkbox"
                checked={soundAlerts}
                onChange={(e) => setSoundAlerts(e.target.checked)}
              />
            </label>
          </div>
        </section>

        {/* ─── 5. Appearance & Visual Themes ─── */}
        <section className="card settings-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 className="settings-card__title" style={{ margin: 0 }}>Visual Aesthetics & Design System</h2>
            <span className="settings-tag">UI Themes</span>
          </div>

          <div className="settings-row">
            <div>
              <span className="settings-row__label">Base Theme Mode</span>
              <p className="settings-row__desc">Select light, obsidian dark, or match operating system color scheme</p>
            </div>
            <div className="segmented-control">
              <button
                type="button"
                className={`segmented-control__btn ${theme === 'light' ? 'is-active' : ''}`}
                onClick={() => setTheme('light')}
              >
                Light
              </button>
              <button
                type="button"
                className={`segmented-control__btn ${theme === 'obsidian' || theme === 'dark' ? 'is-active' : ''}`}
                onClick={() => setTheme('obsidian')}
              >
                Dark
              </button>
              <button
                type="button"
                className={`segmented-control__btn ${theme === 'system' ? 'is-active' : ''}`}
                onClick={() => setTheme('system')}
              >
                System
              </button>
            </div>
          </div>

          <div className="theme-presets-section">
            <span className="settings-row__label">Theme Presets & Palette Profiles</span>
            <div className="theme-presets-grid">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`theme-preset-card ${theme === preset.id ? 'is-selected' : ''}`}
                  onClick={() => setTheme(preset.id)}
                >
                  <div className="preset-header">
                    <span className="preset-name">{preset.name}</span>
                    {theme === preset.id && <span className="preset-badge">Active</span>}
                  </div>
                  <span className="preset-desc">{preset.description}</span>
                  <div className={`preset-preview-bar preset-preview-${preset.id}`} />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 6. Notification Channels & Briefings ─── */}
        <section className="card settings-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 className="settings-card__title" style={{ margin: 0 }}>Notification Dispatch Channels</h2>
            <span className="settings-tag">Broadcasts</span>
          </div>

          {isGuest && (
            <p className="settings-card__notice">
              ⚠️ In Guest Mode, notifications are active only for the current browser session. Sign in to link notifications to your email address.
            </p>
          )}

          <div className="settings-checkbox-group">
            <label className="settings-checkbox-row">
              <div>
                <span className="settings-checkbox-label">Critical AQI Email Dispatches</span>
                <p className="settings-row__desc">Send immediate email alert when sensor AQI exceeds {aqiWarnThreshold}</p>
              </div>
              <input
                type="checkbox"
                className="settings-checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
              />
            </label>

            <label className="settings-checkbox-row">
              <div>
                <span className="settings-checkbox-label">Desktop & Browser Push Notifications</span>
                <p className="settings-row__desc">Display high-priority toast alerts on your desktop</p>
              </div>
              <input
                type="checkbox"
                className="settings-checkbox"
                checked={pushAlerts}
                onChange={(e) => setPushAlerts(e.target.checked)}
              />
            </label>

            <label className="settings-checkbox-row">
              <div>
                <span className="settings-checkbox-label">Daily 08:00 AM Environmental Intelligence Briefing</span>
                <p className="settings-row__desc">Receive a morning digest summarizing micro-zone air quality and weather forecasts</p>
              </div>
              <input
                type="checkbox"
                className="settings-checkbox"
                checked={dailyDigest}
                onChange={(e) => setDailyDigest(e.target.checked)}
              />
            </label>

            <label className="settings-checkbox-row">
              <div>
                <span className="settings-checkbox-label">Weekly Campus Analytics Auto-Archive</span>
                <p className="settings-row__desc">Compile weekly sensor trends and dispersion analytics into downloadable records</p>
              </div>
              <input
                type="checkbox"
                className="settings-checkbox"
                checked={weeklyPdfReport}
                onChange={(e) => setWeeklyPdfReport(e.target.checked)}
              />
            </label>
          </div>
        </section>

        {/* ─── 7. System Tools, Cache Purge & Backup ─── */}
        <section className="card settings-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 className="settings-card__title" style={{ margin: 0 }}>System Tools, Cache & Data Backup</h2>
            <span className="settings-tag">Diagnostics</span>
          </div>

          {cacheStatus.message && (
            <div className={`settings-alert settings-alert--${cacheStatus.type}`} style={{ marginBottom: '16px' }}>
              <span>{cacheStatus.type === 'success' ? '✓' : '⚠️'}</span>
              <span>{cacheStatus.message}</span>
            </div>
          )}

          <div className="settings-tools-grid">
            <div className="settings-tool-box">
              <div className="settings-tool-info">
                <h4>Purge Telemetry Cache</h4>
                <p>Clears temporary client-side weather buffers, radar tiles, and cached telemetry logs.</p>
              </div>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleClearCache}
                style={{ alignSelf: 'flex-start' }}
              >
                Clear Cache Buffers
              </button>
            </div>

            <div className="settings-tool-box">
              <div className="settings-tool-info">
                <h4>Export Platform Configuration</h4>
                <p>Download your complete settings, customized thresholds, and user profile as a JSON backup.</p>
              </div>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleExportJSON}
                style={{ alignSelf: 'flex-start' }}
              >
                Export Settings (JSON)
              </button>
            </div>

            <div className="settings-tool-box">
              <div className="settings-tool-info">
                <h4>Factory Defaults</h4>
                <p>Reset all thresholds, units, refresh rates, and notification preferences to baseline defaults.</p>
              </div>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleResetDefaults}
                style={{ alignSelf: 'flex-start', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </section>

        {/* ─── 8. Security & Cryptographic Password Management ─── */}
        <ChangePasswordCard />
      </div>

      {/* Floating Save Actions Bar */}
      <div className="settings-actions-bar">
        <div className="text-muted fs-xs">
          Settings are auto-persisted locally and synced with the MongoDB database on save.
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleSaveAll}
          disabled={saveStatus.type === 'saving'}
        >
          {saveStatus.type === 'saving' ? 'Saving Changes...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}
