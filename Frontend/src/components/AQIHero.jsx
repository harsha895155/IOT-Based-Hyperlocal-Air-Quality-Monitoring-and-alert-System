
import React from 'react';
import { classifyAQI, healthRecommendation } from '../utils/aqi';
import './AQIHero.css';

export default function AQIHero({ reading }) {
  const aqi = reading?.airQuality ?? 132;
  const { category, color } = classifyAQI(aqi);
  const recommendation = healthRecommendation(aqi);
  const position = Math.max(0, Math.min(100, (aqi / 500) * 100));

  return (
    <section
      className="hero card"
      style={{
        '--cat-color': color,
      }}
    >
      <div className="hero__readout">
        <div className="hero__label">Current Air Quality Index</div>
        <div className="hero__number mono" style={{ color }}>
          {reading ? aqi : '—'}
        </div>
        <div className="hero__category" style={{ color }}>
          {reading ? category : 'Awaiting first reading'}
        </div>
        <p className="hero__recommendation">
          {reading ? recommendation : 'Connect a device or start the simulator to see live data.'}
        </p>
      </div>

      <div className="hero__gauge" aria-hidden="true">
        <div className="hero__gauge-track">
          <div
            className="hero__gauge-marker"
            style={{
              left: `${position}%`,
              backgroundColor: color,
              boxShadow: `0 0 16px ${color}`,
            }}
          />
        </div>
        <div className="hero__gauge-ticks">
          <div className="tick-col"><span className="tick-line" /><span>0</span></div>
          <div className="tick-col"><span className="tick-line" /><span>50</span></div>
          <div className="tick-col"><span className="tick-line" /><span>100</span></div>
          <div className="tick-col"><span className="tick-line" /><span>150</span></div>
          <div className="tick-col"><span className="tick-line" /><span>200</span></div>
          <div className="tick-col"><span className="tick-line" /><span>300</span></div>
          <div className="tick-col"><span className="tick-line" /><span>500</span></div>
        </div>
      </div>
    </section>
  );
}
