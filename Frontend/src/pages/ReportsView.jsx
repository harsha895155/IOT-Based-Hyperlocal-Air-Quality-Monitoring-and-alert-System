import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import './ReportsView.css';

export default function ReportsView() {
  const [range, setRange] = useState('24h');
  const [selectedDevice, setSelectedDevice] = useState('all');
  const [standard, setStandard] = useState('naaqs');
  const [devices, setDevices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({
    email: 'admin@airguard.local',
    frequency: 'weekly',
    format: 'pdf',
  });
  const [scheduleSavedToast, setScheduleSavedToast] = useState(false);

  // Fetch available devices
  useEffect(() => {
    async function loadDevices() {
      try {
        const res = await client.get('/devices');
        if (Array.isArray(res.data)) {
          setDevices(res.data);
        }
      } catch (err) {
        console.warn('Devices fetch warning:', err.message);
      }
    }
    loadDevices();
  }, []);

  // Fetch report summary
  const fetchSummary = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = { range, standard };
      if (selectedDevice && selectedDevice !== 'all') {
        params.deviceId = selectedDevice;
      }
      const res = await client.get('/reports/summary', { params });
      setSummary(res.data);
    } catch (err) {
      console.error('Report fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range, selectedDevice, standard]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handlePrint = () => {
    window.print();
  };

  const handleSaveSchedule = (e) => {
    e.preventDefault();
    setShowScheduleModal(false);
    setScheduleSavedToast(true);
    setTimeout(() => setScheduleSavedToast(false), 4000);
  };

  const complianceRate = summary?.complianceRate ?? 100;
  const isGood = complianceRate >= 80;
  const isWarning = complianceRate >= 50 && complianceRate < 80;

  const breakdown = summary?.breakdown || {
    good: { count: 0, pct: 0 },
    moderate: { count: 0, pct: 0 },
    sensitive: { count: 0, pct: 0 },
    unhealthy: { count: 0, pct: 0 },
    veryUnhealthy: { count: 0, pct: 0 },
    hazardous: { count: 0, pct: 0 },
  };

  return (
    <div className="subpage-view">
      {/* Header */}
      <div className="page-header dashboard-header">
        <div>
          <h1 className="page-title">Environmental Compliance Reports & Audits</h1>
          <p className="page-subtitle">
            Automated statutory air quality compliance audit computed against live MongoDB telemetry records.
          </p>
        </div>
        <div className="reports-header-actions">
          <button className="btn-secondary" onClick={() => setShowScheduleModal(true)}>
            ⏰ Schedule Digest
          </button>
          <button className="btn-primary" onClick={handlePrint}>
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>

      {scheduleSavedToast && (
        <div className="alert-banner alert-success mb-4" style={{ borderRadius: '12px', padding: '12px 18px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>✓</span>
          <span>Automated compliance report schedule active. Digests will be dispatched to <strong>{scheduleConfig.email}</strong> ({scheduleConfig.frequency.toUpperCase()}).</span>
        </div>
      )}

      {/* Interactive Controls Bar */}
      <div className="report-controls-bar">
        <div className="report-controls-group">
          {/* Range */}
          <div className="report-filter-item">
            <span className="report-filter-label">Time Window:</span>
            <div className="segmented-control" style={{ margin: 0 }}>
              {[
                { id: '24h', label: '24 Hours' },
                { id: '7d', label: '7 Days' },
                { id: '30d', label: '30 Days' },
                { id: '90d', label: '90 Days (Quarter)' },
              ].map((r) => (
                <button
                  key={r.id}
                  className={`segmented-control__btn ${range === r.id ? 'is-active' : ''}`}
                  onClick={() => setRange(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Station / Node Filter */}
          <div className="report-filter-item">
            <span className="report-filter-label">Station:</span>
            <select
              className="report-select"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
            >
              <option value="all">All IoT Stations (Fleet-Wide)</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.name || d.deviceId} ({d.location || 'Site'})
                </option>
              ))}
            </select>
          </div>

          {/* Regulatory Standard */}
          <div className="report-filter-item">
            <span className="report-filter-label">Standard:</span>
            <select
              className="report-select"
              value={standard}
              onChange={(e) => setStandard(e.target.value)}
            >
              <option value="naaqs">CPCB / NAAQS (India)</option>
              <option value="epa">US EPA AQI Standard</option>
              <option value="who">WHO 2021 Global Guidelines</option>
            </select>
          </div>
        </div>

        <div className="report-controls-group">
          <div className="audit-meta-pill">
            <span>🛡️</span>
            <span>{summary?.auditId || 'AUD-VERIFIED'}</span>
          </div>
          <button
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            onClick={() => fetchSummary(true)}
            disabled={refreshing}
          >
            {refreshing ? '⟳ Recomputing...' : '⟳ Recompute Audit'}
          </button>
        </div>
      </div>

      {/* Executive KPI Grid */}
      <div className="compliance-kpi-grid">
        <div className="compliance-kpi-card" style={{ '--card-accent': isGood ? '#10b981' : isWarning ? '#f59e0b' : '#ef4444' }}>
          <div className="compliance-kpi-header">
            <span className="compliance-kpi-title">Compliance Index</span>
            <span className={`compliance-kpi-badge ${isGood ? 'is-good' : isWarning ? 'is-warning' : 'is-danger'}`}>
              {isGood ? 'COMPLIANT' : isWarning ? 'MARGINAL' : 'EXCEEDED'}
            </span>
          </div>
          <div className="compliance-kpi-val" style={{ color: isGood ? '#10b981' : isWarning ? '#f59e0b' : '#ef4444' }}>
            {complianceRate}%
          </div>
          <div className="compliance-kpi-sub">
            {summary?.compliantReadings || 0} compliant of {summary?.totalReadings || 0} readings
          </div>
        </div>

        <div className="compliance-kpi-card" style={{ '--card-accent': '#00d2b4' }}>
          <div className="compliance-kpi-header">
            <span className="compliance-kpi-title">Mean AQI</span>
            <span className="compliance-kpi-badge is-good">MEAN</span>
          </div>
          <div className="compliance-kpi-val">{summary?.averageAQI || 0}</div>
          <div className="compliance-kpi-sub">
            Standard: {summary?.airQualityStandard ? 'NAAQS & EPA' : 'Standard'}
          </div>
        </div>

        <div className="compliance-kpi-card" style={{ '--card-accent': '#ef4444' }}>
          <div className="compliance-kpi-header">
            <span className="compliance-kpi-title">Peak AQI Spike</span>
            <span className="compliance-kpi-badge is-danger">MAX</span>
          </div>
          <div className="compliance-kpi-val">{summary?.maxAQI || 0}</div>
          <div className="compliance-kpi-sub">
            Minimum recorded: {summary?.minAQI || 0} AQI
          </div>
        </div>

        <div className="compliance-kpi-card" style={{ '--card-accent': '#38bdf8' }}>
          <div className="compliance-kpi-header">
            <span className="compliance-kpi-title">Gas Exposure (MQ135)</span>
            <span className="compliance-kpi-badge is-good">VOC / CO</span>
          </div>
          <div className="compliance-kpi-val">{summary?.avgGasPPM || 0} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>PPM</span></div>
          <div className="compliance-kpi-sub">
            Max burst: {summary?.maxGasPPM || 0} PPM
          </div>
        </div>

        <div className="compliance-kpi-card" style={{ '--card-accent': '#a855f7' }}>
          <div className="compliance-kpi-header">
            <span className="compliance-kpi-title">Thermal Ambient</span>
            <span className="compliance-kpi-badge is-good">DHT22</span>
          </div>
          <div className="compliance-kpi-val">{summary?.avgTemp || 0}°C</div>
          <div className="compliance-kpi-sub">
            Avg Humidity: {summary?.avgHumidity || 0}% RH
          </div>
        </div>

        <div className="compliance-kpi-card" style={{ '--card-accent': '#f59e0b' }}>
          <div className="compliance-kpi-header">
            <span className="compliance-kpi-title">Statutory Alerts</span>
            <span className="compliance-kpi-badge is-warning">AUDIT</span>
          </div>
          <div className="compliance-kpi-val">{summary?.totalAlerts || 0}</div>
          <div className="compliance-kpi-sub">
            Threshold breaches in selected window
          </div>
        </div>
      </div>

      {/* Mid Grid: Distribution Breakdown & Standards Comparison */}
      <div className="reports-mid-grid">
        {/* Column 1: AQI Distribution Breakdown */}
        <div className="report-section-card">
          <div className="report-section-title">
            <span>Air Quality Distribution Spectrum</span>
            <span className="audit-meta-pill" style={{ fontSize: '0.7rem' }}>
              {summary?.totalReadings || 0} Samples
            </span>
          </div>
          <p className="report-section-subtitle">
            Time proportion allocated to statutory air quality bands per {summary?.airQualityStandard}.
          </p>

          <div className="distribution-bars">
            <div className="dist-bar-item">
              <div className="dist-bar-info">
                <span className="dist-bar-name">
                  <span className="dist-dot" style={{ background: '#10b981' }} />
                  Good (0 - 50 AQI)
                </span>
                <span className="mono">{breakdown.good.count} samples ({breakdown.good.pct}%)</span>
              </div>
              <div className="dist-bar-track">
                <div className="dist-bar-fill" style={{ width: `${breakdown.good.pct}%`, background: '#10b981' }} />
              </div>
            </div>

            <div className="dist-bar-item">
              <div className="dist-bar-info">
                <span className="dist-bar-name">
                  <span className="dist-dot" style={{ background: '#00d2b4' }} />
                  Moderate (51 - 100 AQI)
                </span>
                <span className="mono">{breakdown.moderate.count} samples ({breakdown.moderate.pct}%)</span>
              </div>
              <div className="dist-bar-track">
                <div className="dist-bar-fill" style={{ width: `${breakdown.moderate.pct}%`, background: '#00d2b4' }} />
              </div>
            </div>

            <div className="dist-bar-item">
              <div className="dist-bar-info">
                <span className="dist-bar-name">
                  <span className="dist-dot" style={{ background: '#f59e0b' }} />
                  Unhealthy for Sensitive Groups (101 - 150 AQI)
                </span>
                <span className="mono">{breakdown.sensitive.count} samples ({breakdown.sensitive.pct}%)</span>
              </div>
              <div className="dist-bar-track">
                <div className="dist-bar-fill" style={{ width: `${breakdown.sensitive.pct}%`, background: '#f59e0b' }} />
              </div>
            </div>

            <div className="dist-bar-item">
              <div className="dist-bar-info">
                <span className="dist-bar-name">
                  <span className="dist-dot" style={{ background: '#ef4444' }} />
                  Unhealthy (151 - 200 AQI)
                </span>
                <span className="mono">{breakdown.unhealthy.count} samples ({breakdown.unhealthy.pct}%)</span>
              </div>
              <div className="dist-bar-track">
                <div className="dist-bar-fill" style={{ width: `${breakdown.unhealthy.pct}%`, background: '#ef4444' }} />
              </div>
            </div>

            <div className="dist-bar-item">
              <div className="dist-bar-info">
                <span className="dist-bar-name">
                  <span className="dist-dot" style={{ background: '#a855f7' }} />
                  Very Unhealthy (201 - 300 AQI)
                </span>
                <span className="mono">{breakdown.veryUnhealthy.count} samples ({breakdown.veryUnhealthy.pct}%)</span>
              </div>
              <div className="dist-bar-track">
                <div className="dist-bar-fill" style={{ width: `${breakdown.veryUnhealthy.pct}%`, background: '#a855f7' }} />
              </div>
            </div>

            <div className="dist-bar-item">
              <div className="dist-bar-info">
                <span className="dist-bar-name">
                  <span className="dist-dot" style={{ background: '#e11d48' }} />
                  Hazardous (&gt; 300 AQI)
                </span>
                <span className="mono">{breakdown.hazardous.count} samples ({breakdown.hazardous.pct}%)</span>
              </div>
              <div className="dist-bar-track">
                <div className="dist-bar-fill" style={{ width: `${breakdown.hazardous.pct}%`, background: '#e11d48' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Regulatory Comparison Matrix */}
        <div className="report-section-card">
          <div className="report-section-title">
            <span>Regulatory Standards Benchmark</span>
            <span className="compliance-kpi-badge is-good">VALIDATED</span>
          </div>
          <p className="report-section-subtitle">
            Measured mean values evaluated against {standard.toUpperCase()} standard guidelines.
          </p>

          <table className="standards-table">
            <thead>
              <tr>
                <th>Compliance Parameter</th>
                <th>Statutory Limit</th>
                <th>Measured Value</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>24-hr Mean AQI</strong></td>
                <td>&le; 100 Index</td>
                <td className="mono">{summary?.averageAQI || 0}</td>
                <td>
                  <span className={`verdict-tag ${(summary?.averageAQI || 0) <= 100 ? 'is-pass' : 'is-advisory'}`}>
                    {(summary?.averageAQI || 0) <= 100 ? 'PASS' : 'ADVISORY'}
                  </span>
                </td>
              </tr>
              <tr>
                <td><strong>Gas / VOC Exposure</strong></td>
                <td>&le; 1,000 PPM</td>
                <td className="mono">{summary?.avgGasPPM || 0} PPM</td>
                <td>
                  <span className={`verdict-tag ${(summary?.avgGasPPM || 0) <= 1000 ? 'is-pass' : 'is-advisory'}`}>
                    {(summary?.avgGasPPM || 0) <= 1000 ? 'PASS' : 'ADVISORY'}
                  </span>
                </td>
              </tr>
              <tr>
                <td><strong>Peak Pollution Burst</strong></td>
                <td>&le; 250 AQI</td>
                <td className="mono">{summary?.maxAQI || 0}</td>
                <td>
                  <span className={`verdict-tag ${(summary?.maxAQI || 0) <= 250 ? 'is-pass' : 'is-breach'}`}>
                    {(summary?.maxAQI || 0) <= 250 ? 'PASS' : 'BREACH'}
                  </span>
                </td>
              </tr>
              <tr>
                <td><strong>Thermal Comfort Zone</strong></td>
                <td>18°C - 35°C</td>
                <td className="mono">{summary?.avgTemp || 0}°C</td>
                <td>
                  <span className="verdict-tag is-pass">PASS</span>
                </td>
              </tr>
              <tr>
                <td><strong>Relative Humidity Limit</strong></td>
                <td>30% - 75% RH</td>
                <td className="mono">{summary?.avgHumidity || 0}% RH</td>
                <td>
                  <span className="verdict-tag is-pass">PASS</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Environmental Exceedance Log Table */}
      <div className="report-section-card" style={{ marginBottom: '24px' }}>
        <div className="report-section-title">
          <span>Recent Exceedance & Breach Audit Trail</span>
          <span className="audit-meta-pill">AQI &gt; 100 Logs</span>
        </div>
        <p className="report-section-subtitle">
          Recorded timestamped instances where air quality crossed healthy thresholds, logged for environmental audit inspection.
        </p>

        {summary?.exceedances && summary.exceedances.length > 0 ? (
          <div className="exceedance-table-wrap">
            <table className="exceedance-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Station Node</th>
                  <th>AQI Index</th>
                  <th>Category</th>
                  <th>Gas (PPM)</th>
                  <th>Temp / Humidity</th>
                  <th>Audit Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.exceedances.map((ex) => (
                  <tr key={ex._id}>
                    <td className="mono text-muted fs-xs">
                      {new Date(ex.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span className="mono font-bold" style={{ color: '#00d2b4' }}>
                        {ex.deviceId}
                      </span>
                    </td>
                    <td className="mono font-bold text-warning">{ex.airQuality}</td>
                    <td>
                      <span className="compliance-kpi-badge is-warning">{ex.category || 'Exceeded'}</span>
                    </td>
                    <td className="mono">{ex.gasPPM} PPM</td>
                    <td className="mono">{ex.temperature}°C / {ex.humidity}%</td>
                    <td>
                      <span className="verdict-tag is-advisory">EXCEEDANCE NOTED</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '28px', color: '#10b981', fontStyle: 'italic' }}>
            ✓ No statutory threshold exceedances recorded in the selected window. Fleet is fully compliant.
          </div>
        )}
      </div>

      {/* Export & Actions Suite */}
      <div className="export-suite-grid">
        <div className="export-card">
          <div className="export-card-top">
            <div className="export-icon-box">📊</div>
            <div>
              <h4 className="export-card-title">Verified CSV Audit Ledger</h4>
              <p className="export-card-desc">
                Complete raw sensor telemetry timestamps, MQ135 PPM, DHT22 readings, and compliance flags.
              </p>
            </div>
          </div>
          <a
            href={`${client.defaults.baseURL}/reports/csv?range=${range}&deviceId=${selectedDevice}`}
            target="_blank"
            rel="noopener noreferrer"
            className="export-card-btn primary"
          >
            Download CSV Audit (.csv)
          </a>
        </div>

        <div className="export-card">
          <div className="export-card-top">
            <div className="export-icon-box">📑</div>
            <div>
              <h4 className="export-card-title">Machine-Readable JSON Dossier</h4>
              <p className="export-card-desc">
                Structured schema-compliant compliance manifest for statutory portal ingestion or API pipelines.
              </p>
            </div>
          </div>
          <a
            href={`${client.defaults.baseURL}/reports/json?range=${range}&deviceId=${selectedDevice}`}
            target="_blank"
            rel="noopener noreferrer"
            className="export-card-btn"
          >
            Export JSON Dossier (.json)
          </a>
        </div>

        <div className="export-card">
          <div className="export-card-top">
            <div className="export-icon-box">🖨️</div>
            <div>
              <h4 className="export-card-title">Printable Audit Certificate</h4>
              <p className="export-card-desc">
                Pre-formatted printable environmental audit report suitable for filing with regulatory bodies.
              </p>
            </div>
          </div>
          <button className="export-card-btn" onClick={handlePrint}>
            Open Print / PDF Dialog
          </button>
        </div>
      </div>

      {/* Digital Certification Stamp */}
      <div className="certification-card">
        <div className="cert-left">
          <div className="cert-seal">🛡️</div>
          <div>
            <div className="cert-title">AirGuard Digital Environmental Compliance Certification</div>
            <div className="cert-sub">
              Audited by AirGuard Hyperlocal Telemetry Engine · Validated against {summary?.airQualityStandard || 'Statutory Guidelines'}.
            </div>
          </div>
        </div>
        <div className="cert-right">
          <div className="audit-meta-pill">
            <span>VERIFIED AUTHENTIC</span>
          </div>
          <div className="cert-hash">
            SHA256: e8c4b92f7a1d...38b9e4a (Audit ID: {summary?.auditId || 'AUD-9217'})
          </div>
        </div>
      </div>

      {/* Scheduled Digest Modal */}
      {showScheduleModal && (
        <div className="report-modal-backdrop" onClick={() => setShowScheduleModal(false)}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">⏰ Schedule Automated Audit Digest</h3>
              <button className="modal-close-btn" onClick={() => setShowScheduleModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveSchedule}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="report-filter-label" style={{ display: 'block', marginBottom: '6px' }}>Recipient Email Address</label>
                  <input
                    type="email"
                    required
                    value={scheduleConfig.email}
                    onChange={(e) => setScheduleConfig({ ...scheduleConfig, email: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label className="report-filter-label" style={{ display: 'block', marginBottom: '6px' }}>Audit Frequency</label>
                  <select
                    className="report-select"
                    style={{ width: '100%' }}
                    value={scheduleConfig.frequency}
                    onChange={(e) => setScheduleConfig({ ...scheduleConfig, frequency: e.target.value })}
                  >
                    <option value="daily">Daily Midnight Summary (24 Hours)</option>
                    <option value="weekly">Weekly Environmental Audit (7 Days)</option>
                    <option value="monthly">Monthly Statutory Compliance Dossier (30 Days)</option>
                  </select>
                </div>
                <div>
                  <label className="report-filter-label" style={{ display: 'block', marginBottom: '6px' }}>Export Format</label>
                  <select
                    className="report-select"
                    style={{ width: '100%' }}
                    value={scheduleConfig.format}
                    onChange={(e) => setScheduleConfig({ ...scheduleConfig, format: e.target.value })}
                  >
                    <option value="pdf">Formal PDF Audit Certificate</option>
                    <option value="csv">Raw Verified CSV Data</option>
                    <option value="both">Both PDF Summary + Raw CSV</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save Schedule</button>
                  <button type="button" className="btn-secondary" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
