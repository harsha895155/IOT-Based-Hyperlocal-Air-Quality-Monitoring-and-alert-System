import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicyView() {
  const navigate = useNavigate();

  return (
    <div style={{
      maxWidth: '860px',
      margin: '0 auto',
      padding: '40px 24px 80px',
      color: '#f8fafc',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      lineHeight: '1.7'
    }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#38bdf8',
          padding: '8px 16px',
          borderRadius: '10px',
          cursor: 'pointer',
          marginBottom: '28px',
          fontSize: '14px',
          fontWeight: 600,
          transition: 'all 0.2s ease'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back
      </button>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        marginBottom: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #0284c7, #0369a1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 20px rgba(2, 132, 199, 0.3)'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            AirGuard Privacy Policy
          </h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
            Last updated: October 25, 2026 • Effective Date: October 25, 2026
          </p>
        </div>
      </div>

      <div style={{
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid rgba(56, 189, 248, 0.15)',
        borderRadius: '16px',
        padding: '24px',
        margin: '24px 0',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)'
      }}>
        <p style={{ margin: 0, fontSize: '15px', color: '#cbd5e1' }}>
          Welcome to <strong>AirGuard</strong> ("we", "our", or "us"). We are dedicated to protecting your personal privacy
          and providing transparency regarding how your data is handled when you use our environmental monitoring web platform
          and Android mobile application (the "Service").
        </p>
      </div>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          1. Information We Collect
        </h2>
        <p style={{ color: '#cbd5e1', fontSize: '15px' }}>
          AirGuard collects only the minimal data necessary to provide real-time air quality index calculations, environmental monitoring,
          and threshold incident notifications:
        </p>
        <ul style={{ paddingLeft: '22px', color: '#94a3b8', fontSize: '14px' }}>
          <li style={{ marginBottom: '8px' }}>
            <strong style={{ color: '#f1f5f9' }}>Approximate Location:</strong> When granted, we use approximate geographical coordinates to fetch localized micro-climate weather forecasts and atmospheric pressure data via Open-Meteo. We do not track fine-grained GPS movements or store background movement histories.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong style={{ color: '#f1f5f9' }}>IoT Hardware Sensor Telemetry:</strong> Gas concentrations (MQ135), Air Quality Index (AQI), temperature, humidity (DHT11/22), and Wi-Fi link status transmitted from your registered ESP32 nodes.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong style={{ color: '#f1f5f9' }}>Account Information:</strong> If you choose to register or authenticate via Google Sign-In, we store your name and verified email address solely to associate your personalized hardware devices and alert configurations.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          2. Zero Advertising & No Sale of Personal Data
        </h2>
        <div style={{
          background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          borderRadius: '12px',
          padding: '16px 20px',
          color: '#86efac',
          fontSize: '14px'
        }}>
          <strong>Privacy Commitment:</strong> AirGuard does not display third-party advertisements, does not contain tracking ad network SDKs, and will never sell, rent, or monetize your personal or environmental data.
        </div>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </svg>
          3. Data Storage & Security
        </h2>
        <p style={{ color: '#cbd5e1', fontSize: '15px' }}>
          All telemetry and account data in transit is encrypted using modern Transport Layer Security (TLS 1.3 / HTTPS).
          Authentication tokens are secured with cryptographically signed JSON Web Tokens (JWT) and stored securely within sandboxed browser/TWA storage.
        </p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          4. Notifications & Push Alerts
        </h2>
        <p style={{ color: '#cbd5e1', fontSize: '15px' }}>
          If you opt in to push notifications, we dispatch notifications exclusively for critical air quality threshold breaches
          (such as elevated gas or high AQI warnings) and device connectivity alerts. You may disable push notifications at any time
          via your device or browser settings.
        </p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
          </svg>
          5. Data Deletion & User Rights
        </h2>
        <p style={{ color: '#cbd5e1', fontSize: '15px' }}>
          You retain full rights to delete your registered hardware nodes, reset historical telemetry logs, or permanently delete your account and associated records directly from your Profile settings or by emailing our privacy team.
        </p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          6. Contact Us
        </h2>
        <p style={{ color: '#cbd5e1', fontSize: '15px' }}>
          For inquiries, feedback, or data privacy requests regarding AirGuard:
        </p>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
          <strong>Email:</strong> support@airguard-hyperlocal.vercel.app<br />
          <strong>Platform:</strong> <a href="https://airguard-hyperlocal.vercel.app" style={{ color: '#38bdf8' }}>https://airguard-hyperlocal.vercel.app</a>
        </p>
      </section>
    </div>
  );
}
