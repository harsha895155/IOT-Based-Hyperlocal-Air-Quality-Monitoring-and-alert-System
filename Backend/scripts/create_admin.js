require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

async function seedAdmin() {
  await connectDB();

  const email = 'harshavardhan10003@gmail.com';
  const name = 'harshavardhan';
  const plainPassword = '123456';

  let user = await User.findOne({ email });
  if (user) {
    console.log('[Admin] User found. Updating to Admin role and resetting password to 123456...');
    user.name = name;
    user.role = 'admin';
    user.password = plainPassword;
    await user.save();
    console.log('[Admin] Successfully updated existing user to Admin:', user.email);
  } else {
    console.log('[Admin] Creating new Admin account with email:', email);
    user = await User.create({
      name,
      email,
      password: plainPassword,
      role: 'admin',
      preferences: {
        emailAlerts: true,
        pushAlerts: true,
        dailyDigest: true,
        soundAlerts: true,
        theme: 'obsidian',
        tempUnit: 'C',
        defaultStation: 'AIRGUARD-001',
        organization: 'AirGuard Admin Operations',
      },
    });
    console.log('[Admin] Successfully created Admin user:', user.email);
  }

  const verified = await user.matchPassword(plainPassword);
  console.log('[Admin] Password verification test:', verified ? 'PASSED (123456 verified)' : 'FAILED');

  await mongoose.disconnect();
  console.log('[DB] Disconnected cleanly.');
}

seedAdmin().catch((err) => {
  console.error('[Error]', err);
  process.exit(1);
});
