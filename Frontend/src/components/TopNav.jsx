import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './TopNav.css';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  live: 'Live Monitoring',
  'air-quality': 'Air Quality',
  devices: 'Devices',
  locations: 'Locations',
  analytics: 'Analytics',
  history: 'History',
  alerts: 'Alerts',
  reports: 'Reports',
  health: 'System Health',
  settings: 'Settings',
  help: 'Help & Support',
  profile: 'Profile',
};

export default function TopNav({ activeTab, setActiveTab, onToggleSidebar, connected, unreadAlerts = 0 }) {
  const { user, isGuest, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  const title = PAGE_TITLES[activeTab] || 'Dashboard';

  return (
    <header className="topnav">
      <div className="topnav__left">
        <button
          className="topnav__hamburger"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <span className="topnav__title">{title}</span>

        {isGuest ? (
          <span className="topnav__badge-guest">GUEST MODE</span>
        ) : (
          <span className="topnav__badge-user">{user?.role?.toUpperCase() || 'USER'}</span>
        )}
      </div>

      <div className="topnav__right">
        {/* Status pill: • ONLINE / • OFFLINE */}
        <div className={`topnav__status-pill ${connected ? 'is-online' : 'is-offline'}`}>
          <span className="topnav__status-dot" />
          <span className="topnav__status-text">{connected ? 'ONLINE' : 'OFFLINE'}</span>
        </div>

        {/* Theme Toggle (Sun / Moon) */}
        <button
          className="topnav__icon-btn"
          onClick={toggleTheme}
          title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle color theme"
        >
          {resolvedTheme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Notification Bell with unread badge */}
        <button
          className="topnav__icon-btn topnav__bell-btn"
          onClick={() => setActiveTab('alerts')}
          title="View alerts"
          aria-label="Alerts"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadAlerts > 0 && <span className="topnav__bell-badge">{unreadAlerts}</span>}
        </button>

        {/* Login or User profile button */}
        {user ? (
          <div className="topnav__user-menu">
            <button
              className="topnav__user-chip"
              onClick={() => setActiveTab('profile')}
              title={`Logged in as ${user.email}`}
            >
              <span className="topnav__avatar">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
              <span className="topnav__user-name">{user.name}</span>
            </button>
            <button className="topnav__logout-btn" onClick={logout} title="Log out">
              Log out
            </button>
          </div>
        ) : (
          <button className="topnav__login-btn" onClick={() => setActiveTab('login')}>
            Log in
          </button>
        )}
      </div>
    </header>
  );
}
