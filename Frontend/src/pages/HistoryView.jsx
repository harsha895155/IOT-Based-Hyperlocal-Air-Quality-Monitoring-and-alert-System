import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import { formatTimeAgo } from '../hooks/useReadings';
import { classifyAQI, healthRecommendation } from '../utils/aqi';
import './HistoryView.css';

export default function HistoryView() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    avgAQI: 0,
    maxAQI: 0,
    minAQI: 0,
    avgTemp: 0,
    avgHumidity: 0,
    avgGasPPM: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedDevice, setSelectedDevice] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timePreset, setTimePreset] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');

  // Inspection Modal
  const [inspectReading, setInspectReading] = useState(null);

  // Load available devices for filter dropdown
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

  // Fetch paginated history from backend
  const fetchHistory = useCallback(
    async (pageToFetch = 1, isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const params = {
          page: pageToFetch,
          limit: pageSize,
          sort: sortOrder,
        };

        if (selectedDevice !== 'all') params.deviceId = selectedDevice;
        if (selectedCategory !== 'all') params.category = selectedCategory;

        if (timePreset === '24h') {
          params.from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        } else if (timePreset === '7d') {
          params.from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        } else if (timePreset === '30d') {
          params.from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        const res = await client.get('/readings/history', { params });
        setHistory(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      } catch (err) {
        console.error('History query error:', err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDevice, selectedCategory, timePreset, sortOrder, pageSize]
  );

  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);

  // Filter in-memory for live search query
  const displayedHistory = history.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchId = (r.deviceId || '').toLowerCase().includes(q);
    const matchCat = (r.category || '').toLowerCase().includes(q);
    return matchId || matchCat;
  });

  // Export current filter slice as CSV
  const handleExportCSV = () => {
    if (displayedHistory.length === 0) return;
    let csv = 'Timestamp,Device ID,AQI,Category,Temperature (°C),Humidity (%),Gas PPM\n';
    displayedHistory.forEach((r) => {
      csv += `"${new Date(r.createdAt).toISOString()}","${r.deviceId}",${r.airQuality},"${r.category}",${r.temperature},${r.humidity},${r.gasPPM}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `airguard_observations_page_${pagination.page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="history-page">
      {/* Page Header */}
      <div className="page-header dashboard-header">
        <div>
          <h1 className="page-title">Historical Sensor Observations</h1>
          <p className="page-subtitle">
            Statutory telemetry archive with multi-tier parametric filtering, server-side pagination, and audit exports.
          </p>
        </div>
        <div className="history-header-actions">
          <button className="btn-secondary" onClick={() => fetchHistory(pagination.page, true)}>
            {refreshing ? '⟳ Refreshing...' : '⟳ Refresh Query'}
          </button>
          <button className="btn-secondary" onClick={handleExportCSV}>
            ⬇ Export Page CSV
          </button>
          <a
            href={`${client.defaults.baseURL}/reports/csv`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Export Full Dataset (.csv)
          </a>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="history-kpi-grid">
        <div className="history-kpi-card">
          <span className="history-kpi-title">
            <span>Total Ingested</span>
            <span>📦</span>
          </span>
          <div className="history-kpi-val">{pagination.total.toLocaleString()}</div>
          <span className="history-kpi-sub">Verified records in archive</span>
        </div>

        <div className="history-kpi-card">
          <span className="history-kpi-title">
            <span>Query Mean AQI</span>
            <span>💨</span>
          </span>
          <div className="history-kpi-val" style={{ color: '#00d2b4' }}>
            {stats.avgAQI || 0}
          </div>
          <span className="history-kpi-sub">Across filtered dataset</span>
        </div>

        <div className="history-kpi-card">
          <span className="history-kpi-title">
            <span>Peak Pollution Burst</span>
            <span>⚠️</span>
          </span>
          <div className="history-kpi-val" style={{ color: '#ef4444' }}>
            {stats.maxAQI || 0}
          </div>
          <span className="history-kpi-sub">Min baseline: {stats.minAQI || 0} AQI</span>
        </div>

        <div className="history-kpi-card">
          <span className="history-kpi-title">
            <span>Avg Gas Concentration</span>
            <span>🧪</span>
          </span>
          <div className="history-kpi-val">{stats.avgGasPPM || 0} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>PPM</span></div>
          <span className="history-kpi-sub">MQ135 Gas sensor baseline</span>
        </div>

        <div className="history-kpi-card">
          <span className="history-kpi-title">
            <span>Thermal Average</span>
            <span>🌡️</span>
          </span>
          <div className="history-kpi-val">{stats.avgTemp || 0}°C</div>
          <span className="history-kpi-sub">Avg Humidity: {stats.avgHumidity || 0}%</span>
        </div>
      </div>

      {/* Query & Filter Toolbar */}
      <div className="history-filter-card">
        <div className="history-filter-row">
          <div className="history-filter-group">
            {/* Station dropdown */}
            <div className="history-filter-item">
              <span className="history-label">Station:</span>
              <select
                className="history-select"
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
              >
                <option value="all">All IoT Stations</option>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.name || d.deviceId}
                  </option>
                ))}
              </select>
            </div>

            {/* Category dropdown */}
            <div className="history-filter-item">
              <span className="history-label">Category:</span>
              <select
                className="history-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="Good">Good (0 - 50)</option>
                <option value="Moderate">Moderate (51 - 100)</option>
                <option value="Unhealthy (SG)">Sensitive (101 - 150)</option>
                <option value="Unhealthy">Unhealthy (151 - 200)</option>
                <option value="Very Unhealthy">Very Unhealthy (201 - 300)</option>
                <option value="Hazardous">Hazardous (&gt; 300)</option>
              </select>
            </div>

            {/* Time Horizon dropdown */}
            <div className="history-filter-item">
              <span className="history-label">Time Window:</span>
              <select
                className="history-select"
                value={timePreset}
                onChange={(e) => setTimePreset(e.target.value)}
              >
                <option value="all">All Historical Time</option>
                <option value="24h">Past 24 Hours</option>
                <option value="7d">Past 7 Days</option>
                <option value="30d">Past 30 Days</option>
              </select>
            </div>

            {/* Sort order */}
            <div className="history-filter-item">
              <span className="history-label">Order:</span>
              <select
                className="history-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>

          <div className="history-filter-group">
            {/* Search Input */}
            <div className="history-filter-item">
              <input
                type="text"
                className="history-input"
                placeholder="Search station or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ minWidth: '200px' }}
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

            {/* Rows per page */}
            <div className="history-filter-item">
              <span className="history-label">Rows:</span>
              <select
                className="history-select"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value="15">15</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Observations Table */}
      <div className="history-table-card">
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>TIMESTAMP</th>
                <th>DEVICE STATION</th>
                <th>AQI INDEX</th>
                <th>CLASSIFICATION</th>
                <th>MQ135 GAS</th>
                <th>TEMPERATURE</th>
                <th>HUMIDITY</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</div>
                    <div style={{ marginTop: '8px' }}>Retrieving observations from MongoDB archive...</div>
                  </td>
                </tr>
              ) : displayedHistory.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No readings found matching active filters in the database.
                  </td>
                </tr>
              ) : (
                displayedHistory.map((r) => {
                  const { category, color } = classifyAQI(r.airQuality);
                  return (
                    <tr key={r._id}>
                      <td>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                          {new Date(r.createdAt).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {formatTimeAgo(r.createdAt)}
                        </div>
                      </td>
                      <td>
                        <span className="station-chip">
                          📡 {r.deviceId}
                        </span>
                      </td>
                      <td>
                        <span
                          className="aqi-pill"
                          style={{
                            background: `${color}20`,
                            color: color,
                            border: `1px solid ${color}40`,
                          }}
                        >
                          {r.airQuality}
                        </span>
                      </td>
                      <td>
                        <span className="category-tag" style={{ color }}>
                          <span className="category-dot" style={{ background: color }} />
                          {r.category || category}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {r.gasPPM} PPM
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {r.temperature}°C
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {r.humidity}%
                      </td>
                      <td>
                        <button
                          className="page-btn"
                          style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                          onClick={() => setInspectReading(r)}
                        >
                          🔍 Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="history-pagination-bar">
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.pages}</strong> ({pagination.total.toLocaleString()} total observations)
          </span>

          <div className="pagination-controls">
            <button
              className="page-btn"
              disabled={pagination.page <= 1}
              onClick={() => fetchHistory(1)}
              title="First Page"
            >
              ««
            </button>
            <button
              className="page-btn"
              disabled={pagination.page <= 1}
              onClick={() => fetchHistory(pagination.page - 1)}
            >
              Previous
            </button>

            {/* Current Page Pill */}
            <span
              style={{
                background: 'rgba(0, 210, 180, 0.1)',
                border: '1px solid rgba(0, 210, 180, 0.3)',
                color: '#00d2b4',
                padding: '4px 12px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.8rem',
              }}
            >
              {pagination.page} / {pagination.pages}
            </span>

            <button
              className="page-btn"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchHistory(pagination.page + 1)}
            >
              Next
            </button>
            <button
              className="page-btn"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchHistory(pagination.pages)}
              title="Last Page"
            >
              »»
            </button>
          </div>
        </div>
      </div>

      {/* Observation Inspection Modal */}
      {inspectReading && (
        <div className="history-modal-backdrop" onClick={() => setInspectReading(null)}>
          <div className="history-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                🔍 Telemetry Observation Detail
              </h3>
              <button
                onClick={() => setInspectReading(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '16px' }}>
              Detailed physical sensor diagnostics logged for ingestion event <code>{inspectReading._id}</code>.
            </p>

            <div className="inspect-grid">
              <div className="inspect-item">
                <span className="inspect-label">Station Identifier</span>
                <span className="inspect-val" style={{ color: '#00d2b4' }}>{inspectReading.deviceId}</span>
              </div>
              <div className="inspect-item">
                <span className="inspect-label">Measured AQI</span>
                <span className="inspect-val" style={{ color: classifyAQI(inspectReading.airQuality).color }}>
                  {inspectReading.airQuality}
                </span>
              </div>
              <div className="inspect-item">
                <span className="inspect-label">Classification</span>
                <span className="inspect-val" style={{ fontSize: '0.95rem' }}>
                  {inspectReading.category || classifyAQI(inspectReading.airQuality).category}
                </span>
              </div>
              <div className="inspect-item">
                <span className="inspect-label">MQ135 Gas Level</span>
                <span className="inspect-val">{inspectReading.gasPPM} PPM</span>
              </div>
              <div className="inspect-item">
                <span className="inspect-label">Ambient Temperature</span>
                <span className="inspect-val">{inspectReading.temperature}°C</span>
              </div>
              <div className="inspect-item">
                <span className="inspect-label">Relative Humidity</span>
                <span className="inspect-val">{inspectReading.humidity}% RH</span>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Health Advisory</div>
              <div style={{ fontSize: '0.82rem', color: '#f8fafc' }}>
                {healthRecommendation(inspectReading.airQuality)}
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
              ISO Timestamp: {inspectReading.createdAt}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn-secondary" onClick={() => setInspectReading(null)}>
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
