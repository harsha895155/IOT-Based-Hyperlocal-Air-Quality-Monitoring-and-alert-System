import React from 'react';
import './ActionableHealthBadges.css';

export default function ActionableHealthBadges({ aqi = 0, placeName = 'Current Location' }) {
  const aqiNum = Math.round(Number(aqi) || 0);

  // Compute recommendations for each category based on EPA / WHO air quality guidelines
  const getBadgeDetails = () => {
    let mask = {
      icon: '😷',
      title: 'Wear a Mask',
      status: 'Not Needed',
      badgeClass: 'status-safe',
      color: '#10b981',
      advice: 'Air is clean and safe. Normal unassisted breathing outdoors.',
    };

    let ventilation = {
      icon: '🪟',
      title: 'Home Ventilation',
      status: 'Open Windows',
      badgeClass: 'status-safe',
      color: '#10b981',
      advice: 'Ideal time to open windows and let clean fresh air circulate.',
    };

    let exercise = {
      icon: '🏃',
      title: 'Outdoor Exercise',
      status: 'Safe for Sports',
      badgeClass: 'status-safe',
      color: '#10b981',
      advice: 'Great conditions for running, cycling, and outdoor activities.',
    };

    let purifier = {
      icon: '🌀',
      title: 'Air Purifier',
      status: 'Not Required',
      badgeClass: 'status-safe',
      color: '#10b981',
      advice: 'Natural indoor air is fresh. No mechanical filtration needed.',
    };

    if (aqiNum > 50 && aqiNum <= 100) {
      mask = {
        icon: '😷',
        title: 'Wear a Mask',
        status: 'Optional',
        badgeClass: 'status-info',
        color: '#0284c7',
        advice: 'Clean conditions. Sensitive groups may wear a mask near heavy traffic.',
      };
      ventilation = {
        icon: '🪟',
        title: 'Home Ventilation',
        status: 'Safe to Ventilate',
        badgeClass: 'status-info',
        color: '#0284c7',
        advice: 'Safe to open windows during morning or low-traffic periods.',
      };
      exercise = {
        icon: '🏃',
        title: 'Outdoor Exercise',
        status: 'Acceptable',
        badgeClass: 'status-info',
        color: '#0284c7',
        advice: 'Normal outdoor activities are safe. Sensitive people watch for coughs.',
      };
      purifier = {
        icon: '🌀',
        title: 'Air Purifier',
        status: 'Eco / Auto Mode',
        badgeClass: 'status-info',
        color: '#0284c7',
        advice: 'Run purifier on low or eco auto-mode to maintain indoor cleanliness.',
      };
    } else if (aqiNum > 100 && aqiNum <= 150) {
      mask = {
        icon: '😷',
        title: 'Wear a Mask',
        status: 'Recommended for Sensitive',
        badgeClass: 'status-warning',
        color: '#f59e0b',
        advice: 'Wear an N95/FFP2 mask if you have respiratory or heart conditions.',
      };
      ventilation = {
        icon: '🪟',
        title: 'Home Ventilation',
        status: 'Limit Open Windows',
        badgeClass: 'status-warning',
        color: '#f59e0b',
        advice: 'Keep windows mostly closed. Avoid letting outdoor dust enter.',
      };
      exercise = {
        icon: '🏃',
        title: 'Outdoor Exercise',
        status: 'Reduce Heavy Cardio',
        badgeClass: 'status-warning',
        color: '#f59e0b',
        advice: 'Cut back on intense outdoor running; take more frequent breaks.',
      };
      purifier = {
        icon: '🌀',
        title: 'Air Purifier',
        status: 'Turn On Purifier',
        badgeClass: 'status-warning',
        color: '#f59e0b',
        advice: 'Turn on HEPA purifiers in bedrooms and study areas with doors closed.',
      };
    } else if (aqiNum > 150) {
      mask = {
        icon: '😷',
        title: 'Wear a Mask',
        status: 'Required Outdoors',
        badgeClass: 'status-danger',
        color: '#ef4444',
        advice: 'Wear a certified N95 respirator outdoors to filter harmful PM2.5 particles.',
      };
      ventilation = {
        icon: '🪟',
        title: 'Home Ventilation',
        status: 'Keep Windows Closed',
        badgeClass: 'status-danger',
        color: '#ef4444',
        advice: 'Seal windows and exterior doors tightly to block toxic pollution.',
      };
      exercise = {
        icon: '🏃',
        title: 'Outdoor Exercise',
        status: 'Avoid Outdoor Cardio',
        badgeClass: 'status-danger',
        color: '#ef4444',
        advice: 'Move all exercise indoors. Deep inhalation of toxic air is hazardous.',
      };
      purifier = {
        icon: '🌀',
        title: 'Air Purifier',
        status: 'High Speed HEPA',
        badgeClass: 'status-danger',
        color: '#ef4444',
        advice: 'Operate indoor air purifiers at max speed to actively scrub room air.',
      };
    }

    return [mask, ventilation, exercise, purifier];
  };

  const badges = getBadgeDetails();

  return (
    <div className="card actionable-health-card">
      <div className="actionable-health-header">
        <div className="health-header-left">
          <h2 className="health-header-title">Personal Protection &amp; Activity Guide</h2>
          <p className="health-header-sub">
            Real-world EPA &amp; WHO health actions calibrated for AQI {aqiNum} in {placeName}
          </p>
        </div>
        <span className="health-header-badge">📍 Actionable Health Decisions</span>
      </div>

      <div className="actionable-health-grid">
        {badges.map((b, idx) => (
          <div key={idx} className={`actionable-badge-item ${b.badgeClass}`}>
            <div className="badge-item-top">
              <span className="badge-emoji">{b.icon}</span>
              <span className="badge-status-pill" style={{ borderColor: `${b.color}55`, color: b.color, background: `${b.color}15` }}>
                {b.status}
              </span>
            </div>
            <div className="badge-item-title">{b.title}</div>
            <p className="badge-item-advice">{b.advice}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
