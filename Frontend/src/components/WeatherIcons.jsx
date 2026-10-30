import React from 'react';
import './WeatherIcons.css';

export const WeatherIcons = {
  clear: ({ size = 28, isDay = true, className = '' }) => (
    isDay ? (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`anim-weather-clear ${className}`}>
        <g className="anim-sun-core">
          <circle cx="12" cy="12" r="5" fill="#f59e0b" fillOpacity="0.35" stroke="#f59e0b" />
        </g>
        <g className="anim-sun-rays">
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </g>
      </svg>
    ) : (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`anim-moon-glow ${className}`}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#38bdf8" fillOpacity="0.35" stroke="#38bdf8" />
        <circle cx="17.5" cy="5.5" r="1.1" fill="#e0f2fe" stroke="none" className="anim-star-twinkle anim-star-d1" />
        <circle cx="19.5" cy="18" r="0.8" fill="#bae6fd" stroke="none" className="anim-star-twinkle anim-star-d2" />
        <circle cx="6" cy="6.5" r="0.8" fill="#38bdf8" stroke="none" className="anim-star-twinkle anim-star-d3" />
      </svg>
    )
  ),

  'partly-cloudy': ({ size = 28, isDay = true, className = '' }) => (
    isDay ? (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <g className="anim-sun-rays">
          <path d="M12 2v2M4.93 4.93l1.41 1.41M2 12h2M20 12h2M19.07 4.93l-1.41 1.41" stroke="#f59e0b" />
        </g>
        <path className="anim-cloud-float" d="M17.5 19H9a5 5 0 1 1 2.3-9.45A7 7 0 0 1 21 16a3.5 3.5 0 0 1-3.5 3z" fill="#94a3b8" fillOpacity="0.25" stroke="#cbd5e1" />
      </svg>
    ) : (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`anim-moon-glow ${className}`}>
        <path d="M15.5 11A5 5 0 0 0 10 5.2a6 6 0 1 1 5.5 5.8z" fill="#38bdf8" fillOpacity="0.35" stroke="#38bdf8" />
        <circle cx="18" cy="4.5" r="0.8" fill="#e0f2fe" stroke="none" className="anim-star-twinkle anim-star-d1" />
        <path className="anim-cloud-float" d="M17.5 19H9a5 5 0 1 1 2.3-9.45A7 7 0 0 1 21 16a3.5 3.5 0 0 1-3.5 3z" fill="#94a3b8" fillOpacity="0.3" stroke="#94a3b8" />
      </svg>
    )
  ),

  cloudy: ({ size = 28, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path className="anim-cloud-float" d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#64748b" fillOpacity="0.3" />
    </svg>
  ),

  rain: ({ size = 28, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <g className="anim-rain-drop anim-rain-drop--d1">
        <line x1="8" y1="13" x2="8" y2="19" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g className="anim-rain-drop anim-rain-drop--d2">
        <line x1="12" y1="15" x2="12" y2="21" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g className="anim-rain-drop anim-rain-drop--d3">
        <line x1="16" y1="13" x2="16" y2="19" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      </g>
      <path className="anim-cloud-float" d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" stroke="#94a3b8" fill="#64748b" fillOpacity="0.25" />
    </svg>
  ),

  'heavy-rain': ({ size = 28, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <g className="anim-rain-drop anim-rain-drop--d1">
        <line x1="8" y1="12" x2="8" y2="20" stroke="#0ea5e9" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <g className="anim-rain-drop anim-rain-drop--d4">
        <line x1="12" y1="14" x2="12" y2="22" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <g className="anim-rain-drop anim-rain-drop--d2">
        <line x1="16" y1="12" x2="16" y2="20" stroke="#0ea5e9" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <g className="anim-rain-drop anim-rain-drop--d3">
        <line x1="20" y1="14" x2="20" y2="20" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <path className="anim-cloud-float" d="M20 15A5 5 0 0 0 18 6h-1.26A8 8 0 1 0 4 14" stroke="#64748b" fill="#475569" fillOpacity="0.35" />
    </svg>
  ),

  drizzle: ({ size = 28, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <g className="anim-rain-drop anim-rain-drop--d1">
        <line x1="8" y1="15" x2="8" y2="17.5" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g className="anim-rain-drop anim-rain-drop--d2">
        <line x1="12" y1="16" x2="12" y2="18.5" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g className="anim-rain-drop anim-rain-drop--d3">
        <line x1="16" y1="15" x2="16" y2="17.5" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      </g>
      <path className="anim-cloud-float" d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" stroke="#94a3b8" />
    </svg>
  ),

  thunderstorm: ({ size = 28, className = '' }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`weather-icon-thunderstorm ${className}`}
    >
      {/* 1. Storm Cloud with deep atmospheric contrast */}
      <path
        className="anim-cloud-float-slow"
        d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"
        stroke="#475569"
        strokeWidth="2"
        fill="#334155"
        fillOpacity="0.45"
      />
      {/* 2. Left & Right Heavy Rain streaks */}
      <g className="anim-rain-drop anim-rain-drop--d1">
        <line x1="6.5" y1="16" x2="5.5" y2="20" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
      </g>
      <g className="anim-rain-drop anim-rain-drop--d3">
        <line x1="18" y1="16" x2="17" y2="20" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
      </g>
      {/* 3. Solid, Razor-Sharp Electric Lightning Bolt (ALWAYS 100% visible, NEVER disappearing) */}
      <polygon
        className="anim-lightning-bolt"
        points="13 9.5 8 16 13 16 10.5 23 18.5 14 13.5 14 15 9.5"
        fill="#f59e0b"
        stroke="#fbbf24"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  ),

  snow: ({ size = 28, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#e0f2fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path className="anim-cloud-float" d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" stroke="#94a3b8" />
      <g className="anim-rain-drop anim-rain-drop--d1">
        <line x1="8" y1="16" x2="8.01" y2="16" strokeWidth="3" />
        <line x1="8" y1="20" x2="8.01" y2="20" strokeWidth="3" />
      </g>
      <g className="anim-rain-drop anim-rain-drop--d2">
        <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
      </g>
      <g className="anim-rain-drop anim-rain-drop--d3">
        <line x1="16" y1="16" x2="16.01" y2="16" strokeWidth="3" />
        <line x1="16" y1="20" x2="16.01" y2="20" strokeWidth="3" />
      </g>
    </svg>
  ),

  fog: ({ size = 28, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line className="anim-cloud-float" x1="4" y1="10" x2="20" y2="10" />
      <line className="anim-cloud-float-slow" x1="6" y1="14" x2="18" y2="14" />
      <line className="anim-cloud-float" x1="8" y1="18" x2="16" y2="18" />
      <line x1="3" y1="6" x2="21" y2="6" strokeOpacity="0.6" />
    </svg>
  ),

  wind: ({ size = 20, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path className="anim-wind-stream-1" d="M9.59 4.59A2 2 0 1 1 11 8H2" />
      <path className="anim-wind-stream-2" d="M10.59 19.41A2 2 0 1 0 14 16H2" />
      <path className="anim-wind-stream-3" d="M15.73 8.27A2.5 2.5 0 1 1 19.5 12H2" />
    </svg>
  ),

  compass: ({ degrees = 0, size = 54 }) => (
    <div className="compass-widget" style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="compass-ring-pulse" />
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ overflow: 'visible' }}>
        <circle cx="20" cy="20" r="18" stroke="rgba(56,189,248,0.25)" strokeWidth="1.5" fill="rgba(15,23,42,0.65)" />
        <circle cx="20" cy="20" r="13" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 2" strokeWidth="1" />
        <text x="20" y="8" fontSize="6.5" fill="#38bdf8" textAnchor="middle" fontWeight="bold">N</text>
        <text x="33.5" y="22" fontSize="6" fill="#64748b" textAnchor="middle">E</text>
        <text x="20" y="35" fontSize="6" fill="#64748b" textAnchor="middle">S</text>
        <text x="6.5" y="22" fontSize="6" fill="#64748b" textAnchor="middle">W</text>
        <g className="compass-needle-group" transform={`rotate(${degrees} 20 20)`}>
          <polygon className="compass-needle-tip" points="20,9.5 23.5,20 20,16.5 16.5,20" fill="#38bdf8" />
          <polygon points="20,30.5 23.5,20 20,16.5 16.5,20" fill="rgba(255,255,255,0.35)" />
          <circle cx="20" cy="20" r="2.2" fill="#ffffff" />
        </g>
      </svg>
    </div>
  ),

  sunArc: ({ sunrise = '06:00', sunset = '18:30' }) => {
    // Calculate current sun angle across the arc
    const now = new Date();
    const [srH, srM] = sunrise.includes('T') ? [new Date(sunrise).getHours(), new Date(sunrise).getMinutes()] : (sunrise || '06:00').split(':').map(Number);
    const [ssH, ssM] = sunset.includes('T') ? [new Date(sunset).getHours(), new Date(sunset).getMinutes()] : (sunset || '18:30').split(':').map(Number);
    
    const srMin = srH * 60 + (srM || 0);
    const ssMin = ssH * 60 + (ssM || 0);
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const progress = Math.max(0, Math.min(1, (nowMin - srMin) / Math.max(1, ssMin - srMin)));
    const angle = Math.PI * (1 - progress); // PI at sunrise, 0 at sunset
    const cx = 90 - 70 * Math.cos(angle);
    const cy = 80 - 60 * Math.sin(angle);

    const isDay = nowMin >= srMin && nowMin <= ssMin;

    return (
      <div className="sun-arc-wrap">
        <svg viewBox="0 0 180 90" className="sun-arc-svg" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
          {/* Horizon line */}
          <line x1="10" y1="80" x2="170" y2="80" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3 3" />
          {/* Sun path arc */}
          <path d="M 20 80 A 70 60 0 0 1 160 80" fill="none" stroke="rgba(245, 158, 11, 0.28)" strokeWidth="2.5" strokeDasharray="4 4" />
          {/* Traveled arc with radiant glow */}
          {isDay && (
            <path
              d={`M 20 80 A 70 60 0 0 1 ${cx} ${cy}`}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.8"
              filter="drop-shadow(0 0 4px rgba(245, 158, 11, 0.6))"
            />
          )}
          {/* Animated Sun disc / Moon disc */}
          {isDay ? (
            <g transform={`translate(${cx}, ${cy})`} className="sun-arc-disc">
              <circle className="sun-arc-corona" r="14" fill="#f59e0b" fillOpacity="0.22" />
              <circle r="7.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          ) : (
            <g transform="translate(90, 80)">
              <circle r="5.5" fill="#94a3b8" stroke="#38bdf8" strokeWidth="1" />
            </g>
          )}
        </svg>
      </div>
    );
  },
};

// Thunderstorm & Lightning aliases to guarantee no missed icons regardless of API naming
WeatherIcons.thunder = WeatherIcons.thunderstorm;
WeatherIcons['thunder-storm'] = WeatherIcons.thunderstorm;
WeatherIcons.lightning = WeatherIcons.thunderstorm;
WeatherIcons.storm = WeatherIcons.thunderstorm;
WeatherIcons.stormy = WeatherIcons.thunderstorm;
WeatherIcons['severe-thunderstorm'] = WeatherIcons.thunderstorm;
WeatherIcons['thunderstorm-with-hail'] = WeatherIcons.thunderstorm;
WeatherIcons.thundershower = WeatherIcons.thunderstorm;

/**
 * Robust Weather Icon Resolver:
 * Ensures thunderstorm and other atmospheric conditions are ALWAYS accurately mapped,
 * preventing any missing thunder or falling back to a cloud/sun when storm conditions exist.
 */
export function getWeatherIcon(iconKey, conditionText) {
  const key = String(iconKey || '').toLowerCase().trim();
  const cond = String(conditionText || '').toLowerCase().trim();

  // 1. Check for Thunder / Lightning / Storm in key or condition text
  if (
    key.includes('thunder') ||
    key.includes('storm') ||
    key.includes('lightning') ||
    cond.includes('thunder') ||
    cond.includes('storm') ||
    cond.includes('lightning') ||
    cond.includes('squall')
  ) {
    return WeatherIcons.thunderstorm;
  }

  // 2. Check for Snow / Sleet / Blizzard / Hail
  if (
    key.includes('snow') ||
    key.includes('hail') ||
    key.includes('sleet') ||
    cond.includes('snow') ||
    cond.includes('hail') ||
    cond.includes('sleet') ||
    cond.includes('blizzard') ||
    cond.includes('flurr') ||
    cond.includes('ice')
  ) {
    return WeatherIcons.snow;
  }

  // 3. Check for Heavy Rain / Torrential / Violent Showers
  if (
    key.includes('heavy') ||
    key.includes('violent') ||
    cond.includes('heavy rain') ||
    cond.includes('torrential') ||
    cond.includes('violent')
  ) {
    return WeatherIcons['heavy-rain'];
  }

  // 4. Check for Rain / Showers
  if (
    key.includes('rain') ||
    key.includes('shower') ||
    cond.includes('rain') ||
    cond.includes('shower')
  ) {
    return WeatherIcons.rain;
  }

  // 5. Check for Drizzle
  if (key.includes('drizzle') || cond.includes('drizzle')) {
    return WeatherIcons.drizzle;
  }

  // 6. Check for Fog / Mist / Haze
  if (
    key.includes('fog') ||
    key.includes('mist') ||
    key.includes('haze') ||
    cond.includes('fog') ||
    cond.includes('mist') ||
    cond.includes('haze')
  ) {
    return WeatherIcons.fog;
  }

  // 7. Check for Clear / Sunny
  if (
    key.includes('clear') ||
    key.includes('sunny') ||
    cond.includes('clear') ||
    cond.includes('sunny')
  ) {
    return WeatherIcons.clear;
  }

  // 8. Check for Overcast / Cloudy
  if (
    key.includes('cloud') ||
    key.includes('overcast') ||
    cond.includes('cloud') ||
    cond.includes('overcast')
  ) {
    if (key.includes('partly') || cond.includes('partly')) {
      return WeatherIcons['partly-cloudy'];
    }
    return WeatherIcons.cloudy;
  }

  // 9. Exact dictionary lookup or safe default
  return WeatherIcons[key] || WeatherIcons['partly-cloudy'];
}

export default WeatherIcons;

