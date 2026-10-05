const mongoose = require('mongoose');
const dns = require('dns');

// Fix querySrv ESERVFAIL on Windows/ISP DNS by forcing Google Public DNS for SRV resolution
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const DEFAULT_MONGO_URI = 'mongodb+srv://minddesk43_db_user:Minddesk%401234@cluster0.8q9noke.mongodb.net/airquality?retryWrites=true&w=majority&appName=Cluster0';

async function connectDB() {
  let uri = process.env.MONGO_URI;

  if (!uri || uri.includes('mh1zjhz')) {
    uri = DEFAULT_MONGO_URI;
  }

  try {
    await mongoose.connect(uri, {
      // Modern mongoose (8.x) no longer needs useNewUrlParser/useUnifiedTopology,
      // they're the default — kept out intentionally to avoid deprecation warnings.
      serverSelectionTimeoutMS: 10000,
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
