import './Header.css';

export default function Header({ connected }) {
  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__mark" aria-hidden="true" />
        <div>
          <h1 className="header__title">AirGuard</h1>
          <p className="header__subtitle">Hyperlocal air quality monitor</p>
        </div>
      </div>

      <div className="header__right">
        <div className="header__status" title={connected ? 'Live connection to backend' : 'Disconnected — reconnecting…'}>
          <span className={`header__dot ${connected ? 'is-live' : 'is-offline'}`} />
          <span className="mono header__status-text">{connected ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </div>
    </header>
  );
}

