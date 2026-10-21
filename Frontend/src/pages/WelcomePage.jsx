import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AirGuardLogo from '../components/AirGuardLogo';
import AirGuard3DCanvas from '../components/AirGuard3DCanvas';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './WelcomePage.css';

export default function WelcomePage() {
  const navigate = useNavigate();
  const { user, continueAsGuest } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme() || {};
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [particleMode, setParticleMode] = useState('mesh'); // 'mesh' | 'aerosols' | 'clean'
  const [activeModuleTab, setActiveModuleTab] = useState(0);

  // Simulated live telemetry stream for hero widget
  const [liveTelemetry, setLiveTelemetry] = useState({
    aqi: 38,
    category: 'Good',
    color: '#00d2b4',
    pm25: 8.4,
    pm10: 16.2,
    co: 0.38,
    no2: 12.1,
    temp: 24.6,
    humidity: 57,
    pressure: 1013.4,
    wind: 6.2,
    mq135PPM: 412,
    packetCounter: 14280,
  });

  // Simulated micro-fluctuations every 2.5 seconds to feel live and alive
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTelemetry((prev) => {
        const deltaAQI = Math.floor(Math.random() * 3) - 1;
        const newAQI = Math.max(25, Math.min(50, prev.aqi + deltaAQI));
        return {
          ...prev,
          aqi: newAQI,
          pm25: Number((8.2 + (Math.random() * 0.8 - 0.4)).toFixed(1)),
          pm10: Number((16.0 + (Math.random() * 1.2 - 0.6)).toFixed(1)),
          co: Number((0.38 + (Math.random() * 0.04 - 0.02)).toFixed(2)),
          temp: Number((24.6 + (Math.random() * 0.2 - 0.1)).toFixed(1)),
          humidity: Math.round(57 + (Math.random() * 2 - 1)),
          mq135PPM: Math.round(412 + (Math.random() * 10 - 5)),
          packetCounter: prev.packetCounter + 1,
        };
      });
    }, 2500);
    return () => clearInterval(timer);
  }, []);

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

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('airguard396@gmail.com');
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2500);
  };

  // Module showcase items
  const moduleTabs = [
    {
      id: 'dashboard',
      icon: '📊',
      name: 'Real-Time Telemetry & AQI Gauge',
      badge: 'Live Console',
      title: 'Google Weather-Style Atmospheric HUD',
      description:
        'Sub-second real-time environmental monitoring console featuring an EPA 0–500 circular dial gauge, 6 active pollutant metrics (PM2.5, PM10, CO, NO2, SO2, Gas PPM), 24-hour continuous timeline, 7-day atmospheric forecasts, wind compass, and celestial sunrise/sunset arcs.',
      metrics: [
        { label: 'EPA Breakpoints', val: '0–500 Standard' },
        { label: 'Socket Ping', val: '< 28ms' },
        { label: 'Telemetry Stream', val: '100% Real-time' },
      ],
      route: '/dashboard',
    },
    {
      id: 'devices',
      icon: '📡',
      name: 'IoT Hardware & Node Registry',
      badge: 'Mesh Network',
      title: 'Decentralized Hardware Fleet Management',
      description:
        'Industrial registry tracking deployed ESP32 stations. Features heartbeat verification, dynamic online/standby/offline state derivation based on timestamp thresholds, raw analog ADC voltage telemetry, and pinout wiring diagnostics.',
      metrics: [
        { label: 'Supported Edge Chips', val: 'ESP32 / ESP8266' },
        { label: 'Heartbeat Watchdog', val: '60s Timeout' },
        { label: 'Auto Failover', val: 'Buffer & Backoff' },
      ],
      route: '/devices',
    },
    {
      id: 'alerts',
      icon: '🚨',
      name: 'Deduplicated Siren & Alerts',
      badge: 'Safety Engine',
      title: 'High-Decibel Audio Alarm & Smart Cooldown',
      description:
        'Statutory air quality threshold monitoring with Web Audio API emergency sirens (Smoke detector 3.1kHz, Industrial air raid wail, Digital buzzer, Klaxon) and 30-minute anti-spam deduplication counters.',
      metrics: [
        { label: 'Alarm Frequency', val: 'Up to 3.1 kHz' },
        { label: 'Spam Prevention', val: '30m Cooldown' },
        { label: 'W3C Desktop Alerts', val: 'Native OS Push' },
      ],
      route: '/alerts',
    },
    {
      id: 'analytics',
      icon: '📈',
      name: 'Server-Side Analytics & Trends',
      badge: 'Aggregation',
      title: 'MongoDB Atlas Aggregation Pipelines',
      description:
        'High-performance MongoDB aggregation stages ($group, $match) computing 24-hour distribution spectrums, Pearson correlation between humidity/temperature and pollutant spikes, and EPA category percentage breakups.',
      metrics: [
        { label: 'Pipeline Engine', val: 'MongoDB Atlas' },
        { label: 'Trend Resolution', val: 'Multi-Point' },
        { label: 'Correlation', val: 'Temp / Humidity / Gas' },
      ],
      route: '/analytics',
    },
    {
      id: 'reports',
      icon: '📋',
      name: 'Regulatory Compliance Audits',
      badge: 'Compliance',
      title: 'Automated NAAQS & EPA Compliance Audits',
      description:
        'Instant environmental audits measuring clean air compliance percentages across 24h, 7d, and 30d timeframes with exceedance frequency logs and printable summaries for regulatory submissions.',
      metrics: [
        { label: 'Standards', val: 'EPA & NAAQS' },
        { label: 'Audit Windows', val: '24h / 7d / 30d' },
        { label: 'Report Format', val: 'Printable / CSV' },
      ],
      route: '/reports',
    },
    {
      id: 'wizard',
      icon: '🔌',
      name: 'Web Serial Hardware Onboarding',
      badge: 'WebUSB Direct',
      title: 'Zero-Install Browser Hardware Pairing',
      description:
        'Connect newly purchased ESP32 sensor hardware directly inside Chrome using Web Serial API and Espressif esptool-js. Provision Wi-Fi credentials over USB or captive mobile hotspot with no Arduino IDE needed.',
      metrics: [
        { label: 'Browser Flashing', val: 'WebUSB / WebSerial' },
        { label: 'Wi-Fi Setup', val: 'Portal / Hotspot' },
        { label: 'IDE Required', val: 'None (100% In-Browser)' },
      ],
      route: '/devices',
    },
  ];

  return (
    <div className="welcome-page">
      {/* ─── 0. 3D WEBGL INTERACTIVE ATMOSPHERIC BACKGROUND ─── */}
      <AirGuard3DCanvas particleMode={particleMode} theme={resolvedTheme} />

      {/* ─── 1. TOP NAVBAR ─── */}
      <header className="welcome-nav">
        <div className="welcome-nav__container">
          <Link to="/" className="welcome-brand">
            <AirGuardLogo size={32} />
            <span className="welcome-brand__text">AirGuard</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="welcome-links">
            <button type="button" onClick={() => scrollToSection('telemetry-preview')} className="welcome-link">
              Live Console
            </button>
            <button type="button" onClick={() => scrollToSection('modules')} className="welcome-link">
              Modules
            </button>
            <button type="button" onClick={() => scrollToSection('architecture')} className="welcome-link">
              Architecture
            </button>
            <button type="button" onClick={() => scrollToSection('standards')} className="welcome-link">
              Standards
            </button>
            <button type="button" onClick={() => scrollToSection('contact')} className="welcome-link">
              Contact
            </button>
          </nav>

          <div className="welcome-actions">
            {/* Theme Toggle Button */}
            <button
              type="button"
              className="welcome-theme-toggle"
              onClick={toggleTheme}
              title={`Switch to ${resolvedTheme === 'light' ? 'Obsidian Dark' : 'Ceramic Light'} mode`}
              style={{
                background: resolvedTheme === 'light' ? 'rgba(2, 132, 199, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                border: resolvedTheme === 'light' ? '1.5px solid rgba(2, 132, 199, 0.35)' : '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '8px',
                padding: '7px 11px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: resolvedTheme === 'light' ? '#0284c7' : '#38bdf8',
                transition: 'all 0.2s ease',
              }}
            >
              <span>{resolvedTheme === 'light' ? '🌙 Dark' : '☀️ Light'}</span>
            </button>

            {user ? (
              <Link to="/dashboard" className="btn btn--primary welcome-btn">
                <span>Dashboard</span>
                <span className="welcome-btn-arrow">➔</span>
              </Link>
            ) : (
              <>
                <button type="button" onClick={handleGuestEntry} className="btn btn--ghost welcome-btn">
                  <span>Explore as Guest</span>
                </button>
                <Link to="/login" className="btn btn--ghost welcome-btn">
                  <span>Sign In</span>
                </Link>
                <Link to="/login?mode=register" className="btn btn--primary welcome-btn">
                  <span>Get Started</span>
                  <span className="welcome-btn-arrow">➔</span>
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
            <button type="button" onClick={() => scrollToSection('telemetry-preview')} className="welcome-mobile-link">
              Live Console
            </button>
            <button type="button" onClick={() => scrollToSection('modules')} className="welcome-mobile-link">
              Platform Modules
            </button>
            <button type="button" onClick={() => scrollToSection('architecture')} className="welcome-mobile-link">
              System Architecture
            </button>
            <button type="button" onClick={() => scrollToSection('standards')} className="welcome-mobile-link">
              Industry Standards
            </button>
            <button type="button" onClick={() => scrollToSection('contact')} className="welcome-mobile-link">
              Contact Support
            </button>
            <div className="welcome-mobile-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={toggleTheme}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
              >
                <span>{resolvedTheme === 'light' ? '🌙 Switch to Dark Mode' : '☀️ Switch to Light Mode'}</span>
              </button>
              <button type="button" onClick={handleGuestEntry} className="btn btn--ghost" style={{ width: '100%' }}>
                Explore as Guest
              </button>
              <Link to="/login" className="btn btn--ghost" style={{ width: '100%', textAlign: 'center' }}>
                Sign In
              </Link>
              <Link to="/login?mode=register" className="btn btn--primary" style={{ width: '100%', textAlign: 'center' }}>
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── 2. HERO SECTION WITH 3D HUD & LIVE CONSOLE ─── */}
      <section className="welcome-hero">
        <div className="welcome-hero__container">
          
          {/* Live System Beacon Pill */}
          <div className="welcome-hero__badge">
            <span className="welcome-hero__dot pulse-dot" />
            <span className="welcome-badge-text">
              REAL-TIME IOT SENSOR MESH • FULL-DUPLEX WEBSOCKETS (28ms PING)
            </span>
          </div>

          <h1 className="welcome-hero__title">
            Hyperlocal Air Quality & <br />
            <span className="text-gradient">Atmospheric Intelligence</span>
          </h1>

          <p className="welcome-hero__subtitle">
            An industry-grade environmental monitoring platform fusing physical IoT sensor nodes (ESP32, MQ-135, DHT22) with Google Weather-class meteorological analytics, real-time Web Audio emergency sirens, and automated compliance verification.
          </p>

          {/* 3D Scene Interactive View Controller Pill */}
          <div className="scene-control-pill" title="Interact with the 3D Background Engine">
            <span className="scene-control-label">3D Animation Mode:</span>
            <div className="scene-control-buttons">
              <button
                type="button"
                className={`scene-btn ${particleMode === 'mesh' ? 'is-active' : ''}`}
                onClick={() => setParticleMode('mesh')}
              >
                🌐 IoT Mesh Network
              </button>
              <button
                type="button"
                className={`scene-btn ${particleMode === 'aerosols' ? 'is-active' : ''}`}
                onClick={() => setParticleMode('aerosols')}
              >
                💨 Aerosol Flow
              </button>
              <button
                type="button"
                className={`scene-btn ${particleMode === 'clean' ? 'is-active' : ''}`}
                onClick={() => setParticleMode('clean')}
              >
                ✨ Clean Atmosphere
              </button>
            </div>
          </div>

          {/* Call to Actions */}
          <div className="welcome-hero__cta-group">
            <button type="button" onClick={handleGuestEntry} className="btn btn--primary btn--lg welcome-cta-primary">
              <span className="welcome-cta-icon">⚡</span>
              <span>Launch Live Dashboard</span>
              <span className="welcome-btn-arrow">➔</span>
            </button>
            <Link to="/login?mode=register" className="btn btn--secondary btn--lg welcome-cta-secondary">
              <span className="welcome-cta-icon">✨</span>
              <span>Create Account</span>
            </Link>
            <button type="button" onClick={() => scrollToSection('contact')} className="btn btn--ghost btn--lg">
              <span className="welcome-cta-icon">✉️</span>
              <span>Contact Us</span>
            </button>
          </div>

          {/* ─── 3. LIVE 3D TELEMETRY GLASS CONSOLE (HERO PREVIEW) ─── */}
          <div id="telemetry-preview" className="hero-telemetry-console">
            <div className="console-header">
              <div className="console-status-group">
                <span className="console-status-dot" />
                <span className="console-device-tag">ACTIVE NODE: ESP32-NODE-01</span>
                <span className="console-zone-tag">Campus Research Core</span>
              </div>
              <div className="console-meta-group">
                <span className="console-time-tag">Packet #{liveTelemetry.packetCounter}</span>
                <span className="console-latency-tag">● 28ms Latency</span>
              </div>
            </div>

            <div className="console-body">
              {/* Left: Circular AQI Visualizer */}
              <div className="console-aqi-card">
                <div className="console-gauge-wrap">
                  <svg className="console-gauge-svg" viewBox="0 0 120 120">
                    <circle
                      className="gauge-bg"
                      cx="60"
                      cy="60"
                      r="50"
                    />
                    <circle
                      className="gauge-fill"
                      cx="60"
                      cy="60"
                      r="50"
                      style={{
                        strokeDasharray: '314',
                        strokeDashoffset: `${314 - (314 * Math.min(liveTelemetry.aqi, 500)) / 500}`,
                        stroke: liveTelemetry.color,
                      }}
                    />
                  </svg>
                  <div className="console-gauge-center">
                    <span className="console-aqi-number mono">{liveTelemetry.aqi}</span>
                    <span className="console-aqi-unit">US EPA AQI</span>
                  </div>
                </div>
                <div className="console-aqi-badge" style={{ backgroundColor: `${liveTelemetry.color}22`, color: liveTelemetry.color, borderColor: `${liveTelemetry.color}55` }}>
                  <span>●</span> {liveTelemetry.category} Air Quality
                </div>
              </div>

              {/* Middle: Real-time Pollutant Matrix */}
              <div className="console-pollutants-grid">
                <div className="pollutant-pill">
                  <span className="pollutant-name">PM2.5</span>
                  <span className="pollutant-val mono">{liveTelemetry.pm25} <span className="p-unit">µg/m³</span></span>
                  <span className="pollutant-status text-emerald">Good</span>
                </div>
                <div className="pollutant-pill">
                  <span className="pollutant-name">PM10</span>
                  <span className="pollutant-val mono">{liveTelemetry.pm10} <span className="p-unit">µg/m³</span></span>
                  <span className="pollutant-status text-emerald">Good</span>
                </div>
                <div className="pollutant-pill">
                  <span className="pollutant-name">CO</span>
                  <span className="pollutant-val mono">{liveTelemetry.co} <span className="p-unit">ppm</span></span>
                  <span className="pollutant-status text-emerald">Safe</span>
                </div>
                <div className="pollutant-pill">
                  <span className="pollutant-name">NO2</span>
                  <span className="pollutant-val mono">{liveTelemetry.no2} <span className="p-unit">ppb</span></span>
                  <span className="pollutant-status text-emerald">Optimal</span>
                </div>
                <div className="pollutant-pill">
                  <span className="pollutant-name">Gas Chamber</span>
                  <span className="pollutant-val mono">{liveTelemetry.mq135PPM} <span className="p-unit">ppm</span></span>
                  <span className="pollutant-status text-emerald">Ambient</span>
                </div>
                <div className="pollutant-pill">
                  <span className="pollutant-name">Atm. Pressure</span>
                  <span className="pollutant-val mono">{liveTelemetry.pressure} <span className="p-unit">hPa</span></span>
                  <span className="pollutant-status text-cyan">Standard</span>
                </div>
              </div>

              {/* Right: Ambient Meteorological Conditions */}
              <div className="console-weather-card">
                <span className="weather-title">ATMOSPHERIC WEATHER</span>
                <div className="weather-temp-row">
                  <span className="weather-temp-number mono">{liveTelemetry.temp}°C</span>
                  <div className="weather-sub">
                    <span>Partly Cloudy</span>
                    <span className="text-muted fs-xs">Feels like 24°C</span>
                  </div>
                </div>
                <div className="weather-detail-row">
                  <div className="weather-item">
                    <span className="w-label">Humidity</span>
                    <span className="w-val mono">{liveTelemetry.humidity}%</span>
                  </div>
                  <div className="weather-item">
                    <span className="w-label">Wind</span>
                    <span className="w-val mono">{liveTelemetry.wind} km/h NW</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGuestEntry}
                  className="btn btn--primary console-launch-btn"
                >
                  <span>Launch Live Full Console</span>
                  <span>➔</span>
                </button>
              </div>
            </div>

            {/* Live Streaming Sparkline Bar */}
            <div className="console-sparkline-strip">
              <div className="sparkline-indicator">
                <span className="pulse-dot green" />
                <span>Stream active • Auto-polling 2.5s</span>
              </div>
              <div className="sparkline-waveform">
                {[40, 42, 38, 39, 36, 41, 45, 38, 37, 39, 40, 36, 38, 39, 41, 38, 37, 38].map((h, i) => (
                  <div
                    key={i}
                    className="waveform-bar"
                    style={{ height: `${h * 0.55}%`, opacity: 0.3 + (i / 18) * 0.7 }}
                  />
                ))}
              </div>
              <div className="sparkline-stat mono fs-xs">
                ADC: 1.18V • Rs/R0: 1.84
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="welcome-hero__stats">
            <div className="hero-stat-item">
              <span className="hero-stat-number mono">&lt; 28ms</span>
              <span className="hero-stat-label">Full-Duplex Ping Latency</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat-item">
              <span className="hero-stat-number mono">100% Real-Time</span>
              <span className="hero-stat-label">Full-Duplex Socket.IO</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat-item">
              <span className="hero-stat-number mono">0–500 AQI</span>
              <span className="hero-stat-label">US EPA Breakpoints</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat-item">
              <span className="hero-stat-number mono">3.1 kHz Siren</span>
              <span className="hero-stat-label">High-Decibel Audio Engine</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. INDUSTRY STANDARDS & TRUST BAR ─── */}
      <section id="standards" className="welcome-section welcome-standards">
        <div className="welcome-container">
          <div className="standards-banner">
            <div className="standards-label">
              <span>CERTIFIED & ALIGNED ARCHITECTURE</span>
            </div>
            <div className="standards-badges-grid">
              <div className="standard-chip">
                <span className="standard-icon">📜</span>
                <div>
                  <strong>EPA 40 CFR Part 58</strong>
                  <p>Ambient Air Quality Surveillance Breakpoints</p>
                </div>
              </div>
              <div className="standard-chip">
                <span className="standard-icon">🌐</span>
                <div>
                  <strong>WHO Guidelines 2021</strong>
                  <p>Global PM2.5 / PM10 Clean Air Targets</p>
                </div>
              </div>
              <div className="standard-chip">
                <span className="standard-icon">🇮🇳</span>
                <div>
                  <strong>CPCB NAAQS India</strong>
                  <p>National Ambient Air Quality Standards</p>
                </div>
              </div>
              <div className="standard-chip">
                <span className="standard-icon">📡</span>
                <div>
                  <strong>IEEE 802.11 b/g/n</strong>
                  <p>Low-Power IoT Wi-Fi Mesh Protocol</p>
                </div>
              </div>
              <div className="standard-chip">
                <span className="standard-icon">🚨</span>
                <div>
                  <strong>ISO 7240 / NFPA 72</strong>
                  <p>T3 Audible Alarm Emergency Siren Standard</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. INTERACTIVE PLATFORM MODULE SHOWCASE ─── */}
      <section id="modules" className="welcome-section welcome-modules">
        <div className="welcome-container">
          <div className="section-header">
            <span className="section-tag">COMPLETE PLATFORM DIRECTORY</span>
            <h2 className="section-title">Explore Every Specialized Module</h2>
            <p className="section-desc">
              From real-time sensor streams and automated Wi-Fi hotspot provisioning to server-side aggregation pipelines and regulatory audit generators.
            </p>
          </div>

          {/* Interactive Tab Selector */}
          <div className="module-tabs-nav">
            {moduleTabs.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                className={`module-tab-btn ${activeModuleTab === idx ? 'is-active' : ''}`}
                onClick={() => setActiveModuleTab(idx)}
              >
                <span>{m.icon}</span>
                <span>{m.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Active Tab Spotlight View */}
          <div className="module-spotlight-card">
            <div className="module-spotlight-left">
              <div className="spotlight-badge-row">
                <span className="spotlight-icon">{moduleTabs[activeModuleTab].icon}</span>
                <span className="spotlight-badge">{moduleTabs[activeModuleTab].badge}</span>
              </div>
              <h3 className="spotlight-title">{moduleTabs[activeModuleTab].title}</h3>
              <p className="spotlight-desc">{moduleTabs[activeModuleTab].description}</p>

              <div className="spotlight-metrics-grid">
                {moduleTabs[activeModuleTab].metrics.map((met, i) => (
                  <div key={i} className="spotlight-metric-box">
                    <span className="spotlight-metric-val mono">{met.val}</span>
                    <span className="spotlight-metric-lbl">{met.label}</span>
                  </div>
                ))}
              </div>

              <div className="spotlight-action-row">
                <button
                  type="button"
                  onClick={handleGuestEntry}
                  className="btn btn--primary btn--lg"
                >
                  <span>Launch This Module</span>
                  <span className="welcome-btn-arrow">➔</span>
                </button>
                <Link to="/login?mode=register" className="btn btn--ghost btn--lg">
                  <span>Register Free</span>
                </Link>
              </div>
            </div>

            <div className="module-spotlight-right">
              <div className="spotlight-preview-frame">
                <div className="preview-top-bar">
                  <div className="preview-dots">
                    <span className="dot red" />
                    <span className="dot yellow" />
                    <span className="dot green" />
                  </div>
                  <span className="preview-url-bar mono">airguard-hyperlocal.vercel.app{moduleTabs[activeModuleTab].route}</span>
                </div>
                <div className="preview-content-box">
                  <div className="preview-watermark-icon">{moduleTabs[activeModuleTab].icon}</div>
                  <div className="preview-info-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span className="pulse-dot green" />
                      <strong>Module Status: Fully Operational</strong>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                      Connected to Render Backend cluster with MongoDB Atlas primary shard. Zero cold boot latency for guest and authenticated sessions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. SYSTEM ARCHITECTURE & DATA FLOW ─── */}
      <section id="architecture" className="welcome-section welcome-architecture">
        <div className="welcome-container">
          <div className="section-header">
            <span className="section-tag">HARDENED IEEE PIPELINE</span>
            <h2 className="section-title">5-Layer End-to-End IoT Architecture</h2>
            <p className="section-desc">
              Data travels from electrochemical gas reaction chambers to browser visualizers in sub-second intervals.
            </p>
          </div>

          <div className="pipeline-flow">
            <div className="pipeline-step">
              <div className="pipeline-step__num mono">01</div>
              <div className="pipeline-step__title">Sensors</div>
              <div className="pipeline-step__desc">MQ-135 detects VOCs/Gases; DHT22 samples ambient temperature & humidity.</div>
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

      {/* ─── 7. CONTACT & SUPPORT SECTION ─── */}
      <section id="contact" className="welcome-section welcome-contact">
        <div className="welcome-container">
          <div className="section-header">
            <span className="section-tag">ENGINEERING SUPPORT</span>
            <h2 className="section-title">Connect with the AirGuard Team</h2>
            <p className="section-desc">
              Have questions regarding sensor calibration, campus deployments, academic research, or platform API access? We are here to help.
            </p>
          </div>

          <div className="contact-main-card">
            <div className="contact-card__left">
              <div className="contact-badge-pill">
                <span className="contact-badge-dot" />
                <span>OFFICIAL CONTACT EMAIL</span>
              </div>
              <h3 className="contact-card__title">Direct Technical & Project Support</h3>
              <p className="contact-card__desc">
                For hardware inquiries, university deployments, paper citations, or developer partnership opportunities, reach out directly to our engineering mailbox:
              </p>

              <div className="contact-email-box">
                <a href="mailto:airguard396@gmail.com" className="contact-email-link" title="Click to email airguard396@gmail.com">
                  <span className="contact-email-icon">✉️</span>
                  <span className="contact-email-text mono">airguard396@gmail.com</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="btn btn--secondary contact-copy-btn"
                  title="Copy email to clipboard"
                >
                  {emailCopied ? (
                    <>
                      <span>✓</span>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <span>📋</span>
                      <span>Copy Email</span>
                    </>
                  )}
                </button>
              </div>

              <div className="contact-action-row">
                <a href="mailto:airguard396@gmail.com?subject=AirGuard%20Platform%20Inquiry" className="btn btn--primary btn--lg contact-btn-primary">
                  <span>Send an Email</span>
                  <span className="welcome-btn-arrow">➔</span>
                </a>
                <button type="button" onClick={handleGuestEntry} className="btn btn--ghost btn--lg">
                  <span>Explore Live App</span>
                </button>
              </div>

              <div className="contact-notice">
                <span className="contact-notice-icon">⏱️</span>
                <span>Typical response window: <strong>Within 24 hours</strong> on business days.</span>
              </div>
            </div>

            <div className="contact-card__right">
              <h4 className="contact-sub-title">What We Can Assist You With:</h4>
              <ul className="contact-features-list">
                <li>
                  <span className="contact-li-icon">🔬</span>
                  <div>
                    <strong>Academic Research & IEEE Citations:</strong>
                    <p>Guidance on methodology, sensor transfer functions, and replication protocols.</p>
                  </div>
                </li>
                <li>
                  <span className="contact-li-icon">🛠️</span>
                  <div>
                    <strong>Custom Hardware Setup:</strong>
                    <p>Wiring schematics, resistor dividers, and flashing firmware to ESP32 NodeMCU modules.</p>
                  </div>
                </li>
                <li>
                  <span className="contact-li-icon">🏢</span>
                  <div>
                    <strong>Institutional Deployments:</strong>
                    <p>Setting up multi-sensor micro-zones for universities, laboratories, or municipal facilities.</p>
                  </div>
                </li>
                <li>
                  <span className="contact-li-icon">🔑</span>
                  <div>
                    <strong>API & Telemetry Feeds:</strong>
                    <p>Authenticated REST endpoints and WebSocket hooks for custom downstream integrations.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 8. FINAL CALL TO ACTION ─── */}
      <section className="welcome-cta-banner">
        <div className="welcome-container">
          <div className="cta-banner-content">
            <h2>Ready to Understand Your Air?</h2>
            <p>Explore live campus data immediately as a guest, or create a registered account for personalized device controls and system settings.</p>
            <div className="cta-banner-buttons">
              <button type="button" onClick={handleGuestEntry} className="btn btn--primary btn--lg">
                <span className="welcome-cta-icon">⚡</span>
                <span>Explore as Guest</span>
                <span className="welcome-btn-arrow">➔</span>
              </button>
              <Link to="/login?mode=register" className="btn btn--secondary btn--lg">
                <span className="welcome-cta-icon">✨</span>
                <span>Create Free Account</span>
              </Link>
              <a href="mailto:airguard396@gmail.com" className="btn btn--ghost btn--lg">
                <span className="welcome-cta-icon">✉️</span>
                <span>Email Us</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 9. FOOTER ─── */}
      <footer className="welcome-footer">
        <div className="welcome-container welcome-footer__content">
          <div className="footer-brand-col">
            <div className="welcome-brand">
              <AirGuardLogo size={28} />
              <span className="welcome-brand__text">AirGuard</span>
            </div>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '10px', lineHeight: '1.6' }}>
              Companion implementation for the IEEE paper: <em>"IoT-Based Hyperlocal Air Quality Monitoring and Alert System with Cloud Integration."</em>
            </p>
            <div className="footer-contact-chip" style={{ marginTop: '14px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Official Email: </span>
              <a href="mailto:airguard396@gmail.com" className="footer-email-link" style={{ fontWeight: 600, color: 'var(--accent)' }}>
                airguard396@gmail.com
              </a>
            </div>
          </div>

          <div className="footer-links-col">
            <span className="footer-col-title">PLATFORM MODULES</span>
            <button type="button" onClick={handleGuestEntry} className="footer-link-btn">Live Dashboard</button>
            <button type="button" onClick={() => scrollToSection('modules')} className="footer-link-btn">Core Views</button>
            <button type="button" onClick={() => scrollToSection('architecture')} className="footer-link-btn">IEEE Architecture</button>
            <button type="button" onClick={() => scrollToSection('standards')} className="footer-link-btn">Industry Standards</button>
          </div>

          <div className="footer-links-col">
            <span className="footer-col-title">ACCESS & AUTH</span>
            <button type="button" onClick={handleGuestEntry} className="footer-link-btn">Instant Guest Access</button>
            <Link to="/login" className="footer-link-btn">User Sign In</Link>
            <Link to="/login?mode=register" className="footer-link-btn">Register Account</Link>
            <button type="button" onClick={() => scrollToSection('contact')} className="footer-link-btn">Support & Help Desk</button>
          </div>

          <div className="footer-links-col">
            <span className="footer-col-title">CONTACT & SPECS</span>
            <a href="mailto:airguard396@gmail.com" className="footer-link-btn">✉️ airguard396@gmail.com</a>
            <span className="text-muted fs-xs">Port 5001 Node.js REST API</span>
            <span className="text-muted fs-xs">Vercel Global Edge CDN</span>
            <span className="text-muted fs-xs">Render Cloud Backend</span>
          </div>
        </div>

        <div className="welcome-footer__bottom">
          <div className="welcome-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <span className="text-muted fs-xs">© 2026 AirGuard Hyperlocal Intelligence. All rights reserved.</span>
            <span className="text-muted fs-xs">Direct Support: <a href="mailto:airguard396@gmail.com" style={{ color: 'var(--accent)' }}>airguard396@gmail.com</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
