const express = require('express');
const router = express.Router();
const { Device, OFFLINE_TIMEOUT_MS } = require('../models/Device');
const Reading = require('../models/Reading');
const { protect, optionalAuth } = require('../middleware/auth');

// GET /api/devices — returns ONLY devices owned by the currently authenticated user
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    // If user is not authenticated (e.g. guest), return an empty array.
    // The frontend UI displays: "No devices connected yet. Connect/register your AirGuard device to start monitoring."
    if (!req.user) {
      return res.json([]);
    }

    let filter = {};
    if (req.user.role === 'admin') {
      // Migrate legacy nodes to admin ownership if unassigned
      await Device.updateMany(
        { $or: [{ userId: null }, { userId: { $exists: false } }] },
        { $set: { userId: req.user._id } }
      );
      filter = { userId: req.user._id };
    } else {
      // Standard users can ONLY view their own devices
      filter = { userId: req.user._id };
    }

    const devices = await Device.find(filter).sort({ createdAt: 1 });

    // Attach latest reading metrics to each owned device
    const enriched = await Promise.all(
      devices.map(async (doc) => {
        const dev = doc.toObject({ virtuals: true });
        const latest = await Reading.findOne({ deviceId: dev.deviceId }).sort({ createdAt: -1 });

        return {
          id: dev.deviceId,
          deviceId: dev.deviceId,
          name: dev.name,
          location: dev.location,
          type: dev.type,
          sensors: dev.sensors,
          coordinates: dev.coordinates,
          status: dev.status, // derived dynamically from lastSeen vs OFFLINE_TIMEOUT_MS
          offlineTimeoutMs: dev.offlineTimeoutMs || OFFLINE_TIMEOUT_MS,
          lastSeen: dev.lastSeen,
          userId: dev.userId,
          aqi: latest ? latest.airQuality : null,
          temperature: latest ? latest.temperature : null,
          humidity: latest ? latest.humidity : null,
          gasPPM: latest ? latest.gasPPM : null,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// GET /api/devices/:id — Fetch single device telemetry & specs with strict ownership validation
router.get('/:id', protect, async (req, res, next) => {
  try {
    const devId = req.params.id.trim();
    const doc = await Device.findOne({ deviceId: devId });
    if (!doc) {
      return res.status(404).json({ error: 'Device not found in registry.' });
    }

    // Strict Authorization: User must own the device or be an admin
    const isOwner = doc.userId && doc.userId.toString() === req.user._id.toString();
    const isRootAdmin = !doc.userId && req.user.role === 'admin';
    if (!isOwner && !isRootAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access forbidden. You do not own this device.' });
    }

    const dev = doc.toObject({ virtuals: true });
    const latest = await Reading.findOne({ deviceId: dev.deviceId }).sort({ createdAt: -1 });

    res.json({
      ...dev,
      id: dev.deviceId,
      aqi: latest ? latest.airQuality : null,
      temperature: latest ? latest.temperature : null,
      humidity: latest ? latest.humidity : null,
      gasPPM: latest ? latest.gasPPM : null,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/devices/check-id/:id — Check device uniqueness & ownership availability
router.get('/check-id/:id', protect, async (req, res, next) => {
  try {
    const devId = req.params.id.trim();
    const existing = await Device.findOne({ deviceId: devId });
    if (!existing) {
      return res.json({ available: true, registered: false });
    }
    const isOwner = existing.userId && existing.userId.toString() === req.user._id.toString();
    if (isOwner || req.user.role === 'admin') {
      return res.json({ available: true, registered: true, ownedByYou: true, name: existing.name });
    }
    return res.json({ available: false, registered: true, error: 'Device ID is already registered to another user.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/devices/provision-session — Initialize secure device onboarding session
router.post('/provision-session', protect, async (req, res, next) => {
  try {
    const { deviceId, name, location, locality, city, state, country, type, coordinates, description, hardwareMac } = req.body;
    if (!deviceId || !deviceId.trim()) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const cleanId = deviceId.trim();
    let existing = await Device.findOne({ deviceId: cleanId });

    if (existing && existing.userId && existing.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'This device ID is already registered to another user account.' });
    }

    const fullLocation = [locality, city, state].filter(Boolean).join(', ') || location || 'AirGuard Station';
    const serverHost = req.protocol + '://' + req.get('host');
    const serverEndpoint = `${serverHost}/api/readings`;

    // Crypto session token
    const crypto = require('crypto');
    const sessionToken = 'ag_prov_' + crypto.randomBytes(16).toString('hex');

    if (existing) {
      existing.name = name || existing.name;
      existing.location = fullLocation;
      existing.locality = locality || existing.locality;
      existing.city = city || existing.city;
      existing.state = state || existing.state;
      existing.country = country || existing.country;
      existing.type = type || existing.type;
      existing.userId = req.user._id;
      existing.description = description || existing.description;
      if (hardwareMac) existing.hardwareMac = hardwareMac;
      if (coordinates) existing.coordinates = coordinates;
      existing.provisioningStatus = 'pending';
      await existing.save();
    } else {
      existing = await Device.create({
        deviceId: cleanId,
        userId: req.user._id,
        name: name || cleanId.toUpperCase(),
        location: fullLocation,
        locality: locality || '',
        city: city || '',
        state: state || '',
        country: country || 'India',
        description: description || '',
        type: type || 'ESP32 Sensing Node',
        sensors: ['MQ135', 'DHT22'],
        coordinates: coordinates || { lat: null, lng: null },
        hardwareMac: hardwareMac || '',
        provisioningStatus: 'pending',
      });
    }

    res.json({
      success: true,
      deviceId: cleanId,
      sessionToken,
      serverEndpoint,
      name: existing.name,
      location: existing.location,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/devices/verify/:id — Verify whether device is actively transmitting to backend
router.get('/verify/:id', protect, async (req, res, next) => {
  try {
    const devId = req.params.id.trim();
    const device = await Device.findOne({ deviceId: devId });
    if (!device) {
      return res.status(404).json({ verified: false, error: 'Device not found' });
    }

    // Verify ownership
    const isOwner = device.userId && device.userId.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ verified: false, error: 'Not authorized for this device' });
    }

    // Check latest reading from this hardware
    const latest = await Reading.findOne({ deviceId: devId }).sort({ createdAt: -1 });
    const isConnected = device.status === 'Online' || (latest && (Date.now() - new Date(latest.createdAt).getTime()) < 90000);

    if (latest && device.provisioningStatus !== 'active') {
      device.provisioningStatus = 'active';
      await device.save();
    }

    res.json({
      verified: !!latest,
      connected: !!isConnected,
      lastSeen: device.lastSeen,
      device: {
        id: device.deviceId,
        deviceId: device.deviceId,
        name: device.name,
        location: device.location,
        status: device.status,
      },
      latestReading: latest
        ? {
            temperature: latest.temperature,
            humidity: latest.humidity,
            airQuality: latest.airQuality,
            gasPPM: latest.gasPPM,
            category: latest.category,
            createdAt: latest.createdAt,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/devices — Register/connect a new IoT node bound to the authenticated user
router.post('/', protect, async (req, res, next) => {
  try {
    const { deviceId, name, location, locality, city, state, country, type, sensors, coordinates, description, hardwareMac } = req.body;
    if (!deviceId || !deviceId.trim()) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const cleanId = deviceId.trim();
    let existing = await Device.findOne({ deviceId: cleanId });

    const fullLocation = [locality, city, state].filter(Boolean).join(', ') || location || 'AirGuard Station';

    if (existing) {
      // If the device is already registered by a different user
      if (existing.userId && existing.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'This device ID is already registered to another user account.' });
      }

      existing.name = name || existing.name;
      existing.location = fullLocation;
      if (locality) existing.locality = locality;
      if (city) existing.city = city;
      if (state) existing.state = state;
      if (country) existing.country = country;
      if (description) existing.description = description;
      if (hardwareMac) existing.hardwareMac = hardwareMac;
      existing.type = type || existing.type;
      existing.userId = req.user._id;
      existing.provisioningStatus = 'active';
      if (sensors) existing.sensors = sensors;
      if (coordinates) existing.coordinates = coordinates;
      await existing.save();

      return res.json(existing);
    }

    // Create new device owned by the authenticated user
    const device = await Device.create({
      deviceId: cleanId,
      userId: req.user._id,
      name: name || cleanId.toUpperCase(),
      location: fullLocation,
      locality: locality || '',
      city: city || '',
      state: state || '',
      country: country || 'India',
      description: description || '',
      hardwareMac: hardwareMac || '',
      type: type || 'ESP32 Sensing Node',
      sensors: sensors || ['MQ135', 'DHT22'],
      coordinates: coordinates || { lat: null, lng: null },
      lastSeen: new Date(),
      provisioningStatus: 'active',
    });

    res.status(201).json(device);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/devices/:id — Edit node configuration (Only device owner or admin)
router.patch('/:id', protect, async (req, res, next) => {
  try {
    const devId = req.params.id.trim();
    let device = await Device.findOne({ deviceId: devId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found.' });
    }

    // Ownership check
    const isOwner = device.userId && device.userId.toString() === req.user._id.toString();
    const isRootAdmin = !device.userId && req.user.role === 'admin';
    if (!isOwner && !isRootAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access forbidden. You do not have permission to modify this device.' });
    }

    const { name, location, type, sensors, coordinates, offlineTimeoutMs } = req.body;
    if (name !== undefined) device.name = name.trim();
    if (location !== undefined) device.location = location.trim();
    if (type !== undefined) device.type = type;
    if (sensors !== undefined && Array.isArray(sensors)) device.sensors = sensors;
    if (coordinates !== undefined) device.coordinates = coordinates;
    if (offlineTimeoutMs !== undefined) device.offlineTimeoutMs = offlineTimeoutMs;

    await device.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${device.userId}`).emit('device_status', {
        deviceId: device.deviceId,
        name: device.name,
        location: device.location,
        status: device.status,
      });
    }

    res.json({ success: true, message: 'Device configuration updated.', device });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/devices/:id — Remove node from fleet registry (Only device owner or admin)
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const devId = req.params.id.trim();
    const device = await Device.findOne({ deviceId: devId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found in registry.' });
    }

    // Ownership check
    const isOwner = device.userId && device.userId.toString() === req.user._id.toString();
    const isRootAdmin = !device.userId && req.user.role === 'admin';
    if (!isOwner && !isRootAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access forbidden. You do not have permission to remove this device.' });
    }

    await Device.deleteOne({ _id: device._id });

    const io = req.app.get('io');
    if (io) {
      io.emit('device_deleted', { deviceId: devId });
    }

    res.json({ success: true, message: `Device ${devId} removed from AirGuard fleet registry.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
