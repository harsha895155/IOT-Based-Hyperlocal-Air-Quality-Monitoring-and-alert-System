import { classifyAQI } from '../utils/aqi';
import './AlertsPanel.css';

function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function AlertsPanel({ alerts, onAcknowledge }) {
  const active = alerts.filter((a) => !a.acknowledged);
  const resolved = alerts.filter((a) => a.acknowledged).slice(0, 5);

  return (
    <div className="alerts-panel card">
      <div className="alerts-panel__header">
        <h2 className="alerts-panel__title">Alerts</h2>
        <span className="alerts-panel__count">{active.length} active</span>
      </div>

      {alerts.length === 0 && <p className="alerts-panel__empty">No alerts raised yet. Good sign.</p>}

      <ul className="alerts-panel__list">
        {active.map((alert) => {
          const { color } = classifyAQI(alert.airQuality);
          return (
            <li key={alert._id} className="alert-item">
              <span className="alert-item__stripe" style={{ background: color }} />
              <div className="alert-item__body">
                <div className="alert-item__top">
                  <span className="alert-item__category" style={{ color }}>
                    {alert.category}
                  </span>
                  <span className="alert-item__time mono">{timeAgo(alert.createdAt)}</span>
                </div>
                <p className="alert-item__message">{alert.message}</p>
              </div>
              <button className="alert-item__ack" onClick={() => onAcknowledge(alert._id)} type="button">
                Acknowledge
              </button>
            </li>
          );
        })}

        {resolved.map((alert) => (
          <li key={alert._id} className="alert-item alert-item--resolved">
            <span className="alert-item__stripe" style={{ background: 'var(--text-faint)' }} />
            <div className="alert-item__body">
              <div className="alert-item__top">
                <span className="alert-item__category">{alert.category}</span>
                <span className="alert-item__time mono">{timeAgo(alert.createdAt)}</span>
              </div>
              <p className="alert-item__message">{alert.message}</p>
            </div>
            <span className="alert-item__resolved-label">Acknowledged</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
