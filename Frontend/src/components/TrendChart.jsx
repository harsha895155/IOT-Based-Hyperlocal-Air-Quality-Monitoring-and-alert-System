import React, { useState } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import './TrendChart.css';

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="trend-tooltip">
      <div className="trend-tooltip__time mono">{formatTime(label)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="trend-tooltip__row">
          <span className="trend-tooltip__dot" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <span className="mono trend-tooltip__value">
            {p.value != null ? (p.dataKey === 'temperature' ? `${Number(p.value).toFixed(1)} °C` : Math.round(p.value)) : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TrendChart({ data }) {
  const [viewMode, setViewMode] = useState('dual'); // 'dual', 'aqi', 'temperature'

  const chartData = (data || []).map((r) => ({
    time: r.createdAt,
    aqi: typeof r.airQuality === 'number' ? r.airQuality : null,
    temperature: typeof r.temperature === 'number' ? r.temperature : null,
  }));

  return (
    <div className="trend-chart card">
      <div className="trend-chart__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 className="trend-chart__title">AQI &amp; Temperature Trend</h2>
          <p className="trend-chart__subtitle">
            {viewMode === 'dual' ? 'Dual-Axis Sensor Telemetry (Base Paper Fig. 4)' : `Last ${chartData.length} telemetry readings`}
          </p>
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-soft)' }}>
          <button
            type="button"
            onClick={() => setViewMode('dual')}
            style={{
              background: viewMode === 'dual' ? 'var(--surface-raised)' : 'transparent',
              color: viewMode === 'dual' ? 'var(--accent)' : 'var(--text-muted)',
              border: 'none',
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Dual (Fig. 4)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('aqi')}
            style={{
              background: viewMode === 'aqi' ? 'var(--surface-raised)' : 'transparent',
              color: viewMode === 'aqi' ? 'var(--accent)' : 'var(--text-muted)',
              border: 'none',
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            AQI
          </button>
          <button
            type="button"
            onClick={() => setViewMode('temperature')}
            style={{
              background: viewMode === 'temperature' ? 'var(--surface-raised)' : 'transparent',
              color: viewMode === 'temperature' ? '#f59e0b' : 'var(--text-muted)',
              border: 'none',
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Temp (°C)
          </button>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="trend-chart__empty">No historical telemetry recorded yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height={290}>
          <ComposedChart data={chartData} margin={{ top: 12, right: viewMode === 'dual' ? 16 : 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="aqiFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-soft)" vertical={false} />
            <XAxis
              dataKey="time"
              tickFormatter={formatTime}
              stroke="var(--text-faint)"
              tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
            />

            {/* Left Y-Axis: AQI */}
            {(viewMode === 'dual' || viewMode === 'aqi') && (
              <YAxis
                yAxisId="left"
                orientation="left"
                stroke="var(--text-faint)"
                tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
                width={36}
                domain={[0, (dataMax) => Math.max(160, Math.ceil(dataMax * 1.15))]}
              />
            )}

            {/* Right Y-Axis: Temperature */}
            {(viewMode === 'dual' || viewMode === 'temperature') && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#f59e0b"
                tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
                width={40}
                unit="°"
                domain={[15, 45]}
              />
            )}

            <Tooltip content={<CustomTooltip />} />

            {/* Threshold Reference Lines from Paper Fig. 4 */}
            {(viewMode === 'dual' || viewMode === 'aqi') && (
              <>
                <ReferenceLine
                  yAxisId="left"
                  y={50}
                  stroke="var(--aqi-moderate, #eab308)"
                  strokeDasharray="3 3"
                  label={{ value: 'Moderate (50)', fill: 'var(--text-faint)', fontSize: 10, position: 'insideTopLeft' }}
                />
                <ReferenceLine
                  yAxisId="left"
                  y={100}
                  stroke="var(--aqi-unhealthy-sg, #f97316)"
                  strokeDasharray="3 3"
                  label={{ value: 'Unhealthy SG (100)', fill: 'var(--text-faint)', fontSize: 10, position: 'insideTopLeft' }}
                />
              </>
            )}

            {/* AQI Area Curve */}
            {(viewMode === 'dual' || viewMode === 'aqi') && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="aqi"
                name="Air Quality Index"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#aqiFill)"
                isAnimationActive={false}
              />
            )}

            {/* Temperature Line/Area Curve */}
            {(viewMode === 'dual' || viewMode === 'temperature') && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="temperature"
                name="Temperature (°C)"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray={viewMode === 'dual' ? '4 4' : undefined}
                dot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
