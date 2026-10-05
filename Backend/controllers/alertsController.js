const Alert = require('../models/Alert');

/** GET /api/alerts?deviceId=...&acknowledged=false */
async function getAlerts(req, res, next) {
  try {
    const { deviceId, acknowledged } = req.query;
    const filter = {};
    if (deviceId) filter.deviceId = deviceId;
    if (acknowledged !== undefined) filter.acknowledged = acknowledged === 'true';

    const alerts = await Alert.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(alerts);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/alerts/:id/acknowledge */
async function acknowledgeAlert(req, res, next) {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { acknowledged: true },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: 'Alert not found.' });
    res.json(alert);
  } catch (err) {
    next(err);
  }
}

module.exports = { getAlerts, acknowledgeAlert };
