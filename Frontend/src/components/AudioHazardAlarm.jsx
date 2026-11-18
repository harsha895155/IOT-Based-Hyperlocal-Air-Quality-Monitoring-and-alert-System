import React, { useState, useEffect, useRef } from 'react';
import './AudioHazardAlarm.css';

// Web Audio API Synthesizer (Zero external dependencies)
function playToneChime(type = 'test') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'test') {
      // Pleasant pleasant two-tone ding
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    } else if (type === 'hazard') {
      // Warning siren sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(450, ctx.currentTime + 0.25);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.02, ctx.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.75);
    }
  } catch (e) {
    console.warn('Audio playback not permitted or unavailable:', e);
  }
}

export default function AudioHazardAlarm({ currentAQI = 45 }) {
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [threshold, setThreshold] = useState(150);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAlerting, setIsAlerting] = useState(false);
  const lastAlertTimeRef = useRef(0);
  const menuRef = useRef(null);

  // Close popup menu on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Monitor AQI against threshold
  useEffect(() => {
    if (!alarmEnabled) {
      setIsAlerting(false);
      return;
    }

    if (currentAQI >= threshold) {
      setIsAlerting(true);
      const now = Date.now();
      // Only sound alarm once every 45 seconds to avoid annoyance
      if (now - lastAlertTimeRef.current > 45000) {
        lastAlertTimeRef.current = now;
        playToneChime('hazard');
      }
    } else {
      setIsAlerting(false);
    }
  }, [currentAQI, threshold, alarmEnabled]);

  const toggleAlarm = () => {
    const nextState = !alarmEnabled;
    setAlarmEnabled(nextState);
    if (nextState) {
      playToneChime('test');
    }
  };

  const handleTestSound = () => {
    playToneChime('test');
  };

  return (
    <div className="audio-alarm-wrapper" ref={menuRef}>
      <button
        type="button"
        className={`audio-alarm-btn ${alarmEnabled ? 'is-enabled' : ''} ${isAlerting ? 'is-flashing-alert' : ''}`}
        onClick={() => setMenuOpen(!menuOpen)}
        title="Emergency Audio Hazard Alarm Settings"
      >
        <span className="alarm-icon">{alarmEnabled ? (isAlerting ? '🚨' : '🔔') : '🔕'}</span>
        <span className="alarm-label">{alarmEnabled ? (isAlerting ? 'HAZARD SPIKE' : 'Alarm ON') : 'Alarm'}</span>
        {alarmEnabled && <span className="alarm-indicator-dot" />}
      </button>

      {menuOpen && (
        <div className="audio-alarm-dropdown">
          <div className="alarm-dropdown-header">
            <span>🚨 REAL-TIME HAZARD ALARM</span>
          </div>

          <p className="alarm-dropdown-desc">
            Instantly sounds an audio alert and flashes warning if local AQI exceeds your safe exposure threshold.
          </p>

          <div className="alarm-toggle-row">
            <span className="alarm-toggle-lbl">Enable Audio Siren</span>
            <button
              type="button"
              className={`alarm-switch-pill ${alarmEnabled ? 'is-active' : ''}`}
              onClick={toggleAlarm}
            >
              {alarmEnabled ? 'ENABLED' : 'MUTED'}
            </button>
          </div>

          <div className="alarm-threshold-section">
            <div className="alarm-threshold-head">
              <span>Trigger Threshold:</span>
              <strong style={{ color: '#ef4444' }}>AQI &gt; {threshold}</strong>
            </div>
            <input
              type="range"
              min="50"
              max="300"
              step="25"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="alarm-range-slider"
            />
            <div className="alarm-threshold-labels">
              <span>50 (Moderate)</span>
              <span>150 (Unhealthy)</span>
              <span>300 (Hazardous)</span>
            </div>
          </div>

          <div className="alarm-actions-row">
            <button
              type="button"
              className="btn-alarm-test"
              onClick={handleTestSound}
            >
              🔊 Test Chime Tone
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
