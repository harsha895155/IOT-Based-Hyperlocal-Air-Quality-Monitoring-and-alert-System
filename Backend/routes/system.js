const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const { Device } = require('../models/Device');
const Reading = require('../models/Reading');

// GET /api/system/health - Protected system health check for registered users only
router.get('/health', protect, async (req, res, next) => {
  try {
    const dbState = mongoose.connection.readyState;
    const stateLabels = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

    const io = req.app.get('io');
    const totalDevices = await Device.countDocuments();
    const totalReadings = await Reading.countDocuments();
    const latestReading = await Reading.findOne().sort({ createdAt: -1 });

    const mem = process.memoryUsage();

    res.json({
      status: dbState === 1 ? 'operational' : 'degraded',
      authenticatedUser: {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role,
      },
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      database: {
        status: stateLabels[dbState] || 'unknown',
        connected: dbState === 1,
        host: mongoose.connection.host || 'MongoDB Atlas',
        name: mongoose.connection.name || 'airquality',
      },
      socketIO: {
        active: true,
        connectedClients: io?.engine ? io.engine.clientsCount : 0,
      },
      telemetry: {
        totalRegisteredDevices: totalDevices,
        totalHistoricalReadings: totalReadings,
        lastDataSync: latestReading ? latestReading.createdAt : null,
      },
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsageMB: Math.round(mem.rss / 1024 / 1024),
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
