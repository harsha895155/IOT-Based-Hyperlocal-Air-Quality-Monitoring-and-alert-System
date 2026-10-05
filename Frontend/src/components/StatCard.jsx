import './StatCard.css';

export default function StatCard({ label, value, unit, icon }) {
  return (
    <div className="stat-card card">
      <div className="stat-card__icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <div className="stat-card__label">{label}</div>
        <div className="stat-card__value mono">
          {value ?? '—'}
          {value != null && <span className="stat-card__unit">{unit}</span>}
        </div>
      </div>
    </div>
  );
}
