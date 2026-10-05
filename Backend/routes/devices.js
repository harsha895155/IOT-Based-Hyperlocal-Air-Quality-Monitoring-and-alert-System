const express = require('express');
const router = express.Router();
const { Device, OFFLINE_TIMEOUT_MS } = require('../models/Device');
const Reading = require('../models/Reading');

// Default initial devices to seed if DB has none
const INITIAL_NODES = [
  {
    deviceId: 'esp32-node-01',
    name: 'AIRGUARD-001',
    location: 'GIST Campus',
    type: 'ESP32 Sensing Node',
    sensors: ['MQ135', 'DHT22'],
    coordinates: { lat: 14.4426, lng: 79.9865 },
  },
  {
    deviceId: 'esp32-node-02',
    name: 'AIRGUARD-002',
    location: 'Library Block',
    type: 'ESP32 Sensing Node',
    sensors: ['MQ135', 'DHT22'],
    coordinates: { lat: 14.4431, lng: 79.9872 },
  },
  {
    deviceId: 'esp32-node-03',
    name: 'AIRGUARD-003',
    location: 'Research Park West',
    type: 'ESP32 Sensing Node',
    sensors: ['MQ135', 'DHT22'],
    coordinates: { lat: 14.4418, lng: 79.9859 },
  },
];

// GET /api/devices
router.get('/', async (req, res, next) => {
  try {
    let devices = await Device.find().sort({ createdAt: 1 });

    if (devices.length === 0) {
      devices = await Device.insertMany(INITIAL_NODES);
    }

    // Attach latest reading metrics to each device
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
          status: dev.status, // derived from lastSeen vs OFFLINE_TIMEOUT_MS
          offlineTimeoutMs: dev.offlineTimeoutMs || OFFLINE_TIMEOUT_MS,
          lastSeen: dev.lastSeen,
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

// GET /api/devices/:id
router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Device.findOne({ deviceId: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Device not found.' });

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

module.exports = router;
