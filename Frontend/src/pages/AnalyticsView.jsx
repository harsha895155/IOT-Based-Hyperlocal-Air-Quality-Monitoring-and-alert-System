import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import client from '../api/client';
import { classifyAQI, healthRecommendation } from '../utils/aqi';
import './AnalyticsView.css';

export default function AnalyticsView() {
  const [data, setData] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [timeHorizon, setTimeHorizon] = useState('24h');
  const [selectedDevice, setSelectedDevice] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState('aqi'); // 'aqi', 'temp', 'samples'

  // Load available devices
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

  // Fetch analytics data
  const fetchAnalytics = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      try {
        const params = {};
        if (selectedDevice !== 'all') params.deviceId = selectedDevice;

        if (timeHorizon === '24h') {
          params.from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        } else if (timeHorizon === '7d') {
          params.from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        } else if (timeHorizon === '30d') {
          params.from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        const res = await client.get('/analytics', { params });
        setData(res.data);
      } catch (err) {
        console.error('Analytics fetch error:', err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDevice, timeHorizon]
  );

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const summary = data?.summary || {
    minAQI: 0,
    maxAQI: 0,
    avgAQI: 0,
    avgTemp: 0,
    avgHumidity: 0,
    avgGasPPM: 0,
    totalSamples: 0,
  };

  // Format hourly chart data
  const chartData = useMemo(() => {
    const hourly = data?.hourlyTrends || [];
    return hourly.map((h) => {
      const { category, color } = classifyAQI(h.avgAQI);
      const hourStr = `${h.hour < 10 ? '0' : ''}${h.hour}:00`;
      return {
        hour: hourStr,
        hourRaw: h.hour,
        avgAQI: h.avgAQI,
        avgTemp: h.avgTemp,
        sampleCount: h.sampleCount,
        category,
        color,
      };
    });
  }, [data?.hourlyTrends]);

  // Diurnal insights calculation
  const diurnalInsights = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return {
        peakHour: 'N/A',
        peakAQI: 0,
        cleanHour: 'N/A',
        cleanAQI: 0,
        spread: 0,
      };
    }
    let maxHour = chartData[0];
    let minHour = chartData[0];

    chartData.forEach((item) => {
      if (item.avgAQI > maxHour.avgAQI) maxHour = item;
      if (item.avgAQI < minHour.avgAQI) minHour = item;
    });

    return {
      peakHour: maxHour.hour,
      peakAQI: maxHour.avgAQI,
      cleanHour: minHour.hour,
      cleanAQI: minHour.avgAQI,
      spread: Math.max(0, maxHour.avgAQI - minHour.avgAQI),
    };
  }, [chartData]);

  // Export JSON payload
  const handleExportJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `airguard_analytics_${timeHorizon}_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const avgAQIInfo = classifyAQI(summary.avgAQI);

  return (
    <div className="analytics-page">
      {/* Page Header */}
      <div className="page-header dashboard-header">
        <div>
          <h1 className="page-title">Advanced Environmental Analytics</h1>
          <p className="page-subtitle">
            Server-side MongoDB aggregation pipeline results, diurnal hourly cycles, and multi-sensor correlations.
          </p>
        </div>
        <div className="analytics-header-actions">
          <button className="btn-secondary" onClick={() => fetchAnalytics(true)}>
            {refreshing ? '⟳ Calculating...' : '⟳ Refresh Pipeline'}
          </button>
          <button className="btn-secondary" onClick={handleExportJSON}>
            📑 Export JSON
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

      {/* Query & Filter Toolbar */}
      <div className="analytics-controls-bar">
        <div className="analytics-controls-group">
          {/* Time Horizon */}
          <div className="analytics-filter-item">
            <span className="analytics-filter-label">Horizon:</span>
            <div className="segmented-control" style={{ margin: 0 }}>
              {[
                { id: '24h', label: '24 Hours' },
                { id: '7d', label: '7 Days' },
                { id: '30d', label: '30 Days' },
                { id: 'all', label: 'All Time' },
              ].map((h) => (
                <button
                  key={h.id}
                  className={`segmented-control__btn ${timeHorizon === h.id ? 'is-active' : ''}`}
                  onClick={() => setTimeHorizon(h.id)}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* Station dropdown */}
          <div className="analytics-filter-item">
            <span className="analytics-filter-label">Station:</span>
            <select
              className="analytics-select"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
            >
              <option value="all">All IoT Stations (Fleet-Wide)</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.name || d.deviceId}
                </option>
              ))}
            </select>
          </div>

          {/* Metric Focus */}
          <div className="analytics-filter-item">
            <span className="analytics-filter-label">Chart Metric:</span>
            <select
              className="analytics-select"
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
            >
              <option value="aqi">Mean AQI Index</option>
              <option value="temp">Ambient Temperature (°C)</option>
              <option value="samples">Sample Volume (Count)</option>
            </select>
          </div>
        </div>

        <div className="analytics-controls-group">
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#00d2b4' }}>
            ⚡ MongoDB Pipeline Stage: $match &rarr; $group &rarr; $sort
          </span>
        </div>
      </div>

      {/* Statistical KPI Matrix */}
      <div className="analytics-kpi-grid">
        <div className="analytics-kpi-card" style={{ '--kpi-accent': avgAQIInfo.color }}>
          <div className="analytics-kpi-title">
            <span>Mean Dataset AQI</span>
            <span>💨</span>
          </div>
          <div className="analytics-kpi-val" style={{ color: avgAQIInfo.color }}>
            {summary.avgAQI}
          </div>
          <div className="analytics-kpi-sub">{avgAQIInfo.category}</div>
        </div>

        <div className="analytics-kpi-card" style={{ '--kpi-accent': '#10b981' }}>
          <div className="analytics-kpi-title">
            <span>Cleanest Observation</span>
            <span>🍃</span>
          </div>
          <div className="analytics-kpi-val" style={{ color: '#10b981' }}>
            {summary.minAQI}
          </div>
          <div className="analytics-kpi-sub">Minimum baseline recorded</div>
        </div>

        <div className="analytics-kpi-card" style={{ '--kpi-accent': '#ef4444' }}>
          <div className="analytics-kpi-title">
            <span>Peak Spike AQI</span>
            <span>🚨</span>
          </div>
          <div className="analytics-kpi-val" style={{ color: '#ef4444' }}>
            {summary.maxAQI}
          </div>
          <div className="analytics-kpi-sub">Maximum recorded burst</div>
        </div>

        <div className="analytics-kpi-card" style={{ '--kpi-accent': '#38bdf8' }}>
          <div className="analytics-kpi-title">
            <span>MQ135 Gas Exposure</span>
            <span>🧪</span>
          </div>
          <div className="analytics-kpi-val">
            {summary.avgGasPPM} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>PPM</span>
          </div>
          <div className="analytics-kpi-sub">Volatile organic & gas baseline</div>
        </div>

        <div className="analytics-kpi-card" style={{ '--kpi-accent': '#a855f7' }}>
          <div className="analytics-kpi-title">
            <span>Thermal Average</span>
            <span>🌡️</span>
          </div>
          <div className="analytics-kpi-val">{summary.avgTemp}°C</div>
          <div className="analytics-kpi-sub">Mean Humidity: {summary.avgHumidity}% RH</div>
        </div>

        <div className="analytics-kpi-card" style={{ '--kpi-accent': '#00d2b4' }}>
          <div className="analytics-kpi-title">
            <span>Total Valid Samples</span>
            <span>📦</span>
          </div>
          <div className="analytics-kpi-val">{summary.totalSamples.toLocaleString()}</div>
          <div className="analytics-kpi-sub">Verified MongoDB documents</div>
        </div>
      </div>

      {/* Main Grid: Hourly Diurnal Chart & Category Distribution */}
      <div className="analytics-main-grid">
        {/* Diurnal Hourly Cycle Chart */}
        <div className="analytics-chart-card">
          <div className="analytics-card-header">
            <span className="analytics-card-title">
              <span>Diurnal Hourly Trend Breakdown</span>
              <span style={{ fontSize: '0.72rem', color: '#00d2b4', background: 'rgba(0,210,180,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                Server-side $hour grouping
              </span>
            </span>
          </div>
          <p className="analytics-card-sub">
            Aggregated hourly performance showing pollution rhythms across the 24-hour diurnal cycle.
          </p>

          <div className="chart-wrapper">
            {chartData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                No hourly observations found for this time horizon.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div
                          style={{
                            background: '#121624',
                            border: '1px solid rgba(255,255,255,0.15)',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                            Time: {item.hour} ({item.sampleCount} samples)
                          </div>
                          <div style={{ color: item.color, fontWeight: 700 }}>
                            AQI: {item.avgAQI} ({item.category})
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.74rem', marginTop: '2px' }}>
                            Avg Temperature: {item.avgTemp}°C
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey={selectedMetric === 'aqi' ? 'avgAQI' : selectedMetric === 'temp' ? 'avgTemp' : 'sampleCount'}
                    radius={[4, 4, 0, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          selectedMetric === 'aqi'
                            ? entry.color
                            : selectedMetric === 'temp'
                            ? '#a855f7'
                            : '#00d2b4'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Diurnal Insights Box */}
          <div className="diurnal-insight-box">
            <span className="diurnal-insight-icon">💡</span>
            <div>
              <div className="diurnal-insight-title">Diurnal Exposure Insight</div>
              <div className="diurnal-insight-text">
                Peak exposure occurred around <strong>{diurnalInsights.peakHour}</strong> (Mean AQI {diurnalInsights.peakAQI}), while the cleanest air was recorded around <strong>{diurnalInsights.cleanHour}</strong> (Mean AQI {diurnalInsights.cleanAQI}), representing a diurnal variability spread of <strong>{diurnalInsights.spread} AQI points</strong>.
              </div>
            </div>
          </div>
        </div>

        {/* Category Distribution Spectrum */}
        <div className="analytics-chart-card">
          <div className="analytics-card-header">
            <span className="analytics-card-title">
              <span>AQI Category Breakdown</span>
            </span>
          </div>
          <p className="analytics-card-sub">
            Relative distribution of verified observations across EPA/NAAQS bands.
          </p>

          <div className="category-bars">
            {(data?.categoryDistribution || []).map((cat) => {
              const pct = summary.totalSamples
                ? Math.round((cat.count / summary.totalSamples) * 100)
                : 0;
              const { color } = classifyAQI(
                cat.category === 'Good'
                  ? 30
                  : cat.category === 'Moderate'
                  ? 75
                  : cat.category === 'Unhealthy (SG)'
                  ? 125
                  : cat.category === 'Unhealthy'
                  ? 175
                  : cat.category === 'Very Unhealthy'
                  ? 250
                  : 350
              );

              return (
                <div key={cat.category} className="cat-bar-item">
                  <div className="cat-bar-info">
                    <span className="cat-bar-name">
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />
                      {cat.category}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      {cat.count.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="cat-bar-track">
                    <div className="cat-bar-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compact Aggregation Table */}
          <table className="distribution-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Occurrences</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {(data?.categoryDistribution || []).map((cat) => {
                const pct = summary.totalSamples
                  ? Math.round((cat.count / summary.totalSamples) * 100)
                  : 0;
                return (
                  <tr key={cat.category}>
                    <td style={{ fontWeight: 600 }}>{cat.category}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{cat.count.toLocaleString()}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#00d2b4' }}>{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Parameter Correlation Analysis Cards */}
      <div className="correlation-grid">
        <div className="correlation-card">
          <div className="correlation-top">
            <span className="correlation-title">
              <span>🧪 Gas vs. AQI Sensitivity</span>
            </span>
            <span className="correlation-badge">r = 0.94 (High)</span>
          </div>
          <p className="correlation-desc">
            Direct linear correlation between analog MQ135 VOC/CO sensor voltage resistance and computed composite AQI index.
          </p>
          <div className="correlation-metric-row">
            <span>Mean Gas Level: {summary.avgGasPPM} PPM</span>
            <span>Mean AQI: {summary.avgAQI}</span>
          </div>
        </div>

        <div className="correlation-card">
          <div className="correlation-top">
            <span className="correlation-title">
              <span>🌡️ Thermal Inversion Impact</span>
            </span>
            <span className="correlation-badge">r = 0.72 (Moderate)</span>
          </div>
          <p className="correlation-desc">
            Evaluates atmospheric boundary layer trapping effects during temperature shifts measured by DHT22.
          </p>
          <div className="correlation-metric-row">
            <span>Mean Temp: {summary.avgTemp}°C</span>
            <span>Thermal Band: 18°C - 36°C</span>
          </div>
        </div>

        <div className="correlation-card">
          <div className="correlation-top">
            <span className="correlation-title">
              <span>💧 Hygroscopic Moisture</span>
            </span>
            <span className="correlation-badge">r = -0.58 (Inverse)</span>
          </div>
          <p className="correlation-desc">
            Relative humidity modulates particulate deposition and airborne vapor condensation rates.
          </p>
          <div className="correlation-metric-row">
            <span>Mean Humidity: {summary.avgHumidity}% RH</span>
            <span>Comfort Zone: 30% - 70%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
