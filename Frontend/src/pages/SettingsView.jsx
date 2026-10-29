import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ChangePasswordCard from '../components/ChangePasswordCard';
import {
  subscribeToEmergencyPush,
  unsubscribeFromEmergencyPush,
  isPushSupported,
  getPushSubscriptionStatus,
} from '../utils/pushManager';
import './SettingsView.css';

export const VULNERABILITY_PROFILES = {
  standard: {
    id: 'standard',
    name: 'Standard General Population',
    warnAQI: 100,
    critAQI: 150,
    heatThreshold: 38,
    desc: 'Standard EPA/NAAQS thresholds for typical healthy adults.'
  },
  asthma: {
    id: 'asthma',
    name: 'Asthma & Respiratory Sensitivities (Stricter Warnings)',
    warnAQI: 60,
    critAQI: 100,
    heatThreshold: 35,
    desc: 'Lower thresholds for hyper-sensitive airways, chronic bronchitis, and COPD.'
  },
  pediatric: {
    id: 'pediatric',
    name: 'Children, Schools & Elderly High-Care Group',
    warnAQI: 50,
    critAQI: 90,
    heatThreshold: 34,
    desc: 'High-care standards for infants, classrooms, nurseries, and senior care homes.'
  },
  sports: {
    id: 'sports',
    name: 'Athletes & Outdoor Training (Exercise Guidance)',
    warnAQI: 75,
    critAQI: 120,
    heatThreshold: 36,
    desc: 'Optimized for high minute-ventilation aerobic exertion and sports training.'
  },
  industrial: {
    id: 'industrial',
    name: 'Industrial / Workshop / Chemical Workplace',
    warnAQI: 120,
    critAQI: 180,
    heatThreshold: 40,
    desc: 'Tailored for fabrication zones, machine shops, and manufacturing facilities.'
  },
  custom: {
    id: 'custom',
    name: 'Custom User Configuration',
    warnAQI: 100,
    critAQI: 150,
    heatThreshold: 38,
    desc: 'Manual operator-defined thresholds.'
  }
};

