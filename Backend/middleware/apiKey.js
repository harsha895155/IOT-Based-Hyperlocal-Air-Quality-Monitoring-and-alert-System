// Sensing nodes (ESP32) can't reasonably hold a rotating JWT, so
// ingestion uses a separate, simpler shared-secret scheme: the
// x-api-key header must match API_KEY in the backend's .env, which
// must also match DEVICE_API_KEY in the firmware's config.h.
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];

  if (!key || key !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing device API key.' });
  }

  next();
}

module.exports = { requireApiKey };
