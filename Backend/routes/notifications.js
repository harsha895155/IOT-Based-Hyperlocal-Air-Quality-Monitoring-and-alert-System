const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  dispatchDailyBriefingForUser,
  dispatchWeeklyAnalyticsForUser,
} = require('../services/schedulerService');

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
