import React from 'react';

export const WeatherIcons = {
  clear: ({ size = 28, isDay = true, className = '' }) => (
    isDay ? (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="5" fill="#fef3c7" fillOpacity="0.3" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ) : (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#38bdf8" fillOpacity="0.2" />
      </svg>
    )
  ),

  'partly-cloudy': ({ size = 28, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2v2M4.93 4.93l1.41 1.41M2 12h2M20 12h2M19.07 4.93l-1.41 1.41" stroke="#f59e0b" />
      <path d="M17.5 19H9a5 5 0 1 1 2.3-9.45A7 7 0 0 1 21 16a3.5 3.5 0 0 1-3.5 3z" fill="#94a3b8" fillOpacity="0.2" stroke="#cbd5e1" />
    </svg>
  ),

  cloudy: ({ size = 28, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#64748b" fillOpacity="0.25" />
    </svg>
  ),

  rain: ({ size = 28, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 13v6M8 13v6M12 15v6" />
      <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" stroke="#94a3b8" fill="#64748b" fillOpacity="0.2" />
    </svg>
  ),

  'heavy-rain': ({ size = 28, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 12v8M8 12v8M12 14v8M20 14v6" />
      <path d="M20 15A5 5 0 0 0 18 6h-1.26A8 8 0 1 0 4 14" stroke="#64748b" fill="#475569" fillOpacity="0.2" />
    </svg>
  ),

  drizzle: ({ size = 28, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="8" y1="15" x2="8" y2="17" />
      <line x1="12" y1="16" x2="12" y2="18" />
      <line x1="16" y1="15" x2="16" y2="17" />
      <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" stroke="#94a3b8" />
    </svg>
  ),

  thunderstorm: ({ size = 28, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9" stroke="#64748b" />
      <polyline points="13 11 9 17 15 17 11 23" fill="#fbbf24" fillOpacity="0.3" />
    </svg>
  ),

  snow: ({ size = 28, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#e0f2fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" stroke="#94a3b8" />
      <line x1="8" y1="16" x2="8.01" y2="16" strokeWidth="3" />
      <line x1="8" y1="20" x2="8.01" y2="20" strokeWidth="3" />
      <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
      <line x1="16" y1="16" x2="16.01" y2="16" strokeWidth="3" />
      <line x1="16" y1="20" x2="16.01" y2="20" strokeWidth="3" />
    </svg>
  ),

  fog: ({ size = 28, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="4" y1="10" x2="20" y2="10" />
      <line x1="6" y1="14" x2="18" y2="14" />
      <line x1="8" y1="18" x2="16" y2="18" />
      <line x1="3" y1="6" x2="21" y2="6" strokeOpacity="0.6" />
    </svg>
  ),

  wind: ({ size = 20, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
    </svg>
  ),

  compass: ({ degrees = 0, size = 36 }) => (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="18" stroke="rgba(255,255,255,0.15)" strokeWidth="2" fill="rgba(15,23,42,0.6)" />
        <text x="20" y="9" fontSize="7" fill="#94a3b8" textAnchor="middle" fontWeight="bold">N</text>
        <text x="33" y="22" fontSize="7" fill="#64748b" textAnchor="middle">E</text>
        <text x="20" y="35" fontSize="7" fill="#64748b" textAnchor="middle">S</text>
        <text x="7" y="22" fontSize="7" fill="#64748b" textAnchor="middle">W</text>
        <g transform={`rotate(${degrees} 20 20)`}>
          <polygon points="20,11 23,20 20,17 17,20" fill="#38bdf8" />
          <polygon points="20,29 23,20 20,17 17,20" fill="rgba(255,255,255,0.3)" />
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
          <line x1="10" y1="80" x2="170" y2="80" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
          {/* Sun path arc */}
          <path d="M 20 80 A 70 60 0 0 1 160 80" fill="none" stroke="rgba(245, 158, 11, 0.25)" strokeWidth="2.5" strokeDasharray="4 4" />
          {/* Traveled arc */}
          {isDay && (
            <path
              d={`M 20 80 A 70 60 0 0 1 ${cx} ${cy}`}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
            />
          )}
          {/* Sun disc */}
          {isDay ? (
            <g transform={`translate(${cx}, ${cy})`}>
              <circle r="7" fill="#f59e0b" />
              <circle r="12" fill="#f59e0b" fillOpacity="0.25" />
            </g>
          ) : (
            <circle cx="90" cy="80" r="5" fill="#64748b" />
          )}
        </svg>
      </div>
    );
  },
};

export default WeatherIcons;
