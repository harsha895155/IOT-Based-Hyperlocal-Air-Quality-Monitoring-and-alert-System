import { useEffect, useState, useCallback, useMemo } from 'react';
import client from '../api/client';
import { getSocket } from '../api/socket';
import { useAuth } from '../context/AuthContext';
import { playHighAlertSound } from '../utils/audioAlert';

const DEFAULT_DEVICE_ID = 'esp32-node-01';
const MAX_TREND_POINTS = 30;

// Resolve station identifier (deviceId or friendly name) to canonical deviceId
export function resolveDeviceId(stationIdentifier, devicesList = []) {
  if (!stationIdentifier) return DEFAULT_DEVICE_ID;
  if (!devicesList || !devicesList.length) return stationIdentifier;

  // 1. Direct match on deviceId or id
  const exact = devicesList.find(
    (d) =>
      (d.deviceId && d.deviceId.toLowerCase() === stationIdentifier.toLowerCase()) ||
      (d.id && d.id.toLowerCase() === stationIdentifier.toLowerCase())
  );
  if (exact) return exact.deviceId || exact.id;

  // 2. Match on node friendly name (e.g., "AIRGUARD-002")
  const byName = devicesList.find(
    (d) => d.name && d.name.toLowerCase() === stationIdentifier.toLowerCase()
  );
  if (byName) return byName.deviceId || byName.id;

  return stationIdentifier;
}

// Centralized relative time formatter per R12
export function formatTimeAgo(dateString) {
  if (!dateString) return 'Never seen';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 1000));
  if (seconds < 5) return '0s ago';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Safe localStorage JSON reader
function getCachedJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

