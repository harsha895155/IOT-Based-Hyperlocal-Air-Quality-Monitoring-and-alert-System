const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { createReading, getLatestReading, getReadingHistory } = require('../controllers/readingsController');
const { requireApiKey } = require('../middleware/apiKey');
const { optionalAuth } = require('../middleware/auth');

// Ingestion rate limit
const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', ingestLimiter, requireApiKey, createReading);
router.get('/latest', optionalAuth, getLatestReading);
router.get('/history', optionalAuth, getReadingHistory);

module.exports = router;
