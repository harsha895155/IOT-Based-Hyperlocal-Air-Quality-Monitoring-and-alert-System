import React from 'react';
import AirGuardLogo from './AirGuardLogo';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

// SVG Icons matching the clean modern outline style
const Icons = {
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  LiveMonitoring: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  AirQuality: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
    </svg>
  ),
  Devices: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  ),
  Locations: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Analytics: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  History: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Alerts: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Reports: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  SystemHealth: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  HelpSupport: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Profile: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  GuestMode: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Login: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  ),
  Logout: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen, unreadAlerts = 0 }) {
  const { user, isGuest, logout } = useAuth();

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    if (window.innerWidth <= 768) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
        <div className="sidebar__brand" onClick={() => handleNavClick('dashboard')}>
          <AirGuardLogo size={26} />
          <span className="sidebar__brand-name">AirGuard</span>
        </div>

        <nav className="sidebar__nav">
          {/* MAIN SECTION */}
          <div className="sidebar__section">
            <div className="sidebar__section-title">MAIN</div>
            <button
              className={`sidebar__item ${activeTab === 'dashboard' ? 'is-active' : ''}`}
              onClick={() => handleNavClick('dashboard')}
            >
              <Icons.Dashboard />
              <span>Dashboard</span>
            </button>
            <button
              className={`sidebar__item ${activeTab === 'live' ? 'is-active' : ''}`}
              onClick={() => handleNavClick('live')}
            >
              <Icons.LiveMonitoring />
              <span>Live Monitoring</span>
            </button>
            <button
              className={`sidebar__item ${activeTab === 'air-quality' ? 'is-active' : ''}`}
              onClick={() => handleNavClick('air-quality')}
            >
              <Icons.AirQuality />
              <span>Air Quality</span>
            </button>
          </div>

          {/* MONITORING SECTION */}
          <div className="sidebar__section">
            <div className="sidebar__section-title">MONITORING</div>
            <button
              className={`sidebar__item ${activeTab === 'devices' ? 'is-active' : ''}`}
              onClick={() => handleNavClick('devices')}
            >
              <Icons.Devices />
              <span>Devices</span>
            </button>
            <button
              className={`sidebar__item ${activeTab === 'locations' ? 'is-active' : ''}`}
              onClick={() => handleNavClick('locations')}
            >
              <Icons.Locations />
              <span>Locations</span>
            </button>
            <button
              className={`sidebar__item ${activeTab === 'analytics' ? 'is-active' : ''}`}
              onClick={() => handleNavClick('analytics')}
            >
              <Icons.Analytics />
              <span>Analytics</span>
            </button>
            <button
              className={`sidebar__item ${activeTab === 'history' ? 'is-active' : ''}`}
              onClick={() => handleNavClick('history')}
            >
              <Icons.History />
              <span>History</span>
            </button>
          </div>

          {/* ALERTS & REPORTS */}
          <div className="sidebar__section">
            <div className="sidebar__section-title">ALERTS & REPORTS</div>
            <button
              className={`sidebar__item ${activeTab === 'alerts' ? 'is-active' : ''}`}
              onClick={() => handleNavClick('alerts')}
            >
              <Icons.Alerts />
              <span>Alerts</span>
              {unreadAlerts > 0 && <span className="sidebar__badge">{unreadAlerts}</span>}
            </button>
            <button
              className={`sidebar__item ${activeTab === 'reports' ? 'is-active' : ''}`}
              onClick={() => handleNavClick('reports')}
            >
              <Icons.Reports />
              <span>Reports</span>
            </button>
          </div>

          {/* SYSTEM */}
          <div className="sidebar__section">
            <div className="sidebar__section-title">SYSTEM</div>
            <button
              className={`sidebar__item ${activeTab === 'health' ? 'is-active' : ''}`}
              onClick={() => handleNavClick('health')}
            >
              <Icons.SystemHealth />
              <span>System Health</span>
            </button>
            <button
              className={`sidebar__item ${activeTab === 'settings' ? 'is-active' : ''}`}
              onClick={() => handleNavClick('settings')}
            >
              <Icons.Settings />
              <span>Settings</span>
            </button>
            <button
              className={`sidebar__item ${activeTab === 'help' ? 'is-active' : ''}`}
              onClick={() => handleNavClick('help')}
            >
              <Icons.HelpSupport />
              <span>Help & Support</span>
            </button>
          </div>

          {/* ACCOUNT */}
          <div className="sidebar__section">
            <div className="sidebar__section-title">ACCOUNT</div>
            {user ? (
              <>
                <button
                  className={`sidebar__item ${activeTab === 'profile' ? 'is-active' : ''}`}
                  onClick={() => handleNavClick('profile')}
                >
                  <Icons.Profile />
                  <span>Profile ({user.name})</span>
                </button>
                <button className="sidebar__item" onClick={logout}>
                  <Icons.Logout />
                  <span>Log out</span>
                </button>
              </>
            ) : (
              <>
                <button
                  className={`sidebar__item ${activeTab === 'profile' ? 'is-active' : ''}`}
                  onClick={() => handleNavClick('profile')}
                >
                  <Icons.Profile />
                  <span>Profile</span>
                </button>
                <button
                  className={`sidebar__item ${isGuest ? 'is-guest-badge' : ''}`}
                  onClick={() => handleNavClick('settings')}
                >
                  <Icons.GuestMode />
                  <span>Guest Mode</span>
                </button>
                <button
                  className={`sidebar__item ${activeTab === 'login' ? 'is-active' : ''}`}
                  onClick={() => handleNavClick('login')}
                >
                  <Icons.Login />
                  <span>Log in</span>
                </button>
              </>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}
