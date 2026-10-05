import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './SettingsView.css';

export default function SettingsView() {
  const { preferences, updatePreferences, isGuest } = useAuth();
  const { theme, setTheme, presets } = useTheme();

  const handleCheckboxChange = (key) => {
    updatePreferences({ [key]: !preferences[key] });
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Appearance, notifications, and account preferences.</p>
      </div>

      <div className="settings-cards">
        {/* Appearance Card */}
        <section className="card settings-card">
          <h2 className="settings-card__title">Appearance</h2>

          <div className="settings-row">
            <div>
              <span className="settings-row__label">Theme Mode</span>
              <p className="settings-row__desc">Select your preferred viewing mode</p>
            </div>
            <div className="segmented-control">
              <button
                type="button"
                className={`segmented-control__btn ${theme === 'light' ? 'is-active' : ''}`}
                onClick={() => setTheme('light')}
              >
                Light
              </button>
              <button
                type="button"
                className={`segmented-control__btn ${theme === 'obsidian' || theme === 'dark' ? 'is-active' : ''}`}
                onClick={() => setTheme('obsidian')}
              >
                Dark
              </button>
              <button
                type="button"
                className={`segmented-control__btn ${theme === 'system' ? 'is-active' : ''}`}
                onClick={() => setTheme('system')}
              >
                System
              </button>
            </div>
          </div>

          <div className="theme-presets-section">
            <span className="settings-row__label">Theme Presets & Aesthetics</span>
            <div className="theme-presets-grid">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`theme-preset-card ${theme === preset.id ? 'is-selected' : ''}`}
                  onClick={() => setTheme(preset.id)}
                >
                  <div className="preset-header">
                    <span className="preset-name">{preset.name}</span>
                    {theme === preset.id && <span className="preset-badge">Active</span>}
                  </div>
                  <span className="preset-desc">{preset.description}</span>
                  <div className={`preset-preview-bar preset-preview-${preset.id}`} />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Notifications Card */}
        <section className="card settings-card">
          <h2 className="settings-card__title">Notifications</h2>

          {isGuest && (
            <p className="settings-card__notice">
              Log in to save notification preferences to your account.
            </p>
          )}

          <div className="settings-checkbox-group">
            <label className="settings-checkbox-row">
              <span className="settings-checkbox-label">Alert notifications (email)</span>
              <input
                type="checkbox"
                className="settings-checkbox"
                checked={!!preferences?.emailAlerts}
                onChange={() => handleCheckboxChange('emailAlerts')}
              />
            </label>

            <label className="settings-checkbox-row">
              <span className="settings-checkbox-label">Alert notifications (push / in-app)</span>
              <input
                type="checkbox"
                className="settings-checkbox"
                checked={!!preferences?.pushAlerts}
                onChange={() => handleCheckboxChange('pushAlerts')}
              />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
