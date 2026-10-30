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

// DELETE /api/system/users/:id - Delete a user account and cascade clean resources (Admin only)
router.delete('/users/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const targetUserId = req.params.id;

    // Prevent admin from accidentally deleting their own currently logged-in account here
    if (req.user._id.toString() === targetUserId.toString()) {
      return res.status(400).json({ error: 'You cannot delete your own active administrator account from here. Use Profile settings if intended.' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Cascade delete target user's devices, alerts, locations, push subscriptions
    const Alert = require('../models/Alert');
    const SavedLocation = require('../models/SavedLocation');
    const PushSubscription = require('../models/PushSubscription');
    const Reading = require('../models/Reading');

    // 1. Find all devices owned by this user
    const userDevices = await Device.find({ userId: targetUser._id });
    const userDeviceIds = userDevices.map((d) => d.deviceId);

    // 2. Cascade delete readings and alerts for those devices
    if (userDeviceIds.length > 0) {
      await Reading.deleteMany({ deviceId: { $in: userDeviceIds } });
      await Alert.deleteMany({ deviceId: { $in: userDeviceIds } });
      await PushSubscription.deleteMany({ deviceId: { $in: userDeviceIds } });
      await Device.deleteMany({ userId: targetUser._id });
    }

    // 3. Delete user's alerts, saved locations, push subscriptions, and account document
    await Alert.deleteMany({ userId: targetUser._id });
    await SavedLocation.deleteMany({ userId: targetUser._id });
    await PushSubscription.deleteMany({ userId: targetUser._id });
    await User.findByIdAndDelete(targetUser._id);

    // 4. Broadcast real-time deletion
    const io = req.app.get('io');
    if (io) {
      io.emit('user_deleted', { userId: targetUserId, email: targetUser.email });
      for (const devId of userDeviceIds) {
        io.emit('device_deleted', { deviceId: devId });
      }
    }

    res.json({
      success: true,
      message: `User account "${targetUser.name}" (${targetUser.email}) and all associated IoT resources have been permanently deleted.`,
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
