const express = require('express');
const router = express.Router();
const Reading = require('../models/Reading');
const Alert = require('../models/Alert');
const { Device } = require('../models/Device');
const { optionalAuth } = require('../middleware/auth');

// GET /api/reports/summary
router.get('/summary', optionalAuth, async (req, res, next) => {
  try {
    const { deviceId, range = '24h', standard = 'naaqs' } = req.query;

    const msMap = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };
    const duration = msMap[range] || msMap['24h'];
    const fromDate = new Date(Date.now() - duration);

    const matchStage = { createdAt: { $gte: fromDate } };
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

    const [stats] = await Reading.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgAQI: { $avg: '$airQuality' },
          minAQI: { $min: '$airQuality' },
          maxAQI: { $max: '$airQuality' },
          avgTemp: { $avg: '$temperature' },
          avgHumidity: { $avg: '$humidity' },
          avgGasPPM: { $avg: '$gasPPM' },
          maxGasPPM: { $max: '$gasPPM' },
          goodCount: { $sum: { $cond: [{ $lte: ['$airQuality', 50] }, 1, 0] } },
          moderateCount: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$airQuality', 50] }, { $lte: ['$airQuality', 100] }] },
                1,
                0,
              ],
            },
          },
          sensitiveCount: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$airQuality', 100] }, { $lte: ['$airQuality', 150] }] },
                1,
                0,
              ],
            },
          },
          unhealthyCount: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$airQuality', 150] }, { $lte: ['$airQuality', 200] }] },
                1,
                0,
              ],
            },
          },
          veryUnhealthyCount: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$airQuality', 200] }, { $lte: ['$airQuality', 300] }] },
                1,
                0,
              ],
            },
          },
          hazardousCount: { $sum: { $cond: [{ $gt: ['$airQuality', 300] }, 1, 0] } },
        },
      },
    ]);

    const alertCount = await Alert.countDocuments(matchStage);

    // Fetch recent 10 exceedances (AQI > 100)
    const exceedances = await Reading.find({
      ...matchStage,
      airQuality: { $gt: 100 },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('deviceId airQuality gasPPM temperature humidity category createdAt');

    const totalReadings = stats ? stats.total : 0;
    const compliantCount = (stats ? (stats.goodCount + stats.moderateCount) : 0);
    const complianceRate =
      totalReadings > 0 ? Math.round((compliantCount / totalReadings) * 100) : 100;

    const breakdown = {
      good: {
        count: stats ? stats.goodCount : 0,
        pct: totalReadings > 0 ? Math.round((stats.goodCount / totalReadings) * 100) : 0,
      },
      moderate: {
        count: stats ? stats.moderateCount : 0,
        pct: totalReadings > 0 ? Math.round((stats.moderateCount / totalReadings) * 100) : 0,
      },
      sensitive: {
        count: stats ? stats.sensitiveCount : 0,
        pct: totalReadings > 0 ? Math.round((stats.sensitiveCount / totalReadings) * 100) : 0,
      },
      unhealthy: {
        count: stats ? stats.unhealthyCount : 0,
        pct: totalReadings > 0 ? Math.round((stats.unhealthyCount / totalReadings) * 100) : 0,
      },
      veryUnhealthy: {
        count: stats ? stats.veryUnhealthyCount : 0,
        pct: totalReadings > 0 ? Math.round((stats.veryUnhealthyCount / totalReadings) * 100) : 0,
      },
      hazardous: {
        count: stats ? stats.hazardousCount : 0,
        pct: totalReadings > 0 ? Math.round((stats.hazardousCount / totalReadings) * 100) : 0,
      },
    };

    res.json({
      range,
      standard,
      deviceId: deviceId || 'all',
      generatedAt: new Date().toISOString(),
      auditId: `AUD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      totalReadings,
      averageAQI: stats ? Math.round(stats.avgAQI) : 0,
      minAQI: stats ? Math.round(stats.minAQI) : 0,
      maxAQI: stats ? Math.round(stats.maxAQI) : 0,
      avgTemp: stats ? Number(stats.avgTemp.toFixed(1)) : 0,
      avgHumidity: stats ? Number(stats.avgHumidity.toFixed(1)) : 0,
      avgGasPPM: stats ? Number(stats.avgGasPPM.toFixed(1)) : 0,
      maxGasPPM: stats ? Number(stats.maxGasPPM.toFixed(1)) : 0,
      complianceRate,
      compliantReadings: compliantCount,
      nonCompliantReadings: totalReadings - compliantCount,
      totalAlerts: alertCount,
      breakdown,
      exceedances,
      airQualityStandard:
        standard === 'who'
          ? 'WHO Global Air Quality Guidelines (2021)'
          : standard === 'epa'
          ? 'US EPA National Ambient Air Quality Standards (NAAQS)'
          : 'Central Pollution Control Board (CPCB) / NAAQS National Standard',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/csv
router.get('/csv', optionalAuth, async (req, res, next) => {
  try {
    const { deviceId, limit = 1000, range = '24h' } = req.query;
    const filter = {};
    if (deviceId && deviceId !== 'all') {
      const dev = await Device.findOne({ deviceId: deviceId.trim() });
      if (dev && dev.userId) {
        if (!req.user || (req.user.role !== 'admin' && dev.userId.toString() !== req.user._id.toString())) {
          return res.status(403).json({ error: 'Access forbidden. This device belongs to another user.' });
        }
      }
      filter.deviceId = deviceId.trim();
    } else if (req.user && req.user.role !== 'admin') {
      const userDevices = await Device.find({ userId: req.user._id }).select('deviceId');
      filter.deviceId = { $in: userDevices.map((d) => d.deviceId) };
    }

    const msMap = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };
    if (range && msMap[range]) {
      filter.createdAt = { $gte: new Date(Date.now() - msMap[range]) };
    }

    const readings = await Reading.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(5000, parseInt(limit, 10)));

    let csv = 'Timestamp,Device ID,AQI,Category,Temperature (°C),Humidity (%),Gas PPM,Compliance Status\n';
    for (const r of readings) {
      const isCompliant = (r.airQuality || 0) <= 100 ? 'COMPLIANT' : 'EXCEEDED';
      csv += `"${r.createdAt.toISOString()}","${r.deviceId}",${r.airQuality},"${r.category}",${r.temperature},${r.humidity},${r.gasPPM},"${isCompliant}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="airguard_compliance_audit_${range}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/json
router.get('/json', optionalAuth, async (req, res, next) => {
  try {
    const { deviceId, range = '24h' } = req.query;
    const filter = {};
    if (deviceId && deviceId !== 'all') {
      const dev = await Device.findOne({ deviceId: deviceId.trim() });
      if (dev && dev.userId) {
        if (!req.user || (req.user.role !== 'admin' && dev.userId.toString() !== req.user._id.toString())) {
          return res.status(403).json({ error: 'Access forbidden. This device belongs to another user.' });
        }
      }
      filter.deviceId = deviceId.trim();
    } else if (req.user && req.user.role !== 'admin') {
      const userDevices = await Device.find({ userId: req.user._id }).select('deviceId');
      filter.deviceId = { $in: userDevices.map((d) => d.deviceId) };
    }

    const msMap = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };
    if (range && msMap[range]) {
      filter.createdAt = { $gte: new Date(Date.now() - msMap[range]) };
    }

    const readings = await Reading.find(filter)
      .sort({ createdAt: -1 })
      .limit(2000);

    const dossier = {
      manifest: 'AirGuard Environmental Compliance Dossier',
      version: '2.4.0',
      exportDate: new Date().toISOString(),
      scope: { range, deviceId: deviceId || 'all' },
      recordCount: readings.length,
      records: readings.map((r) => ({
        timestamp: r.createdAt,
        deviceId: r.deviceId,
        aqi: r.airQuality,
        category: r.category,
        temperatureC: r.temperature,
        humidityPct: r.humidity,
        gasPPM: r.gasPPM,
        compliant: (r.airQuality || 0) <= 100,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="airguard_dossier_${range}.json"`);
    res.json(dossier);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
