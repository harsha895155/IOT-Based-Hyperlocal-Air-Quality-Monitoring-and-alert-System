const Reading = require('../models/Reading');
const Alert = require('../models/Alert');
const { Device } = require('../models/Device');
const { classifyAQI, requiresAlert, healthRecommendation } = require('../utils/aqi');

// 30-minute alert deduplication window for continuous conditions
const ALERT_DEDUPLICATION_WINDOW_MS = 30 * 60 * 1000;

/**
 * POST /api/readings
 * Called by the ESP32 (or the simulator). Validates the payload,
 * classifies it, persists it, updates device telemetry in MongoDB,
 * deduplicates alerts, and emits real-time events over Socket.IO.
 */
async function createReading(req, res, next) {
  try {
    const { deviceId, temperature, humidity, gasPPM, airQuality } = req.body;

    // Strict validation of payload types & physiological/sensor ranges
    if (
      typeof deviceId !== 'string' ||
      !deviceId.trim() ||
      [temperature, humidity, gasPPM, airQuality].some((v) => typeof v !== 'number' || Number.isNaN(v))
    ) {
      return res.status(400).json({
        error: 'deviceId (string) and temperature, humidity, gasPPM, airQuality (numbers) are required.',
      });
    }

    if (temperature < -40 || temperature > 85) {
      return res.status(400).json({ error: 'temperature out of range (-40 to 85°C).' });
    }
    if (humidity < 0 || humidity > 100) {
      return res.status(400).json({ error: 'humidity out of range (0 to 100%).' });
    }
    if (gasPPM < 0 || gasPPM > 5000) {
      return res.status(400).json({ error: 'gasPPM out of range (0 to 5000ppm).' });
    }
    if (airQuality < 0 || airQuality > 500) {
      return res.status(400).json({ error: 'airQuality out of range (0 to 500).' });
    }

    const { category } = classifyAQI(airQuality);

    // 1. Persist sensor reading
    const reading = await Reading.create({
      deviceId: deviceId.trim(),
      temperature,
      humidity,
      gasPPM,
      airQuality,
      category,
    });

    // 2. Update/upsert Device registry in MongoDB
    const now = new Date();
    let device = await Device.findOne({ deviceId: deviceId.trim() });
    if (!device) {
      device = await Device.create({
        deviceId: deviceId.trim(),
        name: deviceId.trim() === 'esp32-node-01' ? 'AIRGUARD-001' : deviceId.trim().toUpperCase(),
        location: 'GIST Campus',
        lastSeen: now,
        latestReading: reading._id,
      });
    } else {
      device.lastSeen = now;
      device.latestReading = reading._id;
      await device.save();
    }

    // 3. Alert deduplication & occurrence counting (R7)
    let alert = null;
    if (requiresAlert(airQuality)) {
      const windowStart = new Date(Date.now() - ALERT_DEDUPLICATION_WINDOW_MS);

      // Find an active (unacknowledged) alert for this device & category within the deduplication window
      const existingAlert = await Alert.findOne({
        deviceId: device.deviceId,
        category,
        acknowledged: false,
        createdAt: { $gte: windowStart },
      }).sort({ createdAt: -1 });

      if (existingAlert) {
        existingAlert.seenCount = (existingAlert.seenCount || 1) + 1;
        existingAlert.lastSeen = now;
        existingAlert.airQuality = airQuality;
        existingAlert.reading = reading._id;
        await existingAlert.save();
        alert = existingAlert;
      } else {
        alert = await Alert.create({
          deviceId: device.deviceId,
          location: device.location || 'GIST Campus',
          reading: reading._id,
          airQuality,
          category,
          message: healthRecommendation(airQuality),
          seenCount: 1,
          lastSeen: now,
          acknowledged: false,
        });
      }

      // Real-time push for alert
      const io = req.app.get('io');
      if (io) {
        io.emit('alert', alert);
      }
    }

    // 4. Real-time push for reading & device status
    const io = req.app.get('io');
    if (io) {
      io.emit('reading', reading);
      io.emit('device_status', {
        deviceId: device.deviceId,
        name: device.name,
        location: device.location,
        status: device.status,
        aqi: reading.airQuality,
        temperature: reading.temperature,
        humidity: reading.humidity,
        gasPPM: reading.gasPPM,
        lastSeen: now,
      });
    }

    res.status(201).json({ reading, alert });
  } catch (err) {
    next(err);
  }
}

/** GET /api/readings/latest?deviceId=... */
async function getLatestReading(req, res, next) {
  try {
    const { deviceId } = req.query;
    const filter = deviceId ? { deviceId: deviceId.trim() } : {};

    const reading = await Reading.findOne(filter).sort({ createdAt: -1 });
    if (!reading) return res.status(404).json({ error: 'No readings found.' });

    res.json(reading);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/readings/history?deviceId=...&from=...&to=...&page=1&limit=50
 * Supports pagination and optional date-range filtering.
 */
async function getReadingHistory(req, res, next) {
  try {
    const { deviceId, from, to } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 50));

    const filter = {};
    if (deviceId) filter.deviceId = deviceId.trim();
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const [readings, total] = await Promise.all([
      Reading.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Reading.countDocuments(filter),
    ]);

    res.json({
      data: readings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createReading, getLatestReading, getReadingHistory };
