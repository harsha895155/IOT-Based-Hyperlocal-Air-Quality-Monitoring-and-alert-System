const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
      minlength: 6,
    },
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    avatar: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    organization: {
      type: String,
      default: 'AirGuard Environmental Intelligence',
    },
    bio: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Active', 'Suspended', 'Deactivated'],
      default: 'Active',
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    activityLog: [
      {
        action: { type: String, required: true },
        detail: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      enum: ['admin', 'researcher', 'user'],
      default: 'user',
    },
    preferences: {
      emailAlerts: { type: Boolean, default: true },
      pushAlerts: { type: Boolean, default: true },
      dailyDigest: { type: Boolean, default: false },
      soundAlerts: { type: Boolean, default: true },
      theme: { type: String, default: 'obsidian' },
      tempUnit: { type: String, default: 'C' },
      windUnit: { type: String, default: 'km/h' },
      pressureUnit: { type: String, default: 'hPa' },
      refreshRate: { type: Number, default: 15 },
      defaultStation: { type: String, default: 'AIRGUARD-001' },
      aqiWarnThreshold: { type: Number, default: 100 },
      aqiCriticalThreshold: { type: Number, default: 150 },
      sensitivityProfile: { type: String, default: 'standard' },
      organization: { type: String, default: 'GIST Environmental Research' },
    },
  },
  { timestamps: true, strict: false }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
