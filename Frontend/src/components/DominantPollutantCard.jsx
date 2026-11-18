import React, { useMemo } from 'react';
import './DominantPollutantCard.css';

/**
 * DominantPollutantCard
 * Calculates which pollutant is the primary health risk driver
 * and displays an interactive proportional hazard contribution bar.
 */
export default function DominantPollutantCard({
  pm25 = null,
  pm10 = null,
  gasPpm = null,
  coPpm = null,
  isDeviceConnected = false,
}) {
  const breakdown = useMemo(() => {
    // Normalise each pollutant relative to standard WHO / EPA 24h safe thresholds
    // PM2.5 WHO threshold: 15 ug/m3
    // PM10 WHO threshold: 45 ug/m3
    // Gas PPM baseline: ~20 ppm
    // CO WHO 8h limit: ~9 ppm
    const safePm25 = Number(pm25) > 0 ? Number(pm25) : 12;
    const safePm10 = Number(pm10) > 0 ? Number(pm10) : 25;
    const safeGas = Number(gasPpm) > 0 ? Number(gasPpm) : 18;
    const safeCo = Number(coPpm) > 0 ? Number(coPpm) : 0.8;

    // Relative hazard weights
    const weightPm25 = (safePm25 / 15) * 1.5;
    const weightGas = (safeGas / 25) * 1.2;
    const weightCo = (safeCo / 9) * 0.8;
    const weightPm10 = (safePm10 / 45) * 0.6;

    const totalWeight = weightPm25 + weightGas + weightCo + weightPm10 || 1;

    const pctPm25 = Math.round((weightPm25 / totalWeight) * 100);
    const pctGas = Math.round((weightGas / totalWeight) * 100);
    const pctCo = Math.round((weightCo / totalWeight) * 100);
    const pctPm10 = Math.max(0, 100 - (pctPm25 + pctGas + pctCo));

    // Determine dominant driver
    let dominant = {
      name: 'Fine Particulate (PM2.5)',
      pct: pctPm25,
      color: '#ef4444',
      origin: 'Vehicle exhaust, biomass smoke & micro-aerosols',
      epaLimit: '15 µg/m³ (WHO 24h)',
      icon: '🌫️',
    };

    if (pctGas > pctPm25 && (isDeviceConnected || Number(gasPpm) > 30)) {
      dominant = {
        name: 'Chemical Vapors & Gases (MQ-135)',
        pct: pctGas,
        color: '#f59e0b',
        origin: 'Ammonia, benzene, toxic smoke & organic compounds',
        epaLimit: 'Baseline R0 = 76.63 kΩ',
        icon: '🧪',
      };
    } else if (pctCo > pctPm25 && pctCo > pctGas) {
      dominant = {
        name: 'Carbon Monoxide (CO)',
        pct: pctCo,
        color: '#f97316',
        origin: 'Incomplete fuel combustion & engine idling',
        epaLimit: '9 ppm (WHO 8h)',
        icon: '🚗',
      };
    }

    return {
      dominant,
      items: [
        { name: 'PM2.5', label: 'Fine PM2.5', pct: pctPm25, color: '#38bdf8', val: `${safePm25} µg/m³` },
        { name: 'MQ-135', label: 'Gas / VOCs', pct: pctGas, color: '#10b981', val: `${safeGas} ppm` },
        { name: 'CO', label: 'Carbon Monoxide', pct: pctCo, color: '#f59e0b', val: `${safeCo} ppm` },
        { name: 'PM10', label: 'Coarse PM10', pct: pctPm10, color: '#a855f7', val: `${safePm10} µg/m³` },
      ],
    };
  }, [pm25, pm10, gasPpm, coPpm, isDeviceConnected]);

  return (
    <div className="dominant-pollutant-card">
      <div className="dominant-main-row">
        <div className="dominant-info-left">
          <span className="dominant-pill-badge">
            <span className="dominant-spark">⚡</span>
            <span>PRIMARY RISK DRIVER</span>
          </span>
          <div className="dominant-headline">
            <span className="dom-icon">{breakdown.dominant.icon}</span>
            <strong className="dom-name">{breakdown.dominant.name}</strong>
            <span className="dom-pct-tag" style={{ background: `${breakdown.dominant.color}22`, color: breakdown.dominant.color }}>
              {breakdown.dominant.pct}% Risk Share
            </span>
          </div>
          <div className="dominant-desc">
            Primary source: <span>{breakdown.dominant.origin}</span> • Standard: <strong>{breakdown.dominant.epaLimit}</strong>
          </div>
        </div>
      </div>

      {/* Proportional Segmented Risk Bar */}
      <div className="proportional-bar-wrap">
        <div className="proportional-bar">
          {breakdown.items.map((it) => (
            <div
              key={it.name}
              className="prop-segment"
              style={{
                width: `${it.pct}%`,
                background: it.color,
              }}
              title={`${it.label}: ${it.pct}% contribution (${it.val})`}
            />
          ))}
        </div>

        <div className="proportional-legend">
          {breakdown.items.map((it) => (
            <div key={it.name} className="legend-chip">
              <span className="legend-dot" style={{ background: it.color }} />
              <span className="legend-name">{it.name}:</span>
              <strong className="legend-pct">{it.pct}%</strong>
              <span className="legend-val">({it.val})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
