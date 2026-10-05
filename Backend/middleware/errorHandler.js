function notFound(req, res, _next) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Express recognizes this as an error handler purely by its 4-argument
// signature — do not remove any of the four parameters even if unused.
function errorHandler(err, req, res, _next) {
  console.error('[Error]', err.stack || err.message);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed.', details: err.message });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Internal server error.' : err.message,
  });
}

module.exports = { notFound, errorHandler };
