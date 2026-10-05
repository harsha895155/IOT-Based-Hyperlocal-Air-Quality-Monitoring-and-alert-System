import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatTimeAgo } from '../hooks/useReadings';
import { classifyAQI } from '../utils/aqi';
import './AlertsView.css';

export default function AlertsView({ alerts = [], onAcknowledge, onNavigateLogin }) {
  const { user, isGuest } = useAuth();
  const [filterTab, setFilterTab] = useState('All');

  const filteredAlerts = alerts.filter((alert) => {
    if (filterTab === 'Unread') return !alert.acknowledged;
    if (filterTab === 'Resolved') return !!alert.acknowledged;
    if (filterTab === 'Critical') return alert.airQuality >= 151;
    return true; // 'All'
  });

  return (
    <div className="alerts-page">
      <div className="page-header">
        <h1 className="page-title">Alerts</h1>
        <p className="page-subtitle">Every threshold crossing, deduplicated while a condition persists.</p>
      </div>

      {/* Filter Tabs: All, Unread, Critical, Resolved */}
      <div className="alerts-tabs">
        {['All', 'Unread', 'Critical', 'Resolved'].map((tab) => (
          <button
            key={tab}
            className={`alerts-tab ${filterTab === tab ? 'is-active' : ''}`}
            onClick={() => setFilterTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Alerts list */}
      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="card alerts-empty">
            <p>No alerts in this category. Sensor readings are within nominal baseline thresholds.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const { category, color } = classifyAQI(alert.airQuality);
            const seenCount = alert.seenCount || 1;
            const location = alert.location || 'GIST Campus';
            const timeAgo = formatTimeAgo(alert.lastSeen || alert.createdAt);

            return (
              <div
                key={alert._id}
                className="card alert-card"
                style={{ borderLeftColor: color }}
              >
                <div className="alert-card__content">
                  <div className="alert-card__header">
                    <h2 className="alert-card__title" style={{ color }}>
                      {alert.category || category}
                    </h2>
                  </div>

                  <p className="alert-card__message">
                    {alert.message || 'Air quality threshold exceeded.'}
                  </p>

                  <div className="alert-card__meta">
                    <span>{alert.deviceId}</span>
                    <span className="dot-sep">·</span>
                    <span>{location}</span>
                    <span className="dot-sep">·</span>
                    <span>AQI {alert.airQuality}</span>
                    <span className="dot-sep">·</span>
                    <span>seen {seenCount}×</span>
                  </div>
                </div>

                <div className="alert-card__aside">
                  <span className="alert-card__time">{timeAgo}</span>

                  {isGuest ? (
                    <button
                      className="alert-card__action-link"
                      onClick={onNavigateLogin}
                    >
                      Log in to act
                    </button>
                  ) : alert.acknowledged ? (
                    <span className="alert-card__status-resolved">Resolved</span>
                  ) : (
                    <button
                      className="alert-card__ack-btn"
                      onClick={() => onAcknowledge(alert._id)}
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
