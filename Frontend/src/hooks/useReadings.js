import { useEffect, useState, useCallback, useMemo } from 'react';
import client from '../api/client';
import { getSocket } from '../api/socket';

const DEFAULT_DEVICE_ID = 'esp32-node-01';
const MAX_TREND_POINTS = 30;

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

export function useReadings() {
  const [selectedDevice, setSelectedDevice] = useState(DEFAULT_DEVICE_ID);
  const [devices, setDevices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [latest, setLatest] = useState(null);
  const [trend, setTrend] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [, setTick] = useState(0);

  // Live timer tick to update relative timestamps without re-fetching
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [latestRes, historyRes, alertsRes, devicesRes, locationsRes] = await Promise.allSettled([
        client.get('/readings/latest', { params: { deviceId: selectedDevice } }),
        client.get('/readings/history', { params: { deviceId: selectedDevice, limit: MAX_TREND_POINTS } }),
        client.get('/alerts', { params: { deviceId: selectedDevice } }),
        client.get('/devices'),
        client.get('/locations'),
      ]);

      if (devicesRes.status === 'fulfilled' && Array.isArray(devicesRes.value.data)) {
        setDevices(devicesRes.value.data);
      }

      if (locationsRes.status === 'fulfilled' && Array.isArray(locationsRes.value.data)) {
        setLocations(locationsRes.value.data);
      }

      if (latestRes.status === 'fulfilled' && latestRes.value.data) {
        setLatest(latestRes.value.data);
      } else {
        setLatest(null);
      }

      if (historyRes.status === 'fulfilled' && historyRes.value.data?.data) {
        setTrend([...historyRes.value.data.data].reverse());
      } else {
        setTrend([]);
      }

      if (alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value.data)) {
        setAlerts(alertsRes.value.data);
      } else {
        setAlerts([]);
      }
    } catch (err) {
      setLoadError('Failed to fetch telemetry from backend.');
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time Socket.IO listener for live telemetry updates (R4, R5, R7)
  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onReading = (reading) => {
      setConnected(true);
      if (reading.deviceId === selectedDevice) {
        setLatest(reading);
        setTrend((prev) => [...prev.slice(-(MAX_TREND_POINTS - 1)), reading]);
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
      setAlerts((prev) => [alert, ...prev.filter((a) => a._id !== alert._id)].slice(0, 100));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reading', onReading);
    socket.on('device_status', onDeviceStatus);
    socket.on('alert', onAlert);

    setConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reading', onReading);
      socket.off('device_status', onDeviceStatus);
      socket.off('alert', onAlert);
    };
  }, [selectedDevice]);

  const acknowledgeAlert = useCallback(async (id) => {
    try {
      await client.patch(`/alerts/${id}/acknowledge`);
      setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, acknowledged: true } : a)));
    } catch (e) {
      console.error('Failed to acknowledge alert:', e.message);
    }
  }, []);

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
    acknowledgeAlert,
    reload: loadData,
  };
}
