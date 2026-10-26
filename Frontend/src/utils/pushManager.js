import client from '../api/client';

/**
 * Convert VAPID base64 public key into Uint8Array for PushManager
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks if browser/mobile supports Web Push API & Service Worker
 */
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Check current push subscription status
 */
export async function getPushSubscriptionStatus() {
  if (!isPushSupported()) return { supported: false, subscribed: false, permission: 'unsupported' };
  try {
    const permission = Notification.permission;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return {
      supported: true,
      subscribed: !!subscription,
      permission,
      subscription,
    };
  } catch (e) {
    return { supported: true, subscribed: false, permission: Notification.permission, error: e.message };
  }
}

/**
 * Request permission and subscribe mobile device to real-time background emergency alerts
 */
export async function subscribeToEmergencyPush(deviceId = null) {
  if (!isPushSupported()) {
    throw new Error('Web Push is not supported on this browser/environment.');
  }

  // 1. Request OS permission for notifications
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted in system settings.');
  }

  // 2. Obtain active service worker registration
  const registration = await navigator.serviceWorker.ready;

  // 3. Fetch public VAPID key from backend
  const { data } = await client.get('/notifications/vapid-key');
  if (!data?.publicKey) {
    throw new Error('Backend did not supply a valid VAPID public key.');
  }

  const convertedVapidKey = urlBase64ToUint8Array(data.publicKey);

  // 4. Register with browser push service (Firebase Cloud Messaging / Apple Push / Mozilla)
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });
  }

  // 5. Send registration payload to backend
  const subJSON = subscription.toJSON();
  await client.post('/notifications/subscribe', {
    endpoint: subJSON.endpoint,
    keys: subJSON.keys,
    deviceId: deviceId || localStorage.getItem('airguard_selected_device') || 'esp32-node-01',
  });

  localStorage.setItem('airguard_push_active', 'true');
  return subscription;
}

/**
 * Unsubscribe mobile device from real-time background emergency alerts
 */
export async function unsubscribeFromEmergencyPush() {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await client.post('/notifications/unsubscribe', { endpoint }).catch(() => {});
    }
    localStorage.removeItem('airguard_push_active');
    return true;
  } catch (e) {
    console.warn('Unsubscribe push warning:', e.message);
    return false;
  }
}

/**
 * Trigger immediate test emergency danger alert push
 */
export async function sendTestDangerPush(deviceId = null) {
  const { data } = await client.post('/notifications/test-danger-alert', {
    deviceId: deviceId || localStorage.getItem('airguard_selected_device') || 'esp32-node-01',
    location: 'Mobile Alert Node',
  });
  return data;
}
