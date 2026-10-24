const express = require('express');
const router = express.Router();
const { getWeatherForCoordinates, searchLocations, reverseGeocode } = require('../services/weatherService');
const { Device } = require('../models/Device');

// GET /api/weather?lat=...&lng=...&location=...
router.get('/', async (req, res) => {
  try {
    let lat = req.query.lat ? parseFloat(req.query.lat) : null;
    let lng = req.query.lng ? parseFloat(req.query.lng) : null;
    let locationName = req.query.location || 'Current Location';

    // If no coordinates provided, resolve via device registry or geocode the location name
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
      if (req.query.location && req.query.location !== 'Current Location') {
        // 1. Try matching a registered physical device's coordinates
        const dev = await Device.findOne({
          location: new RegExp('^' + req.query.location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
          'coordinates.lat': { $exists: true },
        });
        if (dev && dev.coordinates?.lat && dev.coordinates?.lng) {
          lat = dev.coordinates.lat;
          lng = dev.coordinates.lng;
        } else {
          // 2. Geocode the location name via meteorological geocoder
          try {
            const searchResults = await searchLocations(req.query.location);
            if (searchResults && searchResults.length > 0 && searchResults[0].latitude) {
              lat = searchResults[0].latitude;
              lng = searchResults[0].longitude;
            }
          } catch (geoErr) {}
        }
      }

      // 3. Fallback to registered device coordinates or sensing hub
      if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
        const anyDev = await Device.findOne({ 'coordinates.lat': { $exists: true } });
        if (anyDev && anyDev.coordinates?.lat && anyDev.coordinates?.lng) {
          lat = anyDev.coordinates.lat;
          lng = anyDev.coordinates.lng;
          if (!req.query.location) locationName = anyDev.location || locationName;
        } else {
          lat = 14.4426;
          lng = 79.9865;
          if (!req.query.location) locationName = 'AirGuard Regional Station';
        }
      }
    }

    const weatherData = await getWeatherForCoordinates(lat, lng, locationName);
    res.json(weatherData);
  } catch (err) {
    res.status(503).json({
      error: 'Weather service temporarily unavailable',
      message: 'AirGuard sensor monitoring is still operational and streaming real-time readings.',
      details: err.message,
    });
  }
});

// GET /api/weather/
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.json([]);
    const results = await searchLocations(q);
    res.json(results);
  } catch (err) {
    res.json([]);
  }
});

// GET /api/weather/reverse?lat=14.4426&lng=79.9865
router.get('/reverse', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid lat and lng query params are required' });
    }
    const result = await reverseGeocode(lat, lng);
    res.json(result || { name: 'Current Location', label: `GPS (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)` });
  } catch (err) {
    res.json({ name: 'Current Location', label: `GPS (${req.query.lat}, ${req.query.lng})` });
  }
});

module.exports = router;
