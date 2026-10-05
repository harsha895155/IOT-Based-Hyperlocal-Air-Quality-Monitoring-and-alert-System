const mongoose = require('mongoose');

// Every persisted sensor sample. `airQuality` is the standardized
// field name used across the ESP32 firmware, backend, dashboard, and
// mobile app — never renamed, since all four consume the same schema.
const readingSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    temperature: {
      type: Number,
      required: true,
      min: -40,
      max: 85,
    },
    humidity: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    gasPPM: {
      type: Number,
      required: true,
      min: 0,
    },
    airQuality: {
      type: Number,
      required: true,
      min: 0,
      max: 500,
    },
    category: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index: dashboard's most common query is "latest N readings
// for a device, most recent first."
readingSchema.index({ deviceId: 1, createdAt: -1 });

module.exports = mongoose.model('Reading', readingSchema);