export function useReadings() {
  const { user, isGuest, preferences, updatePreferences } = useAuth() || {};

  // Account key isolating station preferences per user identity
  const accountKey = useMemo(() => {
    if (!isGuest && user) {
      return (user.id || user._id || user.email || 'user').toString().toLowerCase();
    }
    return 'guest';
  }, [user, isGuest]);

  // Initial station loader with fallback cascade
  const getInitialDevice = useCallback(() => {
    try {
      // 1. Check account-scoped localStorage
      const accountSaved = localStorage.getItem(`airguard_station_pref_${accountKey}`);
      if (accountSaved) return accountSaved;

      // 2. Check user profile preferences from MongoDB Atlas
      if (preferences?.defaultStation) return preferences.defaultStation;
      if (user?.preferences?.defaultStation) return user.preferences.defaultStation;

      // 3. Fallback generic station
      const fallback = localStorage.getItem('airguard_selected_device');
      if (fallback) return fallback;
    } catch (e) {
      console.warn('Storage read error for station preference:', e);
    }
    return DEFAULT_DEVICE_ID;
  }, [accountKey, preferences?.defaultStation, user?.preferences?.defaultStation]);

  const [selectedDevice, setSelectedDeviceRaw] = useState(getInitialDevice);

  // Offline-First: Hydrate all initial state from persistent local storage
  const [devices, setDevices] = useState(() => {
    if (isGuest || !user) return [];
    return getCachedJson(`airguard_devices_cache_${accountKey}`, []);
  });

  const [locations, setLocations] = useState(() => {
    return getCachedJson('airguard_cached_locations', []);
  });

  const [latest, setLatest] = useState(() => {
    return getCachedJson(`airguard_cached_latest_${getInitialDevice()}`, null);
  });

  const [trend, setTrend] = useState(() => {
    return getCachedJson(`airguard_cached_trend_${getInitialDevice()}`, []);
  });

  const [alerts, setAlerts] = useState(() => {
    return getCachedJson(`airguard_cached_alerts_${getInitialDevice()}`, []);
  });

  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));
  const [, setTick] = useState(0);

  // Network connectivity state listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync active device whenever the authenticated user or account changes
  useEffect(() => {
    const saved = getInitialDevice();
    const resolved = resolveDeviceId(saved, devices);
    setSelectedDeviceRaw((curr) => (curr !== resolved ? resolved : curr));
  }, [accountKey, preferences?.defaultStation, user?.preferences?.defaultStation]);

  // When selectedDevice changes, load its cached metrics immediately for zero offline latency
  useEffect(() => {
    if (!selectedDevice) return;
    const cachedLatest = getCachedJson(`airguard_cached_latest_${selectedDevice}`);
    if (cachedLatest) setLatest(cachedLatest);

    const cachedTrend = getCachedJson(`airguard_cached_trend_${selectedDevice}`);
    if (cachedTrend && Array.isArray(cachedTrend)) setTrend(cachedTrend);

    const cachedAlerts = getCachedJson(`airguard_cached_alerts_${selectedDevice}`);
    if (cachedAlerts && Array.isArray(cachedAlerts)) setAlerts(cachedAlerts);
  }, [selectedDevice]);

  // Dynamic setter: saves per account in localStorage AND syncs to MongoDB Atlas
  const setSelectedDevice = useCallback(
    (newId) => {
      if (!newId) return;
      const resolved = resolveDeviceId(newId, devices);
      setSelectedDeviceRaw(resolved);

      try {
        // Save isolated preference for this account
        localStorage.setItem(`airguard_station_pref_${accountKey}`, resolved);
        // Also save generic fallback
        localStorage.setItem('airguard_selected_device', resolved);
      } catch (e) {
        console.warn('Failed to save station preference in localStorage:', e);
      }

      // If logged in and online, sync with user preferences in MongoDB Atlas
      if (!isGuest && user && updatePreferences && navigator.onLine) {
        updatePreferences({ defaultStation: resolved }).catch((err) => {
          console.warn('Failed to sync defaultStation to backend:', err.message);
        });
      }
    },
    [accountKey, devices, isGuest, user, updatePreferences]
  );

  // Live timer tick to update relative timestamps without re-fetching
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) {
        setLoading(true);
      }
      setLoadError(null);

      // If browser is explicitly offline, do not clear state — preserve all cached telemetry!
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOffline(true);
        setConnected(false);
        if (!isSilent) setLoading(false);
        return;
      }

      try {
        const [latestRes, historyRes, alertsRes, devicesRes, locationsRes] = await Promise.allSettled([
          client.get('/readings/latest', { params: { deviceId: selectedDevice } }),
          client.get('/readings/history', { params: { deviceId: selectedDevice, limit: MAX_TREND_POINTS } }),
          client.get('/alerts', { params: { deviceId: selectedDevice } }),
          client.get('/devices'),
          client.get('/locations'),
        ]);

        if (isGuest || !user) {
          setDevices([]);
        } else if (devicesRes.status === 'fulfilled' && Array.isArray(devicesRes.value.data)) {
          const loadedDevs = devicesRes.value.data;
          setDevices(loadedDevs);
          try {
            localStorage.setItem(`airguard_devices_cache_${accountKey}`, JSON.stringify(loadedDevs));
          } catch (e) {}
          setSelectedDeviceRaw((curr) => resolveDeviceId(curr, loadedDevs));
        }

        if (locationsRes.status === 'fulfilled' && Array.isArray(locationsRes.value.data)) {
          setLocations(locationsRes.value.data);
          try {
            localStorage.setItem('airguard_cached_locations', JSON.stringify(locationsRes.value.data));
          } catch (e) {}
        }

        // Offline-First Latest Telemetry: Cache on success, preserve existing on failure
        if (latestRes.status === 'fulfilled' && latestRes.value.data) {
          setLatest(latestRes.value.data);
          try {
            localStorage.setItem(`airguard_cached_latest_${selectedDevice}`, JSON.stringify(latestRes.value.data));
          } catch (e) {}
        } else if (latestRes.status === 'rejected') {
          // Fallback to cache without blanking the screen
          const cached = getCachedJson(`airguard_cached_latest_${selectedDevice}`);
          if (cached) setLatest(cached);
        }

        // Offline-First History & Trends
        if (historyRes.status === 'fulfilled' && historyRes.value.data?.data) {
          const trendPoints = [...historyRes.value.data.data].reverse();
          setTrend(trendPoints);
          try {
            localStorage.setItem(`airguard_cached_trend_${selectedDevice}`, JSON.stringify(trendPoints));
          } catch (e) {}
        } else if (historyRes.status === 'rejected') {
          const cached = getCachedJson(`airguard_cached_trend_${selectedDevice}`);
          if (cached && Array.isArray(cached)) setTrend(cached);
        }

        // Offline-First Alerts Log
        if (alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value.data)) {
          setAlerts(alertsRes.value.data);
          try {
            localStorage.setItem(`airguard_cached_alerts_${selectedDevice}`, JSON.stringify(alertsRes.value.data));
          } catch (e) {}
        } else if (alertsRes.status === 'rejected') {
          const cached = getCachedJson(`airguard_cached_alerts_${selectedDevice}`);
          if (cached && Array.isArray(cached)) setAlerts(cached);
        }
      } catch (err) {
        if (!isSilent) {
          setLoadError('Operating in offline cached mode. Live IoT connection requires internet.');
        }
      } finally {
        if (!isSilent) {
          setLoading(false);
        }
      }
    },
    [selectedDevice, accountKey, isGuest, user]
  );

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Periodic polling for live connected hardware telemetry (every 15 seconds when online)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        loadData(true);
      }
    }, 15000);
    return () => clearInterval(pollInterval);
  }, [loadData]);

  // Remove a device from local cache and active state
  const removeDevice = useCallback(
    (deletedId) => {
      if (!deletedId) return;
      setDevices((prev) => {
        const next = prev.filter((d) => d.deviceId !== deletedId && d.id !== deletedId);
        try {
          localStorage.setItem(`airguard_devices_cache_${accountKey}`, JSON.stringify(next));
          localStorage.setItem('airguard_devices_cache', JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      setSelectedDeviceRaw((curr) => {
        if (curr === deletedId) {
          return '';
        }
        return curr;
      });
    },
    [accountKey]
  );

  // Real-time Socket.IO listener for live telemetry updates
  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setConnected(true);
      setIsOffline(false);
    };
    const onDisconnect = () => {
      setConnected(false);
    };

    const onReading = (reading) => {
      setConnected(true);
      setIsOffline(false);
      if (reading.deviceId === selectedDevice) {
        setLatest(reading);
        try {
          localStorage.setItem(`airguard_cached_latest_${selectedDevice}`, JSON.stringify(reading));
        } catch (e) {}

        setTrend((prev) => {
          const updated = [...prev.slice(-(MAX_TREND_POINTS - 1)), reading];
          try {
            localStorage.setItem(`airguard_cached_trend_${selectedDevice}`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
      setDevices((prev) =>
        prev.map((d) =>
          d.id === reading.deviceId || d.deviceId === reading.deviceId
            ? {
                ...d,
                aqi: reading.airQuality,
                temperature: reading.temperature,
                humidity: reading.humidity,
                gasPPM: reading.gasPPM,
                lastSeen: reading.createdAt,
                status: 'Online',
              }
            : d
        )
      );
    };

    const onDeviceStatus = (statusUpdate) => {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === statusUpdate.deviceId || d.deviceId === statusUpdate.deviceId
            ? { ...d, ...statusUpdate }
            : d
        )
      );
    };

    const onAlert = (alert) => {
      setConnected(true);
      setAlerts((prev) => {
        const updated = [alert, ...prev.filter((a) => a._id !== alert._id)].slice(0, 100);
        try {
          localStorage.setItem(`airguard_cached_alerts_${selectedDevice}`, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      // 1. Synthesize high-decibel emergency audio siren via Web Audio API
      playHighAlertSound();

      // 2. Dispatch native OS desktop notification (W3C Web Notification API)
      try {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification(`🚨 AirGuard: ${alert.category || 'Air Quality Alert'} (AQI ${alert.airQuality})`, {
              body: `${alert.location || alert.deviceId}: ${alert.message || 'Pollution threshold exceeded.'}`,
              icon: '/android-chrome-192x192.png',
              tag: `airguard-alert-${alert._id || alert.deviceId}`,
            });
          } else if (Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
          }
        }
      } catch (e) {}
    };

    const onDeviceDeleted = ({ deviceId: deletedId }) => {
      removeDevice(deletedId);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reading', onReading);
    socket.on('device_status', onDeviceStatus);
    socket.on('alert', onAlert);
    socket.on('device_deleted', onDeviceDeleted);

    setConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reading', onReading);
      socket.off('device_status', onDeviceStatus);
      socket.off('alert', onAlert);
      socket.off('device_deleted', onDeviceDeleted);
    };
  }, [selectedDevice, removeDevice]);

  const acknowledgeAlert = useCallback(async (id) => {
    try {
      if (navigator.onLine) {
        await client.patch(`/alerts/${id}/acknowledge`);
      }
      setAlerts((prev) => {
        const updated = prev.map((a) => (a._id === id ? { ...a, acknowledged: true } : a));
        try {
          localStorage.setItem(`airguard_cached_alerts_${selectedDevice}`, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    } catch (e) {
      console.error('Failed to acknowledge alert:', e.message);
    }
  }, [selectedDevice]);

  const acknowledgeAllAlerts = useCallback(async (deviceId) => {
    try {
      if (navigator.onLine) {
        await client.patch('/alerts/acknowledge-all', { deviceId });
      }
      setAlerts((prev) => {
        const updated = prev.map((a) =>
          !deviceId || deviceId === 'all' || a.deviceId === deviceId ? { ...a, acknowledged: true } : a
        );
        try {
          localStorage.setItem(`airguard_cached_alerts_${selectedDevice}`, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    } catch (e) {
      console.error('Failed to acknowledge all alerts:', e.message);
    }
  }, [selectedDevice]);

  const unreadAlertsCount = useMemo(() => {
    return alerts.filter((a) => !a.acknowledged).length;
  }, [alerts]);

  const activeDevicesCount = useMemo(() => {
    return devices.filter((d) => d.status === 'Online').length;
  }, [devices]);

  return {
    selectedDevice,
    setSelectedDevice,
    devices,
    locations,
    latest,
    trend,
    alerts,
    unreadAlertsCount,
    activeDevicesCount,
    connected,
    loading,
    loadError,
    isOffline,
    acknowledgeAlert,
    acknowledgeAllAlerts,
    removeDevice,
    reload: loadData,
  };
}
