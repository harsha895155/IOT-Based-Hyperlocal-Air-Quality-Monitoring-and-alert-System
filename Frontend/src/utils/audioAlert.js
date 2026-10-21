/**
 * audioAlert.js — High-Urgency Industrial Alarm Synthesizer
 * 
 * Uses the Web Audio API to synthesize a high-frequency, high-decibel
 * 3-pulse emergency siren without requiring external MP3/WAV assets.
 * Tuned to 1600Hz–2600Hz (human ear maximum sensitivity per ISO 226).
 */

export function playHighAlertSound(force = false) {
  try {
    if (!force && typeof localStorage !== 'undefined' && localStorage.getItem('airguard_audio_alerts') === 'false') {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Master volume gain (high, clear, unclipped)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.75, now);
    masterGain.connect(ctx.destination);

    // High-pitched 3-pulse urgent siren pattern:
    // Pulse 1: 1760 Hz (A6) -> 2200 Hz
    // Pulse 2: 1960 Hz -> 2400 Hz
    // Pulse 3: 2093 Hz (C7) -> 2650 Hz
    const pulses = [
      { start: 0.00, duration: 0.14, freqStart: 1760, freqEnd: 2200 },
      { start: 0.18, duration: 0.14, freqStart: 1960, freqEnd: 2400 },
      { start: 0.36, duration: 0.22, freqStart: 2093, freqEnd: 2650 },
    ];

    pulses.forEach(({ start, duration, freqStart, freqEnd }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // 'sawtooth' generates sharp, high-penetration alarm harmonics
      osc.type = 'sawtooth';

      const pStart = now + start;
      const pEnd = pStart + duration;

      // Frequency upward alarm sweep
      osc.frequency.setValueAtTime(freqStart, pStart);
      osc.frequency.exponentialRampToValueAtTime(freqEnd, pEnd);

      // Fast attack & punchy decay
      gain.gain.setValueAtTime(0.7, pStart);
      gain.gain.setValueAtTime(0.7, pStart + duration * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, pEnd);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(pStart);
      osc.stop(pEnd);
    });

    // Clean up audio context
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1000);
  } catch (err) {
    console.warn('[AudioAlert] Non-fatal audio synthesizer warning:', err);
  }
}
