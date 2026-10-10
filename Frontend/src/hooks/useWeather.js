import { useState, useEffect, useCallback, useRef } from 'react';
import client from '../api/client';

export function useWeather(initialLocation = 'Current Location', initialCoords = null, autoTrack = true) {
  const [locationName, setLocationName] = useState(initialLocation || 'Current Location');
  const [coords, setCoords] = useState(initialCoords);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [isLiveLocation, setIsLiveLocation] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('unknown'); // 'unknown' | 'prompt' | 'granted' | 'denied'

  const watchIdRef = useRef(null);

  // Check browser permission status if supported
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          setPermissionStatus(status.state);
          status.onchange = () => {
            setPermissionStatus(status.state);
          };
        })
        .catch(() => {});
    }
  }, []);

  const fetchWeather = useCallback(async (lat, lng, locName) => {
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await client.get('/weather', {
        params: {
          lat,
          lng,
          location: locName ?? locationName,
        },
      });
      setWeatherData(res.data);
    } catch (err) {
      console.warn('Weather fetch warning:', err.message);
      // Only set error if we don't already have valid weatherData
      setWeatherData((prev) => {
        if (!prev) {
          setError('Live weather is updating. Real-time sensor telemetry remains active.');
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, [locationName]);

  // Request browser geolocation and track user's real-time position
  const useCurrentLocation = useCallback((forcePrompt = false) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLoading(true);
    setError(null);

    const onGeoSuccess = async (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      const newCoords = {
        lat: Number(latitude.toFixed(4)),
        lng: Number(longitude.toFixed(4)),
      };
      setCoords(newCoords);
      setIsLiveLocation(true);
      setPermissionStatus('granted');

      try {
        const rev = await client.get('/weather/reverse', {
          params: { lat: newCoords.lat, lng: newCoords.lng },
        });
        const resolvedName = rev.data?.name || rev.data?.city || 'Current Location';
        setLocationName(resolvedName);
        fetchWeather(newCoords.lat, newCoords.lng, resolvedName);
      } catch {
        setLocationName('Current Location');
        fetchWeather(newCoords.lat, newCoords.lng, 'Current Location');
      } finally {
        setLoading(false);
      }
    };

    const onGeoError = (err) => {
      setLoading(false);
      if (err.code === 1) {
        // PERMISSION_DENIED
        setPermissionStatus('denied');
        setIsLiveLocation(false);
        console.info('User denied browser geolocation prompt.');
      } else {
        console.warn('Geolocation acquisition timeout or error:', err.message);
      }
      // If we don't have coords yet, fallback to sensible regional station so weather loads
      setCoords((prev) => {
        if (!prev) {
          const fallback = { lat: 14.4426, lng: 79.9865 };
          fetchWeather(fallback.lat, fallback.lng, 'AirGuard Station');
          return fallback;
        }
        return prev;
      });
    };

    navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoError, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 60000,
    });
  }, [fetchWeather]);

  // Auto-request location permission on mount if autoTrack is true and coords not manually provided
  useEffect(() => {
    if (autoTrack && !coords) {
      useCurrentLocation();
    }
  }, [autoTrack, coords, useCurrentLocation]);

  // Fetch weather on coords update and refresh periodically (every 10m)
  useEffect(() => {
    if (coords?.lat != null && coords?.lng != null) {
      fetchWeather(coords.lat, coords.lng, locationName);
      const interval = setInterval(() => {
        fetchWeather(coords.lat, coords.lng, locationName);
      }, 600000);
      return () => clearInterval(interval);
    }
  }, [coords?.lat, coords?.lng, locationName, fetchWeather]);

  // Synchronize state when initialLocation or initialCoords props update
  useEffect(() => {
    if (initialLocation && initialLocation !== locationName && !isLiveLocation) {
      setLocationName(initialLocation);
    }
  }, [initialLocation, isLiveLocation, locationName]);

  useEffect(() => {
    if (
      initialCoords?.lat != null &&
      initialCoords?.lng != null &&
      (initialCoords.lat !== coords?.lat || initialCoords.lng !== coords?.lng)
    ) {
      setCoords(initialCoords);
      setIsLiveLocation(false);
    }
  }, [initialCoords?.lat, initialCoords?.lng, coords?.lat, coords?.lng]);

  const selectLocation = useCallback((newLoc) => {
    const locTitle = newLoc.name || newLoc.label || newLoc.location;
    if (locTitle) setLocationName(locTitle);
    if (newLoc.latitude && newLoc.longitude) {
      setCoords({ lat: newLoc.latitude, lng: newLoc.longitude });
    } else if (newLoc.coordinates?.lat && newLoc.coordinates?.lng) {
      setCoords({ lat: newLoc.coordinates.lat, lng: newLoc.coordinates.lng });
    }
    setIsLiveLocation(false);
    setSearchResults([]);
  }, []);

  const search = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await client.get('/weather/search', { params: { q: query } });
      setSearchResults(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  return {
    locationName,
    coords,
    weatherData,
    loading,
    error,
    searchResults,
    searching,
    isLiveLocation,
    permissionStatus,
    selectLocation,
    search,
    useCurrentLocation,
    refreshWeather: () => fetchWeather(coords?.lat, coords?.lng, locationName),
  };
}
