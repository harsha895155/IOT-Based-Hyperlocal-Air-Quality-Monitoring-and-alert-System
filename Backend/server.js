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
app.use(express.json({ limit: '100kb' })); // sensor payloads are tiny; cap defensively

// General API rate limit (per-route limiters in routes/ are stricter
// where it matters — auth, ingestion).
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

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

// ---- Socket.IO: dashboard/mobile clients join to receive live pushes ----
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ---- 404 + error handling (must be last) ----
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`[Server] Listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

start();

module.exports = { app, server, io };
