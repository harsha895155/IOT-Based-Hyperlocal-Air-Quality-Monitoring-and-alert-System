import React, { useState, useEffect, useRef, useCallback } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import WeatherIcons from '../components/WeatherIcons';
import './LocationsView.css';

// Popular quick-access metropolitan centers
const POPULAR_CITIES = [
  { name: 'Hyderabad', label: 'Hyderabad, Telangana, India', lat: 17.385, lng: 78.4867 },
  { name: 'Kolkata', label: 'Kolkata, West Bengal, India', lat: 22.5726, lng: 88.3639 },
  { name: 'Bengaluru', label: 'Bengaluru, Karnataka, India', lat: 12.9716, lng: 77.5946 },
  { name: 'Chennai', label: 'Chennai, Tamil Nadu, India', lat: 13.0827, lng: 80.2707 },
  { name: 'New Delhi', label: 'New Delhi, Delhi, India', lat: 28.6139, lng: 77.209 },
  { name: 'Mumbai', label: 'Mumbai, Maharashtra, India', lat: 19.076, lng: 72.8777 },
  { name: 'London', label: 'London, Greater London, United Kingdom', lat: 51.5072, lng: -0.1276 },
  { name: 'New York', label: 'New York, United States', lat: 40.7128, lng: -74.006 },
  { name: 'Tokyo', label: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503 },
];

