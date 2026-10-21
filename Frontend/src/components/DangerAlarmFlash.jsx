import React, { useState, useEffect } from 'react';
import { stopCurrentSound } from '../utils/audioAlert';
import './DangerAlarmFlash.css';

/**
 * DangerAlarmFlash
 * Full-viewport emergency red flashing light overlay that triggers automatically
 * whenever high-alert sirens sound anywhere on the AirGuard website.
 */
export default function DangerAlarmFlash() {
  const [isActive, setIsActive] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ title: 'HAZARDOUS THRESHOLD DETECTED', soundId: 'smoke_alarm' });

  useEffect(() => {
    let timer = null;

    const handleSirenTrigger = (event) => {
      const { duration = 4.0, soundId = 'siren', title } = event?.detail || {};
      
      setAlertInfo({
        title: title || 'HAZARDOUS AIR QUALITY THRESHOLD DETECTED',
        soundId,
      });
      setIsActive(true);

      if (document.body) {
        document.body.classList.add('danger-mode-active');
      }

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setIsActive(false);
        if (document.body) {
          document.body.classList.remove('danger-mode-active');
        }
      }, Math.max(3500, (duration + 1.2) * 1000));
    };

    const handleSirenStop = () => {
      if (timer) clearTimeout(timer);
      setIsActive(false);
      if (document.body) {
        document.body.classList.remove('danger-mode-active');
      }
    };

    window.addEventListener('airguard:danger-siren-trigger', handleSirenTrigger);
    window.addEventListener('airguard:danger-siren-stop', handleSirenStop);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('airguard:danger-siren-trigger', handleSirenTrigger);
      window.removeEventListener('airguard:danger-siren-stop', handleSirenStop);
      if (document.body) {
        document.body.classList.remove('danger-mode-active');
      }
    };
  }, []);

  const handleDismiss = () => {
    stopCurrentSound();
    setIsActive(false);
    if (document.body) {
      document.body.classList.remove('danger-mode-active');
    }
    window.dispatchEvent(new CustomEvent('airguard:danger-siren-stop'));
  };

  if (!isActive) return null;

  return (
    <div className="danger-alarm-overlay" role="alert" aria-live="assertive">
      {/* 1. Full-screen emergency red strobe lights */}
      <div className="danger-strobe-frame" />
      <div className="danger-strobe-veil" />

      {/* 2. Floating High-Priority Siren Emergency Banner */}
      <div className="danger-alarm-banner">
        <span className="danger-siren-beacon">🚨</span>
        <div className="danger-alarm-text">
          <div className="danger-alarm-title">
            <span>DANGER MODE ACTIVE</span>
            <span style={{ opacity: 0.6 }}>•</span>
            <span style={{ fontSize: '0.78rem', color: '#fef08a' }}>HIGH-DECIBEL SIREN SOUNDING</span>
          </div>
          <div className="danger-alarm-sub">{alertInfo.title}</div>
        </div>
        <button
          type="button"
          className="danger-dismiss-btn"
          onClick={handleDismiss}
          title="Silence siren and exit danger mode"
        >
          ✕ Silence Siren
        </button>
      </div>
    </div>
  );
}
