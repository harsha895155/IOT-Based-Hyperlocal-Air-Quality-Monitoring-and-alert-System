const mongoose = require('mongoose');

const OFFLINE_TIMEOUT_MS = 60000; // 60 seconds centralized timeout

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      default: 'ESP32 Sensing Node',
    },
    sensors: {
      type: [String],
      default: ['MQ135', 'DHT11'],
    },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    lastSeen: {
      type: Date,
      default: null,
    },
    latestReading: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reading',
      default: null,
    },
    offlineTimeoutMs: {
      type: Number,
      default: OFFLINE_TIMEOUT_MS,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    wifiSSID: {
      type: String,
      default: '',
      trim: true,
    },
    ipAddress: {
      type: String,
      default: '',
      trim: true,
    },
    rssi: {
      type: Number,
      default: null,
    },
    locality: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    state: {
      type: String,
      default: '',
      trim: true,
    },
    country: {
      type: String,
      default: 'India',
      trim: true,
    },
    hardwareMac: {
      type: String,
      default: '',
      trim: true,
    },
    firmwareVersion: {
      type: String,
      default: '2.2.0',
    },
    provisioningStatus: {
      type: String,
      enum: ['pending', 'provisioned', 'active'],
      default: 'active',
    },
    pendingCommands: [
      {
        command: { type: String, required: true },
        params: { type: mongoose.Schema.Types.Mixed, default: {} },
        issuedBy: { type: String, default: 'Admin' },
        issuedAt: { type: Date, default: Date.now },
      },
    ],
    turboMode: {
      type: Boolean,
      default: false,
    },
    calibrationOffsetPPM: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Derived status property per R4 & Section 7 (never trust a manually set boolean)
deviceSchema.virtual('status').get(function () {
  if (!this.lastSeen) return 'Offline';
  const timeout = this.offlineTimeoutMs || OFFLINE_TIMEOUT_MS;
  const elapsed = Date.now() - new Date(this.lastSeen).getTime();
  if (elapsed < timeout) return 'Online';
  if (elapsed < timeout * 5) return 'Standby';
  return 'Offline';
});

module.exports = {
  Device: mongoose.model('Device', deviceSchema),
  OFFLINE_TIMEOUT_MS,
};
