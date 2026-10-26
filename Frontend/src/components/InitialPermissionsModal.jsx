import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  isPushSupported,
  subscribeToEmergencyPush,
  getPushSubscriptionStatus,
} from '../utils/pushManager';
import { playSoundProfile, stopCurrentSound } from '../utils/audioAlert';
import client from '../api/client';
import './InitialPermissionsModal.css';

export default function InitialPermissionsModal() {
  const { user, isGuest, preferences, updatePreferences } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // 1. Notification state
  const [notificationState, setNotificationState] = useState(() => {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission; // 'default' | 'granted' | 'denied'
  });
  const [pushSubscribed, setPushSubscribed] = useState(() => {
    return localStorage.getItem('airguard_push_active') === 'true';
  });

  // 2. Geolocation state
  const [geoState, setGeoState] = useState('idle'); // 'idle' | 'locating' | 'granted' | 'denied'
  const [coordsInfo, setCoordsInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('airguard_last_gps_location');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 3. SMS & Emergency Phone state
  const [phoneNumber, setPhoneNumber] = useState(() => {
    return (
      user?.phone ||
      preferences?.emergencyPhone ||
      localStorage.getItem('airguard_emergency_phone') ||
      ''
    );
  });
  const [smsAlertsEnabled, setSmsAlertsEnabled] = useState(() => {
    return preferences?.smsAlerts !== false;
  });

  // 4. Storage Persistence state
  const [storagePersisted, setStoragePersisted] = useState(false);

  // 5. Audio Siren state
  const [audioArmed, setAudioArmed] = useState(() => {
    return localStorage.getItem('airguard_audio_armed') === 'true';
  });

  // Check on mount: Is this first launch or has user requested wizard?
  useEffect(() => {
    const hasOnboarded = localStorage.getItem('airguard_permissions_onboarded');
    if (!hasOnboarded) {
      setIsOpen(true);
    }

    const handleOpenWizard = () => {
      setIsOpen(true);
    };

    window.addEventListener('airguard:open-permissions-wizard', handleOpenWizard);
    return () => {
      window.removeEventListener('airguard:open-permissions-wizard', handleOpenWizard);
    };
  }, []);

  // Check storage persistence capability on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then((persisted) => {
        setStoragePersisted(persisted);
      }).catch(() => {});
    }

    if (isPushSupported()) {
      getPushSubscriptionStatus().then((res) => {
        if (res.permission) setNotificationState(res.permission);
        if (res.subscribed) setPushSubscribed(true);
      });
    }

    if (coordsInfo?.lat && coordsInfo?.lng) {
      setGeoState('granted');
    }
  }, [coordsInfo]);

  // Keep phone number synchronized if user profile loads
  useEffect(() => {
    if (user?.phone && !phoneNumber) {
      setPhoneNumber(user.phone);
    }
  }, [user]);

  // ─── Individual Handlers ───

  // 1. Request Push Notifications
  const handleEnablePush = async () => {
    if (!isPushSupported()) {
      setActionNotice({ type: 'warning', text: 'Web Push is not supported in this browser window.' });
      return false;
    }
    try {
      setActionNotice({ type: 'info', text: 'Prompting system for notification permission...' });
      const sub = await subscribeToEmergencyPush();
      setNotificationState('granted');
      setPushSubscribed(true);
      localStorage.setItem('airguard_push_active', 'true');
      if (!isGuest && updatePreferences) {
        await updatePreferences({ pushAlerts: true }).catch(() => {});
      }
      setActionNotice({
        type: 'success',
        text: '🔔 Emergency mobile push alerts active! Danger strobe will notify you in real-time.',
      });
      return true;
    } catch (err) {
      setNotificationState(typeof Notification !== 'undefined' ? Notification.permission : 'denied');
      setActionNotice({
        type: 'error',
        text: `Notification access: ${err.message || 'Please grant permission in device settings.'}`,
      });
      return false;
    }
  };

  // 2. Request GPS Location
  const handleAcquireLocation = async () => {
    if (!navigator.geolocation) {
      setActionNotice({ type: 'warning', text: 'Geolocation is not available on this device.' });
      return false;
    }
    setGeoState('locating');
    setActionNotice({ type: 'info', text: 'Acquiring high-accuracy campus coordinates via GPS...' });

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          let label = `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`;

          // Attempt reverse geocoding via OpenStreetMap Nominatim
          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              { headers: { 'User-Agent': 'AirGuard-IoT-Environment/1.0' } }
            );
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData?.display_name) {
                const parts = geoData.display_name.split(',');
                label = parts.slice(0, 3).join(',').trim();
              }
            }
          } catch (e) {}

          const locObj = {
            name: 'Local Campus Coordinates',
            placeName: label,
            label,
            lat: latitude,
            lng: longitude,
            accuracy: Math.round(accuracy || 0),
            timestamp: Date.now(),
          };

          localStorage.setItem('airguard_last_gps_location', JSON.stringify(locObj));
          localStorage.setItem('airguard_user_location', JSON.stringify(locObj));
          setCoordsInfo(locObj);
          setGeoState('granted');

          if (!isGuest && updatePreferences) {
            await updatePreferences({
              lastKnownLat: latitude,
              lastKnownLng: longitude,
              lastKnownLocation: label,
            }).catch(() => {});
          }

          setActionNotice({
            type: 'success',
            text: `📍 Hyperlocal coordinates locked! Nearest node connected: ${label}`,
          });
          resolve(true);
        },
        (err) => {
          setGeoState('denied');
          setActionNotice({
            type: 'warning',
            text: `GPS Access: ${err.message}. You can manually set your default station anytime.`,
          });
          resolve(false);
        },
        { timeout: 12000, enableHighAccuracy: true }
      );
    });
  };

  // 3. Request Storage Persistence
  const handleRequestPersistentStorage = async () => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persist();
        setStoragePersisted(isPersisted);
        if (isPersisted) {
          setActionNotice({
            type: 'success',
            text: '💾 Persistent cache authorized! Offline telemetry and logs will never be evicted.',
          });
          return true;
        } else {
          setActionNotice({
            type: 'info',
            text: 'Storage persistence is managed dynamically by your mobile OS.',
          });
          return true;
        }
      } catch (e) {
        return false;
      }
    }
    return false;
  };

  // 4. Arm Web Audio Siren
  const handleArmAudio = () => {
    try {
      // Play a gentle activation chime to un-mute and arm the Web Audio engine
      playSoundProfile('double_chime', true, 0.4);
      setTimeout(() => stopCurrentSound(), 1400);
      setAudioArmed(true);
      localStorage.setItem('airguard_audio_armed', 'true');
      localStorage.setItem('airguard_audio_alerts', 'true');
      setActionNotice({
        type: 'success',
        text: '🔊 Audio siren engine armed! High-frequency emergency alarms will sound when triggered.',
      });
      return true;
    } catch (e) {
      setActionNotice({ type: 'warning', text: 'Could not initialize audio engine.' });
      return false;
    }
  };

  // 5. Automated "Grant All & Fast Launch" Flow
  const handleGrantAll = async () => {
    setIsProcessingAll(true);
    setActionNotice({ type: 'info', text: 'Configuring all system requirements...' });

    // Step A: Storage Persistence
    await handleRequestPersistentStorage();

    // Step B: Push Notifications
    await handleEnablePush();

    // Step C: Geolocation
    await handleAcquireLocation();

    // Step D: Audio Siren
    handleArmAudio();

    // Step E: Save SMS / Phone
    if (phoneNumber.trim()) {
      localStorage.setItem('airguard_emergency_phone', phoneNumber.trim());
      if (!isGuest && updatePreferences) {
        await updatePreferences({
          phone: phoneNumber.trim(),
          emergencyPhone: phoneNumber.trim(),
          smsAlerts: smsAlertsEnabled,
        }).catch(() => {});
      }
    }

    setIsProcessingAll(false);
    setActionNotice({
      type: 'success',
      text: '✨ All essential requirements configured successfully! Launching AirGuard...',
    });

    setTimeout(() => {
      finishSetup();
    }, 1200);
  };

  // Finalize and Close
  const finishSetup = async () => {
    localStorage.setItem('airguard_permissions_onboarded', 'true');
    localStorage.setItem('airguard_onboarding_date', new Date().toISOString());

    if (phoneNumber.trim()) {
      localStorage.setItem('airguard_emergency_phone', phoneNumber.trim());
      if (!isGuest && updatePreferences) {
        await updatePreferences({
          phone: phoneNumber.trim(),
          emergencyPhone: phoneNumber.trim(),
          smsAlerts: smsAlertsEnabled,
        }).catch(() => {});
      }
    }

    setIsOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem('airguard_permissions_onboarded', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="permissions-onboard-backdrop" role="dialog" aria-modal="true" aria-labelledby="perm-title">
      <div className="permissions-onboard-card">
        {/* Top Glowing Header */}
        <div className="permissions-header">
          <div className="permissions-logo-badge">
            <span className="permissions-radar-ring" />
            <span className="permissions-logo-icon">🛡️</span>
          </div>
          <div className="permissions-title-wrap">
            <span className="permissions-tag">FIRST-TIME SETUP & REQUIREMENTS</span>
            <h2 id="perm-title" className="permissions-title">
              Configure Real-Time Alerts & Sensors
            </h2>
            <p className="permissions-subtitle">
              To deliver <strong>hyperlocal safety warnings, emergency siren strobes</strong>, and <strong>offline cellular broadcasts</strong>, AirGuard requires the following hardware access.
            </p>
          </div>
        </div>

        {/* Action Status Toast Banner */}
        {actionNotice && (
          <div className={`permissions-notice-banner notice-${actionNotice.type}`} role="alert">
            <span className="notice-icon">
              {actionNotice.type === 'success' ? '✅' : actionNotice.type === 'error' ? '⚠️' : 'ℹ️'}
            </span>
            <span className="notice-text">{actionNotice.text}</span>
          </div>
        )}

        {/* Requirements Grid / List */}
        <div className="permissions-list">
          {/* 1. Push Notifications & Danger Strobe */}
          <div className={`permission-item-card ${notificationState === 'granted' && pushSubscribed ? 'is-granted' : ''}`}>
            <div className="perm-card-icon-col">
              <div className="perm-icon-bubble notif-bubble">🔔</div>
            </div>
            <div className="perm-card-content">
              <div className="perm-card-title-row">
                <h4 className="perm-item-title">Real-Time Mobile Push & Danger Strobe</h4>
                <span className={`perm-status-badge ${notificationState === 'granted' ? 'badge-success' : 'badge-pending'}`}>
                  {notificationState === 'granted' && pushSubscribed ? 'Active ✓' : notificationState === 'denied' ? 'Blocked' : 'Required'}
                </span>
              </div>
              <p className="perm-item-desc">
                Dispatches high-priority system alerts and activates the full-screen danger strobe when hazardous AQI or toxic gas spikes occur — even when your phone is locked.
              </p>
            </div>
            <div className="perm-card-action">
              <button
                type="button"
                className={`perm-action-btn ${notificationState === 'granted' && pushSubscribed ? 'btn-granted' : 'btn-primary'}`}
                onClick={handleEnablePush}
                disabled={notificationState === 'granted' && pushSubscribed}
              >
                {notificationState === 'granted' && pushSubscribed ? 'Enabled ✓' : 'Allow Alerts'}
              </button>
            </div>
          </div>

          {/* 2. Hyperlocal GPS Location */}
          <div className={`permission-item-card ${geoState === 'granted' ? 'is-granted' : ''}`}>
            <div className="perm-card-icon-col">
              <div className="perm-icon-bubble gps-bubble">📍</div>
            </div>
            <div className="perm-card-content">
              <div className="perm-card-title-row">
                <h4 className="perm-item-title">Hyperlocal GPS & Nearest Sensor Station</h4>
                <span className={`perm-status-badge ${geoState === 'granted' ? 'badge-success' : 'badge-pending'}`}>
                  {geoState === 'granted' ? 'Locked ✓' : geoState === 'locating' ? 'Locating...' : 'Recommended'}
                </span>
              </div>
              <p className="perm-item-desc">
                Pinpoints your physical location to connect to the nearest IoT sensor station (Campus Labs, Main Gates, Industrial Blocks) and detect proximity hazards.
              </p>
              {coordsInfo?.label && (
                <div className="perm-coords-tag">
                  <span className="dot-pulse" />
                  <span>{coordsInfo.label}</span>
                </div>
              )}
            </div>
            <div className="perm-card-action">
              <button
                type="button"
                className={`perm-action-btn ${geoState === 'granted' ? 'btn-granted' : 'btn-primary'}`}
                onClick={handleAcquireLocation}
                disabled={geoState === 'locating'}
              >
                {geoState === 'locating' ? 'Scanning...' : geoState === 'granted' ? 'Updated ✓' : 'Detect GPS'}
              </button>
            </div>
          </div>

          {/* 3. SMS & Emergency Cellular Fallback */}
          <div className="permission-item-card sms-card">
            <div className="perm-card-icon-col">
              <div className="perm-icon-bubble sms-bubble">📱</div>
            </div>
            <div className="perm-card-content">
              <div className="perm-card-title-row">
                <h4 className="perm-item-title">SMS & Emergency Cellular Broadcast</h4>
                <span className={`perm-status-badge ${phoneNumber.trim().length >= 8 ? 'badge-success' : 'badge-info'}`}>
                  {phoneNumber.trim().length >= 8 ? 'Configured ✓' : 'Cellular Alert'}
                </span>
              </div>
              <p className="perm-item-desc">
                When campus Wi-Fi or mobile packet data goes offline during extreme chemical or fire hazards, alerts are broadcasted directly via cellular SMS.
              </p>
              <div className="perm-input-group">
                <input
                  type="tel"
                  className="perm-phone-input"
                  placeholder="+91 98765 43210 (Mobile Number)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <label className="perm-sms-toggle-label">
                  <input
                    type="checkbox"
                    checked={smsAlertsEnabled}
                    onChange={(e) => setSmsAlertsEnabled(e.target.checked)}
                  />
                  <span>Opt-in for emergency SMS fallback</span>
                </label>
              </div>
            </div>
          </div>

          {/* 4. Emergency Siren & Web Audio Engine */}
          <div className={`permission-item-card ${audioArmed ? 'is-granted' : ''}`}>
            <div className="perm-card-icon-col">
              <div className="perm-icon-bubble audio-bubble">🔊</div>
            </div>
            <div className="perm-card-content">
              <div className="perm-card-title-row">
                <h4 className="perm-item-title">Emergency Siren Audio Engine</h4>
                <span className={`perm-status-badge ${audioArmed ? 'badge-success' : 'badge-pending'}`}>
                  {audioArmed ? 'Armed ✓' : 'Ready to Arm'}
                </span>
              </div>
              <p className="perm-item-desc">
                Initializes the browser Web Audio synthesizer with an authorized user gesture so piercing hazard evacuation sirens can sound instantly when triggered.
              </p>
            </div>
            <div className="perm-card-action">
              <button
                type="button"
                className={`perm-action-btn ${audioArmed ? 'btn-granted' : 'btn-secondary'}`}
                onClick={handleArmAudio}
              >
                {audioArmed ? 'Test Siren 🔊' : 'Arm Audio Engine'}
              </button>
            </div>
          </div>

          {/* 5. Persistent Storage & Offline Telemetry Cache */}
          <div className={`permission-item-card ${storagePersisted ? 'is-granted' : ''}`}>
            <div className="perm-card-icon-col">
              <div className="perm-icon-bubble storage-bubble">💾</div>
            </div>
            <div className="perm-card-content">
              <div className="perm-card-title-row">
                <h4 className="perm-item-title">Offline Telemetry & Storage Persistence</h4>
                <span className={`perm-status-badge ${storagePersisted ? 'badge-success' : 'badge-info'}`}>
                  {storagePersisted ? 'Persistent Quota ✓' : 'Offline Cache Ready'}
                </span>
              </div>
              <p className="perm-item-desc">
                Guarantees sensor telemetry logs, calibration tables, and station maps remain cached on your device and are never evicted by Android/iOS storage cleaners.
              </p>
            </div>
            <div className="perm-card-action">
              <button
                type="button"
                className={`perm-action-btn ${storagePersisted ? 'btn-granted' : 'btn-secondary'}`}
                onClick={handleRequestPersistentStorage}
                disabled={storagePersisted}
              >
                {storagePersisted ? 'Guaranteed ✓' : 'Persist Storage'}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="permissions-footer">
          <button
            type="button"
            className="perm-skip-btn"
            onClick={handleSkip}
          >
            Skip for Now
          </button>

          <div className="perm-footer-right">
            <button
              type="button"
              className="perm-grant-all-btn"
              onClick={handleGrantAll}
              disabled={isProcessingAll}
            >
              {isProcessingAll ? (
                <>
                  <span className="spinner-inline" />
                  Configuring Device...
                </>
              ) : (
                '⚡ Grant All & Fast Launch'
              )}
            </button>

            <button
              type="button"
              className="perm-finish-btn"
              onClick={finishSetup}
            >
              Save & Enter Dashboard →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
