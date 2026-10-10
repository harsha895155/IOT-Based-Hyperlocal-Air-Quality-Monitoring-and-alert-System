import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import AirGuardLogo from '../components/AirGuardLogo';
import { useAuth } from '../context/AuthContext';
import './LoginView.css';

export default function LoginView() {
  const { login, register, loginWithGoogle, forgotPassword, resetPassword, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Mode: 'login' | 'register' | 'forgot' | 'reset'
  const [mode, setMode] = useState(() => {
    if (searchParams.get('mode') === 'register') return 'register';
    if (searchParams.get('token')) return 'reset';
    return 'login';
  });

  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState(() => searchParams.get('token') || '');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const redirectDest = location.state?.from?.pathname || '/dashboard';
  const redirectMessage = location.state?.message;

  // Initialize Google Identity Services
  useEffect(() => {
    const googleClientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      '1039756326675-s4ktg2qsa72ifvpkrql65a13htk04bot.apps.googleusercontent.com';

    const setupGoogle = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            auto_select: false,
            callback: async (response) => {
              if (response.credential) {
                try {
                  setLoading(true);
                  setError('');
                  await loginWithGoogle({ credential: response.credential });
                  navigate(redirectDest, { replace: true });
                } catch (err) {
                  setError(err.message || 'Google authentication failed.');
                } finally {
                  setLoading(false);
                }
              }
            },
          });
        } catch (e) {
          console.warn('Google ID init notice:', e.message);
        }
      }
    };

    if (window.google?.accounts?.id) {
      setupGoogle();
    } else {
      const checkTimer = setInterval(() => {
        if (window.google?.accounts?.id) {
          setupGoogle();
          clearInterval(checkTimer);
        }
      }, 400);
      return () => clearInterval(checkTimer);
    }
  }, [navigate, redirectDest, loginWithGoogle]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim()) throw new Error('Name is required');
        await register(name, email, password);
        navigate(redirectDest, { replace: true });
      } else if (mode === 'login') {
        await login(email, password);
        navigate(redirectDest, { replace: true });
      } else if (mode === 'forgot') {
        const res = await forgotPassword(email);
        setSuccessMsg(res.message || 'Password reset instructions have been generated.');
        if (res.resetToken) {
          setResetToken(res.resetToken);
          setMode('reset');
        }
      } else if (mode === 'reset') {
        if (newPassword !== confirmPassword) {
          throw new Error('New passwords do not match.');
        }
        if (newPassword.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        await resetPassword(resetToken, newPassword);
        setSuccessMsg('Password has been reset successfully! Redirecting...');
        setTimeout(() => {
          navigate(redirectDest, { replace: true });
        }, 1200);
      }
    } catch (err) {
      setError(err.message || 'Authentication action failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    setError('');
    setLoading(true);

    const googleClientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      '1039756326675-s4ktg2qsa72ifvpkrql65a13htk04bot.apps.googleusercontent.com';

    // 1. Preferred modern Google OAuth2 Token Client popup
    if (window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              setLoading(false);
              setError(`Google sign-in error: ${tokenResponse.error_description || tokenResponse.error}`);
              return;
            }
            try {
              await loginWithGoogle({ accessToken: tokenResponse.access_token });
              navigate(redirectDest, { replace: true });
            } catch (err) {
              setError(err.message || 'Google authentication failed.');
            } finally {
              setLoading(false);
            }
          },
        });
        client.requestAccessToken();
        return;
      } catch (err) {
        console.warn('OAuth2 token client request failed:', err);
      }
    }

    // 2. Google One-Tap prompt fallback
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setLoading(false);
            setError('Google One Tap was dismissed or is not available. Please allow popups or use email sign-in.');
          }
        });
        return;
      } catch (err) {
        console.warn('Google One Tap prompt failed:', err);
      }
    }

    setLoading(false);
    setError('Google Identity Services is currently loading. Please wait a moment and click Continue with Google again.');
  };

  const handleGuest = () => {
    continueAsGuest();
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="login-layout">
      {/* Left branding hero panel */}
      <div className="login-hero">
        <div className="login-hero__content">
          <Link to="/" className="login-hero__brand" style={{ textDecoration: 'none' }}>
            <AirGuardLogo size={36} />
            <span className="login-hero__brand-name">AirGuard</span>
          </Link>

          <h1 className="login-hero__title">
            Hyperlocal Air Quality Intelligence Platform
          </h1>

          <p className="login-hero__desc">
            Real-time IoT monitoring, cloud analytics, and automated alert dispatch — built on ESP32, Node.js, MongoDB Atlas, and React.
          </p>

          <Link to="/" className="login-hero__back" style={{ textDecoration: 'none' }}>
            ← Back to Welcome Page
          </Link>
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-form-pane">
        <div className="login-form-container">
          {redirectMessage && (
            <div className="login-alert login-alert--info">
              ℹ️ {redirectMessage}
            </div>
          )}

          <div className="login-form-header">
            <h2 className="login-form-title">
              {mode === 'register' && 'Create Your Account'}
              {mode === 'login' && 'Welcome Back'}
              {mode === 'forgot' && 'Reset Your Password'}
              {mode === 'reset' && 'Set New Password'}
            </h2>
            <p className="login-form-subtitle">
              {mode === 'register' && 'Join AirGuard to configure alert thresholds, download reports, and manage devices.'}
              {mode === 'login' && 'Enter your credentials to access system health, diagnostics, and settings.'}
              {mode === 'forgot' && 'Enter your registered email address to receive password recovery instructions.'}
              {mode === 'reset' && 'Choose a strong new password for your AirGuard account.'}
            </p>
          </div>

          {error && <div className="login-alert login-alert--error">{error}</div>}
          {successMsg && <div className="login-alert login-alert--info">✓ {successMsg}</div>}

          {/* GOOGLE SIGN IN BUTTON (on Login / Register views) */}
          {(mode === 'login' || mode === 'register') && (
            <div style={{ marginBottom: '18px' }}>
              <button
                type="button"
                className="login-google-btn"
                onClick={handleGoogleClick}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="login-divider">
                <span>OR SIGN IN WITH EMAIL</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            {/* REGISTER: Name */}
            {mode === 'register' && (
              <div className="login-field">
                <label className="login-label">Full Name</label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="e.g. Harsha Vardhan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            {/* EMAIL (login, register, forgot) */}
            {mode !== 'reset' && (
              <div className="login-field">
                <label className="login-label">Email Address</label>
                <input
                  type="email"
                  className="login-input"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            {/* PASSWORD (login, register) */}
            {(mode === 'login' || mode === 'register') && (
              <div className="login-field">
                <label className="login-label">Password</label>
                <div className="login-password-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
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
            )}

            {/* RESET MODE: Token + New Password */}
            {mode === 'reset' && (
              <>
                <div className="login-field">
                  <label className="login-label">Reset Token</label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="Paste your reset token"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                  />
                </div>

                <div className="login-field">
                  <label className="login-label">New Password</label>
                  <input
                    type="password"
                    className="login-input"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="login-field">
                  <label className="login-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="login-input"
                    placeholder="Re-type new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </>
            )}

            {/* REMEMBER ME + FORGOT PASSWORD LINK */}
            {mode === 'login' && (
              <div className="login-options">
                <label className="login-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember this device</span>
                </label>

                <button
                  type="button"
                  className="login-forgot-link"
                  onClick={() => {
                    setError('');
                    setSuccessMsg('');
                    setMode('forgot');
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* ACTION BUTTON */}
            <button type="submit" className="btn btn--primary login-submit-btn" disabled={loading}>
              {loading
                ? 'Processing...'
                : mode === 'register'
                ? 'Create Account'
                : mode === 'login'
                ? 'Sign In'
                : mode === 'forgot'
                ? 'Generate Reset Link'
                : 'Update Password & Sign In'}
            </button>
          </form>

          {/* BACK TO LOGIN FOR FORGOT/RESET */}
          {(mode === 'forgot' || mode === 'reset') && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                className="login-link-btn"
                onClick={() => {
                  setError('');
                  setSuccessMsg('');
                  setMode('login');
                }}
              >
                ← Return to Sign In
              </button>
            </div>
          )}

          {/* PUBLIC GUEST EXPLORE (Login / Register modes) */}
          {(mode === 'login' || mode === 'register') && (
            <>
              <div className="login-divider">
                <span>OR</span>
              </div>

              <button type="button" className="btn btn--ghost login-guest-btn" onClick={handleGuest}>
                <span style={{ fontSize: '1.1rem' }}>🛡️</span>
                <span>Explore as Public Guest</span>
              </button>

              <div className="login-switch">
                {mode === 'register' ? (
                  <p>
                    Already have an account?{' '}
                    <button type="button" className="login-link-btn" onClick={() => setMode('login')}>
                      Sign In
                    </button>
                  </p>
                ) : (
                  <p>
                    Don't have an account?{' '}
                    <button type="button" className="login-link-btn" onClick={() => setMode('register')}>
                      Create Account
                    </button>
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
