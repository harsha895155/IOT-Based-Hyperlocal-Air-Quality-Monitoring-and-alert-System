const Reading = require('../models/Reading');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { Device } = require('../models/Device');
const { classifyAQI, requiresAlert, healthRecommendation, calculateAQIFromSensors } = require('../utils/aqi');
const { sendAirQualityAlertEmail } = require('../services/emailService');
const { getWeatherForCoordinates } = require('../services/weatherService');
const { broadcastAlert } = require('../services/pushService');

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
    const { deviceId, temperature, humidity, gasPPM, airQuality, wifiSSID, ip, rssi } = req.body;
    const incomingWifi = wifiSSID || req.body.wifiSsid || req.body.ssid || req.body.wifi_ssid || req.body.wifi;
    const incomingIp = ip || req.body.ipAddress || req.body.ip_address;
    const incomingRssi = rssi != null ? rssi : (req.body.signal != null ? req.body.signal : null);

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

    // 1. Verify device exists in fleet registry, or auto-provision on first ping
    const cleanId = deviceId.trim();
    let device = await Device.findOne({ deviceId: cleanId });
    const now = new Date();

    if (!device) {
      // Auto-provision newly flashed / connected hardware as unclaimed until onboarded by a user
      device = await Device.create({
        deviceId: cleanId,
        userId: null,
        name: `AirGuard Node (${cleanId})`,
        location: 'Gangavaram, Andhra Pradesh',
        type: 'AirGuard ESP32 Sensing Node',
        wifiSSID: incomingWifi ? String(incomingWifi).trim() : '',
        ipAddress: incomingIp ? String(incomingIp).trim() : '',
        rssi: incomingRssi != null ? Number(incomingRssi) : null,
        lastSeen: now,
      });
      req.app.get('io')?.emit('device_created', { device: device.toObject({ virtuals: true }) });
    } else {
      if (incomingWifi && String(incomingWifi).trim()) {
        device.wifiSSID = String(incomingWifi).trim();
      }
      if (incomingIp) device.ipAddress = String(incomingIp).trim();
      if (incomingRssi != null) device.rssi = Number(incomingRssi);
    }

    // 1. Temperature & Humidity: Prioritize physical hardware sensor readings
    // If the board's DHT communicated (or values differ from the static fallback 26.0 / 50.0),
    // we preserve the physical hardware temperature & humidity 100% without modification!
    const isPhysicalDHTReading = req.body.dhtHardwareValid === true ||
      (Number(temperature) !== 26.0 || Number(humidity) !== 50.0);

    let finalTemp = Number(temperature);
    let finalHumidity = Number(humidity);

    if (!isPhysicalDHTReading) {
      // ONLY if physical sensor is disconnected/failed, use location's real-time weather
      try {
        const coords = (device.coordinates && device.coordinates.lat != null)
          ? device.coordinates
          : { lat: 14.489, lng: 79.957 };
        const weather = await getWeatherForCoordinates(coords.lat, coords.lng, device.location);
        if (weather && weather.temperature != null && weather.humidity != null) {
          finalTemp = weather.temperature;
          finalHumidity = weather.humidity;
        }
      } catch (wErr) {}
    }

    // 2. Accurately compute EPA/CPCB AQI from real sensor gasPPM, temperature, and humidity
    let finalAQI = Number(airQuality);
    if (!finalAQI || finalAQI < 10) {
      finalAQI = calculateAQIFromSensors(gasPPM, finalTemp, finalHumidity);
    }

    const { category } = classifyAQI(finalAQI);

    // 3. Persist sensor reading
    const reading = await Reading.create({
      deviceId: cleanId,
      temperature: finalTemp,
      humidity: finalHumidity,
      gasPPM,
      airQuality: finalAQI,
      category,
    });

    // 3. Update device telemetry
    device.lastSeen = now;
    device.latestReading = reading._id;
    await device.save();
    req.app.get('io')?.emit('device_updated', { device: device.toObject({ virtuals: true }) });

    // 3. Alert deduplication & multi-channel dispatching with CAP-v1.2 Protocols (R7)
    let alert = null;
    if (requiresAlert(airQuality)) {
      const windowStart = new Date(Date.now() - ALERT_DEDUPLICATION_WINDOW_MS);

      // Map severity per ITU-T X.1303 CAP protocol
      const severity = airQuality > 300 ? 'Extreme' : airQuality > 200 ? 'Severe' : airQuality > 100 ? 'Warning' : 'Notice';
      const headline = `${category} Air Quality (AQI ${airQuality}) at ${device.name || device.location}`;

      // Find an active (unacknowledged) alert for this device & category within the deduplication window
      const existingAlert = await Alert.findOne({
        deviceId: device.deviceId,
        category,
        acknowledged: false,
        createdAt: { $gte: windowStart },
      }).sort({ createdAt: -1 });

      let isNewAlert = false;

      if (existingAlert) {
        existingAlert.seenCount = (existingAlert.seenCount || 1) + 1;
        existingAlert.lastSeen = now;
        existingAlert.airQuality = airQuality;
        existingAlert.reading = reading._id;
        existingAlert.severity = severity;
        existingAlert.headline = headline;
        await existingAlert.save();
        alert = existingAlert;
      } else {
        isNewAlert = true;
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
          severity,
          headline,
          urgency: 'Immediate',
          certainty: 'Observed',
          protocol: 'CAP-v1.2',
          coordinates: {
            lat: device.coordinates?.lat || null,
            lng: device.coordinates?.lng || null,
          },
          channelsDelivered: ['websocket'],
        });
      }

      // Real-time push for alert (WebSocket Protocol with Scoped Rooms)
      const io = req.app.get('io');
      if (io) {
        io.emit('alert', alert);
        if (device.userId) {
          io.to(`user_${device.userId}`).emit('alert', alert);
        }
        io.to(`device_${device.deviceId}`).emit('alert', alert);
      }

      // Web Push Protocol: Real-time background delivery to installed mobile devices even when closed
      if (isNewAlert || severity === 'Severe' || severity === 'Extreme' || airQuality >= 150) {
        broadcastAlert(alert, reading, device.userId, device.deviceId)
          .then((pRes) => {
            if (pRes && pRes.count > 0) {
              Alert.findByIdAndUpdate(alert._id, { $addToSet: { channelsDelivered: 'push' } }).catch(() => {});
            }
          })
          .catch((pErr) => console.warn('[Alert Engine] Push dispatch notice:', pErr.message));
      }

      // Multi-channel dispatch (SMTP Email Protocol) on new exceedance or severe spike
      if (isNewAlert && device.userId) {
        User.findById(device.userId)
          .select('email name preferences')
          .then((owner) => {
            if (owner && owner.email && owner.preferences?.emailAlerts !== false) {
              const aqi = airQuality;
              if (aqi >= 100 && aqi < 150 && owner.preferences?.highAqiAlert === false) return;
              if (aqi >= 150 && aqi < 200 && owner.preferences?.unhealthyAlert === false) return;
              if (aqi >= 200 && owner.preferences?.hazardousAlert === false) return;

              const userThreshold = owner.preferences?.aqiWarnThreshold || 100;
              if (airQuality >= userThreshold) {
                sendAirQualityAlertEmail({
                  to: owner.email,
                  name: owner.name,
                  deviceName: device.name,
                  location: device.location,
                  aqi: airQuality,
                  category,
                  gasPPM: reading.gasPPM,
                  temperature: reading.temperature,
                  humidity: reading.humidity,
                  message: alert.message,
                  severity,
                })
                  .then(() => {
                    Alert.findByIdAndUpdate(alert._id, { $addToSet: { channelsDelivered: 'email' } }).catch(() => { });
                  })
                  .catch((mailErr) => {
                    console.error('[Alert Engine] Async email dispatch notice:', mailErr.message);
                  });
              }
            }
          })
          .catch((uErr) => console.warn('[Alert Engine] User lookup notice:', uErr.message));
      }

      // Webhook dispatch if configured in environment (REST Protocol)
      if (isNewAlert && process.env.ALERT_WEBHOOK_URL) {
        fetch(process.env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'AIR_QUALITY_ALERT',
            protocol: 'CAP-v1.2',
            timestamp: now.toISOString(),
            alert,
          }),
        })
          .then(() => {
            Alert.findByIdAndUpdate(alert._id, { $addToSet: { channelsDelivered: 'webhook' } }).catch(() => { });
          })
          .catch(() => { });
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
      }
      io.emit('reading', reading);
      io.emit('device_status', statusPayload);
      io.to('admin_room').emit('reading', reading);
      io.to('admin_room').emit('device_status', statusPayload);
      io.to('admin_room').emit('admin_telemetry_packet', {
        packetId: reading._id,
        deviceId: device.deviceId,
        deviceName: device.name,
        location: device.location,
        aqi: reading.airQuality,
        temperature: reading.temperature,
        humidity: reading.humidity,
        gasPPM: reading.gasPPM,
        wifiSSID: device.wifiSSID,
        ipAddress: device.ipAddress,
        rssi: device.rssi,
        timestamp: reading.createdAt || new Date(),
        rawPayload: req.body,
      });
    }

    let pendingCommands = [];
    if (device.pendingCommands && device.pendingCommands.length > 0) {
      pendingCommands = [...device.pendingCommands];
      device.pendingCommands = [];
      await device.save();
    }

    res.status(201).json({
      reading,
      alert,
      pendingCommands,
      turboMode: device.turboMode || false,
    });
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

    const readingDoc = await Reading.findOne(filter).sort({ createdAt: -1 });
    if (!readingDoc) return res.status(404).json({ error: 'No readings found.' });

    let reading = readingDoc.toObject();

    // Guard against static fallback (26°C / 50%): always substitute live location weather
    if (Math.round(reading.temperature) === 26 && Math.round(reading.humidity) === 50) {
      try {
        const dev = await Device.findOne({ deviceId: reading.deviceId });
        if (dev) {
          const coords = dev.coordinates && dev.coordinates.lat != null ? dev.coordinates : { lat: 14.489, lng: 79.957 };
          const weather = await getWeatherForCoordinates(coords.lat, coords.lng, dev.location);
          if (weather && weather.temperature != null && weather.humidity != null) {
            reading.temperature = weather.temperature;
            reading.humidity = weather.humidity;
          }
        }
      } catch (wErr) {}
    }

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
