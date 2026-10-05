const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { createReading, getLatestReading, getReadingHistory } = require('../controllers/readingsController');
const { requireApiKey } = require('../middleware/apiKey');
// Ingestion is rate-limited separately from the general API limiter
// (server.js) because a misbehaving or looping device is the most
// likely source of a flood on this specific route.
const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // generous for a 15s sample interval, catches runaway loops
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', ingestLimiter, requireApiKey, createReading);
router.get('/latest', getLatestReading);
router.get('/history', getReadingHistory);

module.exports = router;
