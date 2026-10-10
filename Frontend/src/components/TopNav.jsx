import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './TopNav.css';

const PATH_TITLES = {
  '/dashboard': 'Dashboard',
  '/devices': 'My Connected Devices',
  '/locations': 'Location Weather Search',
  '/analytics': 'Analytics & Trends',
  '/history': 'Readings History',
  '/alerts': 'Real-Time Alerts',
  '/reports': 'Compliance Reports',
  '/system-health': 'System Health',
  '/settings': 'Settings',
  '/help': 'Help & Support',
  '/profile': 'User Profile',
  '/login': 'Account Access',
};

export default function TopNav({ onToggleSidebar, connected, unreadAlerts = 0 }) {
  const { user, isGuest, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  let title = PATH_TITLES[location.pathname];
  if (!title) {
    if (location.pathname.startsWith('/devices/')) {
      title = 'Device Details';
    } else {
      title = 'Dashboard';
    }
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="topnav">
      <div className="topnav__left">
        <button
          type="button"
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
          <span className="topnav__badge-user">{user?.role?.toUpperCase() || 'REGISTERED'}</span>
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
          type="button"
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
          type="button"
          className="topnav__icon-btn topnav__bell-btn"
          onClick={() => navigate('/alerts')}
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
        {!isGuest && user ? (
          <div className="topnav__user-menu" ref={userMenuRef}>
            <button
              type="button"
              className={`topnav__user-chip ${menuOpen ? 'is-active' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              title={`Logged in as ${user.email}`}
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <span className="topnav__avatar">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  user.name?.charAt(0)?.toUpperCase() || 'U'
                )}
              </span>
              <span className="topnav__user-name">{user.name}</span>
              <span style={{ fontSize: '0.65rem', marginLeft: '2px', opacity: 0.7 }}>{menuOpen ? '▲' : '▼'}</span>
            </button>

            {menuOpen && (
              <div className="topnav__dropdown">
                <div className="topnav__dropdown-header">
                  <div className="topnav__dropdown-name">{user.name}</div>
                  <div className="topnav__dropdown-email">{user.email}</div>
                  <span className={`topnav__badge-user`} style={{ marginTop: '6px', display: 'inline-block' }}>
                    {user.role?.toUpperCase() || 'USER'}
                  </span>
                </div>

                <div className="topnav__dropdown-divider" />

                <div className="topnav__dropdown-items">
                  <button
                    type="button"
                    className="topnav__dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/profile?tab=personal');
                    }}
                  >
                    <span>👤</span>
                    <span>Profile</span>
                  </button>
                  <button
                    type="button"
                    className="topnav__dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/profile?tab=security');
                    }}
                  >
                    <span>🔒</span>
                    <span>Account & Security</span>
                  </button>
                  <button
                    type="button"
                    className="topnav__dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/profile?tab=preferences');
                    }}
                  >
                    <span>⚙️</span>
                    <span>Preferences</span>
                  </button>
                </div>

                <div className="topnav__dropdown-divider" />

                <div className="topnav__dropdown-footer">
                  <button
                    type="button"
                    className="topnav__dropdown-item topnav__dropdown-item--logout"
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <span>🚪</span>
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="topnav__login-btn" style={{ textDecoration: 'none' }}>
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
