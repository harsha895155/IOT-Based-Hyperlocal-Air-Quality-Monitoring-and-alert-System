const mongoose = require('mongoose');
const dns = require('dns');

// Fix querySrv ESERVFAIL on Windows/ISP DNS by forcing Google Public DNS for SRV resolution
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

async function connectDB(retries = 5, delayMs = 3000) {
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

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 25000,
      });
      console.log(`[DB] MongoDB connected: ${mongoose.connection.host}`);
      break;
    } catch (err) {
      console.error(`[DB] MongoDB connection attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt < retries) {
        console.log(`[DB] Retrying connection in ${delayMs / 1000}s...`);
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        console.warn('[DB] Continuing with degraded database status — auto-reconnect active.');
      }
    }
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] MongoDB disconnected — mongoose will attempt to reconnect automatically.');
  });
}

module.exports = connectDB;
