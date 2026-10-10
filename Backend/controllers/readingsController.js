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

    // 4. Real-time push for reading & device status (Scoped to user room & device room)
    const io = req.app.get('io');
    if (io) {
      const statusPayload = {
        deviceId: device.deviceId,
        name: device.name,
        location: device.location,
        status: device.status,
        aqi: reading.airQuality,
        temperature: reading.temperature,
        humidity: reading.humidity,
        gasPPM: reading.gasPPM,
        lastSeen: now,
      };

      if (device.userId) {
        io.to(`user_${device.userId}`).emit('reading', reading);
        io.to(`device_${device.deviceId}`).emit('reading', reading);
        io.to(`user_${device.userId}`).emit('device_status', statusPayload);
        io.to(`device_${device.deviceId}`).emit('device_status', statusPayload);
      } else {
        io.emit('reading', reading);
        io.emit('device_status', statusPayload);
      }
      io.to('admin_room').emit('reading', reading);
      io.to('admin_room').emit('device_status', statusPayload);
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
    let filter = {};
    if (deviceId) {
      const dev = await Device.findOne({ deviceId: deviceId.trim() });
      if (dev && dev.userId) {
        if (!req.user || (req.user.role !== 'admin' && dev.userId.toString() !== req.user._id.toString())) {
          return res.status(403).json({ error: 'Access forbidden. This device belongs to another user.' });
        }
      }
      filter = { deviceId: deviceId.trim() };
    } else if (req.user && req.user.role !== 'admin') {
      const userDevices = await Device.find({ userId: req.user._id }).select('deviceId');
      if (userDevices.length === 0) {
        return res.status(404).json({ error: 'No devices registered for this user.' });
      }
      filter = { deviceId: { $in: userDevices.map((d) => d.deviceId) } };
    }

    const reading = await Reading.findOne(filter).sort({ createdAt: -1 });
    if (!reading) return res.status(404).json({ error: 'No readings found.' });

    res.json(reading);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/readings/history?deviceId=...&from=...&to=...&page=1&limit=50
 * Supports pagination and optional date-range filtering with user device ownership enforcement.
 */
async function getReadingHistory(req, res, next) {
  try {
    const { deviceId, from, to, category, minAQI, maxAQI, sort = 'desc' } = req.query;

    if (deviceId && deviceId !== 'all') {
      const dev = await Device.findOne({ deviceId: deviceId.trim() });
      if (dev && dev.userId) {
        if (!req.user || (req.user.role !== 'admin' && dev.userId.toString() !== req.user._id.toString())) {
          return res.status(403).json({ error: 'Access forbidden. This device belongs to another user.' });
        }
      }
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = {};
    if (deviceId && deviceId !== 'all') {
      filter.deviceId = deviceId.trim();
    } else if (req.user && req.user.role !== 'admin') {
      const userDevices = await Device.find({ userId: req.user._id }).select('deviceId');
      filter.deviceId = { $in: userDevices.map((d) => d.deviceId) };
    }
    if (category && category !== 'all') filter.category = category.trim();

    if (minAQI !== undefined || maxAQI !== undefined) {
      filter.airQuality = {};
      if (minAQI !== undefined && !Number.isNaN(Number(minAQI))) {
        filter.airQuality.$gte = Number(minAQI);
      }
      if (maxAQI !== undefined && !Number.isNaN(Number(maxAQI))) {
        filter.airQuality.$lte = Number(maxAQI);
      }
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const sortOrder = sort === 'asc' ? 1 : -1;

    const [readings, total] = await Promise.all([
      Reading.find(filter)
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit),
      Reading.countDocuments(filter),
    ]);

    // Fast quick stats for the active filter
    let stats = null;
    if (total > 0) {
      const [agg] = await Reading.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            avgAQI: { $avg: '$airQuality' },
            maxAQI: { $max: '$airQuality' },
            minAQI: { $min: '$airQuality' },
            avgTemp: { $avg: '$temperature' },
            avgHumidity: { $avg: '$humidity' },
            avgGasPPM: { $avg: '$gasPPM' },
          },
        },
      ]);
      if (agg) {
        stats = {
          avgAQI: Math.round(agg.avgAQI || 0),
          maxAQI: Math.round(agg.maxAQI || 0),
          minAQI: Math.round(agg.minAQI || 0),
          avgTemp: Number((agg.avgTemp || 0).toFixed(1)),
          avgHumidity: Number((agg.avgHumidity || 0).toFixed(1)),
          avgGasPPM: Number((agg.avgGasPPM || 0).toFixed(1)),
        };
      }
    }

    res.json({
      data: readings,
      stats: stats || { avgAQI: 0, maxAQI: 0, minAQI: 0, avgTemp: 0, avgHumidity: 0, avgGasPPM: 0 },
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
