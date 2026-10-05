import React, { useState } from 'react';
import AirGuardLogo from '../components/AirGuardLogo';
import { useAuth } from '../context/AuthContext';
import './LoginView.css';

export default function LoginView({ onBackToHome }) {
  const { login, register, continueAsGuest } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Name is required');
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      onBackToHome();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    onBackToHome();
  };

  return (
    <div className="login-layout">
      {/* Left branding hero panel */}
      <div className="login-hero">
        <div className="login-hero__content">
          <div className="login-hero__brand">
            <AirGuardLogo size={36} />
            <span className="login-hero__brand-name">AirGuard</span>
          </div>

          <h1 className="login-hero__title">
            Hyperlocal Air Quality Intelligence Platform
          </h1>

          <p className="login-hero__desc">
            Real-time IoT monitoring, cloud storage, and automated alerts — built on ESP32, Node.js, MongoDB Atlas, and React.
          </p>

          <button className="login-hero__back" onClick={onBackToHome}>
            ← Back to home
          </button>
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-form-panel">
        <div className="login-form-box">
          <h2 className="login-title">
            {isRegister ? 'Create an account' : 'Welcome back'}
          </h2>
          <p className="login-subtitle">
            {isRegister
              ? 'Get started monitoring your hyperlocal sensors.'
              : 'Sign in to your AirGuard account.'}
          </p>

          {error && <div className="login-error-banner">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            {isRegister && (
              <div className="form-group">
                <label className="form-label" htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  className="form-input"
                  placeholder="Harshavardhan Reddy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="password-input-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="remember-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <a href="#forgot" className="forgot-link" onClick={(e) => { e.preventDefault(); alert('Password reset link sent.'); }}>
                Forgot password?
              </a>
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'Processing…' : isRegister ? 'Create account' : 'Login'}
            </button>

            <div className="form-switch-row">
              {isRegister ? (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => { setIsRegister(false); setError(''); }}
                  >
                    Sign in
                  </button>
                </span>
              ) : (
                <span>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => { setIsRegister(true); setError(''); }}
                  >
                    Create account
                  </button>
                </span>
              )}
            </div>

            <div className="guest-row">
              <button type="button" className="guest-btn" onClick={handleGuest}>
                Continue as Guest →
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
