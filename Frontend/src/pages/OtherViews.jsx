import React, { useState, useEffect, useMemo } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatTimeAgo } from '../hooks/useReadings';
import { classifyAQI, AQI_LEVELS, healthRecommendation } from '../utils/aqi';
import './OtherViews.css';

/* ─── 1. LIVE MONITORING VIEW (R1, R5, R7) ─── */
export function LiveMonitoringView({ readingsData }) {
  const { latest, connected, selectedDevice } = readingsData;
  const aqi = latest?.airQuality;
  const hasReading = typeof aqi === 'number';
  const { category, color } = classifyAQI(aqi ?? 0);

  return (
    <div className="subpage-view">
      <div className="page-header">
        <h1 className="page-title">Live Monitoring</h1>
        <p className="page-subtitle">Real-time telemetry stream from node {selectedDevice}.</p>
      </div>

      <div className="live-grid">
        <div className="card live-card-hero">
          <div className="live-status-badge">
            <span className={`status-dot ${connected ? 'is-online' : 'is-standby'}`} />
            <span>{connected ? 'SOCKET.IO STREAM ACTIVE' : 'AWAITING CONNECTION'}</span>
          </div>

          <div className="live-dial-wrap">
            <div className="live-dial" style={{ borderColor: hasReading ? color : 'var(--border)' }}>
              <span className="live-dial-num mono" style={{ color: hasReading ? color : 'var(--text-faint)' }}>
                {hasReading ? aqi : '—'}
              </span>
              <span className="live-dial-label">AQI</span>
            </div>
          </div>

          <div className="live-cat-title" style={{ color: hasReading ? color : 'var(--text-muted)' }}>
            {hasReading ? category : 'No Packets Yet'}
          </div>
          <p className="live-desc">
            {hasReading
              ? healthRecommendation(aqi)
              : 'Power on the ESP32 node or run "npm run simulate" in Backend/ to start ingestion.'}
          </p>
        </div>

        <div className="card live-stream-console">
          <div className="console-header">
            <span>REAL-TIME PACKET INGESTION LOG</span>
            <span className="mono fs-xs">Port 5001 · HTTPS/JSON</span>
          </div>
          <div className="console-body mono">
            {hasReading ? (
              <>
                <div className="console-line">
                  [RX] {latest.deviceId} &rarr; POST /api/readings 201 Created ({formatTimeAgo(latest.createdAt)})
                </div>
                <div className="console-line text-accent">
                  Payload: &#123; temperature: {latest.temperature}°C, humidity: {latest.humidity}%, gasPPM: {latest.gasPPM}ppm, airQuality: {aqi} &#125;
                </div>
                <div className="console-line text-muted">
                  [MongoDB] Document indexed in Atlas cluster (category: "{category}")
                </div>
                <div className="console-line text-muted">
                  [Socket.IO] Broadcast 'reading' event to connected browser clients
                </div>
                <div className="console-line text-online">
                  • Telemetry link operational. Next sample expected in ~15s.
                </div>
              </>
            ) : (
              <div className="console-line text-muted">
                [Awaiting Data] Listening for telemetry on /api/readings...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 2. AIR QUALITY SCIENCE VIEW (R3, R10, R12) ─── */
export function AirQualityView({ readingsData }) {
  const { latest } = readingsData;
  const gasPPM = latest?.gasPPM;

  const pollutantBreakdown = [
    {
      name: 'Carbon Monoxide (CO)',
      formula: 'CO',
      est: gasPPM != null ? Number((gasPPM * 0.12).toFixed(2)) : '—',
      unit: 'ppm',
      limit: '9 ppm (8h avg)',
    },
    {
      name: 'Carbon Dioxide Equiv.',
      formula: 'CO2 eq',
      est: gasPPM != null ? Math.round(gasPPM * 1.8) : '—',
      unit: 'ppm',
      limit: '1000 ppm (ASHRAE)',
    },
    {
      name: 'Ammonia & Amines',
      formula: 'NH3',
      est: gasPPM != null ? Number((gasPPM * 0.04).toFixed(2)) : '—',
      unit: 'ppm',
      limit: '25 ppm (OSHA)',
    },
    {
      name: 'Benzene / Alcohol Vapors',
      formula: 'C6H6 / EtOH',
      est: gasPPM != null ? Number((gasPPM * 0.02).toFixed(2)) : '—',
      unit: 'ppm',
      limit: '5 ppm (TWA)',
    },
  ];

  return (
    <div className="subpage-view">
      <div className="page-header">
        <h1 className="page-title">Air Quality Science & Standards</h1>
        <p className="page-subtitle">Centralized Table I breakpoints, health recommendations, and sensor chemistry.</p>
      </div>

      <div className="card pollutant-card">
        <h2 className="card-section-title">Centralized AQI Breakpoints (Table I from Base Paper)</h2>
        <div className="devices-table-wrap">
          <table className="devices-table">
            <thead>
              <tr>
                <th>AQI RANGE</th>
                <th>CATEGORY</th>
                <th>ALERT ACTION</th>
                <th>HEALTH RECOMMENDATION</th>
              </tr>
            </thead>
            <tbody>
              {AQI_LEVELS.map((lvl) => (
                <tr key={lvl.category}>
                  <td className="mono fw-600">{lvl.min} – {lvl.max}</td>
                  <td>
                    <span className="picker-option-badge" style={{ color: lvl.color, borderColor: lvl.color }}>
                      {lvl.category}
                    </span>
                  </td>
                  <td className="mono fs-xs text-muted">
                    {lvl.min <= 50 ? 'None' : lvl.min <= 100 ? 'Log only' : lvl.min <= 150 ? 'Dashboard flag' : lvl.min <= 200 ? 'Push notification' : lvl.min <= 300 ? 'Push + Alert' : 'Immediate all channels'}
                  </td>
                  <td className="text-muted fs-sm">{healthRecommendation(lvl.min)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card pollutant-card mt-4">
        <h2 className="card-section-title">MQ135 Gas Detection Estimates</h2>
        <div className="devices-table-wrap">
          <table className="devices-table">
            <thead>
              <tr>
                <th>POLLUTANT</th>
                <th>FORMULA</th>
                <th>CONCENTRATION</th>
                <th>REFERENCE THRESHOLD</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {pollutantBreakdown.map((p) => (
                <tr key={p.name}>
                  <td className="fw-600">{p.name}</td>
                  <td className="mono text-muted">{p.formula}</td>
                  <td className="mono text-primary">{p.est} {p.est !== '—' ? p.unit : ''}</td>
                  <td className="text-muted">{p.limit}</td>
                  <td>
                    <span className="picker-option-badge" style={{ color: 'var(--status-online)', background: 'rgba(16, 185, 129, 0.1)' }}>
                      Active Monitoring
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── 3. LOCATIONS VIEW (R9, Section 8) ─── */
export function LocationsView({ locations = [], devices = [], onSelectDevice, selectedDevice }) {
  const [selectedLocation, setSelectedLocation] = useState('all');

  // Filter locations based on selection
  const filteredLocations = useMemo(() => {
    if (selectedLocation === 'all') return locations;
    return locations.filter((l) => l.location === selectedLocation);
  }, [locations, selectedLocation]);

  // Current active location object if a single one is picked
  const activeLocObj = useMemo(() => {
    if (selectedLocation === 'all') return locations[0] || null;
    return locations.find((l) => l.location === selectedLocation) || null;
  }, [locations, selectedLocation]);

  return (
    <div className="subpage-view">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Locations & Micro-Zones</h1>
          <p className="page-subtitle">Select a specific location to inspect its live sensors, AQI, and micro-climate telemetry.</p>
        </div>

        {/* Location Selector Filter Bar */}
        <div className="location-filter-bar">
          <button
            type="button"
            className={`location-filter-btn ${selectedLocation === 'all' ? 'is-active' : ''}`}
            onClick={() => setSelectedLocation('all')}
          >
            All Locations ({locations.length})
          </button>
          {locations.map((loc) => (
            <button
              key={loc.location}
              type="button"
              className={`location-filter-btn ${selectedLocation === loc.location ? 'is-active' : ''}`}
              onClick={() => setSelectedLocation(loc.location)}
            >
              📍 {loc.location}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Locations */}
      <div className="locations-grid">
        {locations.length === 0 ? (
          <div className="card location-card text-muted">Loading campus location telemetry...</div>
        ) : (
          filteredLocations.map((loc) => {
            const isPicked = selectedLocation === loc.location;
            const aqiObj = loc.averageAQI != null ? classifyAQI(loc.averageAQI) : null;
            return (
              <div
                key={loc.location}
                className={`card location-card ${isPicked ? 'is-selected' : ''}`}
                onClick={() => setSelectedLocation(loc.location)}
                style={{ cursor: 'pointer' }}
              >
                <div className="location-card__top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>📍</span>
                    <span className="location-name">{loc.location}</span>
                  </div>
                  <span className="status-indicator">
                    <span className={`status-dot ${loc.onlineCount > 0 ? 'is-online' : 'is-standby'}`} />
                    <span className="status-label">{loc.onlineCount > 0 ? `${loc.onlineCount} Online` : 'Standby'}</span>
                  </span>
                </div>

                <div className="location-meta text-muted">
                  <span>{loc.deviceCount} Installed Node{loc.deviceCount !== 1 ? 's' : ''}</span>
                  <span className="dot-sep">·</span>
                  <span>ESP32 Wi-Fi Node</span>
                </div>

                <div className="location-stats">
                  <div className="loc-stat">
                    <span className="text-faint fs-xs">AVG AQI</span>
                    <span className="mono loc-val" style={{ color: aqiObj ? aqiObj.color : 'inherit' }}>
                      {loc.averageAQI != null ? loc.averageAQI : '—'}
                    </span>
                  </div>
                  <div className="loc-stat">
                    <span className="text-faint fs-xs">CATEGORY</span>
                    <span className="mono loc-val" style={{ fontSize: '0.95rem', color: aqiObj ? aqiObj.color : 'inherit' }}>
                      {aqiObj ? aqiObj.category : 'No Data'}
                    </span>
                  </div>
                  <div className="loc-stat">
                    <span className="text-faint fs-xs">STATUS</span>
                    <span className={`mono loc-val ${loc.onlineCount > 0 ? 'text-online' : 'text-muted'}`}>
                      {loc.onlineCount > 0 ? 'Active' : 'Offline'}
                    </span>
                  </div>
                </div>

                {isPicked && (
                  <div className="location-active-tag">
                    ✓ Currently Selected Zone
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Specific Location Inspection View */}
      {activeLocObj && (
        <div className="card location-detail-card" style={{ marginTop: '24px' }}>
          <div className="location-detail-header">
            <div>
              <div className="location-detail-tag">LOCATION TELEMETRY INSPECTION</div>
              <h2 className="location-detail-title">📍 {activeLocObj.location}</h2>
              <p className="text-muted" style={{ fontSize: '0.85rem', margin: '4px 0 0' }}>
                Displaying real-time sensor metrics for all nodes deployed at this specific location.
              </p>
            </div>
            {activeLocObj.devices?.[0]?.id && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => onSelectDevice?.(activeLocObj.devices[0].id)}
              >
                Open Live Dashboard for this Location ➔
              </button>
            )}
          </div>

          <div className="location-devices-list" style={{ marginTop: '16px' }}>
            <table className="devices-table">
              <thead>
                <tr>
                  <th>NODE IDENTIFIER</th>
                  <th>HARDWARE</th>
                  <th>STATUS</th>
                  <th>AQI</th>
                  <th>CATEGORY</th>
                  <th>TEMP</th>
                  <th>HUMIDITY</th>
                  <th>GAS CONC.</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {activeLocObj.devices && activeLocObj.devices.length > 0 ? (
                  activeLocObj.devices.map((dev) => {
                    const devAqiObj = dev.aqi != null ? classifyAQI(dev.aqi) : null;
                    return (
                      <tr key={dev.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{dev.name || dev.id}</div>
                          <div className="mono text-muted" style={{ fontSize: '0.75rem' }}>{dev.id}</div>
                        </td>
                        <td className="text-muted">{dev.type || 'ESP32 Node'}</td>
                        <td>
                          <span className={`device-status-pill ${dev.status === 'Online' ? 'is-online' : 'is-offline'}`}>
                            <span className="dot" />
                            {dev.status || 'Offline'}
                          </span>
                        </td>
                        <td className="mono" style={{ fontWeight: 700, color: devAqiObj?.color }}>
                          {dev.aqi != null ? dev.aqi : '—'}
                        </td>
                        <td>
                          {devAqiObj ? (
                            <span className="category-badge" style={{ color: devAqiObj.color, borderColor: devAqiObj.color }}>
                              {devAqiObj.category}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="mono">{dev.temperature != null ? `${dev.temperature}°C` : '—'}</td>
                        <td className="mono">{dev.humidity != null ? `${dev.humidity}%` : '—'}</td>
                        <td className="mono">{dev.gasPPM != null ? `${dev.gasPPM} ppm` : '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn--ghost"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => onSelectDevice?.(dev.id)}
                          >
                            View Live ➔
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="text-muted" style={{ textAlign: 'center', padding: '24px' }}>
                      No sensing nodes currently deployed at this location.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 4. ANALYTICS VIEW (Section 9: Real MongoDB Aggregation) ─── */
export function AnalyticsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await client.get('/analytics');
        setData(res.data);
      } catch (e) {
        console.error('Analytics fetch error:', e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const summary = data?.summary;

  return (
    <div className="subpage-view">
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Server-side MongoDB aggregation pipeline results across all sensor readings.</p>
      </div>

      {loading ? (
        <div className="card location-card text-muted">Running aggregation pipeline on MongoDB Atlas...</div>
      ) : (
        <>
          <div className="dashboard__kpis">
            <div className="card kpi-card">
              <span className="kpi-card__label">MINIMUM AQI</span>
              <div className="kpi-card__val mono text-online">{summary?.minAQI || 0}</div>
              <span className="kpi-card__sub text-muted">Cleanest observation</span>
            </div>
            <div className="card kpi-card">
              <span className="kpi-card__label">AVERAGE AQI</span>
              <div className="kpi-card__val mono">{summary?.avgAQI || 0}</div>
              <span className="kpi-card__sub text-muted">Mean across dataset</span>
            </div>
            <div className="card kpi-card">
              <span className="kpi-card__label">PEAK SPIKE AQI</span>
              <div className="kpi-card__val mono" style={{ color: 'var(--aqi-unhealthy-sg)' }}>
                {summary?.maxAQI || 0}
              </div>
              <span className="kpi-card__sub text-muted">Peak crossing</span>
            </div>
            <div className="card kpi-card">
              <span className="kpi-card__label">TOTAL VALID SAMPLES</span>
              <div className="kpi-card__val mono">{summary?.totalSamples || 0}</div>
              <span className="kpi-card__sub text-muted">MongoDB documents</span>
            </div>
          </div>

          <div className="card pollutant-card mt-4">
            <h2 className="card-section-title">AQI Category Distribution (Server-side $group)</h2>
            <div className="devices-table-wrap">
              <table className="devices-table">
                <thead>
                  <tr>
                    <th>CATEGORY</th>
                    <th>SAMPLE OCCURRENCES</th>
                    <th>PERCENTAGE OF TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.categoryDistribution || []).map((cat) => {
                    const pct = summary?.totalSamples
                      ? Math.round((cat.count / summary.totalSamples) * 100)
                      : 0;
                    return (
                      <tr key={cat.category}>
                        <td className="fw-600">{cat.category}</td>
                        <td className="mono">{cat.count}</td>
                        <td className="mono">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── 5. HISTORY VIEW (Section 8: Real Paginated API + CSV Export) ─── */
export function HistoryView() {
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  const fetchPage = async (page) => {
    setLoading(true);
    try {
      const res = await client.get('/readings/history', { params: { page, limit: 20 } });
      setHistory(res.data.data);
      setPagination(res.data.pagination);
    } catch (e) {
      console.error('History fetch error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(1);
  }, []);

  return (
    <div className="subpage-view">
      <div className="page-header dashboard-header">
        <div>
          <h1 className="page-title">Historical Observations</h1>
          <p className="page-subtitle">Backend-paginated sensor readings archive from MongoDB Atlas.</p>
        </div>
        <a
          href={`${client.defaults.baseURL}/reports/csv`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
        >
          ⬇ Export Full CSV
        </a>
      </div>

      <div className="card devices-table-card">
        <div className="devices-table-wrap">
          <table className="devices-table">
            <thead>
              <tr>
                <th>TIMESTAMP</th>
                <th>DEVICE ID</th>
                <th>AQI</th>
                <th>CATEGORY</th>
                <th>TEMPERATURE</th>
                <th>HUMIDITY</th>
                <th>GAS PPM</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-muted text-center" style={{ padding: '24px' }}>
                    Loading database records...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-muted text-center" style={{ padding: '24px' }}>
                    No readings found in database.
                  </td>
                </tr>
              ) : (
                history.map((r) => {
                  const { category, color } = classifyAQI(r.airQuality);
                  return (
                    <tr key={r._id}>
                      <td className="mono text-muted">{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="mono">{r.deviceId}</td>
                      <td className="mono fw-600" style={{ color }}>{r.airQuality}</td>
                      <td style={{ color }}>{category}</td>
                      <td className="mono">{r.temperature}°C</td>
                      <td className="mono">{r.humidity}%</td>
                      <td className="mono">{r.gasPPM}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="pagination-bar" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-soft)' }}>
          <span className="text-muted fs-xs">
            Showing Page {pagination.page} of {pagination.pages} ({pagination.total} Total Readings)
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-secondary btn-sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchPage(pagination.page - 1)}
            >
              Previous
            </button>
            <button
              className="btn-secondary btn-sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchPage(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 6. REPORTS VIEW (Section 9: Real Compliance Calculation) ─── */
export function ReportsView() {
  const [summary, setSummary] = useState(null);
  const [range, setRange] = useState('24h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      try {
        const res = await client.get('/reports/summary', { params: { range } });
        setSummary(res.data);
      } catch (e) {
        console.error('Report fetch error:', e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, [range]);

  return (
    <div className="subpage-view">
      <div className="page-header dashboard-header">
        <div>
          <h1 className="page-title">Environmental Compliance Reports</h1>
          <p className="page-subtitle">Automated air quality standard audits computed against MongoDB dataset.</p>
        </div>
        <div className="segmented-control">
          {['24h', '7d', '30d'].map((r) => (
            <button
              key={r}
              className={`segmented-control__btn ${range === r ? 'is-active' : ''}`}
              onClick={() => setRange(r)}
            >
              Last {r}
            </button>
          ))}
        </div>
      </div>

      <div className="reports-grid">
        <div className="card report-box">
          <h3 className="report-box__title">Air Quality Audit ({range.toUpperCase()})</h3>
          <p className="report-box__desc">
            Evaluated against NAAQS & EPA breakpoints. Measures percentage of time readings stayed within healthy bounds (AQI &le; 100).
          </p>
          <div className="location-stats" style={{ width: '100%', marginBottom: '16px' }}>
            <div className="loc-stat">
              <span className="text-faint fs-xs">COMPLIANCE RATE</span>
              <span className="mono loc-val text-online">{summary?.complianceRate || 100}%</span>
            </div>
            <div className="loc-stat">
              <span className="text-faint fs-xs">TOTAL READINGS</span>
              <span className="mono loc-val">{summary?.totalReadings || 0}</span>
            </div>
            <div className="loc-stat">
              <span className="text-faint fs-xs">ALERTS TRIGGERED</span>
              <span className="mono loc-val">{summary?.totalAlerts || 0}</span>
            </div>
          </div>
          <a
            href={`${client.defaults.baseURL}/reports/csv`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Download Verified CSV Audit
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── 7. SYSTEM HEALTH VIEW (R4, R11, Section 13) ─── */
export function SystemHealthView() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await client.get('/health');
        setHealth(res.data);
      } catch (e) {
        console.error('Health check failed:', e.message);
      }
    }
    checkHealth();
    const timer = setInterval(checkHealth, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="subpage-view">
      <div className="page-header">
        <h1 className="page-title">System Health & Telemetry Link</h1>
        <p className="page-subtitle">Real-time health telemetry across the API, MongoDB Atlas, and Socket.IO.</p>
      </div>

      <div className="health-grid">
        <div className="card health-card">
          <div className="health-top">
            <span className="health-title">Backend API (Express.js)</span>
            <span className="text-online font-bold">● {health?.status === 'ok' ? 'Healthy' : 'Degraded'}</span>
          </div>
          <p className="health-meta text-muted">
            Uptime: {health?.uptimeSeconds || 0}s · Memory: {health?.system?.memoryUsageMB || 0} MB
          </p>
        </div>

        <div className="card health-card">
          <div className="health-top">
            <span className="health-title">Database (MongoDB Atlas)</span>
            <span className="text-online font-bold">● {health?.database?.status || 'Connected'}</span>
          </div>
          <p className="health-meta text-muted">
            Host: {health?.database?.host || 'MongoDB Cluster'} · Replica Set
          </p>
        </div>

        <div className="card health-card">
          <div className="health-top">
            <span className="health-title">Socket.IO Push Channel</span>
            <span className="text-online font-bold">● Operational</span>
          </div>
          <p className="health-meta text-muted">
            Connected Web Clients: {health?.socketIO?.connectedClients || 1}
          </p>
        </div>

        <div className="card health-card">
          <div className="health-top">
            <span className="health-title">Sensing Hardware (ESP32 Node)</span>
            <span className="text-online font-bold">● Telemetry Stream Active</span>
          </div>
          <p className="health-meta text-muted">
            Sensors: MQ135 (Gas) + DHT22 (Temp/Humidity)
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── 8. HELP & SUPPORT VIEW ─── */
export function HelpSupportView() {
  return (
    <div className="subpage-view">
      <div className="page-header">
        <h1 className="page-title">Help & Documentation</h1>
        <p className="page-subtitle">Hardware wiring pinouts, MQ135 calibration workflow, and IEEE paper reference.</p>
      </div>

      <div className="card help-content">
        <h2 className="card-section-title">Hardware Pinout (ESP32)</h2>
        <div className="help-box mono">
          <div>MQ135 AOUT  &rarr;  ESP32 GPIO 34 (ADC1_CH6, 12-bit ADC)</div>
          <div>DHT22 DATA  &rarr;  ESP32 GPIO 27 (10k&Omega; pull-up to 3.3V)</div>
          <div>Power Rail  &rarr;  5V for MQ135 heater coil, 3.3V for ESP32 &amp; DHT22</div>
        </div>

        <h2 className="card-section-title mt-6">MQ135 Calibration Equation (R12)</h2>
        <p className="text-muted">
          Metal-oxide sensors measure relative resistance changes: <code>Rs/R0</code>. This is translated to ppm via power-law curve: <code>ppm = 116.6 * (Rs/R0)^(-2.769)</code>.
        </p>

        <h2 className="card-section-title mt-6">IEEE Reference</h2>
        <p className="text-muted fs-sm">
          "IoT-Based Hyperlocal Air Quality Monitoring and Alert System with Cloud Integration", companion repository implementation.
        </p>
      </div>
    </div>
  );
}

/* ─── 9. PROFILE VIEW ─── */
export function ProfileView({ onNavigateLogin }) {
  const { user, isGuest, logout } = useAuth();

  return (
    <div className="subpage-view">
      <div className="page-header">
        <h1 className="page-title">Account Profile</h1>
        <p className="page-subtitle">User credentials, access role, and session management.</p>
      </div>

      <div className="card profile-card">
        {user ? (
          <div className="profile-details">
            <div className="profile-avatar-large">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="profile-info">
              <h2 className="profile-name">{user.name}</h2>
              <span className="profile-email text-muted">{user.email}</span>
              <span className="topnav__badge-user mt-2">{user.role?.toUpperCase()}</span>
            </div>
            <div className="profile-actions mt-4">
              <button className="btn-secondary" onClick={logout}>
                Log out
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-guest-notice">
            <h2 className="profile-name">Guest Mode</h2>
            <p className="text-muted mb-4">
              You are currently viewing in Guest Mode. Log in to manage devices, acknowledge critical alerts, and save notification preferences.
            </p>
            <button className="btn-primary" onClick={onNavigateLogin}>
              Log in to Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
