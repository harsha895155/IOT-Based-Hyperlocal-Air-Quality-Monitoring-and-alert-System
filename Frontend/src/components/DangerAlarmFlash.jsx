import React, { useState, useEffect } from 'react';
import { stopCurrentSound, playHighAlertSound } from '../utils/audioAlert';
import './DangerAlarmFlash.css';

/**
 * DangerAlarmFlash
 * Full-viewport emergency red flashing light overlay that triggers automatically
 * whenever high-alert sirens sound, background push alerts arrive, or when opened
 * via emergency push notification on mobile.
 */
export default function DangerAlarmFlash() {
  const [isActive, setIsActive] = useState(false);
  const [alertInfo, setAlertInfo] = useState({
    title: 'HAZARDOUS THRESHOLD DETECTED',
    soundId: 'smoke_alarm',
  });

  useEffect(() => {
    let timer = null;

    const triggerAlarm = ({ duration = 6.0, soundId = 'siren', title }) => {
      setAlertInfo({
        title: title || 'HAZARDOUS AIR QUALITY THRESHOLD DETECTED',
        soundId,
      });
      setIsActive(true);

      if (document.body) {
        document.body.classList.add('danger-mode-active');
      }

      // Trigger mobile haptic vibration motor if supported
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([500, 150, 500, 150, 500, 200, 800, 200, 800]);
        }
      } catch (e) {}

      // Play emergency siren audio
      try {
        playHighAlertSound();
      } catch (e) {}

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setIsActive(false);
        if (document.body) {
          document.body.classList.remove('danger-mode-active');
        }
      }, Math.max(5000, (duration + 1.5) * 1000));
    };

    const handleSirenTrigger = (event) => {
      triggerAlarm(event?.detail || {});
    };

    const handleSirenStop = () => {
      if (timer) clearTimeout(timer);
      setIsActive(false);
      if (document.body) {
        document.body.classList.remove('danger-mode-active');
      }
    };

    // 1. Listen for custom window events dispatched by socket or UI
    window.addEventListener('airguard:danger-siren-trigger', handleSirenTrigger);
    window.addEventListener('airguard:danger-siren-stop', handleSirenStop);

    // 2. Listen for Service Worker background push broadcast messages
    const handleServiceWorkerMessage = (event) => {
      if (
        event.data?.type === 'AIRGUARD_DANGER_ALERT' ||
        event.data?.type === 'AIRGUARD_TRIGGER_DANGER_FLASH'
      ) {
        const payload = event.data.payload || {};
        triggerAlarm({
          title: payload.title || payload.body || 'EMERGENCY: Toxic Atmospheric Hazard Detected!',
          duration: 8.0,
        });
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // 3. Check if app was opened with ?danger=true (from mobile push notification tap)
    try {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('danger') === 'true') {
        triggerAlarm({
          title: 'MOBILE EMERGENCY PUSH: Critical Pollution Threshold Exceeded!',
          duration: 8.0,
        });
        // Clean URL parameter without reloading page
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {}

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('airguard:danger-siren-trigger', handleSirenTrigger);
      window.removeEventListener('airguard:danger-siren-stop', handleSirenStop);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
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
            <span>DANGER ALERT ACTIVE</span>
            <span style={{ opacity: 0.6 }}>•</span>
            <span style={{ fontSize: '0.78rem', color: '#fef08a' }}>RED FLASH STROBE SOUNDING</span>
          </div>
          <div className="danger-alarm-sub">{alertInfo.title}</div>
        </div>
        <button
          type="button"
          className="danger-dismiss-btn"
          onClick={handleDismiss}
          title="Silence siren and exit danger mode"
        >
          ✕ Silence Alert
        </button>
      </div>
    </div>
  );
}
