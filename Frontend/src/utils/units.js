/**
 * Atmospheric & Environmental Unit Conversion Utilities
 * Supports:
 * - Temperature: Celsius (°C), Fahrenheit (°F)
 * - Wind Velocity: km/h, m/s, mph
 * - Barometric / Atmospheric Pressure: hPa (mbar), inHg, mmHg
 * - Clock / Time: 12-Hour (02:30 PM) vs 24-Hour (14:30)
 */

// ─── 1. TEMPERATURE CONVERSIONS ───
export function convertTemperature(celsius, unit = 'C') {
  if (celsius == null || isNaN(Number(celsius))) return null;
  const c = Number(celsius);
  if (unit === 'F') {
    return (c * 9) / 5 + 32;
  }
  return c;
}

export function formatTemperature(celsius, unit = 'C', options = {}) {
  const { decimals = 1, showUnit = true } = options;
  if (celsius == null || isNaN(Number(celsius))) return '—';
  const val = convertTemperature(celsius, unit);
  const formatted = decimals === 0 ? Math.round(val) : Number(val.toFixed(decimals));
  return showUnit ? `${formatted}°${unit}` : `${formatted}`;
}

// ─── 2. WIND VELOCITY CONVERSIONS ───
export function convertWindSpeed(kmh, unit = 'km/h') {
  if (kmh == null || isNaN(Number(kmh))) return null;
  const k = Number(kmh);
  if (unit === 'm/s') {
    return k / 3.6;
  }
  if (unit === 'mph') {
    return k * 0.621371;
  }
  return k; // km/h
}

export function formatWindSpeed(kmh, unit = 'km/h', options = {}) {
  const { decimals = 1, showUnit = true } = options;
  if (kmh == null || isNaN(Number(kmh))) return '—';
  const val = convertWindSpeed(kmh, unit);
  const formatted = decimals === 0 ? Math.round(val) : Number(val.toFixed(decimals));
  return showUnit ? `${formatted} ${unit}` : `${formatted}`;
}

// ─── 3. BAROMETRIC / ATMOSPHERIC PRESSURE CONVERSIONS ───
export function convertPressure(hPa, unit = 'hPa') {
  if (hPa == null || isNaN(Number(hPa))) return null;
  const p = Number(hPa);
  if (unit === 'inHg') {
    return p * 0.02953;
  }
  if (unit === 'mmHg') {
    return p * 0.750062;
  }
  return p; // hPa / mbar
}

export function formatPressure(hPa, unit = 'hPa', options = {}) {
  const { decimals = unit === 'inHg' ? 2 : 0, showUnit = true } = options;
  if (hPa == null || isNaN(Number(hPa))) return '—';
  const val = convertPressure(hPa, unit);
  const formatted = decimals === 0 ? Math.round(val) : Number(val.toFixed(decimals));
  const unitLabel = unit === 'hPa' ? 'hPa' : unit;
  return showUnit ? `${formatted} ${unitLabel}` : `${formatted}`;
}

// ─── 4. CLOCK DISPLAY FORMAT CONVERSIONS ───
export function formatClockTime(dateOrTime, timeFormat = '12h') {
  if (!dateOrTime) return '';
  let d;
  if (dateOrTime instanceof Date) {
    d = dateOrTime;
  } else if (typeof dateOrTime === 'string') {
    // If it's already a time string like "14:30" or "02:30 PM"
    if (/^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(dateOrTime.trim())) {
      const match = dateOrTime.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (match) {
        let hour = parseInt(match[1], 10);
        const min = match[2];
        const ampm = match[3] ? match[3].toUpperCase() : null;
        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        d = new Date();
        d.setHours(hour, parseInt(min, 10), 0, 0);
      }
    } else {
      d = new Date(dateOrTime);
    }
  } else if (typeof dateOrTime === 'number') {
    d = new Date(dateOrTime);
  }

  if (!d || isNaN(d.getTime())) return String(dateOrTime);

  const hours24 = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');

  if (timeFormat === '24h') {
    return `${String(hours24).padStart(2, '0')}:${minutes}`;
  }

  // 12-Hour format
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${String(hours12).padStart(2, '0')}:${minutes} ${ampm}`;
}
