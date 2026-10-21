const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    location: {
      type: String,
      default: 'GIST Campus',
    },
    reading: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reading',
      required: true,
    },
    airQuality: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    seenCount: {
      type: Number,
      default: 1,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    acknowledged: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Standard CAP (Common Alerting Protocol - ITU-T X.1303) fields
    protocol: {
      type: String,
      default: 'CAP-v1.2',
    },
    severity: {
      type: String,
      enum: ['Notice', 'Warning', 'Severe', 'Extreme'],
      default: 'Warning',
    },
    urgency: {
      type: String,
      default: 'Immediate',
    },
    certainty: {
      type: String,
      default: 'Observed',
    },
    event: {
      type: String,
      default: 'Air Quality Exceedance',
    },
    headline: {
      type: String,
      default: '',
    },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    channelsDelivered: {
      type: [String],
      default: ['websocket'], // 'websocket', 'email', 'webhook', 'push'
    },
  },
  {
    timestamps: true,
  }
);

alertSchema.index({ deviceId: 1, acknowledged: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
