require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const readingsRoutes = require('./routes/readings');
const alertsRoutes = require('./routes/alerts');
const authRoutes = require('./routes/auth');
const devicesRoutes = require('./routes/devices');
const locationsRoutes = require('./routes/locations');
const analyticsRoutes = require('./routes/analytics');
const reportsRoutes = require('./routes/reports');
const systemRoutes = require('./routes/system');
const weatherRoutes = require('./routes/weather');
const supportRoutes = require('./routes/support');
const notificationsRoutes = require('./routes/notifications');
const { initScheduler } = require('./services/schedulerService');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
});
app.set('io', io); // controllers reach this via req.app.get('io')

// ---- Security middleware ----
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// General API rate limit (per-route limiters in routes/ are stricter
// where it matters — auth, ingestion).
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 1000 : 5000,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ---- W3C Scope Extensions Origin Association ----
app.get('/.well-known/web-app-origin-association', (_req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json({
    web_apps: [
      {
        manifest: 'https://airguard-hyperlocal.vercel.app/site.webmanifest',
        details: {
          paths: ['/*'],
        },
      },
    ],
  });
});

// ---- Detailed Health check (R4, R11, R13, Section 13) ----
app.get('/api/health', (_req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState; // 1 = connected
  const stateLabels = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  res.json({
    status: dbState === 1 ? 'ok' : 'degraded',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: stateLabels[dbState] || 'unknown',
      host: mongoose.connection.host || 'cluster0',
      connected: dbState === 1,
    },
    socketIO: {
      connectedClients: io.engine ? io.engine.clientsCount : 0,
      active: true,
    },
    system: {
      memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      nodeVersion: process.version,
    },
  });
});

// ---- Routes ----
app.use('/api/readings', readingsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/notifications', notificationsRoutes);

// ---- Socket.IO: dashboard/mobile clients join to receive live pushes ----
const jwt = require('jsonwebtoken');

io.on('connection', (socket) => {
  // Support client authentication to scope device telemetry per user
  socket.on('authenticate', (token) => {
    try {
      if (!token) return;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'airguard_default_secret_key_2026');
      if (decoded?.id) {
        socket.userId = decoded.id;
        socket.join(`user_${decoded.id}`);
        if (decoded.role === 'admin') {
          socket.join('admin_room');
        }
      }
    } catch (e) {}
  });

  socket.on('subscribe_device', (deviceId) => {
    if (deviceId) {
      socket.join(`device_${String(deviceId).trim()}`);
    }
  });

  socket.on('disconnect', () => {});
});

// ---- 404 + error handling (must be last) ----
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Device status watchdog: proactively detects and broadcasts offline transitions
function initDeviceWatchdog(ioInstance) {
  const { Device, OFFLINE_TIMEOUT_MS } = require('./models/Device');
  const deviceStateMap = new Map();

  setInterval(async () => {
    try {
      const devices = await Device.find({}, 'deviceId name location lastSeen offlineTimeoutMs userId').lean();
      const now = Date.now();

      for (const dev of devices) {
        const timeout = dev.offlineTimeoutMs || OFFLINE_TIMEOUT_MS;
        const elapsed = dev.lastSeen ? now - new Date(dev.lastSeen).getTime() : Infinity;
        const isOnline = elapsed < timeout;
        const currentStatus = isOnline ? 'Online' : 'Offline';

        const prevStatus = deviceStateMap.get(dev.deviceId);

        if (prevStatus !== undefined && prevStatus !== currentStatus) {
          deviceStateMap.set(dev.deviceId, currentStatus);
          const payload = {
            deviceId: dev.deviceId,
            name: dev.name,
            location: dev.location,
            status: currentStatus,
            lastSeen: dev.lastSeen,
          };
          ioInstance.emit('device_status', payload);
          if (dev.userId) {
            ioInstance.to(`user_${dev.userId}`).emit('device_status', payload);
          }
          ioInstance.to(`device_${dev.deviceId}`).emit('device_status', payload);
          console.log(`[Watchdog] Sensing Node ${dev.deviceId} status changed: ${prevStatus} -> ${currentStatus}`);
        } else if (prevStatus === undefined) {
          deviceStateMap.set(dev.deviceId, currentStatus);
        }
      }
    } catch (err) {
      // Ignore background transient database errors
    }
  }, 10000);
}

async function start() {
  server.listen(PORT, () => {
    console.log(`[Server] Listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
  await connectDB();
  initScheduler();
  initDeviceWatchdog(io);
}

start();

module.exports = { app, server, io };
