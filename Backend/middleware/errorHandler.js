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

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Your session has expired or is invalid. Please log in again.' });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || (status === 500 ? 'Internal server error.' : 'Request failed.'),
  });
}

module.exports = { notFound, errorHandler };
