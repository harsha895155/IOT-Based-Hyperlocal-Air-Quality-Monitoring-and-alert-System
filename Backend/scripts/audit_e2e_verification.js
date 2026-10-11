/**
 * AirGuard E2E Full-Stack Verification Suite
 * Tests every API endpoint, authentication flow, User A vs User B data isolation,
 * device provisioning, telemetry ingestion, threshold alerts, and weather lookups.
 */

const BASE_URL = 'http://127.0.0.1:5001/api';

async function runAudit() {
  console.log('====================================================');
  console.log('   AIRGUARD COMPREHENSIVE END-TO-END SYSTEM AUDIT   ');
  console.log('====================================================\n');

  let passCount = 0;
  let failCount = 0;

  function assert(desc, condition) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failCount++;
    }
  }

  // Helper fetch with JSON
  async function api(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, ok: res.ok, data };
  }

  // 1. HEALTH CHECK
  console.log('[1/10] Verifying Backend & System Health...');
  const healthRes = await api('/health');
  assert('Health endpoint status is 200', healthRes.status === 200);
  assert('Database status is connected', healthRes.data?.database?.status === 'connected');
  assert('Socket.IO is active', healthRes.data?.socketIO?.active === true);

  // 2. AUTHENTICATION & VALIDATION
  console.log('\n[2/10] Auditing Authentication, Registration & Validation...');
  const timestamp = Date.now();
  const userA_email = `audit_user_a_${timestamp}@airguard.test`;
  const userB_email = `audit_user_b_${timestamp}@airguard.test`;

  // Validation tests
  const invalidReg = await api('/auth/register', {
    method: 'POST',
    body: { email: userA_email }, // missing name and password
  });
  assert('Registration rejects missing fields (400)', invalidReg.status === 400);

  // Valid registration User A
  const regA = await api('/auth/register', {
    method: 'POST',
    body: { name: 'Audit User A', email: userA_email, password: 'Password123!' },
  });
  assert('User A registered successfully (201)', regA.status === 201 && regA.data?.token);
  const tokenA = regA.data?.token;

  // Duplicate registration test
  const dupReg = await api('/auth/register', {
    method: 'POST',
    body: { name: 'Audit User A Dup', email: userA_email, password: 'Password123!' },
  });
  assert('Duplicate email registration rejected (400)', dupReg.status === 400);

  // Valid registration User B
  const regB = await api('/auth/register', {
    method: 'POST',
    body: { name: 'Audit User B', email: userB_email, password: 'Password123!' },
  });
  assert('User B registered successfully (201)', regB.status === 201 && regB.data?.token);
  const tokenB = regB.data?.token;

  // Login test
  const loginA = await api('/auth/login', {
    method: 'POST',
    body: { email: userA_email, password: 'Password123!' },
  });
  assert('User A login with correct credentials returns 200 and token', loginA.status === 200 && loginA.data?.token);

  const loginWrongPass = await api('/auth/login', {
    method: 'POST',
    body: { email: userA_email, password: 'WrongPassword!' },
  });
  assert('Login with wrong password rejected (401)', loginWrongPass.status === 401);

  // Verify /auth/me
  const meA = await api('/auth/me', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert('/auth/me returns User A details without password field', meA.status === 200 && meA.data.email === userA_email && !meA.data.password);

  // 3. FORGOT PASSWORD & RESET PASSWORD FLOW
  console.log('\n[3/10] Auditing Forgot Password & Password Reset Lifecycle...');
  const forgotRes = await api('/auth/forgot-password', {
    method: 'POST',
    body: { email: userA_email },
  });
  assert('Forgot password generates secure reset token', forgotRes.status === 200 && forgotRes.data?.resetToken);
  const resetToken = forgotRes.data?.resetToken;

  const resetInvalid = await api('/auth/reset-password', {
    method: 'POST',
    body: { token: 'invalid_token_123', newPassword: 'NewPassword123!' },
  });
  assert('Reset with invalid token rejected (400)', resetInvalid.status === 400);

  const resetShortPass = await api('/auth/reset-password', {
    method: 'POST',
    body: { token: resetToken, newPassword: '123' },
  });
  assert('Reset with short password (<6 chars) rejected (400)', resetShortPass.status === 400);

  const resetSuccess = await api('/auth/reset-password', {
    method: 'POST',
    body: { token: resetToken, newPassword: 'NewPassword123!' },
  });
  assert('Reset with valid token succeeds (200)', resetSuccess.status === 200 && resetSuccess.data?.token);

  // Verify new password works
  const loginNewPass = await api('/auth/login', {
    method: 'POST',
    body: { email: userA_email, password: 'NewPassword123!' },
  });
  assert('Login with new updated password succeeds (200)', loginNewPass.status === 200);

  // 4. DEVICE REGISTRATION & STRICT USER DATA ISOLATION
  console.log('\n[4/10] Auditing Device Provisioning, Registry & Strict User Isolation...');
  const devA_id = `esp32-node-audit-a-${timestamp}`;
  const devB_id = `esp32-node-audit-b-${timestamp}`;

  // User A provisions device
  const regDevA = await api('/devices', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      deviceId: devA_id,
      name: 'Station Alpha (User A)',
      location: 'Sector 4, Main Campus',
      locality: 'Sector 4',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
    },
  });
  assert('User A registers device (201)', regDevA.status === 201 && regDevA.data?.deviceId === devA_id);

  // User B provisions device
  const regDevB = await api('/devices', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: {
      deviceId: devB_id,
      name: 'Station Beta (User B)',
      location: 'South Campus',
      locality: 'South Gate',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
    },
  });
  assert('User B registers device (201)', regDevB.status === 201 && regDevB.data?.deviceId === devB_id);

  // User A fetches devices
  const listDevsA = await api('/devices', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert('User A sees only their own device', listDevsA.data.some(d => d.deviceId === devA_id) && !listDevsA.data.some(d => d.deviceId === devB_id));

  // User B fetches devices
  const listDevsB = await api('/devices', {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert('User B sees only their own device', listDevsB.data.some(d => d.deviceId === devB_id) && !listDevsB.data.some(d => d.deviceId === devA_id));

  // ISOLATION ATTACK 1: User B tries to read User A's device
  const attackRead = await api(`/devices/${devA_id}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert('User B cannot read User A device details (403 Forbidden)', attackRead.status === 403);

  // ISOLATION ATTACK 2: User B tries to modify User A's device
  const attackPatch = await api(`/devices/${devA_id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: { name: 'Hacked Device Name' },
  });
  assert('User B cannot modify User A device (403 Forbidden)', attackPatch.status === 403);

  // ISOLATION ATTACK 3: User B tries to delete User A's device
  const attackDelete = await api(`/devices/${devA_id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert('User B cannot delete User A device (403 Forbidden)', attackDelete.status === 403);

  // 5. HARDWARE SENSOR TELEMETRY PIPELINE
  console.log('\n[5/10] Auditing Sensor Telemetry Pipeline (MQ135 + DHT22)...');
  const apiKey = process.env.API_KEY || 'CHANGE_ME_SHARED_SECRET';

  // Negative test: invalid payload or missing API key
  const noKeyReading = await api('/readings', {
    method: 'POST',
    body: { deviceId: devA_id, temperature: 27.5, humidity: 55, gasPPM: 140, airQuality: 88 },
  });
  assert('Telemetry rejected without API key (401/403)', noKeyReading.status === 401 || noKeyReading.status === 403);

  // Negative test: out-of-range sensor values
  const outOfRange = await api('/readings', {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: { deviceId: devA_id, temperature: 150, humidity: 55, gasPPM: 140, airQuality: 88 }, // 150°C is out of range
  });
  assert('Telemetry with out-of-range temperature rejected (400)', outOfRange.status === 400);

  // Valid normal sensor reading
  const goodReading = await api('/readings', {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: { deviceId: devA_id, temperature: 26.4, humidity: 58.2, gasPPM: 135.0, airQuality: 45 },
  });
  assert('Valid sensor reading ingested and classified (201)', goodReading.status === 201 && goodReading.data?.reading?.category === 'Good');

  // Verify device status updated
  const devCheck = await api(`/devices/${devA_id}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert('Device lastSeen and latest telemetry updated in database', devCheck.status === 200 && devCheck.data?.aqi === 45);

  // 6. REAL-TIME THRESHOLD ALERTS
  console.log('\n[6/10] Auditing Threshold Alerts Generation & Scoping...');
  // Post high AQI reading (AQI = 165 -> Unhealthy)
  const highReading = await api('/readings', {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: { deviceId: devA_id, temperature: 31.0, humidity: 62.0, gasPPM: 380.0, airQuality: 165 },
  });
  assert('High AQI reading ingested (201)', highReading.status === 201 && highReading.data?.alert);

  // User A views alerts
  const alertsA = await api('/alerts', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert('User A sees alert for their device', Array.isArray(alertsA.data) && alertsA.data.some(a => a.deviceId === devA_id));

  // User B views alerts - should not see User A's alerts
  const alertsB = await api('/alerts', {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert('User B cannot see User A alerts', Array.isArray(alertsB.data) && !alertsB.data.some(a => a.deviceId === devA_id));

  // Acknowledge alert
  const alertToAck = alertsA.data.find(a => a.deviceId === devA_id);
  if (alertToAck) {
    const ackRes = await api(`/alerts/${alertToAck._id}/acknowledge`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert('Alert successfully acknowledged by owner (200)', ackRes.status === 200 && ackRes.data?.acknowledged === true);
  }

  // 7. HISTORY & ANALYTICS DATA RETRIEVAL
  console.log('\n[7/10] Auditing History, Analytics & Aggregation Queries...');
  const historyA = await api(`/readings/history?deviceId=${devA_id}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert('History endpoint returns real stored readings for User A', historyA.status === 200 && historyA.data?.data?.length >= 2);

  // User B attempts to access User A's history
  const attackHistory = await api(`/readings/history?deviceId=${devA_id}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert('User B denied access to User A history (403)', attackHistory.status === 403);

  // Analytics query
  const analyticsA = await api(`/analytics?deviceId=${devA_id}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert('Analytics returns real aggregated statistics (min, max, avg)', analyticsA.status === 200 && analyticsA.data?.summary?.totalSamples >= 2);

  // 8. WEATHER & GEOCODING SERVICE
  console.log('\n[8/10] Auditing Weather Integration & Geocoding...');
  const searchRes = await api('/weather/search?q=Hyderabad');
  assert('Weather search returns real geocoded coordinates', Array.isArray(searchRes.data) && searchRes.data.length > 0 && searchRes.data[0].latitude);

  const weatherRes = await api('/weather?lat=17.385&lng=78.4867&location=Hyderabad');
  assert('Weather service returns live atmospheric conditions', weatherRes.status === 200 && weatherRes.data?.temperature != null && weatherRes.data?.humidity != null);

  const reverseRes = await api('/weather/reverse?lat=17.385&lng=78.4867');
  assert('Reverse geocoding resolves coordinates to location label', reverseRes.status === 200 && reverseRes.data?.label);

  // 9. SAVED LOCATIONS USER ISOLATION
  console.log('\n[9/10] Auditing Saved Locations User Isolation...');
  const saveLocA = await api('/locations/saved', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { name: 'Campus Station', label: 'Campus Research Station', latitude: 17.385, longitude: 78.4867 },
  });
  assert('User A saves location (201)', saveLocA.status === 201 && saveLocA.data?._id);
  const locIdA = saveLocA.data?._id;

  const getLocsB = await api('/locations/saved', {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert('User B cannot see User A saved location', Array.isArray(getLocsB.data) && !getLocsB.data.some(l => l._id === locIdA));

  const attackDeleteLoc = await api(`/locations/saved/${locIdA}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert('User B cannot delete User A saved location (404)', attackDeleteLoc.status === 404);

  // 10. PROFILE, SETTINGS & CASCADE ACCOUNT CLEANUP
  console.log('\n[10/10] Auditing Profile Settings, Activity & Cleanup...');
  const updateProfile = await api('/auth/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { name: 'Audited Lead Engineer', bio: 'IoT Firmware & Operations Specialist' },
  });
  assert('Profile update persists name and bio (200)', updateProfile.status === 200 && updateProfile.data?.user?.name === 'Audited Lead Engineer');

  const updatePrefs = await api('/auth/preferences', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { soundAlerts: true, theme: 'obsidian', tempUnit: 'C' },
  });
  assert('Settings and preferences persist (200)', updatePrefs.status === 200 && updatePrefs.data?.preferences?.soundAlerts === true);

  const activityA = await api('/auth/activity', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert('Activity log reflects user actions', Array.isArray(activityA.data) && activityA.data.length > 0);

  // Clean up User A and User B devices and accounts
  await api(`/devices/${devA_id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenA}` } });
  await api(`/devices/${devB_id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenB}` } });
  await api('/auth/account', { method: 'DELETE', headers: { Authorization: `Bearer ${tokenA}` }, body: { confirmation: 'DELETE' } });
  await api('/auth/account', { method: 'DELETE', headers: { Authorization: `Bearer ${tokenB}` }, body: { confirmation: 'DELETE' } });
  console.log('  🧹 Cleaned up temporary test devices and accounts.');

  console.log('\n====================================================');
  console.log(` AUDIT SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('[Audit Script Error]', err);
  process.exit(1);
});
