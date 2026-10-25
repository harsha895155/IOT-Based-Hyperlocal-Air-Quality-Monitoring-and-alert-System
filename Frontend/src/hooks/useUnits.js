import { useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  convertTemperature,
  formatTemperature,
  convertWindSpeed,
  formatWindSpeed,
  convertPressure,
  formatPressure,
  formatClockTime,
} from '../utils/units';

export function useUnits() {
  const { preferences, updatePreferences } = useAuth() || {};

  const tempUnit = preferences?.tempUnit || 'C';
  const windUnit = preferences?.windUnit || 'km/h';
  const pressureUnit = preferences?.pressureUnit || 'hPa';
  const timeFormat = preferences?.timeFormat || '12h';

  const formatTemp = useCallback(
    (celsius, options = {}) => formatTemperature(celsius, tempUnit, options),
    [tempUnit]
  );

  const convertTemp = useCallback(
    (celsius) => convertTemperature(celsius, tempUnit),
    [tempUnit]
  );

  const formatWind = useCallback(
    (kmh, options = {}) => formatWindSpeed(kmh, windUnit, options),
    [windUnit]
  );

  const convertWind = useCallback(
    (kmh) => convertWindSpeed(kmh, windUnit),
    [windUnit]
  );

  const formatPress = useCallback(
    (hPa, options = {}) => formatPressure(hPa, pressureUnit, options),
    [pressureUnit]
  );

  const convertPress = useCallback(
    (hPa) => convertPressure(hPa, pressureUnit),
    [pressureUnit]
  );

  const formatTime = useCallback(
    (dateOrTime) => formatClockTime(dateOrTime, timeFormat),
    [timeFormat]
  );

  // Real-time instantaneous setters that persist immediately to user profile
  const setTempUnit = useCallback(
    (newUnit) => {
      if (updatePreferences) updatePreferences({ tempUnit: newUnit });
    },
    [updatePreferences]
  );

  const setWindUnit = useCallback(
    (newUnit) => {
      if (updatePreferences) updatePreferences({ windUnit: newUnit });
    },
    [updatePreferences]
  );

  const setPressureUnit = useCallback(
    (newUnit) => {
      if (updatePreferences) updatePreferences({ pressureUnit: newUnit });
    },
    [updatePreferences]
  );

  const setTimeFormat = useCallback(
    (newFormat) => {
      if (updatePreferences) updatePreferences({ timeFormat: newFormat });
    },
    [updatePreferences]
  );

  return {
    tempUnit,
    windUnit,
    pressureUnit,
    timeFormat,
    formatTemp,
    convertTemp,
    formatWind,
    convertWind,
    formatPress,
    convertPress,
    formatTime,
    setTempUnit,
    setWindUnit,
    setPressureUnit,
    setTimeFormat,
  };
}