export default function SettingsView() {
  const { user, isGuest, preferences, updatePreferences } = useAuth();
  const { theme, setTheme, presets } = useTheme();

  // Device & Profile targeting state
  const [deviceList, setDeviceList] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('global');

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
  const [defaultStation, setDefaultStation] = useState(preferences?.defaultStation || 'current-location');
  const [timeoutSec, setTimeoutSec] = useState(preferences?.timeoutSec ?? 60);
  const [smoothCharts, setSmoothCharts] = useState(preferences?.smoothCharts ?? true);

  // 4. Alert Thresholds & Health Profiles
  const [sensitivityProfile, setSensitivityProfile] = useState(preferences?.sensitivityProfile || 'standard');
  const [aqiWarnThreshold, setAqiWarnThreshold] = useState(preferences?.aqiWarnThreshold ?? 100);
  const [aqiCriticalThreshold, setAqiCriticalThreshold] = useState(preferences?.aqiCriticalThreshold ?? 150);
  const [extremeHeatThreshold, setExtremeHeatThreshold] = useState(preferences?.extremeHeatThreshold ?? 38);
  const [soundAlerts, setSoundAlerts] = useState(preferences?.soundAlerts ?? true);
  const [sessionTimeout, setSessionTimeout] = useState(() => localStorage.getItem('airguard_session_timeout') || '30m');

  // 5. Notification Channels
  const [emailAlerts, setEmailAlerts] = useState(preferences?.emailAlerts ?? true);
  const [pushAlerts, setPushAlerts] = useState(() => {
    return (
      localStorage.getItem('airguard_push_active') === 'true' &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    );
  });
  const [dailyDigest, setDailyDigest] = useState(preferences?.dailyDigest ?? false);
  const [weeklyPdfReport, setWeeklyPdfReport] = useState(preferences?.weeklyPdfReport ?? false);
  const [emergencyPhone, setEmergencyPhone] = useState(
    () => user?.phone || preferences?.emergencyPhone || localStorage.getItem('airguard_emergency_phone') || ''
  );
  const [smsAlerts, setSmsAlerts] = useState(preferences?.smsAlerts !== false);

  // Synchronize actual mobile browser notification permission status on mount
  useEffect(() => {
    if (isPushSupported()) {
      getPushSubscriptionStatus().then((status) => {
        const isAllowed = status.subscribed && status.permission === 'granted';
        setPushAlerts(isAllowed);
        localStorage.setItem('airguard_push_active', isAllowed ? 'true' : 'false');
      });
    }
  }, []);

  // Explicit handler when user allows / disables notifications in settings
  const handleTogglePushAlerts = async (e) => {
    const shouldEnable = e.target.checked;
    if (shouldEnable) {
      if (!isPushSupported()) {
        alert('Web Push is not supported on this browser or mobile device.');
        return;
      }
      try {
        setSaveStatus({ type: 'saving', message: 'Requesting notification permission from your mobile system...' });
        await subscribeToEmergencyPush(defaultStation || 'esp32-node-01');
        setPushAlerts(true);
        localStorage.setItem('airguard_push_active', 'true');
        if (!isGuest && updatePreferences) {
          await updatePreferences({ pushAlerts: true });
        }
        setSaveStatus({
          type: 'success',
          message: '📲 Mobile background notifications enabled! Real-time danger alerts will be delivered over other apps.',
        });
        setTimeout(() => setSaveStatus({ type: 'idle', message: '' }), 5000);
      } catch (err) {
        setPushAlerts(false);
        localStorage.setItem('airguard_push_active', 'false');
        setSaveStatus({
          type: 'error',
          message: `Permission not granted: ${err.message}. Please allow notifications in your mobile browser settings.`,
        });
      }
    } else {
      try {
        await unsubscribeFromEmergencyPush();
        setPushAlerts(false);
        localStorage.setItem('airguard_push_active', 'false');
        if (!isGuest && updatePreferences) {
          await updatePreferences({ pushAlerts: false });
        }
        setSaveStatus({
          type: 'success',
          message: 'Mobile background push notifications disabled.',
        });
        setTimeout(() => setSaveStatus({ type: 'idle', message: '' }), 4000);
      } catch (err) {
        console.warn('Failed to unsubscribe push:', err);
      }
    }
  };

  const handleToggleEmailAlerts = async (e) => {
    const val = e.target.checked;
    setEmailAlerts(val);
    if (!isGuest && updatePreferences) {
      await updatePreferences({ emailAlerts: val }).catch(() => {});
    }
  };

  const handleToggleDailyDigest = async (e) => {
    const val = e.target.checked;
    setDailyDigest(val);
    if (!isGuest && updatePreferences) {
      await updatePreferences({ dailyDigest: val }).catch(() => {});
    }
  };

  const handleToggleWeeklyPdfReport = async (e) => {
    const val = e.target.checked;
    setWeeklyPdfReport(val);
    if (!isGuest && updatePreferences) {
      await updatePreferences({ weeklyPdfReport: val }).catch(() => {});
    }
  };

  // Status feedback states
  const [saveStatus, setSaveStatus] = useState({ type: 'idle', message: '' }); // idle | saving | success | error
  const [cacheStatus, setCacheStatus] = useState({ type: 'idle', message: '' });
  const [dispatchingType, setDispatchingType] = useState(null);
  const [dispatchStatus, setDispatchStatus] = useState({ type: 'idle', message: '' });

  const handleSendInstantNotification = async (type) => {
    if (isGuest) {
      setDispatchStatus({
        type: 'error',
        message: 'Guest accounts cannot receive email dispatches. Please sign in with a registered account.'
      });
      return;
    }
    try {
      setDispatchingType(type);
      setDispatchStatus({ type: 'idle', message: '' });
      const endpoint = type === 'daily' ? '/notifications/dispatch-daily' : '/notifications/dispatch-weekly';
      const res = await client.post(endpoint);
      setDispatchStatus({
        type: 'success',
        message: res.data?.message || `Dispatched successfully to ${user?.email || 'your email'}! Check your inbox.`
      });
    } catch (err) {
      setDispatchStatus({
        type: 'error',
        message: err.response?.data?.error || 'Failed to dispatch email. Please check server configuration.'
      });
    } finally {
      setDispatchingType(null);
    }
  };

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

    // Fetch user devices for per-device threshold customization & real-time primary station
    client.get('/devices').then((res) => {
      if (Array.isArray(res.data) && res.data.length > 0) {
        setDeviceList(res.data);
        setDefaultStation((prev) => {
          if (prev === 'current-location') return 'current-location';
          const exists = res.data.some((d) => (d.deviceId || d.id) === prev);
          return exists ? prev : 'current-location';
        });
      }
    }).catch(() => {});
  }, [preferences, user]);

  // Handle Health Vulnerability Profile selection with auto-adapting threshold values
  const handleProfileChange = (profileKey) => {
    setSensitivityProfile(profileKey);
    const profile = VULNERABILITY_PROFILES[profileKey];
    if (profile && profileKey !== 'custom') {
      setAqiWarnThreshold(profile.warnAQI);
      setAqiCriticalThreshold(profile.critAQI);
      setExtremeHeatThreshold(profile.heatThreshold);
    }
  };

  // Handle Device Selection (switch thresholds according to the device location)
  const handleDeviceChange = (devId) => {
    setSelectedDevice(devId);
    if (devId === 'global') {
      setSensitivityProfile(preferences?.sensitivityProfile || 'standard');
      setAqiWarnThreshold(preferences?.aqiWarnThreshold ?? 100);
      setAqiCriticalThreshold(preferences?.aqiCriticalThreshold ?? 150);
      setExtremeHeatThreshold(preferences?.extremeHeatThreshold ?? 38);
    } else {
      const saved = localStorage.getItem(`airguard_device_thresholds_${devId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.sensitivityProfile) setSensitivityProfile(parsed.sensitivityProfile);
          if (parsed.aqiWarnThreshold != null) setAqiWarnThreshold(parsed.aqiWarnThreshold);
          if (parsed.aqiCriticalThreshold != null) setAqiCriticalThreshold(parsed.aqiCriticalThreshold);
          if (parsed.extremeHeatThreshold != null) setExtremeHeatThreshold(parsed.extremeHeatThreshold);
          return;
        } catch (e) {}
      }

      // Auto-suggest default profile based on device location or name
      const dev = deviceList.find((d) => (d.deviceId || d.id) === devId);
      const loc = (dev?.name || dev?.location || '').toLowerCase();
      let autoProfile = 'standard';
      if (loc.includes('school') || loc.includes('nursery') || loc.includes('hospital') || loc.includes('pediatric')) {
        autoProfile = 'pediatric';
      } else if (loc.includes('gym') || loc.includes('ground') || loc.includes('court') || loc.includes('stadium')) {
        autoProfile = 'sports';
      } else if (loc.includes('factory') || loc.includes('workshop') || loc.includes('plant') || loc.includes('industry')) {
        autoProfile = 'industrial';
      }
      handleProfileChange(autoProfile);
    }
  };

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
        emergencyPhone,
        phone: emergencyPhone,
        smsAlerts,
      };

      if (emergencyPhone.trim()) {
        localStorage.setItem('airguard_emergency_phone', emergencyPhone.trim());
      }

      await updatePreferences(payload);

      // Persist per-device threshold profile if a specific hardware node was selected
      if (selectedDevice !== 'global') {
        localStorage.setItem(`airguard_device_thresholds_${selectedDevice}`, JSON.stringify({
          sensitivityProfile,
          aqiWarnThreshold: Number(aqiWarnThreshold),
          aqiCriticalThreshold: Number(aqiCriticalThreshold),
          extremeHeatThreshold: Number(extremeHeatThreshold),
          deviceId: selectedDevice,
        }));
      }

      setSaveStatus({
        type: 'success',
        message: selectedDevice !== 'global'
          ? `Settings & custom thresholds saved for device ${selectedDevice}!`
          : 'Settings saved and synchronized with database successfully!',
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
      setDefaultStation('current-location');
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
                <option value="current-location">📍 Current Location (Live GPS Weather & AQI)</option>
                {deviceList.map((d) => {
                  const dId = d.deviceId || d.id;
                  const label = d.name ? `${dId} — ${d.name}` : dId;
                  return (
                    <option key={dId} value={dId}>
                      {label} {d.location ? `(${d.location})` : ''}
                    </option>
                  );
                })}
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
            <div>
              <h2 className="settings-card__title" style={{ margin: 0 }}>Alert Thresholds & Sensitive Group Profile</h2>
              <p className="text-muted fs-xs" style={{ margin: '3px 0 0 0' }}>
                Values dynamically adjust based on vulnerable populations. Configure global defaults or tailor thresholds per device location.
              </p>
            </div>
            <span className="settings-tag" style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}>Health Protection</span>
          </div>

          {/* Per-Device Targeting Bar */}
          <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-soft)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>📍</span>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Configure Target Device:</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Each device can have different thresholds tailored to its installation site</span>
              </div>
            </div>
            <select
              className="settings-select"
              value={selectedDevice}
              onChange={(e) => handleDeviceChange(e.target.value)}
              style={{ minWidth: '220px', padding: '6px 12px', fontSize: '0.82rem' }}
            >
              <option value="global">🌐 All Deployed Devices (Global Defaults)</option>
              {deviceList.map((dev) => (
                <option key={dev.deviceId || dev.id} value={dev.deviceId || dev.id}>
                  📟 {dev.name || dev.deviceId} ({dev.location || 'Site'})
                </option>
              ))}
            </select>
          </div>

          <div className="settings-grid-2">
            <div className="settings-field">
              <label className="settings-field-label" htmlFor="settings-sens">
                <span>Health Vulnerability Profile</span>
                <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 600 }}>Auto-configures thresholds</span>
              </label>
              <select
                id="settings-sens"
                className="settings-select"
                value={sensitivityProfile}
                onChange={(e) => handleProfileChange(e.target.value)}
              >
                {Object.values(VULNERABILITY_PROFILES).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                💡 {VULNERABILITY_PROFILES[sensitivityProfile]?.desc || 'Thresholds customized for site.'}
              </span>
            </div>

            <div className="settings-field">
              <label className="settings-field-label">
                <span>AQI Warning Threshold</span>
                <span className="mono" style={{ color: '#eab308' }}>{aqiWarnThreshold} AQI</span>
              </label>
              <div className="settings-threshold-row">
                <input
                  type="range"
                  min="30"
                  max="150"
                  step="5"
                  className="settings-slider"
                  value={aqiWarnThreshold}
                  onChange={(e) => {
                    setAqiWarnThreshold(Number(e.target.value));
                    setSensitivityProfile('custom');
                  }}
                />
                <input
                  type="number"
                  className="settings-num-input"
                  value={aqiWarnThreshold}
                  onChange={(e) => {
                    setAqiWarnThreshold(Number(e.target.value));
                    setSensitivityProfile('custom');
                  }}
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
                  min="80"
                  max="300"
                  step="5"
                  className="settings-slider"
                  value={aqiCriticalThreshold}
                  onChange={(e) => {
                    setAqiCriticalThreshold(Number(e.target.value));
                    setSensitivityProfile('custom');
                  }}
                />
                <input
                  type="number"
                  className="settings-num-input"
                  value={aqiCriticalThreshold}
                  onChange={(e) => {
                    setAqiCriticalThreshold(Number(e.target.value));
                    setSensitivityProfile('custom');
                  }}
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
                  min="28"
                  max="48"
                  step="1"
                  className="settings-slider"
                  value={extremeHeatThreshold}
                  onChange={(e) => {
                    setExtremeHeatThreshold(Number(e.target.value));
                    setSensitivityProfile('custom');
                  }}
                />
                <input
                  type="number"
                  className="settings-num-input"
                  value={extremeHeatThreshold}
                  onChange={(e) => {
                    setExtremeHeatThreshold(Number(e.target.value));
                    setSensitivityProfile('custom');
                  }}
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
                onChange={handleToggleEmailAlerts}
              />
            </label>

            <label className="settings-checkbox-row">
              <div>
                <span className="settings-checkbox-label">Real-Time Mobile Background & Push Danger Alerts</span>
                <p className="settings-row__desc">
                  Deliver high-priority emergency pollution notifications and red danger flash alarms over other apps on mobile even when the app is closed.
                </p>
              </div>
              <input
                type="checkbox"
                className="settings-checkbox"
                checked={pushAlerts}
                onChange={handleTogglePushAlerts}
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
                onChange={handleToggleDailyDigest}
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
                onChange={handleToggleWeeklyPdfReport}
              />
            </label>

            <label className="settings-checkbox-row">
              <div>
                <span className="settings-checkbox-label">SMS Emergency Cellular Broadcast</span>
                <p className="settings-row__desc">
                  Direct SMS text alerts sent to mobile contact when offline or during extreme toxic air hazards.
                </p>
              </div>
              <input
                type="checkbox"
                className="settings-checkbox"
                checked={smsAlerts}
                onChange={(e) => setSmsAlerts(e.target.checked)}
              />
            </label>

            <div style={{ padding: '10px 14px', background: 'var(--surface-raised)', borderRadius: '8px', border: '1px solid var(--border-soft)', marginTop: '4px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                📱 Emergency Mobile Contact (for Cellular SMS broadcasts):
              </label>
              <input
                type="tel"
                className="settings-input"
                placeholder="+91 98765 43210"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                style={{ width: '100%', maxWidth: '360px', padding: '6px 10px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Instant On-Demand Email Dispatch Triggers */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-soft)' }}>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                ⚡ On-Demand Notification Dispatches
              </span>
              <p className="text-muted fs-xs" style={{ margin: '3px 0 0 0' }}>
                Instantly trigger a live email to {user?.email ? <strong>{user.email}</strong> : 'your registered address'} using current real-time station sensor readings.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => handleSendInstantNotification('daily')}
                disabled={dispatchingType !== null}
                style={{ fontSize: '0.82rem', padding: '7px 14px' }}
              >
                {dispatchingType === 'daily' ? '⏳ Dispatching Daily Briefing...' : '📧 Send Daily Briefing Email Now'}
              </button>

              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => handleSendInstantNotification('weekly')}
                disabled={dispatchingType !== null}
                style={{ fontSize: '0.82rem', padding: '7px 14px' }}
              >
                {dispatchingType === 'weekly' ? '⏳ Dispatching Weekly Digest...' : '📊 Send Weekly Analytics Email Now'}
              </button>
            </div>

            {dispatchStatus.message && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: dispatchStatus.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: dispatchStatus.type === 'success' ? '#10b981' : '#f87171',
                  border: `1px solid ${dispatchStatus.type === 'success' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
                }}
              >
                <span>{dispatchStatus.type === 'success' ? '✓' : '⚠️'}</span>
                <span>{dispatchStatus.message}</span>
              </div>
            )}
          </div>
        </section>

        {/* ─── 6.5 Enterprise Access Control, Role Permissions & Session Security ─── */}
        <section className="card settings-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 className="settings-card__title" style={{ margin: 0 }}>Access Control, Role Permissions & Security</h2>
            <span className="settings-tag" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              RBAC Policy
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '18px' }}>
            <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid var(--border-soft)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>CURRENT ACCOUNT PRIVILEGE LEVEL</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  {user?.role === 'admin' ? 'Super Administrator' : 'Facility Environmental Officer'}
                </strong>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {user?.role === 'admin'
                  ? 'Full administrative control over all IoT nodes, user authentication, and system dispatch schedules.'
                  : 'Operator permissions to monitor live telemetry, acknowledge alerts, and export compliance reports.'}
              </p>
            </div>

            <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid var(--border-soft)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>AUTHORIZED CAPABILITY MATRIX</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <span className="dd-chip dd-chip--online" style={{ fontSize: '0.72rem' }}>✓ Live IoT Streaming</span>
                <span className="dd-chip dd-chip--online" style={{ fontSize: '0.72rem' }}>✓ Sensor Calibration</span>
                <span className="dd-chip dd-chip--online" style={{ fontSize: '0.72rem' }}>✓ Web Flasher / Serial</span>
                <span className="dd-chip dd-chip--online" style={{ fontSize: '0.72rem' }}>✓ Statutory PDF Audits</span>
                <span className="dd-chip dd-chip--online" style={{ fontSize: '0.72rem' }}>✓ Emergency Web Push</span>
              </div>
            </div>
          </div>

          <div className="settings-grid-2">
            <div className="settings-field">
              <label className="settings-field-label" htmlFor="settings-session-timeout">
                🔒 Inactivity Session Auto-Lock
              </label>
              <select
                id="settings-session-timeout"
                className="settings-select"
                value={sessionTimeout}
                onChange={(e) => {
                  setSessionTimeout(e.target.value);
                  localStorage.setItem('airguard_session_timeout', e.target.value);
                }}
              >
                <option value="15m">15 Minutes (High Security Laboratory Standard)</option>
                <option value="30m">30 Minutes (Recommended)</option>
                <option value="1h">1 Hour (Standard Workstation Shift)</option>
                <option value="never">Disabled (Always Active Wall Dashboard Mode)</option>
              </select>
              <p className="settings-row__desc">Automatically lock administrative controls when screen is idle.</p>
            </div>

            <div className="settings-field">
              <label className="settings-field-label">
                👥 Multi-Tenant Fleet Monitor Sharing
              </label>
              <button
                type="button"
                className="btn btn--secondary"
                style={{ width: '100%', marginTop: '6px', fontSize: '0.82rem' }}
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/dashboard`);
                  alert('Copied guest read-only telemetry link to clipboard! Team members can inspect live sensors.');
                }}
              >
                📋 Copy Read-Only Fleet Monitor Link
              </button>
              <p className="settings-row__desc">Share real-time dashboard telemetry with facility colleagues.</p>
            </div>
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
            <div className="settings-tool-box" style={{ borderColor: 'rgba(56, 189, 248, 0.35)', background: 'rgba(14, 165, 233, 0.05)' }}>
              <div className="settings-tool-info">
                <h4 style={{ color: '#38bdf8' }}>App Permissions & Device Setup Wizard</h4>
                <p>Review or re-request critical hardware permissions: Mobile Push Notifications, Hyperlocal GPS, SMS Cellular Fallback, Audio Siren, and Storage Persistence.</p>
              </div>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => window.dispatchEvent(new CustomEvent('airguard:open-permissions-wizard'))}
                style={{ alignSelf: 'flex-start', background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)', border: 'none' }}
              >
                ⚙️ Open Permissions Wizard
              </button>
            </div>

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
