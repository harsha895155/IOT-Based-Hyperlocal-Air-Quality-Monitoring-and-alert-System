const mongoose = require('mongoose');

const systemAuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    adminName: {
      type: String,
      default: 'Administrator',
    },
    adminEmail: {
      type: String,
      default: '',
    },
    targetType: {
      type: String,
      enum: ['DEVICE', 'USER', 'SYSTEM', 'BROADCAST', 'FLEET'],
      default: 'SYSTEM',
    },
    targetId: {
      type: String,
      default: '',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'DISPATCHED', 'PENDING'],
      default: 'SUCCESS',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemAuditLog', systemAuditLogSchema);
