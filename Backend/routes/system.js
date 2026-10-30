const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect, adminOnly } = require('../middleware/auth');
const { Device } = require('../models/Device');
const Reading = require('../models/Reading');
const User = require('../models/User');

// GET /api/system/users - Protected list of all registered accounts (Admin only)
router.get('/users', protect, adminOnly, async (req, res, next) => {
  try {
    const users = await User.find({})
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 });

    const allDevices = await Device.find({}).select('deviceId name userId status location wifiSSID lastSeen');

    const enrichedUsers = users.map((u) => {
      const userObj = u.toObject();
      const userDevs = allDevices.filter(
        (d) => d.userId && d.userId.toString() === u._id.toString()
      );
      return {
        ...userObj,
        devicesCount: userDevs.length,
        devices: userDevs.map((d) => ({
          deviceId: d.deviceId,
          name: d.name,
          status: d.status,
          location: d.location,
          wifiSSID: d.wifiSSID,
          lastSeen: d.lastSeen,
        })),
      };
    });

    res.json({
      success: true,
      count: enrichedUsers.length,
      users: enrichedUsers,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/system/health - Protected system health check for administrators only
router.get('/health', protect, adminOnly, async (req, res, next) => {
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
