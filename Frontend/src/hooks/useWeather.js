import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

export function useWeather(initialLocation = 'Current Location', initialCoords = null) {
  const [locationName, setLocationName] = useState(initialLocation || 'Current Location');
  const [coords, setCoords] = useState(initialCoords);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const fetchWeather = useCallback(async (lat, lng, locName) => {
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
      // No coords yet (GPS not acquired) — don't trigger an error
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
      // 400 = no coords on server side (rare edge case); don't show error
      if (err.response?.status === 400) {
        // Silently wait for GPS
      } else {
        console.warn('Weather fetch failed:', err.message);
        setError('Weather feed temporarily unavailable. Real-time AirGuard sensor stream active.');
      }
    } finally {
      setLoading(false);
    }
  }, [locationName]);

  useEffect(() => {
    if (coords?.lat != null && coords?.lng != null) {
      fetchWeather(coords.lat, coords.lng, locationName);
      // Refresh weather every 10 minutes
      const interval = setInterval(() => {
        fetchWeather(coords.lat, coords.lng, locationName);
      }, 600000);
      return () => clearInterval(interval);
    }
  }, [coords?.lat, coords?.lng, locationName, fetchWeather]);

  // Synchronize state when initialLocation or initialCoords props update
  useEffect(() => {
    if (initialLocation && initialLocation !== locationName) {
      setLocationName(initialLocation);
    }
  }, [initialLocation]);

  useEffect(() => {
    if (
      initialCoords?.lat != null &&
      initialCoords?.lng != null &&
      (initialCoords.lat !== coords?.lat || initialCoords.lng !== coords?.lng)
    ) {
      setCoords(initialCoords);
    }
  }, [initialCoords?.lat, initialCoords?.lng]);

  const selectLocation = useCallback((newLoc) => {
    const locTitle = newLoc.name || newLoc.label || newLoc.location;
    if (locTitle) setLocationName(locTitle);
    if (newLoc.latitude && newLoc.longitude) {
      setCoords({ lat: newLoc.latitude, lng: newLoc.longitude });
    } else if (newLoc.coordinates?.lat && newLoc.coordinates?.lng) {
      setCoords({ lat: newLoc.coordinates.lat, lng: newLoc.coordinates.lng });
    }
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
    } catch (err) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const newCoords = { lat: latitude, lng: longitude };
        setCoords(newCoords);
        try {
          const rev = await client.get('/weather/reverse', {
            params: { lat: latitude, lng: longitude },
          });
          const resolvedName = rev.data?.name || 'Current Location';
          setLocationName(resolvedName);
          fetchWeather(latitude, longitude, resolvedName);
        } catch {
          setLocationName('Current Location');
          fetchWeather(latitude, longitude, 'Current Location');
        }
      },
      (err) => {
        setLoading(false);
        setError(`Location access denied (${err.message}). Search for a location manually.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [fetchWeather]);

  return {
    locationName,
    coords,
    weatherData,
    loading,
    error,
    searchResults,
    searching,
    selectLocation,
    search,
    useCurrentLocation,
    refreshWeather: () => fetchWeather(coords?.lat, coords?.lng, locationName),
  };
}
