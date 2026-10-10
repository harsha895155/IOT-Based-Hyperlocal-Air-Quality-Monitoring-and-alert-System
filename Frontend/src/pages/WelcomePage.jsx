import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AirGuardLogo from '../components/AirGuardLogo';
import { useAuth } from '../context/AuthContext';
import './WelcomePage.css';

export default function WelcomePage() {
  const navigate = useNavigate();
  const { user, isGuest, continueAsGuest } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleGuestEntry = () => {
    continueAsGuest();
    navigate('/dashboard');
  };

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="welcome-page">
      {/* ─── 1. TOP NAVBAR ─── */}
      <header className="welcome-nav">
        <div className="welcome-nav__container">
          <Link to="/" className="welcome-brand">
            <AirGuardLogo size={32} />
            <span className="welcome-brand__text">AirGuard</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="welcome-links">
            <button type="button" onClick={() => scrollToSection('features')} className="welcome-link">
              Features
            </button>
            <button type="button" onClick={() => scrollToSection('architecture')} className="welcome-link">
              How It Works
            </button>
            <button type="button" onClick={() => scrollToSection('technology')} className="welcome-link">
              Technology
            </button>
            <button type="button" onClick={() => scrollToSection('about')} className="welcome-link">
              About
            </button>
          </nav>

          <div className="welcome-actions">
            {user ? (
              <Link to="/dashboard" className="btn btn--primary welcome-btn">
                Open Dashboard ➔
              </Link>
            ) : (
              <>
                <button type="button" onClick={handleGuestEntry} className="btn btn--ghost welcome-btn">
                  Explore as Guest
                </button>
                <Link to="/login" className="btn btn--ghost welcome-btn">
                  Log in
                </Link>
                <Link to="/login?mode=register" className="btn btn--primary welcome-btn">
                  Get Started
                </Link>
              </>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              className="welcome-hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M3 12h18M3 6h18M3 18h18" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Menu */}
        {mobileMenuOpen && (
          <div className="welcome-mobile-menu">
            <button type="button" onClick={() => scrollToSection('features')} className="welcome-mobile-link">
              Features
            </button>
            <button type="button" onClick={() => scrollToSection('architecture')} className="welcome-mobile-link">
              How It Works
            </button>
            <button type="button" onClick={() => scrollToSection('technology')} className="welcome-mobile-link">
              Technology
            </button>
            <button type="button" onClick={() => scrollToSection('about')} className="welcome-mobile-link">
              About
            </button>
            <div className="welcome-mobile-actions">
              <button type="button" onClick={handleGuestEntry} className="btn btn--ghost" style={{ width: '100%' }}>
                Explore as Guest
              </button>
              <Link to="/login" className="btn btn--ghost" style={{ width: '100%', textAlign: 'center' }}>
                Log in
              </Link>
              <Link to="/login?mode=register" className="btn btn--primary" style={{ width: '100%', textAlign: 'center' }}>
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── 2. HERO SECTION ─── */}
      <section className="welcome-hero">
        <div className="welcome-hero__container">
          <div className="welcome-hero__badge">
            <span className="welcome-hero__dot" />
            <span>AirGuard — Understand Your Air. Understand Your Environment.</span>
          </div>

          <h1 className="welcome-hero__title">
            Hyperlocal Air Quality Monitoring & <span className="text-gradient">Weather Intelligence</span>
          </h1>

          <p className="welcome-hero__subtitle">
            Real-time air quality monitoring meets Google Weather-style environmental intelligence. Track live AQI, ambient weather dynamics, hourly timelines, 7-day environmental forecasts, and connected ESP32 sensor hardware from a single platform.
          </p>

          <div className="welcome-hero__cta-group">
            <button type="button" onClick={handleGuestEntry} className="btn btn--primary btn--lg welcome-cta-primary">
              Explore Live Dashboard ➔
            </button>
            <Link to="/login?mode=register" className="btn btn--secondary btn--lg welcome-cta-secondary">
              Create Free Account
            </Link>
            <Link to="/login" className="btn btn--ghost btn--lg">
              Sign In
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="welcome-hero__stats">
            <div className="hero-stat-item">
              <span className="hero-stat-number mono">&lt; 500ms</span>
              <span className="hero-stat-label">API Round-Trip Latency</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat-item">
              <span className="hero-stat-number mono">100% Real-Time</span>
              <span className="hero-stat-label">Full-Duplex Socket.IO</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat-item">
              <span className="hero-stat-number mono">0–500 AQI</span>
              <span className="hero-stat-label">EPA Standard Breakpoints</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat-item">
              <span className="hero-stat-number mono">30m Deduplication</span>
              <span className="hero-stat-label">Smart Anti-Spam Alerts</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. ABOUT AIRGUARD SECTION ─── */}
      <section id="about" className="welcome-section welcome-about">
        <div className="welcome-container">
          <div className="section-header">
            <span className="section-tag">ABOUT AIRGUARD</span>
            <h2 className="section-title">Continuous Environmental Awareness</h2>
            <p className="section-desc">
              AirGuard combines precision IoT sensing, automated Wi-Fi backoff, cloud databases, server-side aggregation pipelines, and instant WebSocket dispatch to deliver end-to-end environmental protection.
            </p>
          </div>

          <div className="about-grid">
            <div className="about-card">
              <div className="about-icon">🔬</div>
              <h3>The Hyperlocal Problem</h3>
              <p>
                City-wide meteorological stations are located kilometers away and cannot detect dangerous localized spikes from traffic, factories, cooking smoke, or indoor buildup. AirGuard delivers street-level micro-climate awareness.
              </p>
            </div>
            <div className="about-card">
              <div className="about-icon">⚡</div>
              <h3>Automated Cloud Pipeline</h3>
              <p>
                From sensor analog readings to dashboard animations in under 500ms. If network connectivity drops, ESP32 nodes buffer and reconnect automatically without crashing or flooding backend servers.
              </p>
            </div>
            <div className="about-card">
              <div className="about-icon">🛡️</div>
              <h3>Intelligent Health Defense</h3>
              <p>
                Translates raw parts-per-million and resistance ratios into clear, plain-language health advisories for children, elderly citizens, and sensitive groups before hazardous exposure occurs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. HOW IT WORKS / ARCHITECTURE ─── */}
      <section id="architecture" className="welcome-section welcome-architecture">
        <div className="welcome-container">
          <div className="section-header">
            <span className="section-tag">SYSTEM ARCHITECTURE</span>
            <h2 className="section-title">How AirGuard Works End-to-End</h2>
            <p className="section-desc">
              Based on the published IEEE architecture, data flows continuously across five hardened layers.
            </p>
          </div>

          <div className="pipeline-flow">
            <div className="pipeline-step">
              <div className="pipeline-step__num mono">01</div>
              <div className="pipeline-step__title">Sensors</div>
              <div className="pipeline-step__desc">MQ-135 detects pollutants; DHT22 samples ambient temperature & humidity.</div>
            </div>
            <div className="pipeline-arrow">➔</div>
            <div className="pipeline-step">
              <div className="pipeline-step__num mono">02</div>
              <div className="pipeline-step__title">ESP32 Edge</div>
              <div className="pipeline-step__desc">Applies humidity compensation curve, formats JSON, and authenticates via API Key.</div>
            </div>
            <div className="pipeline-arrow">➔</div>
            <div className="pipeline-step">
              <div className="pipeline-step__num mono">03</div>
              <div className="pipeline-step__title">Express Gateway</div>
              <div className="pipeline-step__desc">Validates numeric ranges, calculates EPA AQI, and derives dynamic device status.</div>
            </div>
            <div className="pipeline-arrow">➔</div>
            <div className="pipeline-step">
              <div className="pipeline-step__num mono">04</div>
              <div className="pipeline-step__title">MongoDB Atlas</div>
              <div className="pipeline-step__desc">Stores historical readings and executes server-side $group aggregation pipelines.</div>
            </div>
            <div className="pipeline-arrow">➔</div>
            <div className="pipeline-step">
              <div className="pipeline-step__num mono">05</div>
              <div className="pipeline-step__title">Socket.IO & Web</div>
              <div className="pipeline-step__desc">Broadcasts telemetry in real time to connected browser dashboards without reloading.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. KEY FEATURES SECTION ─── */}
      <section id="features" className="welcome-section welcome-features">
        <div className="welcome-container">
          <div className="section-header">
            <span className="section-tag">PLATFORM CAPABILITIES</span>
            <h2 className="section-title">Engineered for Environmental Defense</h2>
            <p className="section-desc">Comprehensive tools for citizens, environmental researchers, and campus facilities teams.</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Real-Time Monitoring</h3>
              <p>Live stream of AQI, temperature, relative humidity, and gas PPM updating every 15 seconds without manual page refreshes.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📡</div>
              <h3>IoT Device Management</h3>
              <p>Multi-node registry with auto-discovery, heartbeat tracking, and dynamic online/standby/offline derivation based on lastSeen.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📍</div>
              <h3>Location Micro-Zones</h3>
              <p>Organize sensor deployments by campus zones, labs, or industrial parks with zone-specific average AQI and telemetry drill-downs.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>Server-Side Analytics</h3>
              <p>MongoDB aggregation pipelines computing hourly distribution buckets, min/max/avg trends, and air quality classifications.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📜</div>
              <h3>Historical Telemetry</h3>
              <p>Paginated historical records with device and date range filters, RFC 4180 CSV export streaming, and multi-point area trends.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🚨</div>
              <h3>Smart Deduplicated Alerts</h3>
              <p>Instant Socket.IO threshold alerts with 30-minute anti-spam deduplication and occurrence counters (seenCount).</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📋</div>
              <h3>Regulatory Reports</h3>
              <p>Instant environmental compliance audits measuring NAAQS and EPA standard compliance percentages over 24h, 7d, and 30d.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h3>System Health & Security</h3>
              <p>Dedicated diagnostic console monitoring database health, memory usage, uptime, and client count for registered administrators.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🌤️</div>
              <h3>Weather Intelligence</h3>
              <p>Google Weather-style environmental telemetry: hourly timelines, 7-day forecasts, wind compass, UV index, sunrise/sunset arcs, and weather/AQI dispersion correlation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. REAL TECHNOLOGY STACK ─── */}
      <section id="technology" className="welcome-section welcome-tech">
        <div className="welcome-container">
          <div className="section-header">
            <span className="section-tag">TECHNOLOGY STACK</span>
            <h2 className="section-title">Built with Battle-Tested Technologies</h2>
            <p className="section-desc">Honest, production-ready stack powering hardware, gateway, database, and client applications.</p>
          </div>

          <div className="tech-grid">
            <div className="tech-item">
              <div className="tech-badge">HARDWARE</div>
              <h4>ESP32 NodeMCU</h4>
              <p>Dual-core 240MHz microcontroller with integrated 802.11 b/g/n Wi-Fi and ADC1 analog sampling.</p>
            </div>

            <div className="tech-item">
              <div className="tech-badge">SENSORS</div>
              <h4>MQ-135 & DHT22</h4>
              <p>SnO2 electrochemical gas chamber with temperature & humidity contextual curve correction.</p>
            </div>

            <div className="tech-item">
              <div className="tech-badge">BACKEND</div>
              <h4>Node.js & Express</h4>
              <p>RESTful API with strict range validation, rate limiting, and CORS security headers.</p>
            </div>

            <div className="tech-item">
              <div className="tech-badge">DATABASE</div>
              <h4>MongoDB Atlas</h4>
              <p>Cloud-native NoSQL database with indexing on deviceId, timestamps, and aggregation stages.</p>
            </div>

            <div className="tech-item">
              <div className="tech-badge">REAL-TIME</div>
              <h4>Socket.IO</h4>
              <p>Full-duplex WebSocket channels broadcasting sensor telemetry and alerts in sub-50ms.</p>
            </div>

            <div className="tech-item">
              <div className="tech-badge">FRONTEND</div>
              <h4>React 18 & Vite</h4>
              <p>Lightning-fast single page application with Recharts trend visualizers and CSS custom properties.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. FINAL CALL TO ACTION ─── */}
      <section className="welcome-cta-banner">
        <div className="welcome-container">
          <div className="cta-banner-content">
            <h2>Ready to Monitor Your Air Quality?</h2>
            <p>Explore live campus data as a guest, or create a registered account for personalized device controls and system settings.</p>
            <div className="cta-banner-buttons">
              <button type="button" onClick={handleGuestEntry} className="btn btn--primary btn--lg">
                Explore as Guest ➔
              </button>
              <Link to="/login?mode=register" className="btn btn--secondary btn--lg">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 8. FOOTER ─── */}
      <footer className="welcome-footer">
        <div className="welcome-container welcome-footer__content">
          <div className="footer-brand-col">
            <div className="welcome-brand">
              <AirGuardLogo size={28} />
              <span className="welcome-brand__text">AirGuard</span>
            </div>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '8px' }}>
              Companion implementation for the IEEE paper: <em>"IoT-Based Hyperlocal Air Quality Monitoring and Alert System with Cloud Integration."</em>
            </p>
          </div>

          <div className="footer-links-col">
            <span className="footer-col-title">PLATFORM</span>
            <button type="button" onClick={handleGuestEntry} className="footer-link-btn">Live Dashboard</button>
            <Link to="/login" className="footer-link-btn">User Sign In</Link>
            <Link to="/login?mode=register" className="footer-link-btn">Register Account</Link>
          </div>

          <div className="footer-links-col">
            <span className="footer-col-title">SYSTEM</span>
            <span className="text-muted fs-xs">Port 5001 API</span>
            <span className="text-muted fs-xs">Vercel Edge</span>
            <span className="text-muted fs-xs">Render Cloud</span>
          </div>
        </div>

        <div className="welcome-footer__bottom">
          <div className="welcome-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <span className="text-muted fs-xs">© 2026 AirGuard Hyperlocal Intelligence. All rights reserved.</span>
            <span className="text-muted fs-xs">Status: All Systems Operational • Real-Time Cloud Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
