import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './ChangePasswordCard.css';

export default function ChangePasswordCard() {
  const { changePassword, user, isGuest } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [status, setStatus] = useState({ type: 'idle', message: '' }); // 'idle' | 'loading' | 'success' | 'error'

  if (isGuest || !user) {
    return (
      <div className="card pwd-card pwd-card--guest">
        <div className="pwd-guest-icon">🔒</div>
        <h3 className="pwd-card__title">Password Management</h3>
        <p className="pwd-card__desc">
          Password updates are restricted to authenticated registered accounts. Sign in or create an account to manage cryptographic credentials.
        </p>
      </div>
    );
  }

  const isMinLength = newPassword.length >= 6;
  const isMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const canSubmit = currentPassword && isMinLength && isMatch && status.type !== 'loading';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: 'idle', message: '' });

    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatus({ type: 'error', message: 'Please fill out all password fields.' });
      return;
    }

    if (!isMinLength) {
      setStatus({ type: 'error', message: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    setStatus({ type: 'loading', message: 'Encrypting and updating credentials...' });

    try {
      const res = await changePassword(currentPassword, newPassword);
      setStatus({
        type: 'success',
        message: res?.message || 'Password successfully updated! Your account is now secured with the new password.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatus({ type: 'idle', message: '' }), 6000);
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.message || 'Current password was incorrect. Please check your credentials.',
      });
    }
  };

  return (
    <div className="card pwd-card">
      <div className="pwd-card__header">
        <div>
          <div className="pwd-badge-row">
            <h3 className="pwd-card__title">Change Account Password</h3>
            <span className="pwd-security-badge">
              <span className="pwd-security-dot" />
              Bcrypt Hashed (Salt 10)
            </span>
          </div>
          <p className="pwd-card__desc">
            Update your master password to protect telemetry feeds, hardware configurations, and account sessions.
          </p>
        </div>
      </div>

      {status.type === 'success' && (
        <div className="pwd-alert pwd-alert--success">
          <span className="pwd-alert__icon">✓</span>
          <div>
            <strong>Password Updated</strong>
            <p>{status.message}</p>
          </div>
        </div>
      )}

      {status.type === 'error' && (
        <div className="pwd-alert pwd-alert--error">
          <span className="pwd-alert__icon">⚠️</span>
          <div>
            <strong>Update Failed</strong>
            <p>{status.message}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="pwd-form">
        <div className="pwd-form__grid">
          {/* Current Password */}
          <div className="pwd-field">
            <label className="pwd-label" htmlFor="current-pwd">
              Current Password
            </label>
            <div className="pwd-input-wrap">
              <input
                id="current-pwd"
                type={showCurrent ? 'text' : 'password'}
                className="pwd-input"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="pwd-toggle-btn"
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label="Toggle current password visibility"
              >
                {showCurrent ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="pwd-field">
            <label className="pwd-label" htmlFor="new-pwd">
              New Password
            </label>
            <div className="pwd-input-wrap">
              <input
                id="new-pwd"
                type={showNew ? 'text' : 'password'}
                className="pwd-input"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="pwd-toggle-btn"
                onClick={() => setShowNew(!showNew)}
                aria-label="Toggle new password visibility"
              >
                {showNew ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="pwd-field">
            <label className="pwd-label" htmlFor="confirm-pwd">
              Confirm New Password
            </label>
            <div className="pwd-input-wrap">
              <input
                id="confirm-pwd"
                type={showConfirm ? 'text' : 'password'}
                className="pwd-input"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="pwd-toggle-btn"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label="Toggle confirm password visibility"
              >
                {showConfirm ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>
        </div>

        {/* Validation Checklist Pills */}
        <div className="pwd-requirements">
          <span className={`pwd-req-pill ${isMinLength ? 'is-valid' : ''}`}>
            {isMinLength ? '✓' : '○'} Min 6 characters
          </span>
          <span className={`pwd-req-pill ${isMatch ? 'is-valid' : confirmPassword ? 'is-invalid' : ''}`}>
            {isMatch ? '✓ Passwords match' : confirmPassword ? '✕ Passwords do not match' : '○ Passwords match'}
          </span>
        </div>

        <div className="pwd-footer">
          <div className="pwd-security-hint">
            <span>🛡️ Never share your AirGuard credentials with third parties.</span>
          </div>

          <button
            type="submit"
            className="btn btn--primary pwd-submit-btn"
            disabled={!canSubmit}
          >
            {status.type === 'loading' ? 'Encrypting & Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
}
