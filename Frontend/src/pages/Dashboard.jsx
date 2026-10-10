import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useWeather } from '../hooks/useWeather';
import { formatTimeAgo } from '../hooks/useReadings';
import { classifyAQI, healthRecommendation } from '../utils/aqi';
import WeatherIcons from '../components/WeatherIcons';
import TrendChart from '../components/TrendChart';
import './Dashboard.css';

export default function Dashboard({ readingsData, onNavigateTab }) {
  const {
    latest,
    trend,
    alerts,
    devices,
    selectedDevice,
    setSelectedDevice,
    activeDevicesCount,
    connected,
    loading: readingsLoading,
    loadError,
    reload,
  } = readingsData;

  const currentDevice = useMemo(() => {
    if (!devices || devices.length === 0 || selectedDevice === 'current-location') return null;
    const found = devices.find((d) => d.id === selectedDevice || d.deviceId === selectedDevice);
    if (found) return found;
    return devices[0] || null;
  }, [devices, selectedDevice]);

  // Is an active hardware device connected and actively streaming?
  const isDeviceConnected = Boolean(
    currentDevice &&
    currentDevice.status === 'Online' &&
    connected &&
    selectedDevice !== 'current-location'
  );

  // Weather Hook initialized with device coordinates or current location default
  const {
    locationName,
    coords,
    weatherData,
    loading: weatherLoading,
    error: weatherError,
    searchResults,
    searching,
    selectLocation,
    search,
    useCurrentLocation,
    refreshWeather,
  } = useWeather(currentDevice?.location || 'Current Location', currentDevice?.coordinates || null);

  const [customSearchedLocation, setCustomSearchedLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false);
  const searchRef = useRef(null);

  // When currentDevice changes, sync location coords; if no device, probe current location
  useEffect(() => {
    if (!customSearchedLocation && currentDevice?.coordinates?.lat && currentDevice?.coordinates?.lng) {
      selectLocation({
        name: currentDevice.location,
        latitude: currentDevice.coordinates.lat,
        longitude: currentDevice.coordinates.lng,
      });
    } else if (!customSearchedLocation && !currentDevice && typeof navigator !== 'undefined' && navigator.geolocation) {
      useCurrentLocation();
    }
  }, [
    currentDevice?.id,
    currentDevice?.location,
    currentDevice?.coordinates?.lat,
    currentDevice?.coordinates?.lng,
    customSearchedLocation,
    selectLocation,
    useCurrentLocation,
  ]);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.trim().length >= 2) {
      search(q);
      setSearchDropdownOpen(true);
    } else {
      setSearchDropdownOpen(false);
    }
  };

  const handleSelectSearchResult = (result) => {
    setCustomSearchedLocation(result.name);
    selectLocation(result);
    setSearchQuery(result.name);
    setSearchDropdownOpen(false);
  };

  // Weather data
  const cw = weatherData?.current || {};
  const todayForecast = weatherData?.daily?.[0] || {};

  // Telemetry metrics:
  // When hardware device is connected and transmitting, prioritize live hardware readings.
  // When device is NOT connected, display current location ambient meteorological & air quality data.
  const aqiVal = isDeviceConnected && typeof latest?.airQuality === 'number'
    ? latest.airQuality
    : (cw.aqi != null ? cw.aqi : null);

  const hasAqi = aqiVal != null;
  const { category: aqiCategory, color: aqiColor } = classifyAQI(aqiVal ?? 0);
  const aqiHealthAdvice = healthRecommendation(aqiVal ?? 0);

  const sensorTemp = isDeviceConnected && latest?.temperature != null
    ? Number(latest.temperature).toFixed(1)
    : (cw.temp != null ? `${cw.temp}` : null);

  const currentTemp = sensorTemp;
  const feelsLike = cw.feelsLike != null ? `${cw.feelsLike}°C` : '—';
  const sensorHumidity = isDeviceConnected && latest?.humidity != null
    ? Math.round(latest.humidity)
    : (cw.humidity != null ? cw.humidity : null);

  const sensorGasPpm = isDeviceConnected && latest?.gasPPM != null
    ? Math.round(latest.gasPPM)
    : null;

  const weatherCondition = cw.condition || 'Partly Cloudy';
  const weatherIconType = cw.icon || 'partly-cloudy';
  const isDay = cw.isDay ?? true;

  const activeAlerts = alerts.filter((a) => !a.acknowledged);
  const timeAgo = formatTimeAgo(latest?.createdAt);

  // Weather + Air Quality Correlation calculation
  const correlationInsight = useMemo(() => {
    const hum = sensorHumidity ?? cw.humidity ?? 60;
    const wind = cw.windSpeedKmh ?? 10;
    const aqi = aqiVal ?? 75;

    let text = '';
    let badge = 'Normal Dispersion';

    if (wind < 8 && hum > 65) {
      badge = 'Stagnant Inversion Warning';
      text = `Low wind speeds (${wind} km/h) combined with high ambient humidity (${hum}%) reduce atmospheric vertical mixing. Airborne pollutants are trapped near ground level, contributing to elevated AQI readings.`;
    } else if (wind > 20) {
      badge = 'High Dispersion';
      text = `Moderate to high wind speeds (${wind} km/h) promote rapid atmospheric dilution and horizontal transport, preventing local accumulation of particulate matter.`;
    } else if (aqi <= 50) {
      badge = 'Optimal Ventilation';
      text = `Atmospheric dispersion conditions are favorable. Meteorological parameters and current ventilation allow fresh air turnover across the local monitoring zone.`;
    } else {
      badge = 'Moderate Stagnation';
      text = `Ambient conditions indicate moderate air turnover. Higher ground temperatures and humidity levels of ${hum}% influence gaseous particulate concentrations measured by node sensors.`;
    }

    return { text, badge };
  }, [sensorHumidity, cw.humidity, cw.windSpeedKmh, aqiVal]);

  // Dual-mode trend data: live MongoDB readings when device connected, or 24h hourly forecast when in location mode
  const displayTrend = useMemo(() => {
    if (isDeviceConnected && trend && trend.length > 0) {
      return trend;
    }
    if (weatherData?.hourly && weatherData.hourly.length > 0) {
      return weatherData.hourly.slice(0, 24).map((h) => ({
        createdAt: h.time,
        airQuality: h.aqi ?? (cw.aqi ?? 48),
        temperature: h.temp,
      }));
    }
    return trend || [];
  }, [isDeviceConnected, trend, weatherData?.hourly, cw.aqi]);

  const CurrentWeatherIcon = WeatherIcons[weatherIconType] || WeatherIcons['partly-cloudy'];

  return (
    <div className="weather-dashboard">
      {/* ─── 1. TOP HEADER & LOCATION SELECTOR BAR ─── */}
      <div className="weather-topbar">
        <div className="weather-topbar__location">
          <div className="weather-location-title-row">
            <h1 className="weather-location-title">
              {customSearchedLocation || (isDeviceConnected ? currentDevice?.location : null) || locationName || 'Current Location'}
            </h1>
            <div className={`live-pulse-badge ${isDeviceConnected ? 'is-live' : 'is-standby'}`}>
              <span className="live-dot" />
              <span>{isDeviceConnected ? 'LIVE IOT FEED' : 'CURRENT LOCATION'}</span>
            </div>
          </div>
          <div className="weather-location-sub">
            {isDeviceConnected ? (
              <>
                <span>{currentDevice.name}</span>
                <span className="sep">•</span>
                <span>{latest ? `Sensor ping ${timeAgo}` : 'Awaiting sensor stream'}</span>
                <span className="sep">•</span>
                <span>{weatherData?.updatedAt ? `Weather updated ${formatTimeAgo(weatherData.updatedAt)}` : 'Live forecast'}</span>
              </>
            ) : (
              <>
                <span style={{ color: 'var(--color-primary, #38bdf8)' }}>📍 Current Location Data Mode</span>
                <span className="sep">•</span>
                <span>No Hardware Device Connected</span>
                <span className="sep">•</span>
                <span>{weatherData?.updatedAt ? `Updated ${formatTimeAgo(weatherData.updatedAt)}` : 'Live Forecast'}</span>
              </>
            )}
          </div>
        </div>

        <div className="weather-topbar__actions">
          {/* Location Search Bar with Autocomplete */}
          <div className="location-search-box" ref={searchRef}>
            <div className="location-search-input-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search city, district, or coordinates..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => searchResults.length > 0 && setSearchDropdownOpen(true)}
              />
              {searching && <span className="search-spinner" />}
            </div>

            {searchDropdownOpen && searchResults.length > 0 && (
              <div className="search-results-dropdown">
                {searchResults.map((res, i) => (
                  <button
                    key={`${res.name}-${i}`}
                    type="button"
                    className="search-result-item"
                    onClick={() => handleSelectSearchResult(res)}
                  >
                    <span className="search-result-name">{res.name}</span>
                    <span className="search-result-admin">{res.admin1 ? `${res.admin1}, ` : ''}{res.country}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* GPS Button */}
          <button
            type="button"
            className="btn-icon-glass"
            title="Use My Current GPS Location"
            onClick={() => {
              setCustomSearchedLocation(null);
              useCurrentLocation();
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
          </button>

          {/* Device Station Picker */}
          <div className="device-quick-picker">
            <button
              type="button"
              className="btn-glass-dropdown"
              onClick={() => setDeviceDropdownOpen(!deviceDropdownOpen)}
            >
              <span className="dot-node" style={{ background: isDeviceConnected ? '#10b981' : '#38bdf8' }} />
              <span>{isDeviceConnected ? currentDevice.name : '📍 Current Location'}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {deviceDropdownOpen && (
              <div className="device-dropdown-menu">
                <div className="device-dropdown-header">STATION SELECTION</div>
                <button
                  type="button"
                  className={`device-dropdown-item ${!isDeviceConnected ? 'is-active' : ''}`}
                  onClick={() => {
                    setSelectedDevice('current-location');
                    setDeviceDropdownOpen(false);
                  }}
                >
                  <div>
                    <div className="dev-name">📍 Current Location Only</div>
                    <div className="dev-loc">Live Weather & Ambient AQI</div>
                  </div>
                  <span className="status-pill-sm is-online" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
                    Active
                  </span>
                </button>

                {devices.map((dev) => (
                  <button
                    key={dev.id}
                    type="button"
                    className={`device-dropdown-item ${dev.id === selectedDevice ? 'is-active' : ''}`}
                    onClick={() => {
                      setCustomSearchedLocation(null);
                      setSelectedDevice(dev.id);
                      setDeviceDropdownOpen(false);
                    }}
                  >
                    <div>
                      <div className="dev-name">{dev.name}</div>
                      <div className="dev-loc">{dev.location}</div>
                    </div>
                    <span className={`status-pill-sm ${dev.status === 'Online' ? 'is-online' : 'is-offline'}`}>
                      {dev.status}
                    </span>
                  </button>
                ))}

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '6px' }}>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px' }}
                    onClick={() => {
                      setDeviceDropdownOpen(false);
                      if (onNavigateTab) onNavigateTab('devices');
                    }}
                  >
                    + Add New Device
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {weatherError && (
        <div className="weather-alert-banner">
          <span>⚠️ {weatherError}</span>
        </div>
      )}

      {/* ─── Informative Banner when in Current Location Mode ─── */}
      {!isDeviceConnected && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'linear-gradient(90deg, rgba(56, 189, 248, 0.12) 0%, rgba(37, 99, 235, 0.08) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '12px',
            padding: '12px 18px',
            marginBottom: '18px',
            color: '#f8fafc',
            fontSize: '0.88rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>📍</span>
            <div>
              <strong style={{ color: '#38bdf8' }}>Current Location Mode:</strong>{' '}
              {devices.length === 0
                ? 'No AirGuard IoT device connected yet. Displaying live weather, temperature, humidity, and ambient air quality for '
                : 'Device is offline or not connected. Displaying real-time weather and air quality for '}
              <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                {customSearchedLocation || locationName || 'your current location'}
              </span>.
            </div>
          </div>
          <button
            type="button"
            className="btn-primary btn-sm"
            style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            onClick={() => onNavigateTab ? onNavigateTab('devices') : null}
          >
            + Connect Device
          </button>
        </div>
      )}

      {/* ─── 2. ATMOSPHERIC CURRENT CONDITIONS HERO (GOOGLE WEATHER STYLE) ─── */}
      <div className={`weather-hero-card ${isDay ? 'is-daytime' : 'is-nighttime'}`}>
        <div className="weather-hero-left">
          {/* Primary Focus: Real Air Quality Index */}
          <div className="aqi-hero-dial-wrap">
            <div className="aqi-hero-dial" style={{ borderColor: hasAqi ? aqiColor : 'var(--border)' }}>
              <span className="aqi-hero-num" style={{ color: hasAqi ? aqiColor : '#cbd5e1' }}>
                {hasAqi ? aqiVal : '—'}
              </span>
              <span className="aqi-hero-tag">AQI</span>
            </div>
            <div className="aqi-hero-info">
              <div className="aqi-hero-category" style={{ color: hasAqi ? aqiColor : '#94a3b8' }}>
                {hasAqi ? aqiCategory : 'Current Location AQI'}
              </div>
              <p className="aqi-hero-advice">{hasAqi ? aqiHealthAdvice : 'Current location atmospheric data active'}</p>
              <div className="aqi-source-pill">
                <span className="source-dot" style={{ background: isDeviceConnected ? '#10b981' : '#38bdf8' }} />
                <span>
                  {isDeviceConnected
                    ? `AirGuard Sensing Node (${currentDevice?.name || currentDevice?.id})`
                    : `📍 Ambient Air Quality (${customSearchedLocation || locationName || 'Current Location'})`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="weather-hero-right">
          <div className="weather-condition-display">
            <CurrentWeatherIcon size={56} isDay={isDay} className="weather-condition-icon" />
            <div className="weather-temp-wrap">
              <span className="weather-temp-num">{currentTemp ?? (weatherLoading ? '...' : '—')}</span>
              <span className="weather-temp-unit">°C</span>
            </div>
          </div>
          <div className="weather-condition-name">{weatherCondition}</div>
          <div className="weather-min-max-row">
            <span>Feels like {feelsLike}</span>
            {todayForecast.maxTemp != null && (
              <>
                <span className="dot">•</span>
                <span>H: {todayForecast.maxTemp}° · L: {todayForecast.minTemp}°</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── 3. SENSORS & MULTI-POLLUTANT BREAKDOWN ─── */}
      <div className="card weather-section-card">
        <div className="section-card-header">
          <h2 className="section-card-title">
            {isDeviceConnected ? 'IoT Air Quality & Sensor Breakdown' : 'Current Location Atmospheric & Air Metrics'}
          </h2>
          <span className="section-card-sub">
            {isDeviceConnected
              ? 'Hardware measurements from ESP32, MQ135 & DHT22 modules'
              : `Local ambient measurements for ${customSearchedLocation || locationName || 'current location'}`}
          </span>
        </div>

        <div className="pollutants-grid">
          {/* Card 1: Gas Sensor or Ambient PM2.5 */}
          <div className="pollutant-card is-active-sensor">
            <div className="pol-top">
              <span className="pol-name">{isDeviceConnected ? 'MQ135 Gas Sensor' : 'Ambient Fine PM2.5'}</span>
              <span className="pol-tag" style={{ color: isDeviceConnected ? '#10b981' : '#38bdf8' }}>
                {isDeviceConnected ? 'Active Sensor' : 'Current Location'}
              </span>
            </div>
            <div className="pol-val-row">
              <span className="pol-val mono">{isDeviceConnected ? (sensorGasPpm ?? '—') : (cw.pm2_5 != null ? cw.pm2_5 : '—')}</span>
              <span className="pol-unit">{isDeviceConnected ? 'ppm' : 'µg/m³'}</span>
            </div>
            <div className="pol-sub">
              {isDeviceConnected ? 'Calibrated Baseline: R0 = 76.63 kΩ' : 'Fine respirable atmospheric particulate'}
            </div>
          </div>

          {/* Temperature DHT22 / Weather */}
          <div className="pollutant-card is-active-sensor">
            <div className="pol-top">
              <span className="pol-name">{isDeviceConnected ? 'DHT22 Temperature' : 'Ambient Temperature'}</span>
              <span className="pol-tag" style={{ color: isDeviceConnected ? '#10b981' : '#38bdf8' }}>
                {isDeviceConnected ? 'Active Sensor' : 'Current Location'}
              </span>
            </div>
            <div className="pol-val-row">
              <span className="pol-val mono">{currentTemp ?? '—'}</span>
              <span className="pol-unit">°C</span>
            </div>
            <div className="pol-sub">
              {isDeviceConnected ? 'High accuracy capacitive sensor' : 'Current regional weather temperature'}
            </div>
          </div>

          {/* Humidity DHT22 / Weather */}
          <div className="pollutant-card is-active-sensor">
            <div className="pol-top">
              <span className="pol-name">{isDeviceConnected ? 'DHT22 Humidity' : 'Ambient Relative Humidity'}</span>
              <span className="pol-tag" style={{ color: isDeviceConnected ? '#10b981' : '#38bdf8' }}>
                {isDeviceConnected ? 'Active Sensor' : 'Current Location'}
              </span>
            </div>
            <div className="pol-val-row">
              <span className="pol-val mono">{sensorHumidity ?? '—'}</span>
              <span className="pol-unit">% RH</span>
            </div>
            <div className="pol-sub">Relative moisture saturation</div>
          </div>

          {/* Estimated CO */}
          <div className="pollutant-card">
            <div className="pol-top">
              <span className="pol-name">Carbon Monoxide (CO)</span>
              <span className="pol-tag text-accent">{isDeviceConnected ? 'Derived' : 'Regional'}</span>
            </div>
            <div className="pol-val-row">
              <span className="pol-val mono">
                {isDeviceConnected
                  ? (sensorGasPpm ? (sensorGasPpm * 0.12).toFixed(1) : '—')
                  : (cw.carbonMonoxide ? (cw.carbonMonoxide / 100).toFixed(1) : '2.8')}
              </span>
              <span className="pol-unit">ppm (est.)</span>
            </div>
            <div className="pol-sub">WHO safe 8h exposure limit: 9 ppm</div>
          </div>

          {/* Estimated CO2 Eq / PM10 */}
          <div className="pollutant-card">
            <div className="pol-top">
              <span className="pol-name">{isDeviceConnected ? 'CO₂ Equivalent' : 'Coarse PM10 Particulate'}</span>
              <span className="pol-tag text-accent">{isDeviceConnected ? 'Derived' : 'Regional'}</span>
            </div>
            <div className="pol-val-row">
              <span className="pol-val mono">
                {isDeviceConnected
                  ? (sensorGasPpm ? Math.round(sensorGasPpm * 1.8) : '—')
                  : (cw.pm10 ?? '28.5')}
              </span>
              <span className="pol-unit">{isDeviceConnected ? 'ppm eq' : 'µg/m³'}</span>
            </div>
            <div className="pol-sub">
              {isDeviceConnected ? 'Typical fresh air baseline: 400-500 ppm' : 'Inhalable coarse particulate threshold'}
            </div>
          </div>

          {/* Hardware Connection Card */}
          <div className={`pollutant-card ${isDeviceConnected ? 'is-active-sensor' : 'is-unsupported'}`}>
            <div className="pol-top">
              <span className="pol-name">{isDeviceConnected ? `Hardware Node (${currentDevice?.id})` : 'AirGuard ESP32 Sensor'}</span>
              <span className={`pol-tag ${isDeviceConnected ? 'text-online' : 'text-faint'}`}>
                {isDeviceConnected ? 'Online' : 'Not Connected'}
              </span>
            </div>
            <div className="pol-val-row">
              <span className={`pol-val ${isDeviceConnected ? 'mono' : 'text-faint'}`} style={!isDeviceConnected ? { fontSize: '0.95rem' } : {}}>
                {isDeviceConnected ? currentDevice?.name : 'Current Location Mode'}
              </span>
            </div>
            <div className="pol-sub">
              {isDeviceConnected
                ? `Transmitting via ${currentDevice?.type || 'ESP32'}`
                : 'Click "+ Connect Device" to link hardware'}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 6. DETAILED ENVIRONMENTAL METRICS GRID (WEATHER CARDS) ─── */}
      <div className="environmental-details-grid">
        {/* Wind Compass Card */}
        <div className="card env-metric-card">
          <div className="env-metric-header">
            <span className="env-metric-title">WIND & DYNAMICS</span>
            <WeatherIcons.wind size={18} />
          </div>
          <div className="env-metric-content compass-layout">
            <div className="compass-widget">
              <WeatherIcons.compass degrees={cw.windDirectionDeg || 0} size={54} />
            </div>
            <div>
              <div className="env-metric-num mono">{cw.windSpeedKmh ?? '—'} <span className="unit">km/h</span></div>
              <div className="env-metric-sub">Direction: <strong>{cw.windDirectionCompass || 'N/A'}</strong> ({cw.windDirectionDeg || 0}°)</div>
              <div className="env-metric-foot text-faint fs-xs">Gusts up to {cw.windGustsKmh ?? 0} km/h</div>
            </div>
          </div>
        </div>

        {/* Humidity & Dew Point Card */}
        <div className="card env-metric-card">
          <div className="env-metric-header">
            <span className="env-metric-title">HUMIDITY & DEW POINT</span>
            <span style={{ fontSize: '1.1rem' }}>💧</span>
          </div>
          <div className="env-metric-content">
            <div className="env-metric-num mono">{sensorHumidity ?? cw.humidity ?? '—'} <span className="unit">%</span></div>
            <div className="env-metric-sub">The dew point is {cw.dewPoint != null ? `${cw.dewPoint}°C` : 'N/A'} right now.</div>
            <div className="env-metric-foot text-faint fs-xs">
              Comfort Level: {(sensorHumidity ?? cw.humidity ?? 50) > 70 ? 'High Humidity' : (sensorHumidity ?? cw.humidity ?? 50) < 30 ? 'Dry' : 'Comfortable'}
            </div>
          </div>
        </div>

        {/* UV Index Card */}
        <div className="card env-metric-card">
          <div className="env-metric-header">
            <span className="env-metric-title">UV INDEX</span>
            <span style={{ fontSize: '1.1rem' }}>☀️</span>
          </div>
          <div className="env-metric-content">
            <div className="env-metric-num mono">{cw.uvIndex != null ? cw.uvIndex : (todayForecast.uvMax ?? 0)}</div>
            <div className="env-metric-sub">
              {(cw.uvIndex || 0) <= 2 ? 'Low risk' : (cw.uvIndex || 0) <= 5 ? 'Moderate' : (cw.uvIndex || 0) <= 7 ? 'High' : 'Very High'}
            </div>
            <div className="env-metric-foot text-faint fs-xs">
              {(cw.uvIndex || 0) > 5 ? 'Sun protection recommended between 11 AM - 4 PM' : 'Minimal sun protection required'}
            </div>
          </div>
        </div>

        {/* Atmospheric Pressure & Visibility */}
        <div className="card env-metric-card">
          <div className="env-metric-header">
            <span className="env-metric-title">SURFACE PRESSURE & VISIBILITY</span>
            <span style={{ fontSize: '1.1rem' }}>🧭</span>
          </div>
          <div className="env-metric-content">
            <div className="env-metric-num mono">{cw.pressureHpa ?? 1012} <span className="unit">hPa</span></div>
            <div className="env-metric-sub">Visibility: <strong>{cw.visibilityKm ?? 10} km</strong></div>
            <div className="env-metric-foot text-faint fs-xs">Standard mean sea-level pressure</div>
          </div>
        </div>

        {/* Sunrise & Sunset Arc */}
        <div className="card env-metric-card">
          <div className="env-metric-header">
            <span className="env-metric-title">SUNRISE & SUNSET</span>
            <span style={{ fontSize: '1.1rem' }}>🌅</span>
          </div>
          <div className="env-metric-content">
            <WeatherIcons.sunArc sunrise={cw.sunrise || todayForecast.sunrise} sunset={cw.sunset || todayForecast.sunset} />
            <div className="sun-times-row">
              <div>
                <span className="text-faint fs-xs">SUNRISE</span>
                <div className="mono fw-600">
                  {cw.sunrise ? new Date(cw.sunrise).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '06:05 AM'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="text-faint fs-xs">SUNSET</span>
                <div className="mono fw-600">
                  {cw.sunset ? new Date(cw.sunset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '06:22 PM'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Weather + Air Quality Correlation Insights */}
        <div className="card env-metric-card correlation-card">
          <div className="env-metric-header">
            <span className="env-metric-title">WEATHER & AQI CORRELATION</span>
            <span className="correlation-badge">{correlationInsight.badge}</span>
          </div>
          <div className="env-metric-content">
            <p className="correlation-text">{correlationInsight.text}</p>
            <div className="correlation-stats-strip">
              <div>AQI: <strong>{hasAqi ? aqiVal : '—'}</strong></div>
              <div>Wind: <strong>{cw.windSpeedKmh ?? '—'} km/h</strong></div>
              <div>Humidity: <strong>{sensorHumidity ?? cw.humidity ?? '—'}%</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 7. HISTORICAL TRENDS & REAL-TIME ALERTS ROW ─── */}
      <div className="weather-bottom-row">
        {/* Trend Chart (Driven by real DB history or current location hourly forecast) */}
        <div className="card weather-trend-card">
          <div className="section-card-header">
            <h2 className="section-card-title">
              {isDeviceConnected ? 'Air Quality 24h Sensor History' : '24h Atmospheric AQI & Temperature Trend'}
            </h2>
            <span className="section-card-sub">
              {isDeviceConnected
                ? `Recorded by node ${currentDevice?.name} in MongoDB Atlas`
                : `Hourly meteorological trend for ${customSearchedLocation || locationName || 'current location'}`}
            </span>
          </div>
          <TrendChart data={displayTrend} />
        </div>

        {/* Contextual Real-time Alerts */}
        <div className="card weather-alerts-card">
          <div className="section-card-header">
            <h2 className="section-card-title">Active Environmental Alerts</h2>
            <span className="section-card-sub">{activeAlerts.length} unresolved alerts</span>
          </div>

          <div className="weather-alerts-list">
            {activeAlerts.length === 0 ? (
              <div className="weather-alert-empty">
                <span className="check-icon">✓</span>
                <div>
                  <strong>All Environmental Systems Normal</strong>
                  <p className="text-muted fs-xs">No critical air quality threshold excursions or hazardous conditions detected.</p>
                </div>
              </div>
            ) : (
              activeAlerts.slice(0, 3).map((alt) => (
                <div key={alt._id} className="weather-alert-pill">
                  <div className="alert-pill-top">
                    <span className="alert-pill-cat" style={{ color: classifyAQI(alt.airQuality).color }}>
                      {alt.category}
                    </span>
                    <span className="alert-pill-time">{formatTimeAgo(alt.createdAt)}</span>
                  </div>
                  <div className="alert-pill-msg">{alt.message}</div>
                  <div className="alert-pill-meta mono fs-xs text-faint">Node: {alt.deviceId} · AQI {alt.airQuality}</div>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            className="btn-secondary btn-sm w-full mt-3"
            onClick={() => onNavigateTab('alerts')}
          >
            View Full Alert Center ({alerts.length})
          </button>
        </div>
      </div>
    </div>
  );
}
