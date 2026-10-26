const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const {
  dispatchDailyBriefingForUser,
  dispatchWeeklyAnalyticsForUser,
} = require('../services/schedulerService');
const {
  getVapidPublicKey,
  registerSubscription,
  unregisterSubscription,
  broadcastAlert,
} = require('../services/pushService');

// Middleware to extract optional user from bearer token without blocking unauthenticated mobile visitors
const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
  } catch (e) {
    // Ignore invalid optional tokens
  }
  next();
};

// GET /api/notifications/vapid-key — Returns VAPID public key for Service Worker registration
router.get('/vapid-key', (req, res) => {
  const publicKey = getVapidPublicKey();
  res.json({
    success: true,
    publicKey,
  });
});

// POST /api/notifications/subscribe — Register mobile push subscription for offline/background alerts
router.post('/subscribe', optionalAuth, async (req, res, next) => {
  try {
    const { endpoint, keys, deviceId } = req.body;
    if (!endpoint || !keys) {
      return res.status(400).json({ error: 'Endpoint and crypto keys are required.' });
    }

    const userId = req.user ? req.user._id : null;
    const userAgent = req.headers['user-agent'] || '';

    const sub = await registerSubscription({
      endpoint,
      keys,
      userId,
      deviceId: deviceId || null,
      userAgent,
    });

    res.json({
      success: true,
      message: 'Mobile background push notifications registered successfully.',
      subscriptionId: sub._id,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/unsubscribe — Remove mobile push subscription
router.post('/unsubscribe', async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required to unsubscribe.' });
    }

    await unregisterSubscription(endpoint);
    res.json({
      success: true,
      message: 'Mobile push subscription removed successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/test-danger-alert — Trigger an emergency danger test notification
router.post('/test-danger-alert', optionalAuth, async (req, res, next) => {
  try {
    const { deviceId = 'esp32-node-01', location = 'GIST Campus Station' } = req.body;
    const testAlert = {
      _id: 'test-emergency-' + Date.now(),
      deviceId,
      location,
      airQuality: 265,
      category: 'Hazardous (Emergency Test)',
      message: '🚨 CRITICAL RED DANGER: Severe atmospheric particulate spike detected! Avoid outdoor exposure.',
      severity: 'Extreme',
      createdAt: new Date(),
    };

    const reading = {
      airQuality: 265,
      gasPPM: 680,
      temperature: 34.2,
      humidity: 88,
    };

    const targetUserId = req.user ? req.user._id : null;
    const result = await broadcastAlert(testAlert, reading, targetUserId, deviceId);

    res.json({
      success: true,
      message: `Emergency Danger Push test dispatched to ${result.count || 0} mobile devices.`,
      result,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/dispatch-daily — Send on-demand / test daily briefing to authenticated user's email
router.post('/dispatch-daily', protect, async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || !user.email) {
      return res.status(400).json({ error: 'User does not have a verified email address.' });
    }

    const result = await dispatchDailyBriefingForUser(user);
    if (result.success) {
      res.json({
        success: true,
        message: `Daily Environmental Intelligence Briefing successfully dispatched to ${user.email}. Please check your inbox.`,
        to: user.email,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to dispatch daily briefing email.',
      });
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/dispatch-weekly — Send on-demand / test weekly analytics archive to authenticated user's email
router.post('/dispatch-weekly', protect, async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || !user.email) {
      return res.status(400).json({ error: 'User does not have a verified email address.' });
    }

    const result = await dispatchWeeklyAnalyticsForUser(user);
    if (result.success) {
      res.json({
        success: true,
        message: `Weekly Campus Analytics Auto-Archive successfully dispatched to ${user.email}. Please check your inbox.`,
        to: user.email,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to dispatch weekly analytics email.',
      });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
