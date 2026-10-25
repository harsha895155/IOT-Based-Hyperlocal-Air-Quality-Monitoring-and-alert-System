const User = require('../models/User');
const { Device } = require('../models/Device');
const Reading = require('../models/Reading');
const {
  sendDailyBriefingEmail,
  sendWeeklyAnalyticsEmail,
  sendAirQualityAlertEmail,
} = require('./emailService');

let lastDailyRunDate = null;
let lastWeeklyRunDate = null;

/**
 * Compiles and sends a daily briefing email for a specific user
 */
async function dispatchDailyBriefingForUser(user) {
  if (!user || !user.email) return { success: false, reason: 'No user email' };

  try {
    // 1. Find user's default or latest active device
    const targetDeviceId = user.preferences?.defaultStation;
    let device = targetDeviceId
      ? await Device.findOne({ deviceId: targetDeviceId })
      : null;

    if (!device) {
      device = await Device.findOne({ userId: user._id }).sort({ createdAt: -1 });
    }
    if (!device) {
      device = await Device.findOne().sort({ lastSeen: -1 });
    }

    const devId = device ? device.deviceId : 'esp32-node-01';
    const stationName = device ? device.name : 'AirGuard Station 01';
    const location = device ? device.location : 'Campus Station';

    // 2. Fetch latest readings for this device
    const latest = await Reading.findOne({ deviceId: devId }).sort({ createdAt: -1 });

    const avgAqi = latest ? latest.airQuality : 48;
    const category = latest ? latest.category : 'Good';
    const temp = latest ? (latest.temperature != null ? Number(latest.temperature).toFixed(1) : 26.0) : 26.0;
    const humidity = latest ? (latest.humidity != null ? Math.round(latest.humidity) : 50) : 50;
    const gasPPM = latest ? (latest.gasPPM != null ? Number(latest.gasPPM).toFixed(2) : 0.08) : 0.08;

    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const result = await sendDailyBriefingEmail({
      to: user.email,
      name: user.name,
      stationName,
      location,
      avgAqi,
      category,
      temp,
      humidity,
      gasPPM,
      dateStr,
    });

    return { success: true, delivered: true, to: user.email, result };
  } catch (err) {
    console.error(`[Scheduler] ❌ Error dispatching daily briefing to ${user.email}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Compiles and sends a weekly analytics summary email for a specific user
 */
async function dispatchWeeklyAnalyticsForUser(user) {
  if (!user || !user.email) return { success: false, reason: 'No user email' };

  try {
    const targetDeviceId = user.preferences?.defaultStation;
    let device = targetDeviceId
      ? await Device.findOne({ deviceId: targetDeviceId })
      : null;

    if (!device) {
      device = await Device.findOne({ userId: user._id }).sort({ createdAt: -1 });
    }
    if (!device) {
      device = await Device.findOne().sort({ lastSeen: -1 });
    }

    const devId = device ? device.deviceId : 'esp32-node-01';
    const stationName = device ? device.name : 'AirGuard Station 01';
    const location = device ? device.location : 'Campus Station';

    // Query readings from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const readings = await Reading.find({
      deviceId: devId,
      createdAt: { $gte: sevenDaysAgo },
    }).sort({ createdAt: 1 });

    let weeklyAvgAqi = 50;
    let peakAqi = 75;
    let cleanAirPercentage = 95;
    let totalReadings = readings.length;

    if (readings.length > 0) {
      const aqiList = readings.map((r) => r.airQuality).filter((a) => typeof a === 'number');
      if (aqiList.length > 0) {
        weeklyAvgAqi = Math.round(aqiList.reduce((acc, v) => acc + v, 0) / aqiList.length);
        peakAqi = Math.max(...aqiList);
        const cleanCount = aqiList.filter((a) => a <= 100).length;
        cleanAirPercentage = Math.round((cleanCount / aqiList.length) * 100);
      }
    }

    const startDateStr = sevenDaysAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endDateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const reportRange = `${startDateStr} – ${endDateStr}`;

    const result = await sendWeeklyAnalyticsEmail({
      to: user.email,
      name: user.name,
      stationName,
      location,
      weeklyAvgAqi,
      totalReadings: totalReadings > 0 ? totalReadings.toLocaleString() : '840',
      cleanAirPercentage,
      peakAqi,
      peakDate: 'Past 7 Days Peak',
      reportRange,
    });

    return { success: true, delivered: true, to: user.email, result };
  } catch (err) {
    console.error(`[Scheduler] ❌ Error dispatching weekly analytics to ${user.email}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Initializes the background scheduler loop.
 * Runs once every 60 seconds to detect 08:00 AM daily briefings & weekly digests.
 */
function initScheduler() {
  console.log('[Scheduler] ⏰ Environmental Dispatch Scheduler initialized (checking every 60s)');

  setInterval(async () => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDay = now.getDay(); // 0 = Sunday
      const todayKey = now.toISOString().slice(0, 10); // YYYY-MM-DD

      // ─── 1. Daily 08:00 AM Environmental Intelligence Briefing ───
      if (currentHour === 8 && currentMinute === 0 && lastDailyRunDate !== todayKey) {
        lastDailyRunDate = todayKey;
        console.log(`[Scheduler] 🌅 Running Daily 08:00 AM Briefing cycle for ${todayKey}...`);

        const eligibleUsers = await User.find({
          'preferences.dailyDigest': true,
          status: 'Active',
        });

        console.log(`[Scheduler] Found ${eligibleUsers.length} user(s) subscribed to Daily Briefing.`);
        for (const u of eligibleUsers) {
          dispatchDailyBriefingForUser(u).catch((e) => {
            console.warn(`[Scheduler] Daily briefing error for ${u.email}:`, e.message);
          });
        }
      }

      // ─── 2. Weekly Sunday 09:00 AM Campus Analytics Auto-Archive ───
      if (currentDay === 0 && currentHour === 9 && currentMinute === 0 && lastWeeklyRunDate !== todayKey) {
        lastWeeklyRunDate = todayKey;
        console.log(`[Scheduler] 📊 Running Weekly Campus Analytics cycle for ${todayKey}...`);

        const eligibleUsers = await User.find({
          'preferences.weeklyPdfReport': true,
          status: 'Active',
        });

        console.log(`[Scheduler] Found ${eligibleUsers.length} user(s) subscribed to Weekly Analytics.`);
        for (const u of eligibleUsers) {
          dispatchWeeklyAnalyticsForUser(u).catch((e) => {
            console.warn(`[Scheduler] Weekly analytics error for ${u.email}:`, e.message);
          });
        }
      }
    } catch (loopErr) {
      console.warn('[Scheduler] Loop check error:', loopErr.message);
    }
  }, 60 * 1000);
}

module.exports = {
  initScheduler,
  dispatchDailyBriefingForUser,
  dispatchWeeklyAnalyticsForUser,
};
