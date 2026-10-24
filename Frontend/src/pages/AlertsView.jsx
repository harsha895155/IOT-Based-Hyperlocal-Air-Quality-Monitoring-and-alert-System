import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatTimeAgo } from '../hooks/useReadings';
import { classifyAQI, healthRecommendation } from '../utils/aqi';
import {
  SOUND_PROFILES,
  getSelectedSound,
  setSelectedSound,
  getSoundVolume,
  setSoundVolume,
  playSoundProfile,
  playHighAlertSound,
} from '../utils/audioAlert';
import { VULNERABILITY_PROFILES } from './SettingsView';
import './AlertsView.css';

export default function AlertsView({
  alerts = [],
  devices = [],
  onAcknowledge,
  onAcknowledgeAll,
  onNavigateLogin,
}) {
  const { isGuest } = useAuth();

  // State
  const [filterTab, setFilterTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterRef = useRef(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterMenu(false);
      }
    }
    if (showFilterMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterMenu]);

  const activeFiltersCount =
    (selectedStation !== 'all' ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0) +
    (filterTab !== 'All' ? 1 : 0);

  const handleClearFilters = () => {
    setSelectedStation('all');
    setSortBy('newest');
    setFilterTab('All');
  };

  const [audioEnabled, setAudioEnabled] = useState(() => {
    return localStorage.getItem('airguard_audio_alerts') === 'true';
  });
  const [currentSound, setCurrentSound] = useState(() => getSelectedSound());
  const [currentVolume, setCurrentVolume] = useState(() => getSoundVolume());
  const [showRulesConfig, setShowRulesConfig] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [operatorNotes, setOperatorNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('airguard_operator_notes') || '{}');
    } catch {
      return {};
    }
  });

  // Threshold rules config (saved to local storage)
  const [ruleStation, setRuleStation] = useState('all');
  const [ruleProfile, setRuleProfile] = useState('standard');
  const [rules, setRules] = useState(() => {
    return {
      warningAQI: Number(localStorage.getItem('airguard_alert_warn_aqi')) || 101,
      criticalAQI: Number(localStorage.getItem('airguard_alert_crit_aqi')) || 151,
      gasBurstPPM: Number(localStorage.getItem('airguard_alert_gas_ppm')) || 1000,
    };
  });

  const handleRuleProfileChange = (profKey) => {
    setRuleProfile(profKey);
    const p = VULNERABILITY_PROFILES[profKey];
    if (p && profKey !== 'custom') {
      setRules((prev) => ({
        ...prev,
        warningAQI: p.warnAQI,
        criticalAQI: p.critAQI,
      }));
    }
  };

  const handleRuleStationChange = (stId) => {
    setRuleStation(stId);
    if (stId === 'all') {
      setRules({
        warningAQI: Number(localStorage.getItem('airguard_alert_warn_aqi')) || 101,
        criticalAQI: Number(localStorage.getItem('airguard_alert_crit_aqi')) || 151,
        gasBurstPPM: Number(localStorage.getItem('airguard_alert_gas_ppm')) || 1000,
      });
      setRuleProfile('standard');
    } else {
      const devSaved = localStorage.getItem(`airguard_device_thresholds_${stId}`);
      if (devSaved) {
        try {
          const parsed = JSON.parse(devSaved);
          if (parsed.sensitivityProfile) setRuleProfile(parsed.sensitivityProfile);
          if (parsed.aqiWarnThreshold) setRules((prev) => ({ ...prev, warningAQI: parsed.aqiWarnThreshold }));
          if (parsed.aqiCriticalThreshold) setRules((prev) => ({ ...prev, criticalAQI: parsed.aqiCriticalThreshold }));
          return;
        } catch (e) {}
      }
      const stWarn = Number(localStorage.getItem(`airguard_alert_warn_aqi_${stId}`));
      const stCrit = Number(localStorage.getItem(`airguard_alert_crit_aqi_${stId}`));
      if (stWarn || stCrit) {
        setRules((prev) => ({
          ...prev,
          warningAQI: stWarn || prev.warningAQI,
          criticalAQI: stCrit || prev.criticalAQI,
        }));
      }
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    localStorage.setItem('airguard_audio_alerts', String(next));
    if (next) {
      playSoundProfile(currentSound, true, currentVolume);
      showToast('🔊 High-decibel emergency audio siren enabled.');
    } else {
      showToast('🔇 Audio alert siren muted.');
    }
  };

  const handleSoundChange = (newSound) => {
    setCurrentSound(newSound);
    setSelectedSound(newSound);
    playSoundProfile(newSound, true, currentVolume);
    const profile = SOUND_PROFILES.find((p) => p.id === newSound);
    showToast(`🔊 Alarm Sound changed to: ${profile?.name || newSound}`);
  };

  const handleVolumeChange = (newVol) => {
    setCurrentVolume(newVol);
    setSoundVolume(newVol);
  };

  const handleSaveRules = (e) => {
    e.preventDefault();
    if (ruleStation === 'all') {
      localStorage.setItem('airguard_alert_warn_aqi', rules.warningAQI);
      localStorage.setItem('airguard_alert_crit_aqi', rules.criticalAQI);
      localStorage.setItem('airguard_alert_gas_ppm', rules.gasBurstPPM);
    } else {
      localStorage.setItem(`airguard_alert_warn_aqi_${ruleStation}`, rules.warningAQI);
      localStorage.setItem(`airguard_alert_crit_aqi_${ruleStation}`, rules.criticalAQI);
      localStorage.setItem(`airguard_alert_gas_ppm_${ruleStation}`, rules.gasBurstPPM);
      localStorage.setItem(`airguard_device_thresholds_${ruleStation}`, JSON.stringify({
        sensitivityProfile: ruleProfile,
        aqiWarnThreshold: rules.warningAQI,
        aqiCriticalThreshold: rules.criticalAQI,
      }));
    }
    setShowRulesConfig(false);
    showToast(`✓ Alert trigger rules saved for ${ruleStation === 'all' ? 'all fleet stations' : ruleStation}.`);
  };

  const handleSaveNote = (alertId, text) => {
    const updated = { ...operatorNotes, [alertId]: text };
    setOperatorNotes(updated);
    localStorage.setItem('airguard_operator_notes', JSON.stringify(updated));
  };

  // KPIs
  const stats = useMemo(() => {
    const unread = alerts.filter((a) => !a.acknowledged).length;
    const critical = alerts.filter((a) => (a.airQuality || 0) >= 151).length;
    const resolved = alerts.filter((a) => !!a.acknowledged).length;
    const stations = {};
    alerts.forEach((a) => {
      stations[a.deviceId] = (stations[a.deviceId] || 0) + 1;
    });
    let topStation = 'None';
    let maxCount = 0;
    Object.entries(stations).forEach(([st, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topStation = st;
      }
    });

    return {
      total: alerts.length,
      unread,
      critical,
      resolved,
      topStation: maxCount > 0 ? `${topStation} (${maxCount}×)` : 'Nominal',
    };
  }, [alerts]);

  // Filtering & Sorting
  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((alert) => {
        // Tab Filter
        if (filterTab === 'Unread' && alert.acknowledged) return false;
        if (filterTab === 'Resolved' && !alert.acknowledged) return false;
        if (filterTab === 'Critical' && (alert.airQuality || 0) < 151) return false;
        if (
          filterTab === 'Sensitive' &&
          ((alert.airQuality || 0) < 101 || (alert.airQuality || 0) > 150)
        )
          return false;
        if (filterTab === 'Hazardous' && (alert.airQuality || 0) <= 300) return false;

        // Station Filter
        if (selectedStation !== 'all' && alert.deviceId !== selectedStation) return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchMsg = (alert.message || '').toLowerCase().includes(q);
          const matchDev = (alert.deviceId || '').toLowerCase().includes(q);
          const matchLoc = (alert.location || '').toLowerCase().includes(q);
          const matchCat = (alert.category || '').toLowerCase().includes(q);
          if (!matchMsg && !matchDev && !matchLoc && !matchCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.lastSeen || b.createdAt) - new Date(a.lastSeen || a.createdAt);
        }
        if (sortBy === 'oldest') {
          return new Date(a.lastSeen || a.createdAt) - new Date(b.lastSeen || b.createdAt);
        }
        if (sortBy === 'severity') {
          return (b.airQuality || 0) - (a.airQuality || 0);
        }
        if (sortBy === 'seen') {
          return (b.seenCount || 1) - (a.seenCount || 1);
        }
        return 0;
      });
  }, [alerts, filterTab, selectedStation, searchQuery, sortBy]);

  // Bulk acknowledge handler
  const handleAcknowledgeAll = async () => {
    if (onAcknowledgeAll) {
      await onAcknowledgeAll(selectedStation);
      showToast(`✓ All active ${selectedStation !== 'all' ? selectedStation : 'fleet'} alerts marked resolved.`);
    }
  };

  // Export filtered alerts
  const handleExportCSV = () => {
    if (filteredAlerts.length === 0) {
      showToast('No alerts matching current filters to export.');
      return;
    }
    let csv = 'Timestamp,Device ID,Location,AQI,Category,Seen Count,Status,Message\n';
    filteredAlerts.forEach((a) => {
      const status = a.acknowledged ? 'RESOLVED' : 'UNRESOLVED';
      csv += `"${new Date(a.createdAt).toISOString()}","${a.deviceId}","${a.location || 'Site'}",${a.airQuality},"${a.category || 'Warning'}",${a.seenCount || 1},"${status}","${(a.message || '').replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `airguard_alerts_${filterTab.toLowerCase()}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Alert incident audit exported as CSV.');
  };

  return (
    <div className="alerts-page">
      {/* Page Header */}
      <div className="page-header dashboard-header">
        <div>
          <h1 className="page-title">Real-Time Incident Alerts</h1>
          <p className="page-subtitle">
            Statutory threshold crossings, ambient gas surges, and deduplicated sensor anomaly notifications.
          </p>
        </div>
        <div className="alerts-header-actions">
          <button
            className={`audio-toggle-btn ${audioEnabled ? 'is-active' : ''}`}
            onClick={toggleAudio}
            title={audioEnabled ? 'Mute alert siren' : 'Enable audio siren'}
          >
            {audioEnabled ? '🔊 Siren ON' : '🔇 Muted'}
          </button>

          <button
            className="btn-secondary alert-test-btn"
            onClick={() => {
              playSoundProfile(currentSound, true, currentVolume);
              const p = SOUND_PROFILES.find((s) => s.id === currentSound);
              showToast(`🚨 Playing: ${p?.name || currentSound} (Volume: ${Math.round(currentVolume * 100)}%)`);
            }}
            title="Test the currently selected alarm sound"
          >
            🚨 Test Siren
          </button>
          <button 
            className={`btn-secondary ${showRulesConfig ? 'active' : ''}`} 
            onClick={() => setShowRulesConfig(!showRulesConfig)}
            title="Configure Sound Volume & Pollution Trigger Rules"
          >
            ⚙️ Sound & Rules
          </button>
          <button className="btn-secondary" onClick={handleExportCSV}>
            ⬇ Export (.csv)
          </button>
          {stats.unread > 0 && !isGuest && (
            <button className="btn-primary" onClick={handleAcknowledgeAll}>
              ✓ Mark All Resolved ({stats.unread})
            </button>
          )}
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
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* KPI Overview Grid */}
      <div className="alerts-kpi-grid">
        <div className="alerts-kpi-card" style={{ '--kpi-color': stats.unread > 0 ? '#f59e0b' : '#10b981' }}>
          <div className="alerts-kpi-title">
            <span>Unresolved Incidents</span>
            <span>🚨</span>
          </div>
          <div className="alerts-kpi-val" style={{ color: stats.unread > 0 ? '#f59e0b' : '#10b981' }}>
            {stats.unread}
          </div>
          <div className="alerts-kpi-sub">Awaiting operator acknowledgement</div>
        </div>

        <div className="alerts-kpi-card" style={{ '--kpi-color': '#ef4444' }}>
          <div className="alerts-kpi-title">
            <span>Critical & Emergency</span>
            <span>⚠️</span>
          </div>
          <div className="alerts-kpi-val" style={{ color: '#ef4444' }}>
            {stats.critical}
          </div>
          <div className="alerts-kpi-sub">AQI &ge; 151 (Severe ambient levels)</div>
        </div>

        <div className="alerts-kpi-card" style={{ '--kpi-color': '#10b981' }}>
          <div className="alerts-kpi-title">
            <span>Resolved Incidents</span>
            <span>✓</span>
          </div>
          <div className="alerts-kpi-val">{stats.resolved}</div>
          <div className="alerts-kpi-sub">Cleared and verified safe</div>
        </div>

        <div className="alerts-kpi-card" style={{ '--kpi-color': '#00d2b4' }}>
          <div className="alerts-kpi-title">
            <span>Primary Hotspot</span>
            <span>📍</span>
          </div>
          <div className="alerts-kpi-val" style={{ fontSize: '1.25rem' }}>{stats.topStation}</div>
          <div className="alerts-kpi-sub">Highest violation frequency node</div>
        </div>
      </div>

      {/* Alert Rules Drawer / Panel */}
      {showRulesConfig && (
        <form className="rules-config-card" onSubmit={handleSaveRules}>
          <div className="rules-config-header">
            <div>
              <span className="rules-config-title">⚙️ Threshold Rules & Sensitive Group Profiles</span>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Values dynamically adjust based on vulnerable populations. Configure global limits or tailor per device station.
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => setShowRulesConfig(false)}
            >
              ✕ Close
            </button>
          </div>

          {/* Per-Station Targeting & Vulnerability Profile Selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px', background: 'var(--surface-raised)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-soft)' }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                📍 Target Station
              </label>
              <select
                className="rules-input"
                value={ruleStation}
                onChange={(e) => handleRuleStationChange(e.target.value)}
                style={{ cursor: 'pointer', padding: '6px 10px', fontSize: '0.82rem' }}
              >
                <option value="all">🌐 All Stations (Fleet-Wide Default)</option>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    📟 {d.name || d.deviceId} ({d.location || 'Site'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                🛡️ Health Vulnerability Profile
              </label>
              <select
                className="rules-input"
                value={ruleProfile}
                onChange={(e) => handleRuleProfileChange(e.target.value)}
                style={{ cursor: 'pointer', padding: '6px 10px', fontSize: '0.82rem' }}
              >
                {Object.values(VULNERABILITY_PROFILES).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rules-inputs-grid">
            <div className="rules-field">
              <label className="rules-label">Warning Threshold (AQI)</label>
              <input
                type="number"
                min="30"
                max="200"
                className="rules-input"
                value={rules.warningAQI}
                onChange={(e) => {
                  setRules({ ...rules, warningAQI: Number(e.target.value) });
                  setRuleProfile('custom');
                }}
              />
              <span className="fs-xs text-muted">Triggers amber advisory</span>
            </div>
            <div className="rules-field">
              <label className="rules-label">Emergency Threshold (AQI)</label>
              <input
                type="number"
                min="80"
                max="500"
                className="rules-input"
                value={rules.criticalAQI}
                onChange={(e) => {
                  setRules({ ...rules, criticalAQI: Number(e.target.value) });
                  setRuleProfile('custom');
                }}
              />
              <span className="fs-xs text-muted">Triggers critical siren badge</span>
            </div>
            <div className="rules-field">
              <label className="rules-label">Gas Surge Spike (PPM)</label>
              <input
                type="number"
                min="300"
                max="5000"
                className="rules-input"
                value={rules.gasBurstPPM}
                onChange={(e) => setRules({ ...rules, gasBurstPPM: Number(e.target.value) })}
              />
              <span className="fs-xs text-muted">MQ135 VOC burst limit (Default: 1000)</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
              Save Trigger Rules
            </button>
          </div>

          {/* Audio Alarm Sound Profile & Volume Controls */}
          <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--border-soft)' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent, #0284c7)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔊</span> Emergency Alarm Sound & High Volume Settings
            </div>

            <div className="rules-inputs-grid">
              <div className="rules-field">
                <label className="rules-label">Alarm Sound Profile</label>
                <select
                  className="rules-input"
                  value={currentSound}
                  onChange={(e) => handleSoundChange(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {SOUND_PROFILES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.icon} {p.name}
                    </option>
                  ))}
                </select>
                <span className="fs-xs text-muted">
                  {SOUND_PROFILES.find((p) => p.id === currentSound)?.description}
                </span>
              </div>

              <div className="rules-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="rules-label">Alarm Volume</label>
                  <span style={{ fontSize: '0.78rem', color: '#00d2b4', fontWeight: 700 }}>
                    {Math.round(currentVolume * 100)}% {currentVolume >= 0.8 ? '(Loud / High)' : ''}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="1.0"
                  step="0.05"
                  value={currentVolume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  style={{ cursor: 'pointer', accentColor: '#00d2b4', marginTop: '6px', height: '6px' }}
                />
                <span className="fs-xs text-muted">Slide to 80%–100% for maximum loud alert</span>
              </div>

              <div className="rules-field" style={{ justifyContent: 'center' }}>
                <label className="rules-label">Sound Test & Preview</label>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => playSoundProfile(currentSound, true, currentVolume)}
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.82rem',
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  ▶ Test Current Sound ({SOUND_PROFILES.find((p) => p.id === currentSound)?.name.split(' ')[0]})
                </button>
                <span className="fs-xs text-muted">Tests chosen sound at selected volume</span>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Search, Filter Tabs & Sort Controls */}
      <div className="alerts-controls-card">
        <div className="alerts-search-row">
          <div className="alerts-search-box">
            <span>🔍</span>
            <input
              type="text"
              className="alerts-search-input"
              placeholder="Search by station node, campus location, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="alerts-clear-search-btn"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Option Beside Search Bar */}
          <div className="alerts-filter-wrapper" ref={filterRef}>
            <button
              type="button"
              className={`alerts-filter-btn ${activeFiltersCount > 0 ? 'is-active' : ''}`}
              onClick={() => setShowFilterMenu(!showFilterMenu)}
            >
              <span>⚙️ Filter</span>
              {activeFiltersCount > 0 && (
                <span className="alerts-filter-badge">{activeFiltersCount}</span>
              )}
              <span style={{ fontSize: '0.7rem' }}>{showFilterMenu ? '▲' : '▼'}</span>
            </button>

            {showFilterMenu && (
              <div className="alerts-filter-dropdown">
                <div className="alerts-filter-dropdown-header">
                  <span>FILTERS & SEVERITY</span>
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      className="alerts-clear-btn"
                      onClick={handleClearFilters}
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Severity Status Selection */}
                <div className="alerts-filter-dropdown-item">
                  <label className="alerts-dropdown-label">Incident Status:</label>
                  <div className="alerts-dropdown-pills">
                    {[
                      { id: 'All', label: 'All', count: alerts.length },
                      { id: 'Unread', label: 'Unread', count: stats.unread },
                      { id: 'Critical', label: 'Critical', count: stats.critical },
                      {
                        id: 'Sensitive',
                        label: 'Sensitive',
                        count: alerts.filter((a) => (a.airQuality || 0) >= 101 && (a.airQuality || 0) <= 150).length,
                      },
                      {
                        id: 'Hazardous',
                        label: 'Hazardous',
                        count: alerts.filter((a) => (a.airQuality || 0) > 300).length,
                      },
                      { id: 'Resolved', label: 'Resolved', count: stats.resolved },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        className={`alerts-dropdown-pill ${filterTab === tab.id ? 'is-active' : ''}`}
                        onClick={() => setFilterTab(tab.id)}
                      >
                        {tab.label} ({tab.count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Station Dropdown */}
                <div className="alerts-filter-dropdown-item">
                  <label className="alerts-dropdown-label">Station Node:</label>
                  <select
                    className="alerts-select"
                    value={selectedStation}
                    onChange={(e) => setSelectedStation(e.target.value)}
                  >
                    <option value="all">All IoT Stations</option>
                    {devices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.name || d.deviceId}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Dropdown */}
                <div className="alerts-filter-dropdown-item">
                  <label className="alerts-dropdown-label">Sort Order:</label>
                  <select
                    className="alerts-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="newest">Sort: Newest First</option>
                    <option value="oldest">Sort: Oldest First</option>
                    <option value="severity">Sort: Highest AQI Severity</option>
                    <option value="seen">Sort: Most Frequent (Seen Count)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filter Tabs on wider screens */}
        <div className="alerts-tabs-row">
          <div className="alerts-tabs">
            {[
              { id: 'All', label: 'All Incidents', count: alerts.length },
              { id: 'Unread', label: 'Unread', count: stats.unread, isUnread: true },
              { id: 'Critical', label: 'Critical (AQI > 150)', count: stats.critical },
              {
                id: 'Sensitive',
                label: 'Sensitive (101-150)',
                count: alerts.filter((a) => (a.airQuality || 0) >= 101 && (a.airQuality || 0) <= 150).length,
              },
              {
                id: 'Hazardous',
                label: 'Hazardous (>300)',
                count: alerts.filter((a) => (a.airQuality || 0) > 300).length,
              },
              { id: 'Resolved', label: 'Resolved', count: stats.resolved },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`alerts-tab ${filterTab === tab.id ? 'is-active' : ''}`}
                onClick={() => setFilterTab(tab.id)}
              >
                <span>{tab.label}</span>
                <span className={`tab-badge ${tab.isUnread && tab.count > 0 ? 'unread' : ''}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <span className="fs-xs text-muted alerts-showing-count">
            Showing {filteredAlerts.length} of {alerts.length} incidents
          </span>
        </div>
      </div>

      {/* Alerts list */}
      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="alerts-empty">
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🍃</div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>No Incidents in this View</h3>
            <p>
              Sensor readings are currently within nominal thresholds, or no alerts match the active search filter.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const aqiVal = alert.airQuality ?? 100;
            const { category, color } = classifyAQI(aqiVal);
            const seenCount = alert.seenCount || 1;
            const location = alert.location || 'Station Site';
            const timeAgo = formatTimeAgo(alert.lastSeen || alert.createdAt);
            const advisory = healthRecommendation(aqiVal);
            const isHazardous = aqiVal > 300;
            const isCritical = aqiVal >= 151;

            return (
              <div
                key={alert._id}
                className={`alert-card ${alert.acknowledged ? 'is-acknowledged' : ''}`}
                style={{ borderLeftColor: color }}
              >
                <div className="alert-card__content">
                  <div className="alert-card__header">
                    <span style={{ fontSize: '1.2rem' }}>
                      {isHazardous ? '☣️' : isCritical ? '🚨' : '⚠️'}
                    </span>
                    <h2 className="alert-card__title" style={{ color }}>
                      {alert.category || category}
                    </h2>
                    <span className={`alert-badge ${alert.acknowledged ? 'resolved' : 'unread'}`}>
                      {alert.acknowledged ? 'Resolved' : 'Active Warning'}
                    </span>
                  </div>

                  <p className="alert-card__message">
                    {alert.message || 'Environmental statutory threshold exceeded.'}
                  </p>

                  {/* Contextual Advisory Recommendation */}
                  <div className="alert-advisory">
                    <strong>Advisory:</strong> {advisory}
                  </div>

                  {/* Metadata Chips */}
                  <div className="alert-card__meta">
                    <span className="meta-pill">
                      📡 {alert.deviceId}
                    </span>
                    <span className="meta-pill">
                      📍 {location}
                    </span>
                    <span className="meta-pill" style={{ color, fontWeight: 700 }}>
                      AQI {aqiVal}
                    </span>
                    <span className="meta-pill">
                      🔄 seen {seenCount}×
                    </span>
                    {alert.severity && (
                      <span className="meta-pill" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: isHazardous ? '#f87171' : isCritical ? '#fb923c' : '#38bdf8' }}>
                        🛡️ CAP: {alert.severity}
                      </span>
                    )}
                    {Array.isArray(alert.channelsDelivered) && alert.channelsDelivered.length > 0 && (
                      <span className="meta-pill" title="Protocols & channels used for alert dispatch">
                        📡 Delivered: {alert.channelsDelivered.map((c) => (c === 'websocket' ? 'WebSocket' : c === 'email' ? 'SMTP' : c)).join(', ')}
                      </span>
                    )}
                    {alert.lastSeen && alert.createdAt !== alert.lastSeen && (
                      <span className="meta-pill">
                        First logged: {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {/* Optional operator action annotation */}
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      placeholder="Add operator incident resolution note..."
                      className="rules-input"
                      style={{ padding: '4px 10px', fontSize: '0.74rem', width: '100%', maxWidth: '420px', background: 'rgba(0,0,0,0.2)' }}
                      value={operatorNotes[alert._id] || ''}
                      onChange={(e) => handleSaveNote(alert._id, e.target.value)}
                    />
                  </div>
                </div>

                <div className="alert-card__aside">
                  <span className="alert-card__time">Detected {timeAgo}</span>

                  {isGuest ? (
                    <button className="alert-card__action-link" onClick={onNavigateLogin}>
                      Log in to act
                    </button>
                  ) : alert.acknowledged ? (
                    <span className="alert-card__status-resolved">
                      ✓ Resolved
                    </span>
                  ) : (
                    <button
                      className="alert-card__ack-btn"
                      onClick={() => onAcknowledge(alert._id)}
                    >
                      ✓ Acknowledge
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
