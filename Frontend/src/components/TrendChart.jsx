import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import './TrendChart.css';

function formatTime(iso) {
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
          <span>{p.name}</span>
          <span className="mono trend-tooltip__value">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function TrendChart({ data }) {
  const chartData = data.map((r) => ({
    time: r.createdAt,
    aqi: r.airQuality,
    temperature: r.temperature,
  }));

  return (
    <div className="trend-chart card">
      <div className="trend-chart__header">
        <h2 className="trend-chart__title">AQI &amp; Temperature Trend</h2>
        <p className="trend-chart__subtitle">Last {chartData.length} readings</p>
      </div>

      {chartData.length === 0 ? (
        <div className="trend-chart__empty">No historical data yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="aqiFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
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
            <YAxis
              stroke="var(--text-faint)"
              tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="aqi"
              name="AQI"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#aqiFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
