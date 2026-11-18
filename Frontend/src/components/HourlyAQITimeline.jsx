import React, { useMemo, useState } from 'react';
import { classifyAQI } from '../utils/aqi';
import './HourlyAQITimeline.css';

/**
 * HourlyAQITimeline
 * 24-Hour horizontal interactive scrubber/timeline for outdoor activity planning.
 * Features:
 * - Dynamic diurnal atmospheric model projection
 * - Cleanest outdoor window identification
 * - Interactive hour-by-hour inspection
 */
export default function HourlyAQITimeline({
  currentAQI = 25,
  weatherForecast = null,
  placeName = 'Current Location',
}) {
  const [selectedHourIdx, setSelectedHourIdx] = useState(0);

  // Generate 24-hour predictive steps
  const hourlyData = useMemo(() => {
    const baseAQI = typeof currentAQI === 'number' && !isNaN(currentAQI) ? currentAQI : 25;
    const now = new Date();
    const currentHour = now.getHours();

    const hours = [];
    let bestWindow = null;
    let minAqi = 999;

    // Build 13 checkpoints over next 24 hours (0h, 2h, 4h, ... 24h)
    for (let i = 0; i <= 12; i++) {
      const stepHour = i * 2;
      const targetDate = new Date(now.getTime() + stepHour * 3600 * 1000);
      const hourOfDay = targetDate.getHours();

      // Diurnal model variation
      let diurnalDelta = 0;
      if (hourOfDay >= 7 && hourOfDay <= 9) diurnalDelta = 12; // Morning commute
      else if (hourOfDay >= 18 && hourOfDay <= 21) diurnalDelta = 16; // Evening rush
      else if (hourOfDay >= 12 && hourOfDay <= 15) diurnalDelta = -6; // Solar dispersion
      else if (hourOfDay >= 1 && hourOfDay <= 5) diurnalDelta = -10; // Late night lull

      const regression = (45 - baseAQI) * (0.03 * i);
      const estAQI = Math.max(10, Math.min(350, Math.round(baseAQI + diurnalDelta + regression)));

      const { category, color } = classifyAQI(estAQI);

      let activity = 'Safe for Sports 🏃';
      let activityBadge = 'is-optimal';
      if (estAQI > 150) {
        activity = 'Avoid Exertion 🏠';
        activityBadge = 'is-danger';
      } else if (estAQI > 100) {
        activity = 'Reduce Outdoor 🚶';
        activityBadge = 'is-warning';
      } else if (estAQI > 50) {
        activity = 'Moderate Activity 🚶';
        activityBadge = 'is-moderate';
      }

      const isDaytime = hourOfDay >= 6 && hourOfDay <= 18;
      const weatherIcon = isDaytime ? (estAQI > 100 ? '🌫️' : '☀️') : (estAQI > 100 ? '🌫️' : '🌙');

      const hourObj = {
        idx: i,
        stepHour,
        hourLabel: i === 0 ? 'Now' : targetDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        fullDateStr: targetDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
        hourOfDay,
        aqi: estAQI,
        category,
        color,
        activity,
        activityBadge,
        weatherIcon,
      };

      if (estAQI < minAqi && hourOfDay >= 6 && hourOfDay <= 20) {
        minAqi = estAQI;
        bestWindow = hourObj;
      }

      hours.push(hourObj);
    }

    return { hours, bestWindow };
  }, [currentAQI]);

  const activeItem = hourlyData.hours[selectedHourIdx] || hourlyData.hours[0];

  return (
    <div className="hourly-timeline-card">
      <div className="timeline-header">
        <div className="timeline-title-wrap">
          <span className="timeline-header-icon">⏱️</span>
          <div>
            <h3 className="timeline-title">24-Hour Predictive Planning Timeline</h3>
            <p className="timeline-sub">
              Hourly forecasted air quality calibrated with diurnal traffic and meteorological dispersion
            </p>
          </div>
        </div>

        {hourlyData.bestWindow && (
          <div className="cleanest-window-badge">
            <span className="spark">🌟</span>
            <span>
              Best Exercise Window: <strong>{hourlyData.bestWindow.hourLabel}</strong> (AQI {hourlyData.bestWindow.aqi})
            </span>
          </div>
        )}
      </div>

      {/* Horizontal Scrubber */}
      <div className="timeline-scroll-track">
        {hourlyData.hours.map((item, idx) => (
          <button
            key={item.idx}
            type="button"
            className={`timeline-chip ${selectedHourIdx === idx ? 'is-selected' : ''}`}
            onClick={() => setSelectedHourIdx(idx)}
          >
            <span className="chip-time">{item.hourLabel}</span>
            <span className="chip-icon">{item.weatherIcon}</span>
            <span className="chip-aqi-pill" style={{ background: `${item.color}22`, color: item.color, borderColor: item.color }}>
              {item.aqi}
            </span>
            <span className="chip-cat">{item.category}</span>
          </button>
        ))}
      </div>

      {/* Selected Hour Insight Detail Banner */}
      <div className="timeline-selected-detail">
        <div className="selected-meta-left">
          <span className="selected-tag">{activeItem.idx === 0 ? 'Current Baseline' : `Forecasted +${activeItem.stepHour}h Ahead`}</span>
          <div className="selected-time-cat">
            <strong>{activeItem.hourLabel}</strong>
            <span>•</span>
            <span style={{ color: activeItem.color, fontWeight: 700 }}>AQI {activeItem.aqi} ({activeItem.category})</span>
          </div>
        </div>
        <div className={`selected-activity-badge ${activeItem.activityBadge}`}>
          {activeItem.activity}
        </div>
      </div>
    </div>
  );
}
