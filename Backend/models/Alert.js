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
  },
  {
    timestamps: true,
  }
);

alertSchema.index({ deviceId: 1, acknowledged: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
