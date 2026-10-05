const express = require('express');
const router = express.Router();
const Reading = require('../models/Reading');
const Alert = require('../models/Alert');

// GET /api/reports/summary
router.get('/summary', async (req, res, next) => {
  try {
    const { deviceId, range = '24h' } = req.query;

    const msMap = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    const duration = msMap[range] || msMap['24h'];
    const fromDate = new Date(Date.now() - duration);

    const matchStage = { createdAt: { $gte: fromDate } };
    if (deviceId) matchStage.deviceId = deviceId.trim();

    const [stats] = await Reading.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgAQI: { $avg: '$airQuality' },
          minAQI: { $min: '$airQuality' },
          maxAQI: { $max: '$airQuality' },
          goodCount: { $sum: { $cond: [{ $lte: ['$airQuality', 100] }, 1, 0] } },
        },
      },
    ]);

    const alertCount = await Alert.countDocuments(matchStage);

    const totalReadings = stats ? stats.total : 0;
    const complianceRate =
      totalReadings > 0 ? Math.round((stats.goodCount / totalReadings) * 100) : 100;

    res.json({
      range,
      generatedAt: new Date().toISOString(),
      totalReadings,
      averageAQI: stats ? Math.round(stats.avgAQI) : 0,
      minAQI: stats ? Math.round(stats.minAQI) : 0,
      maxAQI: stats ? Math.round(stats.maxAQI) : 0,
      complianceRate, // % of time air quality was Good or Moderate (<= 100)
      totalAlerts: alertCount,
      airQualityStandard: 'National Ambient Air Quality Standards (NAAQS) & EPA AQI Breakpoints',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/csv
router.get('/csv', async (req, res, next) => {
  try {
    const { deviceId, limit = 500 } = req.query;
    const filter = {};
    if (deviceId) filter.deviceId = deviceId.trim();

    const readings = await Reading.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(2000, parseInt(limit, 10)));

    let csv = 'Timestamp,Device ID,AQI,Category,Temperature (°C),Humidity (%),Gas PPM\n';
    for (const r of readings) {
      csv += `"${r.createdAt.toISOString()}","${r.deviceId}",${r.airQuality},"${r.category}",${r.temperature},${r.humidity},${r.gasPPM}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="airguard_audit_report.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