export default function LocationsView() {
  const { user, isGuest } = useAuth();

  // Active searched location state (Defaults to Current Location)
  const [currentLocation, setCurrentLocation] = useState(() => {
    try {
      const cached = localStorage.getItem('airguard_last_gps_location');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.lat && parsed?.lng) return parsed;
      }
    } catch (e) {}
    return {
      name: 'Current Location',
      label: 'Acquiring current GPS location...',
      lat: null,
      lng: null,
      isCurrentLocation: true,
    };
  });

  // Search input and dropdown
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // Weather data states
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [weatherError, setWeatherError] = useState(null);

  // User-specific saved locations
  const [savedLocations, setSavedLocations] = useState([]);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('airguard_recent_searches') || '[]');
    } catch {
      return [];
    }
  });

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch user-scoped saved locations from backend (or localStorage for guests)
  const loadSavedLocations = useCallback(async () => {
    if (!isGuest && user) {
      try {
        const res = await client.get('/locations/saved');
        if (Array.isArray(res.data)) {
          setSavedLocations(res.data);
          return;
        }
      } catch (err) {
        console.warn('Could not fetch saved locations from server:', err.message);
      }
    }

    // Guest fallback
    try {
      const local = JSON.parse(localStorage.getItem('airguard_fav_locations_guest') || '[]');
      setSavedLocations(local);
    } catch {
      setSavedLocations([]);
    }
  }, [isGuest, user]);

  useEffect(() => {
    loadSavedLocations();
  }, [loadSavedLocations]);

  // Fetch weather for coordinates using server Google Weather data API
  const fetchWeather = useCallback(async (lat, lng, locName) => {
    setLoadingWeather(true);
    setWeatherError(null);
    try {
      const res = await client.get('/weather', {
        params: {
          lat,
          lng,
          location: locName,
        },
      });
      setWeatherData(res.data);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setWeatherError(
        err.response?.data?.message || err.response?.data?.error || 'Unable to retrieve weather data for this location right now. Please try again.'
      );
    } finally {
      setLoadingWeather(false);
    }
  }, []);

  // Trigger weather fetch when active location changes (only when coords are available)
  useEffect(() => {
    if (currentLocation.lat != null && currentLocation.lng != null) {
      fetchWeather(currentLocation.lat, currentLocation.lng, currentLocation.name);
    }
  }, [currentLocation, fetchWeather]);

  // Dynamic debounced search querying Google Geocoding through backend
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await client.get('/weather/search', {
          params: { q: searchQuery.trim() },
        });
        if (Array.isArray(res.data)) {
          setSearchResults(res.data);
          setDropdownOpen(true);
        }
      } catch (err) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle selecting a location from search results or chips
  const handleSelectLocation = (loc) => {
    const chosen = {
      name: loc.name,
      label: loc.label || loc.name,
      lat: Number(loc.latitude ?? loc.lat),
      lng: Number(loc.longitude ?? loc.lng),
    };

    setCurrentLocation(chosen);
    setSearchQuery('');
    setDropdownOpen(false);

    // Add to recent searches
    setRecentSearches((prev) => {
      const updated = [chosen, ...prev.filter((p) => p.name.toLowerCase() !== chosen.name.toLowerCase())].slice(0, 6);
      localStorage.setItem('airguard_recent_searches', JSON.stringify(updated));
      return updated;
    });
  };

  // GPS geolocation handler (auto-detects on mount & on button click)
  const handleUseCurrentLocation = useCallback((isInitialAuto = false) => {
    if (!navigator.geolocation) {
      if (!isInitialAuto) showToast('Geolocation is not supported by your browser.');
      return;
    }

    if (!isInitialAuto) showToast('Locating your current GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let resolvedCity = 'Current Location';
        let resolvedLabel = `GPS (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`;

        try {
          const revRes = await client.get('/weather/reverse', {
            params: { lat: latitude, lng: longitude },
          });
          if (revRes.data?.name) resolvedCity = revRes.data.name;
          if (revRes.data?.label) resolvedLabel = revRes.data.label;
        } catch (e) {}

        const gpsLoc = {
          name: resolvedCity,
          label: resolvedLabel,
          lat: latitude,
          lng: longitude,
          isCurrentLocation: true,
        };
        setCurrentLocation(gpsLoc);
        try {
          localStorage.setItem('airguard_last_gps_location', JSON.stringify(gpsLoc));
        } catch (e) {}
        if (!isInitialAuto) showToast(`✓ Switched to your current location: ${resolvedCity}`);
      },
      (err) => {
        if (!isInitialAuto) showToast(`Could not acquire GPS: ${err.message}`);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, []);

  // Automatically acquire user's current location details on mount as default
  useEffect(() => {
    handleUseCurrentLocation(true);
  }, [handleUseCurrentLocation]);

  // Save or remove favorite location (User-Specific)
  const isCurrentSaved = savedLocations.some(
    (s) => s.name.toLowerCase() === currentLocation.name.toLowerCase()
  );

  const handleToggleSaveLocation = async () => {
    if (isCurrentSaved) {
      // Remove
      const match = savedLocations.find(
        (s) => s.name.toLowerCase() === currentLocation.name.toLowerCase()
      );
      if (!isGuest && user && match?._id) {
        try {
          await client.delete(`/locations/saved/${match._id}`);
          setSavedLocations((prev) => prev.filter((p) => p._id !== match._id));
          showToast(`✓ Removed "${currentLocation.name}" from your saved locations.`);
          return;
        } catch (e) {
          console.warn('Failed to delete saved location from server:', e);
        }
      }

      const updated = savedLocations.filter(
        (p) => p.name.toLowerCase() !== currentLocation.name.toLowerCase()
      );
      setSavedLocations(updated);
      localStorage.setItem('airguard_fav_locations_guest', JSON.stringify(updated));
      showToast(`✓ Removed "${currentLocation.name}" from saved locations.`);
    } else {
      // Add
      const payload = {
        name: currentLocation.name,
        label: currentLocation.label,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
      };

      if (!isGuest && user) {
        try {
          const res = await client.post('/locations/saved', payload);
          setSavedLocations((prev) => [res.data, ...prev]);
          showToast(`✓ Saved "${currentLocation.name}" to your account favorites!`);
          return;
        } catch (e) {
          console.warn('Failed to save location to server:', e);
        }
      }

      const updated = [payload, ...savedLocations];
      setSavedLocations(updated);
      localStorage.setItem('airguard_fav_locations_guest', JSON.stringify(updated));
      showToast(`✓ Saved "${currentLocation.name}" to favorites.`);
    }
  };

  const handleRemoveSavedItem = async (e, item) => {
    e.stopPropagation();
    if (!isGuest && user && item._id) {
      try {
        await client.delete(`/locations/saved/${item._id}`);
      } catch (err) {}
    }
    const updated = savedLocations.filter((s) => s._id ? s._id !== item._id : s.name !== item.name);
    setSavedLocations(updated);
    localStorage.setItem('airguard_fav_locations_guest', JSON.stringify(updated));
    showToast(`Removed "${item.name}".`);
  };

  // Weather extraction
  const cw = weatherData?.current || {};
  const todayForecast = weatherData?.daily?.[0] || {};
  const hourlyList = weatherData?.hourly || [];
  const dailyList = weatherData?.daily || [];
  const WeatherIconComponent = WeatherIcons[cw.icon] || WeatherIcons['partly-cloudy'];

  return (
    <div className="location-weather-page">
      {/* ─── 1. PAGE HEADER ─── */}
      <div className="loc-header">
        <div>
          <div className="loc-badge-row">
            <span className="loc-service-pill">
              <span className="live-dot" />
              GOOGLE WEATHER INTELLIGENCE
            </span>
            <span className="loc-scope-pill">EXTERNAL METEOROLOGICAL SOURCE</span>
          </div>
          <h1 className="loc-title">Location Weather Search</h1>
          <p className="loc-subtitle">
            Search any city, town, district, or region worldwide to inspect real-time atmospheric conditions, 24-hour trends, and 7-day meteorological forecasts.
          </p>
        </div>

        <div className="loc-header-meta">
          <div className="loc-disclaimer-box">
            <span className="disclaimer-icon">ℹ️</span>
            <div>
              <div className="disclaimer-title">Independent Weather Stream</div>
              <div className="disclaimer-text">
                Weather results are fetched from external meteorological sources and are completely independent from your private AirGuard IoT hardware sensing nodes.
              </div>
            </div>
          </div>
        </div>
      </div>

      {toastMessage && <div className="loc-toast-banner">{toastMessage}</div>}

      {/* ─── 2. SEARCH INTERFACE & QUICK CHIPS ─── */}
      <div className="loc-search-card">
        <div className="loc-search-bar-wrap" ref={searchContainerRef}>
          <div className="loc-search-input-box">
            <svg className="loc-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="loc-search-input"
              placeholder="Search any city worldwide (e.g. Hyderabad, London, Tokyo, New York)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
            />
            {isSearching && <span className="loc-search-spinner" />}
            {searchQuery && (
              <button
                type="button"
                className="loc-clear-btn"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            className="loc-btn-gps"
            title="Use My Current GPS Location"
            onClick={handleUseCurrentLocation}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            <span>My Location</span>
          </button>

          {/* Autocomplete Dropdown */}
          {dropdownOpen && searchResults.length > 0 && (
            <div className="loc-autocomplete-dropdown">
              <div className="loc-dropdown-header">MATCHING LOCATIONS (GOOGLE WEATHER)</div>
              {searchResults.map((res, i) => (
                <button
                  key={`${res.name}-${res.latitude}-${i}`}
                  type="button"
                  className="loc-dropdown-item"
                  onClick={() => handleSelectLocation(res)}
                >
                  <div className="loc-item-pin">📍</div>
                  <div className="loc-item-text">
                    <span className="loc-item-name">{res.name}</span>
                    <span className="loc-item-sub">
                      {[res.admin1, res.country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                  <span className="loc-item-arrow">→</span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ─── 3. SAVED & RECENT LOCATIONS BAR ─── */}
      <div className="loc-saved-section">
        <div className="loc-saved-header">
          <div className="loc-saved-title">
            <span>⭐ YOUR SAVED LOCATIONS</span>
            <span className="loc-saved-count">({savedLocations.length})</span>
          </div>
          <button
            type="button"
            className={`loc-save-current-btn ${isCurrentSaved ? 'is-saved' : ''}`}
            onClick={handleToggleSaveLocation}
          >
            {isCurrentSaved ? '★ Saved to Favorites' : '☆ Save Current Location'}
          </button>
        </div>

        {savedLocations.length > 0 ? (
          <div className="loc-saved-chips-grid">
            {savedLocations.map((item, idx) => (
              <div
                key={`${item.name}-${idx}`}
                className={`loc-saved-card ${currentLocation.name.toLowerCase() === item.name.toLowerCase() ? 'is-active' : ''}`}
                onClick={() => handleSelectLocation(item)}
              >
                <div className="loc-saved-card-info">
                  <span className="loc-saved-pin">📍</span>
                  <span className="loc-saved-name">{item.name}</span>
                  {item.country && <span className="loc-saved-country">{item.country}</span>}
                </div>
                <button
                  type="button"
                  className="loc-saved-remove"
                  title="Remove saved location"
                  onClick={(e) => handleRemoveSavedItem(e, item)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="loc-saved-empty">
            No saved locations yet. Click <strong>"☆ Save Current Location"</strong> above to pin your favorite cities.
          </div>
        )}
      </div>

      {/* ─── 4. ERROR / LOADING STATES ─── */}
      {weatherError && (
        <div className="loc-error-banner">
          <span className="loc-error-icon">⚠️</span>
          <div className="loc-error-content">
            <strong>Weather Service Notice:</strong> {weatherError}
          </div>
        </div>
      )}

      {loadingWeather ? (
        <div className="loc-loading-card">
          <div className="loc-big-spinner" />
          <h3>Fetching live weather for {currentLocation.name}...</h3>
          <p>Querying Google Weather meteorological data streams & forecast models</p>
        </div>
      ) : weatherData ? (
        <>
          {/* ─── 5. PRIMARY WEATHER DASHBOARD ─── */}
          <div className="loc-weather-grid">
            {/* Main Current Conditions Hero */}
            <div className="loc-hero-card">
              <div className="loc-hero-top">
                <div>
                  <div className="loc-hero-place-row">
                    <span className="loc-hero-pin">📍</span>
                    <h2 className="loc-hero-place">{currentLocation.label || currentLocation.name}</h2>
                    {currentLocation.isCurrentLocation && (
                      <span className="loc-live-gps-pill">
                        <span className="live-dot" />
                        CURRENT LOCATION
                      </span>
                    )}
                  </div>
                  <span className="loc-hero-source">
                    Source: {weatherData.source || 'Google Weather Service'} · Updated {new Date(weatherData.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="loc-condition-badge">
                  {cw.condition || 'Partly Cloudy'}
                </div>
              </div>

              <div className="loc-hero-mid">
                <div className="loc-hero-temp-group">
                  <div className="loc-hero-temp">
                    {cw.temp != null ? Math.round(cw.temp) : '—'}
                    <span className="loc-hero-deg">°C</span>
                  </div>
                  <div className="loc-hero-feels">
                    Feels like <strong>{cw.feelsLike != null ? Math.round(cw.feelsLike) : '—'}°C</strong>
                  </div>
                </div>

                <div className="loc-hero-icon-box">
                  <WeatherIconComponent size={96} />
                </div>
              </div>

              <div className="loc-hero-range-bar">
                <div className="loc-range-item">
                  <span className="loc-range-lbl">TODAY'S HIGH</span>
                  <span className="loc-range-val high">▲ {todayForecast.maxTemp != null ? `${todayForecast.maxTemp}°C` : '—'}</span>
                </div>
                <div className="loc-range-sep" />
                <div className="loc-range-item">
                  <span className="loc-range-lbl">TODAY'S LOW</span>
                  <span className="loc-range-val low">▼ {todayForecast.minTemp != null ? `${todayForecast.minTemp}°C` : '—'}</span>
                </div>
                <div className="loc-range-sep" />
                <div className="loc-range-item">
                  <span className="loc-range-lbl">RAIN PROBABILITY</span>
                  <span className="loc-range-val rain">💧 {todayForecast.precipitationProbMax ?? 0}%</span>
                </div>
              </div>
            </div>

            {/* Comprehensive Metrics Grid */}
            <div className="loc-metrics-grid">
              <div className="loc-metric-card">
                <div className="loc-metric-head">
                  <span className="loc-m-icon">💧</span>
                  <span className="loc-m-label">HUMIDITY</span>
                </div>
                <div className="loc-m-val">{cw.humidity != null ? `${cw.humidity}%` : '—'}</div>
                <div className="loc-m-desc">{cw.humidity > 65 ? 'High ambient moisture' : cw.humidity < 35 ? 'Dry atmosphere' : 'Comfortable balance'}</div>
              </div>

              <div className="loc-metric-card">
                <div className="loc-metric-head">
                  <span className="loc-m-icon">💨</span>
                  <span className="loc-m-label">WIND VELOCITY</span>
                </div>
                <div className="loc-m-val">{cw.windSpeedKmh != null ? `${cw.windSpeedKmh} km/h` : '—'}</div>
                <div className="loc-m-desc">Direction: {cw.windDirectionCompass || 'N'} ({cw.windDirectionDeg || 0}°)</div>
              </div>

              <div className="loc-metric-card">
                <div className="loc-metric-head">
                  <span className="loc-m-icon">🌪️</span>
                  <span className="loc-m-label">WIND GUSTS</span>
                </div>
                <div className="loc-m-val">{cw.windGustsKmh != null ? `${cw.windGustsKmh} km/h` : '—'}</div>
                <div className="loc-m-desc">Peak horizontal gusts</div>
              </div>

              <div className="loc-metric-card">
                <div className="loc-metric-head">
                  <span className="loc-m-icon">🧭</span>
                  <span className="loc-m-label">ATMOSPHERIC PRESSURE</span>
                </div>
                <div className="loc-m-val">{cw.pressureHpa != null ? `${cw.pressureHpa} hPa` : '—'}</div>
                <div className="loc-m-desc">Barometric surface level</div>
              </div>

              <div className="loc-metric-card">
                <div className="loc-metric-head">
                  <span className="loc-m-icon">👁️</span>
                  <span className="loc-m-label">VISIBILITY</span>
                </div>
                <div className="loc-m-val">{cw.visibilityKm != null ? `${cw.visibilityKm} km` : '10 km'}</div>
                <div className="loc-m-desc">Surface optical clarity</div>
              </div>

              <div className="loc-metric-card">
                <div className="loc-metric-head">
                  <span className="loc-m-icon">☀️</span>
                  <span className="loc-m-label">UV INDEX</span>
                </div>
                <div className="loc-m-val">{cw.uvIndex != null ? cw.uvIndex : '0'}</div>
                <div className="loc-m-desc">
                  {cw.uvIndex >= 8 ? 'Very High (Sun protection needed)' : cw.uvIndex >= 6 ? 'High' : cw.uvIndex >= 3 ? 'Moderate' : 'Low risk'}
                </div>
              </div>

              <div className="loc-metric-card">
                <div className="loc-metric-head">
                  <span className="loc-m-icon">🌡️</span>
                  <span className="loc-m-label">DEW POINT</span>
                </div>
                <div className="loc-m-val">{cw.dewPoint != null ? `${cw.dewPoint}°C` : '—'}</div>
                <div className="loc-m-desc">Condensation temperature</div>
              </div>

              <div className="loc-metric-card">
                <div className="loc-metric-head">
                  <span className="loc-m-icon">🌅</span>
                  <span className="loc-m-label">SUNRISE & SUNSET</span>
                </div>
                <div className="loc-m-val" style={{ fontSize: '1.05rem', marginTop: '6px' }}>
                  🌅 {todayForecast.sunrise ? new Date(todayForecast.sunrise).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '06:00'} · 🌇 {todayForecast.sunset ? new Date(todayForecast.sunset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '18:15'}
                </div>
                <div className="loc-m-desc">Solar daylight cycle</div>
              </div>
            </div>
          </div>

          {/* ─── 6. HOURLY FORECAST (NEXT 24 HOURS) ─── */}
          {hourlyList.length > 0 && (
            <div className="loc-forecast-card">
              <div className="loc-forecast-title-row">
                <h3 className="loc-forecast-title">Hourly Forecast (Next 24 Hours)</h3>
                <span className="loc-forecast-sub">Google Meteorological Time-Series</span>
              </div>

              <div className="loc-hourly-strip">
                {hourlyList.map((hour, idx) => {
                  const IconComp = WeatherIcons[hour.icon] || WeatherIcons['partly-cloudy'];
                  const hourTime = new Date(hour.time).toLocaleTimeString([], { hour: 'numeric', hour12: true });

                  return (
                    <div key={`${hour.time}-${idx}`} className="loc-hour-item">
                      <span className="loc-hour-time">{idx === 0 ? 'Now' : hourTime}</span>
                      <div className="loc-hour-icon">
                        <IconComp size={32} />
                      </div>
                      <span className="loc-hour-temp">{hour.temp}°</span>
                      {hour.precipitationProb > 0 ? (
                        <span className="loc-hour-pop">💧 {hour.precipitationProb}%</span>
                      ) : (
                        <span className="loc-hour-pop-zero">—</span>
                      )}
                      <span className="loc-hour-wind">{hour.windSpeed} km/h</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── 7. DAILY 7-DAY FORECAST ─── */}
          {dailyList.length > 0 && (
            <div className="loc-forecast-card" style={{ marginTop: '22px' }}>
              <div className="loc-forecast-title-row">
                <h3 className="loc-forecast-title">7-Day Meteorological Outlook</h3>
                <span className="loc-forecast-sub">Synoptic Forecast Trend</span>
              </div>

              <div className="loc-daily-grid">
                {dailyList.map((day, idx) => {
                  const IconComp = WeatherIcons[day.icon] || WeatherIcons['partly-cloudy'];
                  const dateObj = new Date(day.date);
                  const dayName = idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : dateObj.toLocaleDateString([], { weekday: 'short' });
                  const dateFormatted = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

                  return (
                    <div key={`${day.date}-${idx}`} className={`loc-daily-card ${idx === 0 ? 'is-today' : ''}`}>
                      <div className="loc-daily-date-col">
                        <span className="loc-daily-day">{dayName}</span>
                        <span className="loc-daily-date">{dateFormatted}</span>
                      </div>

                      <div className="loc-daily-icon-col">
                        <IconComp size={36} />
                        <span className="loc-daily-cond">{day.condition}</span>
                      </div>

                      <div className="loc-daily-rain-col">
                        {day.precipitationProbMax > 0 ? (
                          <span className="loc-daily-pop">💧 {day.precipitationProbMax}%</span>
                        ) : (
                          <span className="loc-daily-pop-none">Dry</span>
                        )}
                        <span className="loc-daily-wind">💨 {day.windSpeedMax} km/h</span>
                      </div>

                      <div className="loc-daily-temp-col">
                        <span className="loc-daily-max">{day.maxTemp}°</span>
                        <span className="loc-daily-min">{day.minTemp}°</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="loc-empty-search-state">
          <div className="loc-empty-icon">🌍</div>
          <h3>Search any place to view weather intelligence</h3>
          <p>
            Type a city name above or select one of the popular quick cities like Hyderabad, London, New York, or Tokyo.
          </p>
        </div>
      )}
    </div>
  );
}
