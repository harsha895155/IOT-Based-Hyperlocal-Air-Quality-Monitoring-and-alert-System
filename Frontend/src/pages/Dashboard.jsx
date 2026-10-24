import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useWeather } from '../hooks/useWeather';
import { formatTimeAgo } from '../hooks/useReadings';
import { classifyAQI, healthRecommendation } from '../utils/aqi';
import WeatherIcons, { getWeatherIcon } from '../components/WeatherIcons';
import TrendChart from '../components/TrendChart';
import WeatherHero3DCanvas from '../components/WeatherHero3DCanvas';
import { useTheme } from '../context/ThemeContext';
import './Dashboard.css';

export default function Dashboard({ readingsData, onNavigateTab }) {
  const { resolvedTheme } = useTheme() || {};
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
    placeName,
    buildingName,
    houseName,
    gpsLocation,
    coords,
    weatherData,
    loading: weatherLoading,
    error: weatherError,
    searchResults,
    searching,
    isLiveLocation,
    permissionStatus,
    selectLocation,
    search,
    useCurrentLocation,
    refreshWeather,
  } = useWeather(
    currentDevice?.location || null,
    currentDevice?.coordinates?.lat ? currentDevice.coordinates : null,
    selectedDevice === 'current-location'
  );

  const isConnectedDeviceSelected = selectedDevice !== 'current-location' && Boolean(currentDevice);

  const [customSearchedLocation, setCustomSearchedLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false);
  const searchRef = useRef(null);

  const displayPlaceName =
    customSearchedLocation ||
    (isConnectedDeviceSelected ? currentDevice?.location : null) ||
    placeName ||
    buildingName ||
    houseName ||
    (locationName && locationName !== 'Current Location' ? locationName : null) ||
    'Current Location';

  // When selectedDevice or currentDevice changes:
  // - If 'current-location': use browser GPS live location
  // - If connected device: ALWAYS use the physical device's registered location (from Step 3)
  useEffect(() => {
    if (customSearchedLocation) return;

    if (selectedDevice === 'current-location') {
      useCurrentLocation();
    } else if (currentDevice) {
      if (currentDevice.coordinates?.lat && currentDevice.coordinates?.lng) {
        selectLocation({
          name: currentDevice.location || 'Device Location',
          latitude: currentDevice.coordinates.lat,
          longitude: currentDevice.coordinates.lng,
        });
      } else if (currentDevice.location) {
        // Geocode the physical device's registered installation location
        client.get('/weather', { params: { location: currentDevice.location } })
          .then((res) => {
            if (res.data?.coords?.lat && res.data?.coords?.lng) {
              selectLocation({
                name: currentDevice.location,
                latitude: res.data.coords.lat,
                longitude: res.data.coords.lng,
              });
            } else {
              selectLocation({ name: currentDevice.location, location: currentDevice.location });
            }
          })
          .catch(() => {
            selectLocation({ name: currentDevice.location, location: currentDevice.location });
          });
      }
    }
  }, [
    currentDevice?.id,
    currentDevice?.location,
    currentDevice?.coordinates?.lat,
    currentDevice?.coordinates?.lng,
    customSearchedLocation,
    selectedDevice,
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

  // Check if device is selected and has recorded telemetry in database
  const isDeviceActiveOrRecorded = Boolean(
    selectedDevice !== 'current-location' &&
    currentDevice &&
    latest &&
    (latest.temperature != null || latest.airQuality != null)
  );

  // Check if physical sensor has transmitted real hardware readings (not static fallback 26°C / 50%)
  const isPhysicalSensorActive = Boolean(
    latest &&
    latest.temperature != null &&
    latest.humidity != null &&
    !(Math.round(latest.temperature) === 26 && Math.round(latest.humidity) === 50)
  );

  // Telemetry metrics:
  // 1. AQI: Prioritize physical sensor AQI when device is selected
  const aqiVal = (isDeviceConnected || isDeviceActiveOrRecorded) && typeof latest?.airQuality === 'number' && latest.airQuality > 0
    ? latest.airQuality
    : (cw.aqi != null ? cw.aqi : (latest?.airQuality != null ? latest.airQuality : null));

  const hasAqi = aqiVal != null;
  const { category: aqiCategory, color: aqiColor } = classifyAQI(aqiVal ?? 0);
  const aqiHealthAdvice = healthRecommendation(aqiVal ?? 0);

  // 2. Temperature:
  // When connected device is selected:
  //   - If physical DHT sensor sends real data: show physical sensor reading
  //   - If physical DHT is disconnected/fallback: show weather from device's registered location
  // When current location is selected: show current location weather
  let currentTemp = null;
  let currentTempTag = 'Current Location';
  let currentTempSub = 'Current regional weather temperature';

  if (isConnectedDeviceSelected) {
    if (isPhysicalSensorActive) {
      currentTemp = Number(latest.temperature).toFixed(1);
      currentTempTag = isDeviceConnected ? 'Physical DHT Sensor' : 'Recorded Telemetry';
      currentTempSub = isDeviceConnected ? 'Live hardware sensor reading' : `Last recorded reading • ${formatTimeAgo(latest?.createdAt)}`;
    } else {
      currentTemp = cw.temp != null ? `${cw.temp}` : (latest?.temperature != null ? Number(latest.temperature).toFixed(1) : '—');
      currentTempTag = 'Device Location Weather';
      currentTempSub = `Weather from device location (${currentDevice?.location || 'Station Location'})`;
    }
  } else {
    currentTemp = cw.temp != null ? `${cw.temp}` : '—';
    currentTempTag = 'Current Location';
    currentTempSub = 'Current regional weather temperature';
  }

  const feelsLike = cw.feelsLike != null ? `${cw.feelsLike}°C` : '—';

  // 3. Humidity:
  let sensorHumidity = null;
  let sensorHumidityTag = 'Current Location';
  let sensorHumiditySub = 'Relative moisture saturation';

  if (isConnectedDeviceSelected) {
    if (isPhysicalSensorActive) {
      sensorHumidity = Math.round(latest.humidity);
      sensorHumidityTag = isDeviceConnected ? 'Physical DHT Sensor' : 'Recorded Telemetry';
      sensorHumiditySub = isDeviceConnected ? 'Live hardware humidity sensor' : `Last recorded reading • ${formatTimeAgo(latest?.createdAt)}`;
    } else {
      sensorHumidity = cw.humidity != null ? cw.humidity : (latest?.humidity != null ? Math.round(latest.humidity) : '—');
      sensorHumidityTag = 'Device Location Weather';
      sensorHumiditySub = `Humidity from device location (${currentDevice?.location || 'Station Location'})`;
    }
  } else {
    sensorHumidity = cw.humidity != null ? cw.humidity : '—';
    sensorHumidityTag = 'Current Location';
    sensorHumiditySub = 'Relative moisture saturation';
  }

  const sensorGasPpm = (isDeviceConnected || isDeviceActiveOrRecorded) && latest?.gasPPM != null
    ? (latest.gasPPM < 1 ? Number(latest.gasPPM).toFixed(2) : Number(latest.gasPPM).toFixed(1))
    : null;
  const numGasPpm = (isDeviceConnected || isDeviceActiveOrRecorded) && latest?.gasPPM != null ? Number(latest.gasPPM) : null;

  // Local solar day/night failsafe: between 6:30 PM (18:30) and 6:00 AM, it is nighttime
  const currentHour = new Date().getHours() + new Date().getMinutes() / 60;
  const localIsDay = currentHour >= 6.0 && currentHour < 18.5;
  const isDay = cw.isDay !== undefined ? Boolean(cw.isDay) : localIsDay;

  const weatherCondition = cw.condition || (isDay ? 'Partly Cloudy' : 'Clear Sky');
  const weatherIconType = cw.icon || (isDay ? 'partly-cloudy' : 'clear');

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

  const CurrentWeatherIcon = getWeatherIcon(weatherIconType, weatherCondition);

  return (
    <div className="weather-dashboard">
      {/* ─── 1. TOP HEADER & LOCATION SELECTOR BAR ─── */}
      <div className="weather-topbar">
        <div className="weather-topbar__location" style={{ width: '100%' }}>
          <div className="weather-location-title-row">
            <div className="weather-title-left">
              <h1 className="weather-location-title">
                {displayPlaceName}
              </h1>
              <div className={`live-pulse-badge ${isDeviceConnected ? 'is-live' : (isLiveLocation ? 'is-live' : 'is-standby')}`}>
                <span className="live-dot" style={isLiveLocation && !isDeviceConnected ? { background: '#10b981', boxShadow: '0 0 8px #10b981' } : {}} />
                <span>{isDeviceConnected ? 'LIVE IOT FEED' : (isLiveLocation ? 'LIVE GPS ACTIVE' : 'LOCATION MODE')}</span>
              </div>
            </div>

            {/* Station / Location Picker placed at top right as requested in Image 2 */}
            <div className="device-quick-picker">
              <button
                type="button"
                className="btn-glass-dropdown"
                onClick={() => setDeviceDropdownOpen(!deviceDropdownOpen)}
                title={isDeviceConnected ? currentDevice.name : (isLiveLocation ? 'Live User Location' : 'Current Location')}
              >
                <span className="dot-node" style={{ background: isDeviceConnected ? '#10b981' : '#38bdf8' }} />
                <span>{isDeviceConnected ? currentDevice.name : (isLiveLocation ? '📍 Live GPS' : '📍 Current Loc')}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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

        <div className="weather-topbar__actions" style={{ width: '100%' }}>
          {/* Row 2: Search Bar + GPS Button taking full width */}
          <div className="weather-topbar__search-row" style={{ width: '100%' }}>
            <div className="location-search-box" ref={searchRef} style={{ flex: 1 }}>
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
              className={`btn-icon-glass ${isLiveLocation ? 'is-active-gps' : ''}`}
              title="Track My Live Location (GPS Permission)"
              style={
                isLiveLocation
                  ? {
                    borderColor: '#10b981',
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.15)',
                    boxShadow: '0 0 10px rgba(16, 185, 129, 0.25)',
                  }
                  : {}
              }
              onClick={() => {
                setCustomSearchedLocation(null);
                useCurrentLocation(true);
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={isLiveLocation ? '#10b981' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Geolocation permission denied notification banner */}
      {permissionStatus === 'denied' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: '12px',
            padding: '10px 16px',
            marginBottom: '16px',
            fontSize: '0.85rem',
            color: '#fef08a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📍</span>
            <span>
              <strong>Live Location Permission:</strong> Location access was blocked in browser settings.
              Click the lock/settings icon in your browser URL bar to allow location tracking, or search your city above.
            </span>
          </div>
          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{ padding: '4px 12px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
            onClick={() => useCurrentLocation(true)}
          >
            Retry Location Access
          </button>
        </div>
      )}

      {weatherError && !weatherData && (
        <div className="weather-alert-banner">
          <span>⚠️ {weatherError}</span>
        </div>
      )}

      {/* ─── Informative Banner when in Current Location Mode or Device Standby ─── */}
      {!isDeviceConnected && (
        <div className="dashboard-current-mode-banner">
          <div className="current-mode-info">
            <span className="current-mode-icon">{isDeviceActiveOrRecorded ? '📡' : '📍'}</span>
            <div className="current-mode-text">
              {isDeviceActiveOrRecorded ? (
                <>
                  <strong style={{ color: '#f59e0b' }}>Device Standby:</strong>{' '}
                  Station <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{currentDevice?.name || currentDevice?.id}</span> last transmitted telemetry {timeAgo}. Displaying recorded device metrics & local ambient forecast.
                </>
              ) : (
                <>
                  <strong style={{ color: 'var(--accent)' }}>Current Place Mode:</strong>{' '}
                  {devices.length === 0
                    ? 'No AirGuard IoT device connected yet. Displaying live weather & ambient air quality for '
                    : 'Device offline. Displaying real-time weather & air quality for '}
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {displayPlaceName}
                  </span>.
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            className="btn-primary btn-sm current-mode-connect-btn"
            onClick={() => onNavigateTab ? onNavigateTab('devices') : null}
          >
            {isDeviceActiveOrRecorded ? 'Manage Device' : '+ Connect Device'}
          </button>
        </div>
      )}

      {/* ─── 2. ATMOSPHERIC CURRENT CONDITIONS HERO (GOOGLE WEATHER STYLE) ─── */}
      <div className={`weather-hero-card ${isDay ? 'is-daytime' : 'is-nighttime'}`}>
        {/* Dynamic 3D Weather Simulation — changes automatically with weather report */}
        <WeatherHero3DCanvas
          condition={weatherCondition}
          iconType={weatherIconType}
          isDay={isDay}
          theme={resolvedTheme}
        />

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
                    : `📍 Ambient Air Quality (${displayPlaceName})`}
                </span>
              </div>

              {/* Live Place Tracked / GPS Coordinates placed here inside the card as shown in Image 2 */}
              <div className="weather-hero-tracking-sub">
                <span style={{ color: isLiveLocation ? '#10b981' : 'var(--color-primary, #38bdf8)', fontWeight: 600 }}>
                  {isLiveLocation ? (buildingName || houseName ? `🏠 ${buildingName || houseName}` : '📍 Live Place Tracked') : '📍 Location Mode'}
                </span>
                <span className="sep">•</span>
                <span>{gpsLocation || (coords ? `${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°` : 'Resolving GPS')}</span>
                <span className="sep">•</span>
                <span>{weatherData?.updatedAt ? `Updated ${formatTimeAgo(weatherData.updatedAt)}` : 'Live Forecast'}</span>
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
              <span className="pol-name">
                {isDeviceConnected || isDeviceActiveOrRecorded ? 'MQ135 Gas Sensor' : 'Ambient Fine PM2.5'}
              </span>
              <span className="pol-tag" style={{ color: isDeviceConnected ? '#10b981' : (isDeviceActiveOrRecorded ? '#f59e0b' : '#38bdf8') }}>
                {isDeviceConnected ? 'Active Sensor' : (isDeviceActiveOrRecorded ? 'Recorded Telemetry' : 'Current Location')}
              </span>
            </div>
            <div className="pol-val-row">
              <span className="pol-val mono">
                {isDeviceConnected || isDeviceActiveOrRecorded
                  ? (sensorGasPpm ?? '—')
                  : (cw.pm2_5 != null ? cw.pm2_5 : '—')}
              </span>
              <span className="pol-unit">{isDeviceConnected || isDeviceActiveOrRecorded ? 'ppm' : 'µg/m³'}</span>
            </div>
            <div className="pol-sub">
              {isDeviceConnected || isDeviceActiveOrRecorded
                ? 'Calibrated Baseline: R0 = 76.63 kΩ'
                : 'Fine respirable atmospheric particulate'}
            </div>
            <div className="pollutant-live-bar"><div className="pollutant-live-bar-fill" /></div>
          </div>

          {/* Temperature DHT22 / Weather */}
          <div className="pollutant-card is-active-sensor">
            <div className="pol-top">
              <span className="pol-name">
                {isConnectedDeviceSelected && isPhysicalSensorActive ? 'DHT22 / DHT11 Temperature' : (isConnectedDeviceSelected ? 'Station Location Temperature' : 'Ambient Temperature')}
              </span>
              <span className="pol-tag" style={{ color: isPhysicalSensorActive ? '#10b981' : (isConnectedDeviceSelected ? '#38bdf8' : '#94a3b8') }}>
                {currentTempTag}
              </span>
            </div>
            <div className="pol-val-row">
              <span className="pol-val mono">{currentTemp ?? '—'}</span>
              <span className="pol-unit">°C</span>
            </div>
            <div className="pol-sub">
              {currentTempSub}
            </div>
            <div className="pollutant-live-bar"><div className="pollutant-live-bar-fill" /></div>
          </div>

          {/* Humidity DHT22 / Weather */}
          <div className="pollutant-card is-active-sensor">
            <div className="pol-top">
              <span className="pol-name">
                {isConnectedDeviceSelected && isPhysicalSensorActive ? 'DHT22 / DHT11 Humidity' : (isConnectedDeviceSelected ? 'Station Location Humidity' : 'Ambient Relative Humidity')}
              </span>
              <span className="pol-tag" style={{ color: isPhysicalSensorActive ? '#10b981' : (isConnectedDeviceSelected ? '#38bdf8' : '#94a3b8') }}>
                {sensorHumidityTag}
              </span>
            </div>
            <div className="pol-val-row">
              <span className="pol-val mono">{sensorHumidity ?? '—'}</span>
              <span className="pol-unit">% RH</span>
            </div>
            <div className="pol-sub">
              {sensorHumiditySub}
            </div>
            <div className="pollutant-live-bar"><div className="pollutant-live-bar-fill" /></div>
          </div>

          {/* Estimated CO */}
          <div className="pollutant-card">
            <div className="pol-top">
              <span className="pol-name">Carbon Monoxide (CO)</span>
              <span className="pol-tag text-accent">
                {isDeviceConnected ? 'Derived' : (isDeviceActiveOrRecorded ? 'Hardware Derived' : 'Regional')}
              </span>
            </div>
            <div className="pol-val-row">
              <span className="pol-val mono">
                {isDeviceConnected || isDeviceActiveOrRecorded
                  ? (numGasPpm != null ? (numGasPpm * 0.12).toFixed(2) : '—')
                  : (cw.carbonMonoxide ? (cw.carbonMonoxide / 100).toFixed(1) : '2.8')}
              </span>
              <span className="pol-unit">ppm (est.)</span>
            </div>
            <div className="pol-sub">WHO safe 8h exposure limit: 9 ppm</div>
            <div className="pollutant-live-bar"><div className="pollutant-live-bar-fill" /></div>
          </div>

          {/* Estimated CO2 Eq / PM10 */}
          <div className="pollutant-card">
            <div className="pol-top">
              <span className="pol-name">
                {isDeviceConnected || isDeviceActiveOrRecorded ? 'CO₂ Equivalent' : 'Coarse PM10 Particulate'}
              </span>
              <span className="pol-tag text-accent">
                {isDeviceConnected ? 'Derived' : (isDeviceActiveOrRecorded ? 'Hardware Derived' : 'Regional')}
              </span>
            </div>
            <div className="pol-val-row">
              <span className="pol-val mono">
                {isDeviceConnected || isDeviceActiveOrRecorded
                  ? (numGasPpm != null ? Math.round(400 + numGasPpm * 1.8) : '—')
                  : (cw.pm10 ?? '28.5')}
              </span>
              <span className="pol-unit">{isDeviceConnected || isDeviceActiveOrRecorded ? 'ppm eq' : 'µg/m³'}</span>
            </div>
            <div className="pol-sub">
              {isDeviceConnected || isDeviceActiveOrRecorded
                ? 'Typical fresh air baseline: 400-500 ppm'
                : 'Inhalable coarse particulate threshold'}
            </div>
            <div className="pollutant-live-bar"><div className="pollutant-live-bar-fill" /></div>
          </div>

          {/* Hardware Connection Card */}
          <div className={`pollutant-card ${isDeviceConnected ? 'is-active-sensor' : (isDeviceActiveOrRecorded ? 'is-active-sensor' : 'is-unsupported')}`}>
            <div className="pol-top">
              <span className="pol-name">
                {currentDevice ? `Hardware Node (${currentDevice?.id})` : 'AirGuard ESP32 Sensor'}
              </span>
              <span
                className={`pol-tag ${isDeviceConnected ? 'text-online' : (isDeviceActiveOrRecorded ? 'text-amber-400' : 'text-faint')}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isDeviceConnected ? '#10b981' : (isDeviceActiveOrRecorded ? '#f59e0b' : '#64748b'),
                    display: 'inline-block',
                    boxShadow: isDeviceConnected ? '0 0 6px #10b981' : (isDeviceActiveOrRecorded ? '0 0 6px #f59e0b' : 'none'),
                  }}
                />
                {isDeviceConnected ? 'Online' : (isDeviceActiveOrRecorded ? 'Standby' : 'Not Connected')}
              </span>
            </div>
            <div className="pol-val-row">
              <span className={`pol-val ${isDeviceConnected || isDeviceActiveOrRecorded ? 'mono' : 'text-faint'}`} style={!isDeviceConnected && !isDeviceActiveOrRecorded ? { fontSize: '0.95rem' } : {}}>
                {currentDevice ? currentDevice?.name : 'Current Location Mode'}
              </span>
            </div>
            <div className="pol-sub">
              {isDeviceConnected
                ? `Transmitting via ${currentDevice?.type || 'ESP32'}`
                : (isDeviceActiveOrRecorded
                  ? `Hardware Standby • Last seen ${timeAgo}`
                  : 'Click "+ Connect Device" to link hardware')}
            </div>
            <div className="pollutant-live-bar"><div className="pollutant-live-bar-fill" /></div>
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
              <WeatherIcons.compass degrees={cw.windDirectionDeg || 0} size={32} />
            </div>
            <div>
              <div className="env-metric-num mono">{cw.windSpeedKmh ?? '—'} <span className="unit">km/h</span></div>
              <div className="env-metric-sub">Direction: <strong>{cw.windDirectionCompass || 'N/A'}</strong> ({cw.windDirectionDeg || 0}°)</div>
              <div className="env-metric-foot text-faint fs-xs">
                <span className="wind-gust-indicator">💨 Gusts up to {cw.windGustsKmh ?? 0} km/h</span>
              </div>
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
            <div className="humidity-liquid-bar">
              <div
                className="humidity-liquid-fill"
                style={{ width: `${Math.min(100, Math.max(8, sensorHumidity ?? cw.humidity ?? 50))}%` }}
              />
            </div>
            <div className="env-metric-sub" style={{ marginTop: '3px' }}>The dew point is {cw.dewPoint != null ? `${cw.dewPoint}°C` : 'N/A'} right now.</div>
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
            <div className="uv-meter-bar">
              <div
                className="uv-meter-fill"
                style={{
                  width: `${Math.min(100, Math.max(8, ((cw.uvIndex || 0) / 11) * 100))}%`,
                  backgroundColor: (cw.uvIndex || 0) <= 2 ? '#10b981' : (cw.uvIndex || 0) <= 5 ? '#f59e0b' : (cw.uvIndex || 0) <= 7 ? '#f97316' : '#ef4444'
                }}
              />
            </div>
            <div className="env-metric-sub" style={{ marginTop: '3px' }}>
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
            <div className="pressure-pulse-wrap">
              <div className="pressure-isobar-ring" />
              <div className="pressure-isobar-ring pressure-isobar-ring--2" />
              <span style={{ fontSize: '1.1rem' }}>🧭</span>
            </div>
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
