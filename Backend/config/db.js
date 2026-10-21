const mongoose = require('mongoose');
const dns = require('dns');

// Fix querySrv ESERVFAIL on Windows/ISP DNS by forcing Google Public DNS for SRV resolution
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

async function connectDB() {
  let uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('[DB] MONGO_URI is missing from environment variables (.env). Please configure it.');
    process.exit(1);
  }

  // Auto-correct obsolete Atlas cluster identifier if still configured in cloud dashboard
  if (uri.includes('mh1zjhz')) {
    console.warn('[DB] Outdated Atlas cluster hostname (mh1zjhz) detected in MONGO_URI. Redirecting to active cluster (8q9noke)...');
    uri = uri.replace('mh1zjhz', '8q9noke');
  }

  try {
    await mongoose.connect(uri, {
      // Modern mongoose (8.x) no longer needs useNewUrlParser/useUnifiedTopology,
      // they're the default — kept out intentionally to avoid deprecation warnings.
      serverSelectionTimeoutMS: 20000,
    });
    console.log(`[DB] MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error('[DB] MongoDB connection failed:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] MongoDB disconnected — mongoose will attempt to reconnect automatically.');
  });
}

module.exports = connectDB;
