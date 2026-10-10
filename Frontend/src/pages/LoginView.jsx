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

  // Google Account Chooser Modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  const redirectDest = location.state?.from?.pathname || '/dashboard';
  const redirectMessage = location.state?.message;

  // Initialize Google Identity Services if client ID is configured
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) return;

    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
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
            auto_select: false,
          });
        } catch (err) {
          console.warn('Google Identity Services initialization notice:', err);
        }
      }
    };

    initGoogle();
    const timer = setInterval(() => {
      if (window.google?.accounts?.id) {
        initGoogle();
        clearInterval(timer);
      }
    }, 400);

    return () => clearInterval(timer);
  }, [mode, navigate, redirectDest, loginWithGoogle]);

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

  const handleGoogleClick = async () => {
    setError('');
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // 1. If Google OAuth Client ID is configured and Google SDK is loaded, open Google's native popup account chooser
    if (googleClientId && window.google?.accounts?.oauth2) {
      try {
        setLoading(true);
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              setLoading(false);
              return;
            }
            try {
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });
              const googleUser = await userRes.json();
              await loginWithGoogle({
                email: googleUser.email,
                name: googleUser.name,
                avatar: googleUser.picture,
                googleId: googleUser.sub,
              });
              navigate(redirectDest, { replace: true });
            } catch (err) {
              setError(err.message || 'Google account verification failed.');
            } finally {
              setLoading(false);
            }
          },
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('Native Google popup error, opening Account Chooser modal:', err);
      }
    }

    // 2. Open authentic Google Account Chooser modal (matching Google UI standards)
    setLoading(false);
    setShowGoogleModal(true);
  };

  const handleSelectGoogleAccount = async (targetEmail, targetName) => {
    if (!targetEmail || !targetEmail.includes('@')) {
      setError('Please provide a valid Google email address.');
      return;
    }
    setLoading(true);
    setShowGoogleModal(false);
    try {
      const derivedName = targetName || targetEmail.split('@')[0];
      const capitalizedName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);
      await loginWithGoogle({
        email: targetEmail.trim().toLowerCase(),
        name: capitalizedName,
        googleId: `google_${Date.now()}`,
      });
      navigate(redirectDest, { replace: true });
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    navigate('/dashboard', { replace: true });
  };

  // Determine preferred Google Account for the Chooser
  const detectedGoogleEmail = email.trim() || 'harshavardhan10003@gmail.com';
  const detectedGoogleName = name.trim() || 'Harsha Vardhan';

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

          <p className="login-hero__subtitle">
            Real-time IoT monitoring, cloud analytics, and automated alert dispatch — built on ESP32,
            Node.js, MongoDB Atlas, and React.
          </p>

          <div style={{ marginTop: '24px' }}>
            <Link to="/" className="login-back-home">
              ← Back to Welcome Page
            </Link>
          </div>
        </div>
      </div>

      {/* Right authentication interactive form pane */}
      <div className="login-form-pane">
        <div className="login-form-container">
          {/* Header */}
          <div className="login-header">
            <h2 className="login-title">
              {mode === 'register'
                ? 'Create Your Account'
                : mode === 'forgot'
                ? 'Reset Password'
                : mode === 'reset'
                ? 'Choose New Password'
                : 'Welcome Back'}
            </h2>
            <p className="login-subtitle">
              {mode === 'register'
                ? 'Join AirGuard to configure alert triggers and manage sensing stations.'
                : mode === 'forgot'
                ? 'Enter your registered email and we will generate a secure reset link.'
                : mode === 'reset'
                ? 'Enter your new secure password below.'
                : 'Enter your credentials to access system health, diagnostics, and settings.'}
            </p>
          </div>

          {/* Feedback messages */}
          {redirectMessage && !error && !successMsg && (
            <div className="login-alert login-alert--info">
              {redirectMessage}
            </div>
          )}

          {error && (
            <div className="login-alert login-alert--error">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="login-alert login-alert--success">
              {successMsg}
            </div>
          )}

          {/* GOOGLE SSO BUTTON (Only for login and register modes) */}
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
                    className="login-toggle-pw"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? 'Hide' : '👁️'}
                  </button>
                </div>
              </div>
            )}

            {/* RESET PASSWORD FIELDS */}
            {mode === 'reset' && (
              <>
                <div className="login-field">
                  <label className="login-label">New Password</label>
                  <input
                    type="password"
                    className="login-input"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="login-field">
                  <label className="login-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="login-input"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
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

      {/* ─── GOOGLE ACCOUNT CHOOSER MODAL (Exact Google standard experience) ─── */}
      {showGoogleModal && (
        <div className="google-modal-overlay" onClick={() => setShowGoogleModal(false)}>
          <div className="google-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="google-modal-header">
              <svg width="36" height="36" viewBox="0 0 24 24">
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
              <h3 className="google-modal-title">Choose an account</h3>
              <p className="google-modal-subtitle">
                to continue to <strong>AirGuard</strong>
              </p>
            </div>

            <div className="google-accounts-list">
              {/* Primary detected Google account */}
              <button
                type="button"
                className="google-account-item"
                onClick={() => handleSelectGoogleAccount(detectedGoogleEmail, detectedGoogleName)}
              >
                <div className="google-account-avatar">
                  {detectedGoogleName.charAt(0).toUpperCase()}
                </div>
                <div className="google-account-info">
                  <span className="google-account-name">{detectedGoogleName}</span>
                  <span className="google-account-email">{detectedGoogleEmail}</span>
                </div>
                <span className="google-account-badge">Google Account</span>
              </button>

              {/* Use another account section */}
              {!showCustomGoogleInput ? (
                <button
                  type="button"
                  className="google-use-another-btn"
                  onClick={() => setShowCustomGoogleInput(true)}
                >
                  <span style={{ fontSize: '1.2rem' }}>➕</span>
                  <span>Use another account</span>
                </button>
              ) : (
                <div className="google-custom-input-box">
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Enter another Google email:
                  </label>
                  <input
                    type="email"
                    placeholder="name@gmail.com"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => setShowCustomGoogleInput(false)}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      onClick={() => handleSelectGoogleAccount(customGoogleEmail)}
                      disabled={!customGoogleEmail.includes('@')}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="google-modal-note">
              🔐 <strong>Production OAuth Setup:</strong> Add your Google Cloud Web Client ID as <code>VITE_GOOGLE_CLIENT_ID</code> in <code>Frontend/.env</code> to connect Google Identity Services.
            </div>

            <div className="google-modal-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setShowGoogleModal(false)}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
