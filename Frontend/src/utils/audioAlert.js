/**
 * audioAlert.js — Multi-Profile High-Decibel Alarm Audio Synthesizer
 * 
 * Generates distinct emergency alarm sound profiles using the Web Audio API.
 * Designed to produce high-frequency, high-decibel audible alerts (1600Hz–3200Hz).
 */

export const SOUND_PROFILES = [
  {
    id: 'smoke_alarm',
    name: 'Smoke Detector (Loud Piercing 3.1kHz)',
    icon: '🚨',
    description: 'Piercing high-frequency T3 temporal pattern (ISO 7240 / NFPA 72 standard)',
  },
  {
    id: 'air_raid',
    name: 'Industrial Air Raid Siren',
    icon: '📢',
    description: 'High-low emergency wail oscillating between 900Hz and 2400Hz',
  },
  {
    id: 'digital_buzzer',
    name: 'High-Pitch Rapid Buzzer',
    icon: '⚡',
    description: 'Rapid 2.8kHz aggressive digital pulse bursts for extreme urgency',
  },
  {
    id: 'hazard_klaxon',
    name: 'Chemical / Hazard Klaxon',
    icon: '☣️',
    description: 'Alternating dual-tone industrial evacuation horn (1200Hz / 1850Hz)',
  },
  {
    id: 'double_chime',
    name: 'Subtle Chime',
    icon: '🔔',
    description: 'Milder harmonic double chime for low-noise environments',
  },
];

export function getSelectedSound() {
  if (typeof localStorage === 'undefined') return 'smoke_alarm';
  return localStorage.getItem('airguard_selected_sound') || 'smoke_alarm';
}

export function setSelectedSound(soundId) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('airguard_selected_sound', soundId);
  }
}

export function getSoundVolume() {
  if (typeof localStorage === 'undefined') return 0.8;
  const v = localStorage.getItem('airguard_sound_volume');
  return v ? Math.min(1, Math.max(0.1, Number(v))) : 0.8;
}

export function setSoundVolume(val) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('airguard_sound_volume', String(val));
  }
}

let activeAudioContext = null;

export function stopCurrentSound() {
  if (activeAudioContext) {
    try {
      activeAudioContext.close().catch(() => {});
    } catch (e) {}
    activeAudioContext = null;
  }
}

/**
 * Synthesizes and plays the specified sound profile using Web Audio API.
 */
export function playSoundProfile(soundId = null, force = false, customVolume = null) {
  try {
    if (!force && typeof localStorage !== 'undefined' && localStorage.getItem('airguard_audio_alerts') === 'false') {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    // Stop any existing sound before starting new
    stopCurrentSound();

    const ctx = new AudioContextClass();
    activeAudioContext = ctx;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const profile = soundId || getSelectedSound();
    const volume = customVolume != null ? customVolume : getSoundVolume();

    // Master volume gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, now);
    masterGain.connect(ctx.destination);

    let maxDuration = 1.0;

    switch (profile) {
      // 1. Smoke Detector (3.1 kHz Piercing T3 Pattern)
      case 'smoke_alarm': {
        maxDuration = 1.2;
        // 3 sharp 3100Hz beeps
        [0.0, 0.35, 0.70].forEach((startOffset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square'; // Sharp square wave cuts through everything
          const pStart = now + startOffset;
          const pEnd = pStart + 0.22;

          osc.frequency.setValueAtTime(3100, pStart); // High 3.1 kHz

          gain.gain.setValueAtTime(0.85, pStart);
          gain.gain.setValueAtTime(0.85, pStart + 0.18);
          gain.gain.exponentialRampToValueAtTime(0.001, pEnd);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(pStart);
          osc.stop(pEnd);
        });
        break;
      }

      // 2. Air Raid / Industrial Siren (High wail)
      case 'air_raid': {
        maxDuration = 1.4;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';

        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(2500, now + 0.6);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 1.2);

        gain.gain.setValueAtTime(0.8, now);
        gain.gain.setValueAtTime(0.8, now + 1.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.35);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 1.35);
        break;
      }

      // 3. Digital Rapid Buzzer (2.8 kHz)
      case 'digital_buzzer': {
        maxDuration = 1.0;
        // 5 rapid bursts
        [0.0, 0.12, 0.24, 0.36, 0.48].forEach((startOffset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          const pStart = now + startOffset;
          const pEnd = pStart + 0.08;

          osc.frequency.setValueAtTime(2800, pStart);

          gain.gain.setValueAtTime(0.85, pStart);
          gain.gain.exponentialRampToValueAtTime(0.001, pEnd);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(pStart);
          osc.stop(pEnd);
        });
        break;
      }

      // 4. Chemical / Hazard Klaxon (Two-Tone alternating)
      case 'hazard_klaxon': {
        maxDuration = 1.2;
        const tones = [
          { start: 0.00, dur: 0.22, freq: 1250 },
          { start: 0.26, dur: 0.22, freq: 1850 },
          { start: 0.52, dur: 0.22, freq: 1250 },
          { start: 0.78, dur: 0.28, freq: 1850 },
        ];
        tones.forEach(({ start, dur, freq }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          const pStart = now + start;
          const pEnd = pStart + dur;

          osc.frequency.setValueAtTime(freq, pStart);
          gain.gain.setValueAtTime(0.8, pStart);
          gain.gain.setValueAtTime(0.8, pStart + dur * 0.8);
          gain.gain.exponentialRampToValueAtTime(0.001, pEnd);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(pStart);
          osc.stop(pEnd);
        });
        break;
      }

      // 5. Subtle Double Chime (Milder)
      case 'double_chime':
      default: {
        maxDuration = 0.6;
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0.5, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc1.connect(gain1);
        gain1.connect(masterGain);
        osc1.start(now);
        osc1.stop(now + 0.2);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1174.66, now + 0.22);
        gain2.gain.setValueAtTime(0.5, now + 0.22);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc2.connect(gain2);
        gain2.connect(masterGain);
        osc2.start(now + 0.22);
        osc2.stop(now + 0.45);
        break;
      }
    }

    // Trigger full-website red light flashing danger mode
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('airguard:danger-siren-trigger', {
          detail: {
            duration: maxDuration,
            soundId: profile,
            title: 'HAZARDOUS THRESHOLD DETECTED — EMERGENCY SIREN ACTIVE',
          },
        })
      );
    }

    // Close audio context after sound finishes
    setTimeout(() => {
      ctx.close().catch(() => {});
      if (activeAudioContext === ctx) {
        activeAudioContext = null;
      }
    }, (maxDuration + 0.3) * 1000);
  } catch (err) {
    console.warn('[AudioAlert] Non-fatal audio synthesizer warning:', err);
  }
}

/**
 * Backward compatibility wrapper — plays current selected sound
 */
export function playHighAlertSound(force = false) {
  playSoundProfile(null, force);
}
