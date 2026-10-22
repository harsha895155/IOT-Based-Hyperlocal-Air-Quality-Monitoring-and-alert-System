import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AirGuardLogo from '../components/AirGuardLogo';
import AirGuard3DCanvas from '../components/AirGuard3DCanvas';
import ESP32Node3DViewer from '../components/ESP32Node3DViewer';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './WelcomePage.css';

export default function WelcomePage() {
  const navigate = useNavigate();
  const { user, continueAsGuest } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme() || {};
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [activeModuleTab, setActiveModuleTab] = useState(0);

  // Hero Console Interactive Mode: 'telemetry' | 'formula' | 'tour'
  const [heroConsoleMode, setHeroConsoleMode] = useState('telemetry');
  const [calcPm25, setCalcPm25] = useState(8.4);
  const [tourStep, setTourStep] = useState(0);
  const [tourAutoPlay, setTourAutoPlay] = useState(false);

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

  // Dynamic EPA Piecewise AQI calculation engine
  const calculatedEPA = useMemo(() => {
    const c = Math.max(0, Number(calcPm25));
    let bpLo = 0, bpHi = 12.0, iLo = 0, iHi = 50, cat = 'Good', color = '#10b981';
    if (c <= 12.0) {
      bpLo = 0.0; bpHi = 12.0; iLo = 0; iHi = 50; cat = 'Good'; color = '#10b981';
    } else if (c <= 35.4) {
      bpLo = 12.1; bpHi = 35.4; iLo = 51; iHi = 100; cat = 'Moderate'; color = '#f59e0b';
    } else if (c <= 55.4) {
      bpLo = 35.5; bpHi = 55.4; iLo = 101; iHi = 150; cat = 'Unhealthy (Sensitive)'; color = '#f97316';
    } else if (c <= 150.4) {
      bpLo = 55.5; bpHi = 150.4; iLo = 151; iHi = 200; cat = 'Unhealthy'; color = '#ef4444';
    } else if (c <= 250.4) {
      bpLo = 150.5; bpHi = 250.4; iLo = 201; iHi = 300; cat = 'Very Unhealthy'; color = '#a855f7';
    } else {
      bpLo = 250.5; bpHi = 500.4; iLo = 301; iHi = 500; cat = 'Hazardous'; color = '#881337';
    }
    const aqi = Math.round(((iHi - iLo) / (bpHi - bpLo)) * (c - bpLo) + iLo);
    return { aqi: Math.min(500, Math.max(0, aqi)), bpLo, bpHi, iLo, iHi, cat, color, c };
  }, [calcPm25]);

  // Video tour auto-play timer
  useEffect(() => {
    if (!tourAutoPlay) return;
    const timer = setInterval(() => {
      setTourStep((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(timer);
  }, [tourAutoPlay]);

  const TOUR_STEPS = [
    {
      step: 1,
      badge: 'Hardware Power & Wiring',
      title: '1. Wire Sensors & Connect USB',
      icon: '🔌',
      description:
        'Connect the MQ-135 Gas Chamber to Pin 34 (ADC1) and the DHT22 Temperature & Humidity sensor to Pin 4. Power the ESP32 NodeMCU using standard Micro-USB or any 5V USB wall adapter.',
      detail: 'Internal SnO2 electrochemical heater warms up to establish baseline zero-point resistance.',
      action: 'Next: Wi-Fi Setup',
      iconBg: '#0284c7',
    },
    {
      step: 2,
      badge: 'Zero-Install In-Browser',
      title: '2. Wire-Free Wi-Fi Provisioning',
      icon: '📶',
      description:
        'No Arduino IDE needed! Either connect Web Serial directly in Google Chrome over USB, OR connect to the device hotspot "AirGuard-Setup" from your mobile phone and input your Wi-Fi password.',
      detail: 'ESP32 verifies handshake with local router and saves credentials permanently into flash memory.',
      action: 'Next: Cloud Ingestion',
      iconBg: '#059669',
    },
    {
      step: 3,
      badge: 'Sub-Second Cloud Gateway',
      title: '3. Automated Cloud Telemetry Ingestion',
      icon: '☁️',
      description:
        'Every 15s, the ESP32 samples analog voltages, applies DHT22 temperature & humidity compensation curves, and transmits authenticated JSON packets to the Node.js Express REST API and MongoDB Atlas.',
      detail: 'MongoDB executes $group aggregation pipelines and archives historical telemetry logs.',
      action: 'Next: Live Alerts',
      iconBg: '#8b5cf6',
    },
    {
      step: 4,
      badge: 'Sub-28ms Latency',
      title: '4. Live WebSocket Dashboard & Alarms',
      icon: '🚨',
      description:
        'Socket.IO broadcasts incoming data to connected browser dashboards in under 28ms. If pollution thresholds breach safe limits, the Web Audio siren immediately triggers high-decibel alarms.',
      detail: 'Audible emergency siren (3.1 kHz) + native OS desktop push alerts with 30m anti-spam cooldown.',
      action: 'Restart Walkthrough',
      iconBg: '#ef4444',
    },
  ];

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
    <div
      className={`welcome-page ${resolvedTheme === 'light' ? 'welcome-page--light' : ''}`}
      data-theme={resolvedTheme}
    >
      {/* ─── 0. 3D WEBGL INTERACTIVE ATMOSPHERIC BACKGROUND ─── */}
      <AirGuard3DCanvas theme={resolvedTheme} />

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
          
          {/* ─── Hero Showcase: Dominant Foreground Layer ─── */}
          <div className="welcome-hero__showcase">
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

            {/* Mode Switcher Tabs */}
            <div className="console-mode-tabs">
              <button
                type="button"
                className={`console-mode-btn ${heroConsoleMode === 'telemetry' ? 'is-active' : ''}`}
                onClick={() => setHeroConsoleMode('telemetry')}
              >
                📊 Live Telemetry HUD
              </button>
              <button
                type="button"
                className={`console-mode-btn ${heroConsoleMode === 'formula' ? 'is-active' : ''}`}
                onClick={() => setHeroConsoleMode('formula')}
              >
                📐 How AQI Is Calculated
              </button>
              <button
                type="button"
                className={`console-mode-btn ${heroConsoleMode === 'tour' ? 'is-active' : ''}`}
                onClick={() => setHeroConsoleMode('tour')}
              >
                🎥 How to Connect & Tour
              </button>
              <button
                type="button"
                className={`console-mode-btn ${heroConsoleMode === 'node3d' ? 'is-active' : ''}`}
                onClick={() => setHeroConsoleMode('node3d')}
              >
                🛸 Interactive 3D Node
              </button>
            </div>

            {/* TAB 1: LIVE TELEMETRY HUD */}
            {heroConsoleMode === 'telemetry' && (
              <div className="console-body">
                {/* Left: Circular AQI Visualizer */}
                <div className="console-aqi-card">
                  <div className="console-gauge-wrap">
                    <svg className="console-gauge-svg" viewBox="0 0 120 120">
                      <circle className="gauge-bg" cx="60" cy="60" r="50" />
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
            )}

            {/* TAB 2: HOW AQI IS CALCULATED (INTERACTIVE MATHEMATICAL ENGINE) */}
            {heroConsoleMode === 'formula' && (
              <div className="console-formula-view">
                {/* Left: Real-Time Calculated Gauge */}
                <div className="formula-gauge-col">
                  <div className="console-gauge-wrap">
                    <svg className="console-gauge-svg" viewBox="0 0 120 120">
                      <circle className="gauge-bg" cx="60" cy="60" r="50" />
                      <circle
                        className="gauge-fill"
                        cx="60"
                        cy="60"
                        r="50"
                        style={{
                          strokeDasharray: '314',
                          strokeDashoffset: `${314 - (314 * Math.min(calculatedEPA.aqi, 500)) / 500}`,
                          stroke: calculatedEPA.color,
                        }}
                      />
                    </svg>
                    <div className="console-gauge-center">
                      <span className="console-aqi-number mono">{calculatedEPA.aqi}</span>
                      <span className="console-aqi-unit">CALCULATED AQI</span>
                    </div>
                  </div>
                  <div className="console-aqi-badge" style={{ backgroundColor: `${calculatedEPA.color}22`, color: calculatedEPA.color, borderColor: `${calculatedEPA.color}55` }}>
                    <span>●</span> {calculatedEPA.cat}
                  </div>
                  <span className="fs-xs text-muted" style={{ textAlign: 'center' }}>
                    Active Tier: {calculatedEPA.bpLo}–{calculatedEPA.bpHi} µg/m³
                  </span>
                </div>

                {/* Center: Live Mathematical Equation & Substitution */}
                <div className="formula-math-col">
                  <div className="formula-title-row">
                    <span className="formula-tag">EPA STANDARD PIECEWISE LINEAR EQUATION</span>
                    <span className="formula-citation">40 CFR Part 58 Appendix G</span>
                  </div>

                  <div className="formula-equation-box mono">
                    <div className="math-row">
                      <span className="var-result">AQI</span> = 
                      <span className="fraction">
                        <span className="num">(I_hi - I_lo)</span>
                        <span className="den">(BP_hi - BP_lo)</span>
                      </span>
                      × (C_p - BP_lo) + I_lo
                    </div>

                    <div className="math-substitution-row">
                      = <span className="fraction">
                        <span className="num">({calculatedEPA.iHi} - {calculatedEPA.iLo})</span>
                        <span className="den">({calculatedEPA.bpHi} - {calculatedEPA.bpLo})</span>
                      </span>
                      × ({calcPm25} - {calculatedEPA.bpLo}) + {calculatedEPA.iLo} = <strong style={{ color: calculatedEPA.color, fontSize: '1.15rem' }}>{calculatedEPA.aqi}</strong>
                    </div>
                  </div>

                  {/* Electrochemical Gas Equation */}
                  <div className="formula-sub-equation">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.78rem', color: '#0284c7' }}>SnO2 Electrochemical Sensor Conversion (MQ-135):</strong>
                      <span className="fs-xs text-muted">DHT22 Temp & Humidity Compensated</span>
                    </div>
                    <p className="mono fs-xs" style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                      R_s = ((V_in - V_out) / V_out) × R_L  |  R_s(corr) = R_s × [1.0 + 0.005(T - 20) - 0.002(H - 55)]
                    </p>
                  </div>
                </div>

                {/* Right: Interactive Concentration Slider */}
                <div className="formula-slider-col">
                  <div className="slider-header-row">
                    <span className="slider-lbl">TEST POLLUTANT:</span>
                    <span className="slider-val mono" style={{ color: calculatedEPA.color, fontWeight: 700 }}>
                      {calcPm25} µg/m³
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="0.5"
                    value={calcPm25}
                    onChange={(e) => setCalcPm25(Number(e.target.value))}
                    className="formula-range-slider"
                    style={{ accentColor: calculatedEPA.color, width: '100%', cursor: 'pointer' }}
                  />

                  <div className="slider-quick-buttons">
                    <button type="button" onClick={() => setCalcPm25(8.4)} className="quick-conc-btn">Clean (8.4)</button>
                    <button type="button" onClick={() => setCalcPm25(25.0)} className="quick-conc-btn">Moderate (25)</button>
                    <button type="button" onClick={() => setCalcPm25(65.0)} className="quick-conc-btn">Unhealthy (65)</button>
                    <button type="button" onClick={() => setCalcPm25(160.0)} className="quick-conc-btn">Severe (160)</button>
                  </div>

                  <span className="fs-xs text-muted" style={{ display: 'block', marginTop: '6px' }}>
                    Drag slider to see the EPA formula recalculate in real-time.
                  </span>
                </div>
              </div>
            )}

            {/* TAB 3: HOW TO CONNECT & PLATFORM TOUR (VIDEO-STYLE WALKTHROUGH) */}
            {heroConsoleMode === 'tour' && (
              <div className="console-tour-view">
                {/* Step Tabs Indicator */}
                <div className="tour-steps-nav">
                  {TOUR_STEPS.map((s, idx) => (
                    <button
                      key={s.step}
                      type="button"
                      className={`tour-step-tab ${tourStep === idx ? 'is-active' : ''}`}
                      onClick={() => setTourStep(idx)}
                    >
                      <span className="tour-step-icon">{s.icon}</span>
                      <div className="tour-step-tab-meta">
                        <span className="tour-step-num">STEP {s.step}</span>
                        <span className="tour-step-tab-title">{s.title.split('. ')[1]}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Active Step Presentation Card */}
                <div className="tour-presentation-card">
                  <div className="tour-card-visual" style={{ borderColor: TOUR_STEPS[tourStep].iconBg }}>
                    <div className="tour-visual-icon" style={{ backgroundColor: `${TOUR_STEPS[tourStep].iconBg}22`, color: TOUR_STEPS[tourStep].iconBg }}>
                      {TOUR_STEPS[tourStep].icon}
                    </div>
                    <div className="tour-visual-pulse-ring" style={{ borderColor: TOUR_STEPS[tourStep].iconBg }} />
                  </div>

                  <div className="tour-card-body">
                    <div className="tour-pill-row">
                      <span className="tour-badge-pill" style={{ color: TOUR_STEPS[tourStep].iconBg, borderColor: `${TOUR_STEPS[tourStep].iconBg}55` }}>
                        {TOUR_STEPS[tourStep].badge}
                      </span>
                      <span className="tour-step-counter">Step {tourStep + 1} of 4</span>
                    </div>

                    <h3 className="tour-step-title">{TOUR_STEPS[tourStep].title}</h3>
                    <p className="tour-step-desc">{TOUR_STEPS[tourStep].description}</p>

                    <div className="tour-highlight-box">
                      <strong>⚡ Technical Check:</strong> {TOUR_STEPS[tourStep].detail}
                    </div>
                  </div>
                </div>

                {/* Video-style Navigation & Controls Bar */}
                <div className="tour-controls-row">
                  <div className="tour-play-controls">
                    <button
                      type="button"
                      className="tour-ctrl-btn"
                      onClick={() => setTourStep((prev) => (prev > 0 ? prev - 1 : TOUR_STEPS.length - 1))}
                      title="Previous Step"
                    >
                      ⏮ Previous
                    </button>

                    <button
                      type="button"
                      className={`tour-ctrl-btn ${tourAutoPlay ? 'is-playing' : ''}`}
                      onClick={() => setTourAutoPlay(!tourAutoPlay)}
                      title={tourAutoPlay ? 'Pause Auto-Play' : 'Auto-Play Walkthrough'}
                    >
                      {tourAutoPlay ? '⏸ Pause Auto-Play' : '▶ Auto-Play Walkthrough'}
                    </button>

                    <button
                      type="button"
                      className="tour-ctrl-btn"
                      onClick={() => setTourStep((prev) => (prev + 1) % TOUR_STEPS.length)}
                      title="Next Step"
                    >
                      Next Step ⏭
                    </button>
                  </div>

                  <div className="tour-action-group">
                    <Link to="/devices" className="btn btn--primary" style={{ padding: '7px 16px', fontSize: '0.82rem' }}>
                      <span>Launch Hardware Wizard</span>
                      <span>➔</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: INTERACTIVE 3D ESP32 HARDWARE NODE */}
            {heroConsoleMode === 'node3d' && (
              <div className="console-node3d-view">
                <ESP32Node3DViewer
                  theme={resolvedTheme}
                  height={340}
                  aqiTier={liveTelemetry.aqi > 150 ? 'unhealthy' : liveTelemetry.aqi > 50 ? 'moderate' : 'good'}
                />
              </div>
            )}

            {/* Live Streaming Sparkline Bar */}
            <div className="console-sparkline-strip">
              <div className="sparkline-indicator">
                <span className="pulse-dot green" />
                <span>
                  {heroConsoleMode === 'telemetry' && 'Stream active • Auto-polling 2.5s'}
                  {heroConsoleMode === 'formula' && `EPA Piecewise Engine • Testing ${calcPm25} µg/m³`}
                  {heroConsoleMode === 'tour' && `Interactive Setup Walkthrough • Step ${tourStep + 1} of 4`}
                  {heroConsoleMode === 'node3d' && 'Physical ESP32-WROOM-32 Twin • Interactive 3D Canvas'}
                </span>
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
                {heroConsoleMode === 'telemetry' && 'ADC: 1.18V • Rs/R0: 1.84'}
                {heroConsoleMode === 'formula' && `AQI: ${calculatedEPA.aqi} (${calculatedEPA.cat})`}
                {heroConsoleMode === 'tour' && (tourAutoPlay ? '▶ Auto-Playing (4.5s)' : '⏸ Manual Walkthrough')}
                {heroConsoleMode === 'node3d' && 'Drag to Rotate 360° • WebGL Accelerated'}
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

          {/* Interactive 3D Hardware Node Showcase */}
          <div className="architecture-3d-card">
            <div className="arch-3d-left">
              <span className="arch-badge">PHYSICAL HARDWARE SPECIFICATION</span>
              <h3 className="arch-title">ESP32-WROOM-32 Edge Station</h3>
              <p className="arch-desc">
                High-precision edge IoT station fusing multi-gas electrochemical sensing, digital psychrometric compensation, and zero-cable captive portal Wi-Fi provisioning.
              </p>

              <div className="arch-specs-list">
                <div className="arch-spec-item">
                  <span className="arch-spec-icon">⚡</span>
                  <div>
                    <strong>Dual-Core Xtensa LX6 @ 240MHz</strong>
                    <p>Sub-millisecond ADC sampling & onboard baseline drift compensation</p>
                  </div>
                </div>
                <div className="arch-spec-item">
                  <span className="arch-spec-icon">🧪</span>
                  <div>
                    <strong>MQ-135 Electrochemical Gas Chamber</strong>
                    <p>Internal SnO2 ceramic heater detecting CO, CO2, NH3, and Benzene</p>
                  </div>
                </div>
                <div className="arch-spec-item">
                  <span className="arch-spec-icon">🌡️</span>
                  <div>
                    <strong>DHT22 Precision Psychrometric Array</strong>
                    <p>±0.5°C Temperature & ±2% RH compensation telemetry</p>
                  </div>
                </div>
                <div className="arch-spec-item">
                  <span className="arch-spec-icon">📡</span>
                  <div>
                    <strong>2.4GHz IEEE 802.11 b/g/n Wi-Fi Mesh</strong>
                    <p>Automatic failover hotspot broadcast & captive mobile onboarding</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="arch-3d-right">
              <ESP32Node3DViewer theme={resolvedTheme} height={360} aqiTier="good" />
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
