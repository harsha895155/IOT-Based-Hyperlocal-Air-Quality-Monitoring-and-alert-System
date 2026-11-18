import React, { useState, useEffect, useRef } from 'react';
import {
  SOUND_PROFILES,
  getSelectedSound,
  setSelectedSound,
  getSoundVolume,
  setSoundVolume,
  playSoundProfile,
  stopCurrentSound,
} from '../utils/audioAlert';
import './AudioHazardControl.css';

/**
 * AudioHazardControl
 * Unobtrusive topbar button + popover enabling the user to:
 * - Toggle Hazard Audio Siren (Armed vs Muted)
 * - Test the Web Audio siren in real time
 * - Select sound profile (smoke alarm, air raid, subtle chime)
 * - Calibrated to automatically sound if AQI > 150 or Gas PPM > 80
 */
export default function AudioHazardControl({ currentAQI = 0, gasPpm = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isArmed, setIsArmed] = useState(() => {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem('airguard_audio_alerts') !== 'false';
  });
  const [selectedSound, setSound] = useState(getSelectedSound);
  const [volume, setVol] = useState(getSoundVolume);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const popoverRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleArmed = () => {
    const next = !isArmed;
    setIsArmed(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('airguard_audio_alerts', String(next));
    }
    if (!next) {
      stopCurrentSound();
      setIsPlayingTest(false);
    }
  };

  const handleSoundChange = (soundId) => {
    setSound(soundId);
    setSelectedSound(soundId);
  };

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    setVol(v);
    setSoundVolume(v);
  };

  const handleTestChime = () => {
    if (isPlayingTest) {
      stopCurrentSound();
      setIsPlayingTest(false);
      return;
    }

    setIsPlayingTest(true);
    playSoundProfile(selectedSound, true, volume);

    // Auto-reset test status after 3 seconds
    setTimeout(() => {
      stopCurrentSound();
      setIsPlayingTest(false);
    }, 2800);
  };

  // Check if hazard conditions are currently met
  const isHazardous = currentAQI > 150 || gasPpm > 80;

  return (
    <div className="audio-hazard-wrap" ref={popoverRef}>
      <button
        type="button"
        className={`btn-audio-siren-trigger ${isArmed ? 'is-armed' : 'is-muted'} ${isHazardous ? 'is-hazard-pulsing' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={isArmed ? 'Audio Hazard Siren: Armed (Alerts on AQI > 150)' : 'Audio Hazard Siren: Muted'}
      >
        <span className="siren-icon">{isArmed ? '🔔' : '🔕'}</span>
        <span className="siren-label">{isArmed ? 'Siren: Active' : 'Siren: Muted'}</span>
        {isArmed && <span className="siren-pulse-dot" />}
      </button>

      {isOpen && (
        <div className="audio-siren-popover animate-fade-in">
          <div className="siren-popover-header">
            <div className="siren-popover-title">
              <span className="siren-popover-icon">🚨</span>
              <div>
                <strong>Emergency Hazard Siren</strong>
                <p>Audible Web Audio tone on dangerous pollution</p>
              </div>
            </div>
            <button
              type="button"
              className="siren-close-btn"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="siren-toggle-row">
            <div>
              <span className="siren-toggle-label">Automatic Hazard Alarm</span>
              <span className="siren-toggle-sub">Sounds when AQI &gt; 150 or Gas &gt; 80 ppm</span>
            </div>
            <button
              type="button"
              className={`siren-switch ${isArmed ? 'switch-on' : 'switch-off'}`}
              onClick={toggleArmed}
            >
              <span className="switch-knob" />
            </button>
          </div>

          <div className="siren-profile-section">
            <label className="siren-field-label">Alarm Sound Profile</label>
            <div className="siren-profiles-list">
              {SOUND_PROFILES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`siren-profile-btn ${selectedSound === p.id ? 'is-selected' : ''}`}
                  onClick={() => handleSoundChange(p.id)}
                >
                  <span className="p-icon">{p.icon}</span>
                  <div className="p-text">
                    <span className="p-name">{p.name}</span>
                    <span className="p-desc">{p.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="siren-volume-row">
            <span className="siren-field-label">Volume: {Math.round(volume * 100)}%</span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="siren-volume-slider"
            />
          </div>

          <div className="siren-footer-actions">
            <button
              type="button"
              className={`btn-test-siren ${isPlayingTest ? 'is-testing' : ''}`}
              onClick={handleTestChime}
            >
              <span>{isPlayingTest ? '⏹ Stop Sound' : '🔊 Test Alarm Tone'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
