const express = require('express');
const router = express.Router();
const Reading = require('../models/Reading');
const { Device } = require('../models/Device');
const { optionalAuth } = require('../middleware/auth');

// GET /api/analytics
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { deviceId, from, to } = req.query;

    const matchStage = {};
    if (deviceId && deviceId !== 'all') {
      const dev = await Device.findOne({ deviceId: deviceId.trim() });
      if (dev && dev.userId) {
        if (!req.user || (req.user.role !== 'admin' && dev.userId.toString() !== req.user._id.toString())) {
          return res.status(403).json({ error: 'Access forbidden. This device belongs to another user.' });
        }
      }
      matchStage.deviceId = deviceId.trim();
    } else if (req.user && req.user.role !== 'admin') {
      const userDevices = await Device.find({ userId: req.user._id }).select('deviceId');
      matchStage.deviceId = { $in: userDevices.map((d) => d.deviceId) };
    }

    if (from || to) {
      matchStage.createdAt = {};
      if (from) matchStage.createdAt.$gte = new Date(from);
      if (to) matchStage.createdAt.$lte = new Date(to);
    }

    // 1. Overall statistical aggregations
    const [stats] = await Reading.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          minAQI: { $min: '$airQuality' },
          maxAQI: { $max: '$airQuality' },
          avgAQI: { $avg: '$airQuality' },
          avgTemp: { $avg: '$temperature' },
          avgHumidity: { $avg: '$humidity' },
          avgGasPPM: { $avg: '$gasPPM' },
          totalSamples: { $sum: 1 },
        },
      },
    ]);

    // 2. Category distribution
    const categoryDistribution = await Reading.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // 3. Hourly diurnal aggregation (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const hourlyTrends = await Reading.aggregate([
      {
        $match: {
          ...matchStage,
          createdAt: { $gte: twentyFourHoursAgo },
        },
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
          },
          avgAQI: { $avg: '$airQuality' },
          avgTemp: { $avg: '$temperature' },
          sampleCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.hour': 1 } },
    ]);

    res.json({
      summary: {
        minAQI: stats ? Math.round(stats.minAQI) : 0,
        maxAQI: stats ? Math.round(stats.maxAQI) : 0,
        avgAQI: stats ? Math.round(stats.avgAQI) : 0,
        avgTemp: stats ? Number(stats.avgTemp.toFixed(1)) : 0,
        avgHumidity: stats ? Math.round(stats.avgHumidity) : 0,
        avgGasPPM: stats ? Math.round(stats.avgGasPPM) : 0,
        totalSamples: stats ? stats.totalSamples : 0,
      },
      categoryDistribution: categoryDistribution.map((c) => ({
        category: c._id,
        count: c.count,
      })),
      hourlyTrends: hourlyTrends.map((h) => ({
        hour: h._id.hour,
        avgAQI: Math.round(h.avgAQI),
        avgTemp: Number(h.avgTemp.toFixed(1)),
        sampleCount: h.sampleCount,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
