const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const User = require('../models/User');

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BIiHNzzcySzPPp1pInAW0BCuQ90qdwEUGcSo8B2geAGd9XHslHbPF9dS41jjuts0sGRkpHyCBshryVAzOQjI7JU';
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'BnhVRt60xmFNzWaVDcbFbZSqrmVOwB5lviHs7D_NgOQ';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:airguard396@gmail.com';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('📡 [PushService] Web Push VAPID configuration initialized successfully.');
} catch (err) {
  console.warn('⚠️ [PushService] Web Push initialization warning:', err.message);
}

function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}

/**
 * Register or update a Web Push subscription
 */
async function registerSubscription({ endpoint, keys, userId = null, deviceId = null, userAgent = '' }) {
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    throw new Error('Invalid Web Push subscription payload.');
  }

  return await PushSubscription.findOneAndUpdate(
    { endpoint },
    {
      endpoint,
      keys,
      userId: userId || null,
      deviceId: deviceId || null,
      userAgent: userAgent || '',
      updatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

/**
 * Unregister a Web Push subscription
 */
async function unregisterSubscription(endpoint) {
  if (!endpoint) return null;
  return await PushSubscription.findOneAndDelete({ endpoint });
}

/**
 * Deliver push payload to a single subscription
 */
async function sendToSubscription(subscriptionDoc, payload) {
  const pushSubscription = {
    endpoint: subscriptionDoc.endpoint,
    keys: {
      p256dh: subscriptionDoc.keys.p256dh,
      auth: subscriptionDoc.keys.auth,
    },
  };

  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

  try {
    await webpush.sendNotification(pushSubscription, payloadString, {
      TTL: 60 * 60, // 1 hour time-to-live
      urgency: payload.isDanger ? 'high' : 'normal',
    });
    await PushSubscription.findByIdAndUpdate(subscriptionDoc._id, { lastDeliveredAt: new Date() });
    return true;
  } catch (err) {
    // 404 or 410 status code indicates subscription is expired or cancelled by browser
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.log(`[PushService] Pruning expired subscription: ${subscriptionDoc.endpoint.slice(0, 30)}...`);
      await PushSubscription.findByIdAndDelete(subscriptionDoc._id).catch(() => {});
    } else {
      console.warn('[PushService] Web Push delivery error:', err.statusCode || err.message);
    }
    return false;
  }
}

/**
 * Broadcast critical environmental danger alert to all registered mobile devices
 */
async function broadcastAlert(alert, reading = null, targetUserId = null, targetDeviceId = null) {
  try {
    if (targetUserId) {
      const owner = await User.findById(targetUserId).select('preferences');
      if (owner && owner.preferences) {
        if (owner.preferences.pushAlerts === false) {
          return { success: true, count: 0, reason: 'Push alerts disabled in user preferences.' };
        }
        const aqi = alert.airQuality || 0;
        if (aqi >= 100 && aqi < 150 && owner.preferences.highAqiAlert === false) {
          return { success: true, count: 0, reason: 'High AQI alerts disabled in user preferences.' };
        }
        if (aqi >= 150 && aqi < 200 && owner.preferences.unhealthyAlert === false) {
          return { success: true, count: 0, reason: 'Unhealthy AQI alerts disabled in user preferences.' };
        }
        if (aqi >= 200 && owner.preferences.hazardousAlert === false) {
          return { success: true, count: 0, reason: 'Hazardous AQI alerts disabled in user preferences.' };
        }
      }
    }

    const isDanger =
      alert.severity === 'Severe' ||
      alert.severity === 'Extreme' ||
      alert.airQuality >= 150 ||
      (reading && (reading.airQuality >= 150 || (reading.gasPPM && reading.gasPPM > 500)));

    const payload = {
      title: isDanger
        ? `🚨 DANGER ALERT: ${alert.category || 'Hazardous Air Quality'}!`
        : `⚠️ Air Quality Notice: ${alert.category || 'Air Quality Warning'}`,
      body: `AQI ${alert.airQuality} at ${alert.location || targetDeviceId || 'Campus Station'}. ${
        alert.message || 'Immediate precautions required.'
      }`,
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-96x96.png',
      isDanger: isDanger,
      severity: alert.severity || (isDanger ? 'Severe' : 'Warning'),
      airQuality: alert.airQuality,
      deviceId: alert.deviceId || targetDeviceId,
      location: alert.location || 'GIST Campus',
      alertId: alert._id,
      timestamp: Date.now(),
      url: `/dashboard?danger=true&alertId=${alert._id || ''}`,
      tag: `airguard-danger-${alert.deviceId || 'node'}`,
    };

    // Find all subscriptions matching device, user, or global subscribers
    const query = {
      $or: [
        { deviceId: alert.deviceId },
        ...(targetUserId ? [{ userId: targetUserId }] : []),
        { deviceId: null }, // Global subscriber wanting campus-wide alerts
      ],
    };

    const subscriptions = await PushSubscription.find(query);
    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, count: 0, reason: 'No active mobile push subscriptions found.' };
    }

    const deliveryPromises = subscriptions.map((sub) => sendToSubscription(sub, payload));
    const results = await Promise.allSettled(deliveryPromises);
    const deliveredCount = results.filter((r) => r.status === 'fulfilled' && r.value === true).length;

    console.log(
      `📲 [PushService] Dispatched mobile push danger alert to ${deliveredCount}/${subscriptions.length} devices.`
    );
    return { success: true, count: deliveredCount, total: subscriptions.length };
  } catch (err) {
    console.error('❌ [PushService] Alert broadcast failed:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  getVapidPublicKey,
  registerSubscription,
  unregisterSubscription,
  sendToSubscription,
  broadcastAlert,
};
