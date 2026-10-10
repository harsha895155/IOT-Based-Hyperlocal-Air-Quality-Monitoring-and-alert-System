const Alert = require('../models/Alert');
const { Device } = require('../models/Device');

/** GET /api/alerts?deviceId=...&acknowledged=false */
async function getAlerts(req, res, next) {
  try {
    const { deviceId, acknowledged } = req.query;
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
      // Filter alerts for user's owned devices
      const myDevs = await Device.find({ userId: req.user._id }).select('deviceId');
      filter.deviceId = { $in: myDevs.map((d) => d.deviceId) };
    }

    if (acknowledged !== undefined) {
      filter.acknowledged = acknowledged === 'true';
    }

    const alerts = await Alert.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(alerts);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/alerts/:id/acknowledge */
async function acknowledgeAlert(req, res, next) {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found.' });

    // Validate ownership if alert is tied to a device
    if (alert.deviceId && req.user && req.user.role !== 'admin') {
      const dev = await Device.findOne({ deviceId: alert.deviceId });
      if (dev && dev.userId && dev.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access forbidden.' });
      }
    }

    alert.acknowledged = true;
    await alert.save();
    res.json(alert);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/alerts/acknowledge-all */
async function acknowledgeAll(req, res, next) {
  try {
    const { deviceId } = req.body || {};
    const filter = { acknowledged: { $ne: true } };

    if (deviceId && deviceId !== 'all') {
      if (req.user && req.user.role !== 'admin') {
        const dev = await Device.findOne({ deviceId: deviceId.trim() });
        if (dev && dev.userId && dev.userId.toString() !== req.user._id.toString()) {
          return res.status(403).json({ error: 'Access forbidden.' });
        }
      }
      filter.deviceId = deviceId;
    } else if (req.user && req.user.role !== 'admin') {
      const myDevs = await Device.find({ userId: req.user._id }).select('deviceId');
      filter.deviceId = { $in: myDevs.map((d) => d.deviceId) };
    }

    const result = await Alert.updateMany(filter, { $set: { acknowledged: true } });
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAlerts, acknowledgeAlert, acknowledgeAll };
