import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './MobileBottomBar.css';

/**
 * MobileBottomBar.jsx
 * Native-app-style bottom navigation bar for narrow/mobile viewports (<= 768px).
 * Provides 1-tap switching between core destinations with safe-area support
 * and quick access to the full menu drawer.
 */
export default function MobileBottomBar({ unreadAlerts = 0, onOpenMenu }) {
  const location = useLocation();

  // Test if devices group is active (e.g. /devices or /devices/:id)
  const isDevicesActive = location.pathname.startsWith('/devices');

  return (
    <nav className="mobile-bottom-bar" aria-label="Mobile Navigation">
      <div className="mobile-bottom-bar__inner">
        {/* 1. Dashboard */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `mobile-bottom-bar__item ${isActive ? 'is-active' : ''}`
          }
        >
          <div className="mobile-bottom-bar__icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <span className="mobile-bottom-bar__label">Dashboard</span>
        </NavLink>

        {/* 2. Devices */}
        <NavLink
          to="/devices"
          className={`mobile-bottom-bar__item ${isDevicesActive ? 'is-active' : ''}`}
        >
          <div className="mobile-bottom-bar__icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
              <line x1="9" y1="1" x2="9" y2="4" />
              <line x1="15" y1="1" x2="15" y2="4" />
              <line x1="9" y1="20" x2="9" y2="23" />
              <line x1="15" y1="20" x2="15" y2="23" />
            </svg>
          </div>
          <span className="mobile-bottom-bar__label">Devices</span>
        </NavLink>

        {/* 3. Analytics */}
        <NavLink
          to="/analytics"
          className={({ isActive }) =>
            `mobile-bottom-bar__item ${isActive ? 'is-active' : ''}`
          }
        >
          <div className="mobile-bottom-bar__icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <span className="mobile-bottom-bar__label">Analytics</span>
        </NavLink>

        {/* 4. Alerts with Badge */}
        <NavLink
          to="/alerts"
          className={({ isActive }) =>
            `mobile-bottom-bar__item ${isActive ? 'is-active' : ''}`
          }
        >
          <div className="mobile-bottom-bar__icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadAlerts > 0 && (
              <span className="mobile-bottom-bar__badge">{unreadAlerts}</span>
            )}
          </div>
          <span className="mobile-bottom-bar__label">Alerts</span>
        </NavLink>

        {/* 5. More / Menu Drawer */}
        <button
          type="button"
          className="mobile-bottom-bar__item mobile-bottom-bar__button"
          onClick={onOpenMenu}
          aria-label="Open full navigation menu"
        >
          <div className="mobile-bottom-bar__icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </div>
          <span className="mobile-bottom-bar__label">Menu</span>
        </button>
      </div>
    </nav>
  );
}
