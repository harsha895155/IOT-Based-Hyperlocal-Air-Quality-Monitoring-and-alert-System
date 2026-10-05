const express = require('express');
const router = express.Router();
const { Device } = require('../models/Device');
const Reading = require('../models/Reading');

// GET /api/locations
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
        temperature: latest ? latest.temperature : null,
        humidity: latest ? latest.humidity : null,
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
