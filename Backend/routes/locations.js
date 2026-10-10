const express = require('express');
const router = express.Router();
const SavedLocation = require('../models/SavedLocation');
const { protect } = require('../middleware/auth');
const { Device } = require('../models/Device');
const Reading = require('../models/Reading');

// GET /api/locations/saved — Get logged-in user's saved/favorite weather locations
router.get('/saved', protect, async (req, res, next) => {
  try {
    const saved = await SavedLocation.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(saved);
  } catch (err) {
    next(err);
  }
});

// POST /api/locations/saved — Save a weather search location for the logged-in user
router.post('/saved', protect, async (req, res, next) => {
  try {
    const { name, label, admin1, country, latitude, longitude } = req.body;
    if (!name || latitude == null || longitude == null) {
      return res.status(400).json({ error: 'name, latitude, and longitude are required.' });
    }

    // Prevent duplicate entries
    const existing = await SavedLocation.findOne({
      userId: req.user._id,
      name: name.trim(),
    });

    if (existing) {
      return res.json(existing);
    }

    const created = await SavedLocation.create({
      userId: req.user._id,
      name: name.trim(),
      label: label || name.trim(),
      admin1: admin1 || '',
      country: country || '',
      latitude: Number(latitude),
      longitude: Number(longitude),
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/locations/saved/:id — Remove a saved weather location
router.delete('/saved/:id', protect, async (req, res, next) => {
  try {
    const deleted = await SavedLocation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!deleted) {
      return res.status(404).json({ error: 'Saved location not found.' });
    }
    res.json({ success: true, message: 'Saved location removed.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/locations — Legacy zones endpoint
router.get('/', async (req, res, next) => {
  try {
    const devices = await Device.find();
    const locationMap = {};

    for (const dev of devices) {
      const loc = dev.location || 'Unknown';
      if (!locationMap[loc]) {
        locationMap[loc] = {
          location: loc,
          devices: [],
          deviceCount: 0,
          onlineCount: 0,
          totalAQI: 0,
          aqiSamples: 0,
        };
      }

      const latest = await Reading.findOne({ deviceId: dev.deviceId }).sort({ createdAt: -1 });
      const devObj = dev.toObject({ virtuals: true });
      const isOnline = devObj.status === 'Online';

      locationMap[loc].deviceCount += 1;
      if (isOnline) locationMap[loc].onlineCount += 1;

      if (latest && typeof latest.airQuality === 'number') {
        locationMap[loc].totalAQI += latest.airQuality;
        locationMap[loc].aqiSamples += 1;
      }

      locationMap[loc].devices.push({
        id: dev.deviceId,
        name: dev.name,
        type: dev.type,
        status: devObj.status,
        lastSeen: dev.lastSeen,
        aqi: latest ? latest.airQuality : null,
      });
    }

    const result = Object.values(locationMap).map((loc) => ({
      location: loc.location,
      deviceCount: loc.deviceCount,
      onlineCount: loc.onlineCount,
      averageAQI: loc.aqiSamples > 0 ? Math.round(loc.totalAQI / loc.aqiSamples) : null,
      devices: loc.devices,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
