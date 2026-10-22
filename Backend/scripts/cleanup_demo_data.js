const mongoose = require('mongoose');
require('dotenv').config();

async function cleanup() {
  console.log('=====================================================');
  console.log('   AIRGUARD PRODUCTION DATABASE PURGE OF DEMO DATA   ');
  console.log('=====================================================\n');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // 1. Purge Readings
    const readingsColl = db.collection('readings');
    const readingCountBefore = await readingsColl.countDocuments();
    const readingRes = await readingsColl.deleteMany({});
    console.log(`[Readings] Deleted ${readingRes.deletedCount} of ${readingCountBefore} historical/demo readings.`);

    // 2. Purge Alerts
    const alertsColl = db.collection('alerts');
    const alertCountBefore = await alertsColl.countDocuments();
    const alertRes = await alertsColl.deleteMany({});
    console.log(`[Alerts] Deleted ${alertRes.deletedCount} of ${alertCountBefore} generated alerts.`);

    // 3. Purge Test / Audit Users
    const usersColl = db.collection('users');
    const testUsersFilter = {
      $or: [
        { email: /@test\.com$/i },
        { email: /@airguard\.local$/i },
        { email: /audit_user/i },
        { name: /Test User|User B/i },
      ],
    };
    const testUsers = await usersColl.find(testUsersFilter).toArray();
    console.log(`[Users] Found ${testUsers.length} temporary/test accounts to remove:`, testUsers.map(u => u.email));
    const userRes = await usersColl.deleteMany(testUsersFilter);
    console.log(`[Users] Deleted ${userRes.deletedCount} test accounts.`);

    // 4. Reset Registered Devices to Clean Ready State
    const devicesColl = db.collection('devices');
    const devUpdateRes = await devicesColl.updateMany(
      {},
      {
        $set: {
          latestReading: null,
          lastSeen: null,
          provisioningStatus: 'active',
        },
      }
    );
    console.log(`[Devices] Reset ${devUpdateRes.modifiedCount} device(s) to fresh offline/awaiting telemetry state.`);

    // 5. Clean Test Locations
    const locationsColl = db.collection('locations');
    const locRes = await locationsColl.deleteMany({
      $or: [
        { name: /test/i },
        { label: /test/i },
      ],
    });
    console.log(`[Locations] Deleted ${locRes.deletedCount} test locations.`);

    // Verification summary
    console.log('\n--- VERIFICATION AFTER CLEANUP ---');
    console.log('Total Readings Remaining:', await readingsColl.countDocuments());
    console.log('Total Alerts Remaining:  ', await alertsColl.countDocuments());
    console.log('Total Users Remaining:   ', await usersColl.countDocuments());
    console.log('Total Devices:           ', await devicesColl.countDocuments());
    
    const remainingUsers = await usersColl.find({}, { projection: { name: 1, email: 1, role: 1 } }).toArray();
    console.log('Active Legitimate Users: ', JSON.stringify(remainingUsers, null, 2));

    const remainingDevices = await devicesColl.find({}).toArray();
    console.log('Device Registry State:   ', JSON.stringify(remainingDevices.map(d => ({
      deviceId: d.deviceId,
      name: d.name,
      lastSeen: d.lastSeen,
      latestReading: d.latestReading,
    })), null, 2));

  } catch (err) {
    console.error('Purge error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\nPurge complete. Database disconnected.');
  }
}

cleanup();
