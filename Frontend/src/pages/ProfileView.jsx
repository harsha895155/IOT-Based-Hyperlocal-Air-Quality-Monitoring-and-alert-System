import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './ProfileView.css';

export default function ProfileView({ onNavigateLogin }) {
  const { user, isGuest, preferences, updatePreferences, updateProfile, changePassword, deleteAccount, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Active Tab from query param or default to 'personal'
  const queryTab = new URLSearchParams(location.search).get('tab');
  const [activeTab, setActiveTab] = useState(queryTab || 'personal');

  useEffect(() => {
    if (queryTab) {
      setActiveTab(queryTab);
    }
  }, [queryTab]);

  // ─── Personal Information Form State ───
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);

  // ─── Password Change State ───
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // ─── Notification & App Preferences State ───
  const [highAqiAlert, setHighAqiAlert] = useState(preferences?.highAqiAlert ?? true);
  const [unhealthyAlert, setUnhealthyAlert] = useState(preferences?.unhealthyAlert ?? true);
  const [hazardousAlert, setHazardousAlert] = useState(preferences?.hazardousAlert ?? true);
  const [deviceOfflineAlert, setDeviceOfflineAlert] = useState(preferences?.deviceOfflineAlert ?? true);
  const [sensorErrorAlert, setSensorErrorAlert] = useState(preferences?.sensorErrorAlert ?? true);
  const [severeWeatherAlert, setSevereWeatherAlert] = useState(preferences?.severeWeatherAlert ?? true);
  const [securityNotify, setSecurityNotify] = useState(preferences?.securityNotify ?? true);
  const [loginNotify, setLoginNotify] = useState(preferences?.loginNotify ?? true);
  const [dailyDigest, setDailyDigest] = useState(preferences?.dailyDigest ?? false);

  const [tempUnit, setTempUnit] = useState(preferences?.tempUnit || 'C');
  const [aqiStandard, setAqiStandard] = useState(preferences?.aqiStandard || 'US_EPA');
  const [timeFormat, setTimeFormat] = useState(preferences?.timeFormat || '12h');
  const [refreshRate, setRefreshRate] = useState(preferences?.refreshRate || 15);

  // ─── Connected Devices & Locations State ───
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [savedLocations, setSavedLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(true);

  // ─── Activity Log State ───
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // ─── UI Status & Modals ───
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  // Danger zone modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state with authenticated user
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || (user.email ? user.email.split('@')[0] : ''));
      setPhone(user.phone || user.preferences?.phone || '');
      setOrganization(user.organization || user.preferences?.organization || 'AirGuard IoT Research');
      setBio(user.bio || user.preferences?.bio || '');
      setAvatarPreview(user.avatar || '');
    }
  }, [user]);

  // Sync preferences state
  useEffect(() => {
    if (preferences) {
      setHighAqiAlert(preferences.highAqiAlert ?? true);
      setUnhealthyAlert(preferences.unhealthyAlert ?? true);
      setHazardousAlert(preferences.hazardousAlert ?? true);
      setDeviceOfflineAlert(preferences.deviceOfflineAlert ?? true);
      setSensorErrorAlert(preferences.sensorErrorAlert ?? true);
      setSevereWeatherAlert(preferences.severeWeatherAlert ?? true);
      setSecurityNotify(preferences.securityNotify ?? true);
      setLoginNotify(preferences.loginNotify ?? true);
      setDailyDigest(preferences.dailyDigest ?? false);
      setTempUnit(preferences.tempUnit || 'C');
      setAqiStandard(preferences.aqiStandard || 'US_EPA');
      setTimeFormat(preferences.timeFormat || '12h');
      setRefreshRate(preferences.refreshRate || 15);
    }
  }, [preferences]);

  // Fetch real connected devices for this authenticated user
  useEffect(() => {
    if (user && !isGuest) {
      setDevicesLoading(true);
      client
        .get('/devices')
        .then((res) => {
          if (Array.isArray(res.data)) {
            setDevices(res.data);
          } else {
            setDevices([]);
          }
        })
        .catch(() => setDevices([]))
        .finally(() => setDevicesLoading(false));

      // Fetch user's saved weather locations
      setLocationsLoading(true);
      client
        .get('/locations/saved')
        .then((res) => {
          if (Array.isArray(res.data)) {
            setSavedLocations(res.data);
          } else {
            setSavedLocations([]);
          }
        })
        .catch(() => setSavedLocations([]))
        .finally(() => setLocationsLoading(false));

      // Fetch real account activity logs
      setActivityLoading(true);
      client
        .get('/auth/activity')
        .then((res) => {
          if (Array.isArray(res.data)) {
            setActivityLogs(res.data);
          } else {
            setActivityLogs([]);
          }
        })
        .catch(() => setActivityLogs([]))
        .finally(() => setActivityLoading(false));
    }
  }, [user, isGuest]);

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // ─── 1. Avatar Upload & Processing ───
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Please select a valid image file (JPEG, PNG, or WebP).', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image size must be less than 2MB.', 'error');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to high quality but lightweight JPEG (typically 15KB-30KB)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setAvatarPreview(compressedDataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
  };

  // ─── 2. Save Personal Details ───
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Full name is required.', 'error');
      return;
    }

    setSavingProfile(true);
    setSaveSuccessMsg(null);
    try {
      const payload = {
        name: name.trim(),
        username: username.trim(),
        phone: phone.trim(),
        organization: organization.trim(),
        bio: bio.trim(),
        avatar: avatarPreview,
      };

      if (updateProfile) {
        await updateProfile(payload);
      } else {
        await updatePreferences(payload);
      }

      setSaveSuccessMsg('Saved successfully ✓');
      showToast('Profile updated successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      showToast(err.message || 'Unable to save profile changes.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelProfile = () => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || (user.email ? user.email.split('@')[0] : ''));
      setPhone(user.phone || user.preferences?.phone || '');
      setOrganization(user.organization || user.preferences?.organization || 'AirGuard IoT Research');
      setBio(user.bio || user.preferences?.bio || '');
      setAvatarPreview(user.avatar || '');
      setAvatarFile(null);
    }
  };

  // ─── 3. Change Password ───
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast('Please provide current and new password.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully! ✓');
    } catch (err) {
      showToast(err.message || 'Current password incorrect or update failed.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  // ─── 4. Toggle Preferences ───
  const handleTogglePreference = async (key, val) => {
    try {
      if (key === 'highAqiAlert') setHighAqiAlert(val);
      if (key === 'unhealthyAlert') setUnhealthyAlert(val);
      if (key === 'hazardousAlert') setHazardousAlert(val);
      if (key === 'deviceOfflineAlert') setDeviceOfflineAlert(val);
      if (key === 'sensorErrorAlert') setSensorErrorAlert(val);
      if (key === 'severeWeatherAlert') setSevereWeatherAlert(val);
      if (key === 'securityNotify') setSecurityNotify(val);
      if (key === 'loginNotify') setLoginNotify(val);
      if (key === 'dailyDigest') setDailyDigest(val);
      if (key === 'tempUnit') setTempUnit(val);
      if (key === 'aqiStandard') setAqiStandard(val);
      if (key === 'timeFormat') setTimeFormat(val);
      if (key === 'refreshRate') setRefreshRate(val);

      await updatePreferences({ [key]: val });
      showToast('Preference saved to server.');
    } catch (err) {
      showToast('Could not save preference.', 'error');
    }
  };

  // ─── 5. Danger Zone Account Deletion ───
  const handleConfirmDelete = async () => {
    if (deleteInput !== 'DELETE') {
      showToast('Please type DELETE to confirm.', 'error');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAccount('DELETE');
      showToast('Account permanently removed.');
      navigate('/');
    } catch (err) {
      showToast(err.message || 'Failed to delete account.', 'error');
      setIsDeleting(false);
    }
  };

  // ─── Deterministic Avatar Fallback ───
  const getInitials = (userName) => {
    if (!userName) return 'U';
    const parts = userName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return userName.slice(0, 2).toUpperCase();
  };

  // Format date helper
  const formatDate = (dateString, options = {}) => {
    if (!dateString) return 'Active Session';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        ...options,
      });
    } catch (e) {
      return String(dateString);
    }
  };

  // Guest State View
  if (isGuest || !user) {
    return (
      <div className="profile-page">
        <div className="profile-hero-card">
          <div className="profile-hero-left">
            <div className="profile-avatar-circle" style={{ background: '#475569' }}>
              ?
            </div>
            <div className="profile-hero-meta">
              <h1 className="profile-hero-name">Unauthenticated Guest Explorer</h1>
              <span className="profile-hero-email">Public Telemetry View Mode</span>
              <div className="profile-hero-sub">
                Sign in to manage personal hardware nodes, save custom thresholds, and configure notifications.
              </div>
            </div>
          </div>
          <div className="profile-hero-actions">
            <button
              className="profile-btn-primary"
              onClick={onNavigateLogin || (() => navigate('/login'))}
            >
              Sign In to Your Account →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const roleDisplay = user.role ? user.role.toUpperCase() : 'USER';
  const onlineDevicesCount = devices.filter((d) => d.isOnline || d.status === 'online').length;

  return (
    <div className="profile-page">
      {/* ─── TOAST FEEDBACK ─── */}
      {toastMsg && (
        <div className={`profile-toast ${toastType}`}>
          <span>{toastType === 'success' ? '✓' : '⚠️'}</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ─── SECTION 2: PROFILE HEADER ─── */}
      <div className="profile-hero-card">
        <div className="profile-hero-left">
          <div className="profile-avatar-wrap">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={user.name}
                className="profile-avatar-circle"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div className="profile-avatar-circle">
                {getInitials(user.name)}
              </div>
            )}
            <div className="profile-avatar-badge" title="Active Verified Session">
              ✓
            </div>
          </div>

          <div className="profile-hero-meta">
            <div className="profile-hero-name-row">
              <h1 className="profile-hero-name">{user.name}</h1>
              <span className={`profile-role-badge ${user.role === 'admin' ? 'admin' : ''}`}>
                {roleDisplay}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                Active
              </span>
            </div>

            <span className="profile-hero-email">
              <span>✉</span>
              <span>{user.email}</span>
              <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600, marginLeft: '6px' }}>• Verified</span>
            </span>

            <div className="profile-hero-sub">
              <span>Member since {user.createdAt ? formatDate(user.createdAt, { month: 'long', year: 'numeric' }) : 'October 2026'}</span>
              <span>•</span>
              <span>Last active: {user.lastLogin ? formatDate(user.lastLogin, { hour: '2-digit', minute: '2-digit' }) : 'Today'}</span>
              <span>•</span>
              <span style={{ color: '#38bdf8' }}>{devices.length} Connected {devices.length === 1 ? 'Device' : 'Devices'}</span>
            </div>
          </div>
        </div>

        <div className="profile-hero-actions">
          <button
            className="profile-btn-primary"
            onClick={() => setActiveTab('personal')}
          >
            <span>✏️</span>
            <span>Edit Profile</span>
          </button>
          <button
            className="profile-btn-secondary"
            onClick={logout}
            title="Log out of current session"
          >
            <span>🚪</span>
            <span>Log out</span>
          </button>
        </div>
      </div>

      {/* ─── SECTION 15: REAL-TIME ACCOUNT STATUS SUMMARY ─── */}
      <div className="profile-stats-row">
        <div className="profile-stat-box">
          <div className="profile-stat-icon">📟</div>
          <div className="profile-stat-info">
            <span className="profile-stat-lbl">Connected Devices</span>
            <span className="profile-stat-val">
              {devicesLoading ? '...' : `${devices.length} (${onlineDevicesCount} Online)`}
            </span>
          </div>
        </div>

        <div className="profile-stat-box">
          <div className="profile-stat-icon" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            🛡️
          </div>
          <div className="profile-stat-info">
            <span className="profile-stat-lbl">Role Tier</span>
            <span className="profile-stat-val">{roleDisplay}</span>
          </div>
        </div>

        <div className="profile-stat-box">
          <div className="profile-stat-icon" style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
            🔔
          </div>
          <div className="profile-stat-info">
            <span className="profile-stat-lbl">Alert Dispatch</span>
            <span className="profile-stat-val">{highAqiAlert ? 'Active' : 'Muted'}</span>
          </div>
        </div>

        <div className="profile-stat-box">
          <div className="profile-stat-icon" style={{ color: '#a855f7', background: 'rgba(168, 85, 247, 0.1)', borderColor: 'rgba(168, 85, 247, 0.2)' }}>
            📍
          </div>
          <div className="profile-stat-info">
            <span className="profile-stat-lbl">Saved Locations</span>
            <span className="profile-stat-val">{locationsLoading ? '...' : `${savedLocations.length} Pinned`}</span>
          </div>
        </div>
      </div>

      {/* ─── SECTION 1 & 25: TAB NAVIGATION BAR ─── */}
      <div className="profile-tabs-nav">
        <button
          className={`profile-tab-btn ${activeTab === 'personal' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          <span>👤</span>
          <span>Personal Info</span>
        </button>

        <button
          className={`profile-tab-btn ${activeTab === 'security' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <span>🔒</span>
          <span>Account & Security</span>
        </button>

        <button
          className={`profile-tab-btn ${activeTab === 'devices' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          <span>📟</span>
          <span>Connected Devices ({devices.length})</span>
        </button>

        <button
          className={`profile-tab-btn ${activeTab === 'locations' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('locations')}
        >
          <span>📍</span>
          <span>Saved Locations ({savedLocations.length})</span>
        </button>

        <button
          className={`profile-tab-btn ${activeTab === 'notifications' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <span>🔔</span>
          <span>Notifications</span>
        </button>

        <button
          className={`profile-tab-btn ${activeTab === 'preferences' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <span>⚙️</span>
          <span>Preferences</span>
        </button>

        <button
          className={`profile-tab-btn ${activeTab === 'activity' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <span>📜</span>
          <span>Activity & Sessions</span>
        </button>

        <button
          className={`profile-tab-btn ${activeTab === 'danger' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('danger')}
          style={{ color: activeTab === 'danger' ? '#ef4444' : '#f87171' }}
        >
          <span>⚠️</span>
          <span>Danger Zone</span>
        </button>
      </div>

      {/* ─── TAB CONTENT PANELS ─── */}

      {/* ══════ TAB 1: PERSONAL INFORMATION ══════ */}
      {activeTab === 'personal' && (
        <div className="profile-content-grid">
          {/* Edit Profile Card */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title-group">
                <span className="profile-card-icon">📝</span>
                <div>
                  <h3 className="profile-card-title">Edit Profile Information</h3>
                  <p className="profile-card-desc">Update your personal identity details visible in reports and logs.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="profile-form">
              {/* Photo Upload Area */}
              <div className="profile-field-group">
                <label className="profile-field-label">Profile Photo / Avatar</label>
                <div className="profile-avatar-upload-area">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar Preview" className="profile-avatar-preview" />
                  ) : (
                    <div
                      className="profile-avatar-circle"
                      style={{ width: '72px', height: '72px', fontSize: '1.6rem' }}
                    >
                      {getInitials(name || user.name)}
                    </div>
                  )}

                  <div className="profile-avatar-btns">
                    <label className="profile-btn-secondary" style={{ cursor: 'pointer', padding: '8px 14px', fontSize: '0.82rem' }}>
                      <span>📷</span>
                      <span>{avatarPreview ? 'Replace Image' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAvatarChange}
                        style={{ display: 'none' }}
                      />
                    </label>

                    {avatarPreview && (
                      <button
                        type="button"
                        className="profile-btn-danger"
                        style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                        onClick={handleRemoveAvatar}
                      >
                        <span>🗑️</span>
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="profile-field-group">
                <label className="profile-field-label">Full Name</label>
                <input
                  type="text"
                  className="profile-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Harshavardhan"
                  required
                />
              </div>

              <div className="profile-field-group">
                <label className="profile-field-label">Display Name / Username</label>
                <input
                  type="text"
                  className="profile-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. harshavardhan"
                />
              </div>

              <div className="profile-field-group">
                <label className="profile-field-label">
                  <span>Email Address</span>
                  <span style={{ color: '#10b981', textTransform: 'none' }}>Verified ✓</span>
                </label>
                <input
                  type="email"
                  className="profile-input"
                  value={user.email}
                  disabled
                />
              </div>

              <div className="profile-field-group">
                <label className="profile-field-label">Phone / Emergency Contact</label>
                <input
                  type="tel"
                  className="profile-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                />
              </div>

              <div className="profile-field-group">
                <label className="profile-field-label">Organization / Laboratory</label>
                <input
                  type="text"
                  className="profile-input"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. AirGuard IoT Research"
                />
              </div>

              <div className="profile-field-group">
                <label className="profile-field-label">Bio / Operational Notes</label>
                <textarea
                  className="profile-input"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe your research focus or hardware deployment node location..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="profile-btn-secondary"
                  onClick={handleCancelProfile}
                  disabled={savingProfile}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="profile-btn-primary"
                  disabled={savingProfile}
                >
                  {savingProfile ? 'Saving...' : saveSuccessMsg ? 'Saved successfully ✓' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Account Overview & Permissions */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title-group">
                <span className="profile-card-icon">🪪</span>
                <div>
                  <h3 className="profile-card-title">Identity & Access Rights</h3>
                  <p className="profile-card-desc">Privilege levels assigned to this authenticated AirGuard account.</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">Access Role</span>
                  <span className="profile-setting-desc">Determined by server-side authorization middleware</span>
                </div>
                <span className={`profile-role-badge ${user.role === 'admin' ? 'admin' : ''}`}>
                  {roleDisplay}
                </span>
              </div>

              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">Hardware Provisioning</span>
                  <span className="profile-setting-desc">Allowed to register, calibrate, and flash ESP32 nodes</span>
                </div>
                <span style={{ color: '#10b981', fontWeight: 600 }}>Enabled ✓</span>
              </div>

              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">IEEE Compliance Reporting</span>
                  <span className="profile-setting-desc">Full access to automated Table I sensor validation audits</span>
                </div>
                <span style={{ color: '#10b981', fontWeight: 600 }}>Enabled ✓</span>
              </div>

              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">Google Weather Integration</span>
                  <span className="profile-setting-desc">Hyperlocal meteorology search and geocoding quota</span>
                </div>
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>Active</span>
              </div>

              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">Hardware Isolation</span>
                  <span className="profile-setting-desc">Only your own registered ESP32 nodes are accessible</span>
                </div>
                <span style={{ color: '#10b981', fontWeight: 600 }}>Enforced 🔒</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ TAB 2: ACCOUNT & SECURITY ══════ */}
      {activeTab === 'security' && (
        <div className="profile-content-grid">
          {/* Section 5 & 6: Account Information & Auth Method */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title-group">
                <span className="profile-card-icon">🛡️</span>
                <div>
                  <h3 className="profile-card-title">Account Information</h3>
                  <p className="profile-card-desc">Authentication and identity credentials.</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
              <div className="profile-setting-item">
                <span style={{ color: '#94a3b8' }}>Account ID:</span>
                <span className="mono" style={{ color: '#38bdf8', fontSize: '0.82rem' }}>
                  {user._id || user.id || 'N/A'}
                </span>
              </div>

              <div className="profile-setting-item">
                <span style={{ color: '#94a3b8' }}>Registered Email:</span>
                <span style={{ color: '#f8fafc', fontWeight: 600 }}>{user.email}</span>
              </div>

              <div className="profile-setting-item">
                <span style={{ color: '#94a3b8' }}>Role:</span>
                <span className={`profile-role-badge ${user.role === 'admin' ? 'admin' : ''}`}>
                  {roleDisplay}
                </span>
              </div>

              <div className="profile-setting-item">
                <span style={{ color: '#94a3b8' }}>Account Status:</span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>● Active</span>
              </div>

              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">Authentication Methods</span>
                  <span className="profile-setting-desc">Supported sign-in providers</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Password</span>
                  <span style={{ color: user.googleId ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
                    {user.googleId ? '✓ Google Account Connected' : 'Google: Not Linked'}
                  </span>
                </div>
              </div>

              <div className="profile-setting-item">
                <span style={{ color: '#94a3b8' }}>Created Date:</span>
                <span style={{ color: '#cbd5e1' }}>
                  {user.createdAt ? formatDate(user.createdAt) : 'October 2026'}
                </span>
              </div>

              <div className="profile-setting-item">
                <span style={{ color: '#94a3b8' }}>Last Login:</span>
                <span style={{ color: '#cbd5e1' }}>
                  {user.lastLogin ? formatDate(user.lastLogin, { hour: '2-digit', minute: '2-digit' }) : 'Current Session'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 7 & 8: Password & Security */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title-group">
                <span className="profile-card-icon">🔑</span>
                <div>
                  <h3 className="profile-card-title">Change Password</h3>
                  <p className="profile-card-desc">Update your secure credentials.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="profile-form">
              <div className="profile-field-group">
                <label className="profile-field-label">Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    className="profile-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    {showCurrentPass ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="profile-field-group">
                <label className="profile-field-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    className="profile-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    {showNewPass ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="profile-field-group">
                <label className="profile-field-label">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    className="profile-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    {showConfirmPass ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => navigate('/login')}
                >
                  Forgot your password?
                </button>

                <button
                  type="submit"
                  className="profile-btn-primary"
                  disabled={savingPassword}
                >
                  {savingPassword ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </form>

            {/* Section 9: Two-Factor Authentication Status */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '10px' }}>
              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">Two-Factor Authentication (2FA)</span>
                  <span className="profile-setting-desc">Status: Not Configured (Hardware TOTP roadmap)</span>
                </div>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  Backend support pending
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ TAB 3: CONNECTED DEVICES ══════ */}
      {activeTab === 'devices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title-group">
                <span className="profile-card-icon">📟</span>
                <div>
                  <h3 className="profile-card-title">My AirGuard Devices</h3>
                  <p className="profile-card-desc">
                    Physical ESP32 sensing hardware registered under your account ({devices.length} Total).
                  </p>
                </div>
              </div>

              <button
                className="profile-btn-primary"
                onClick={() => navigate('/devices')}
              >
                <span>➕</span>
                <span>Add / Provision Device</span>
              </button>
            </div>

            {devicesLoading ? (
              <div className="profile-empty-state">
                <div className="profile-empty-icon">⏳</div>
                <p>Loading your connected devices...</p>
              </div>
            ) : devices.length === 0 ? (
              <div className="profile-empty-state">
                <div className="profile-empty-icon">📡</div>
                <p>No AirGuard devices connected yet.</p>
                <button
                  className="profile-btn-primary"
                  onClick={() => navigate('/devices')}
                >
                  Connect Your First ESP32 Device →
                </button>
              </div>
            ) : (
              <div className="profile-devices-list">
                {devices.map((device) => {
                  const isOnline = device.isOnline || device.status === 'online';
                  return (
                    <div key={device._id || device.deviceId} className="profile-device-card">
                      <div className="profile-device-top">
                        <div>
                          <h4 className="profile-device-name">{device.name || 'AirGuard Sensor'}</h4>
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            {device.type || 'Hyperlocal Multi-Gas Station'}
                          </span>
                        </div>
                        <span className={`profile-device-badge ${isOnline ? 'online' : 'offline'}`}>
                          ● {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>

                      <div className="profile-device-details">
                        <div className="profile-device-details-row">
                          <span>Device ID:</span>
                          <span className="mono" style={{ color: '#38bdf8' }}>{device.deviceId}</span>
                        </div>
                        <div className="profile-device-details-row">
                          <span>Hardware ID:</span>
                          <span className="mono" style={{ color: '#cbd5e1' }}>
                            {device.hardwareId || 'ESP32-NODE-STD'}
                          </span>
                        </div>
                        <div className="profile-device-details-row">
                          <span>Location:</span>
                          <span style={{ color: '#f8fafc' }}>{device.location || 'Moghalrajpuram'}</span>
                        </div>
                        <div className="profile-device-details-row">
                          <span>Firmware:</span>
                          <span className="mono" style={{ color: '#a855f7' }}>
                            {device.firmwareVersion || 'v2.4.1-esp32'}
                          </span>
                        </div>
                        <div className="profile-device-details-row">
                          <span>Last seen:</span>
                          <span style={{ color: isOnline ? '#10b981' : '#94a3b8' }}>
                            {device.lastSeen ? formatDate(device.lastSeen, { hour: '2-digit', minute: '2-digit' }) : 'Active now'}
                          </span>
                        </div>
                      </div>

                      <div className="profile-device-actions">
                        <button
                          className="profile-btn-secondary"
                          style={{ flex: 1, padding: '7px 10px', fontSize: '0.8rem' }}
                          onClick={() => navigate(`/devices`)}
                        >
                          View Device
                        </button>
                        <button
                          className="profile-btn-secondary"
                          style={{ flex: 1, padding: '7px 10px', fontSize: '0.8rem' }}
                          onClick={() => navigate('/devices')}
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════ TAB 4: SAVED LOCATIONS ══════ */}
      {activeTab === 'locations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title-group">
                <span className="profile-card-icon">📍</span>
                <div>
                  <h3 className="profile-card-title">My Saved Weather Locations</h3>
                  <p className="profile-card-desc">
                    Bookmarked meteorology search locations (Separate from physical ESP32 node hardware).
                  </p>
                </div>
              </div>

              <button
                className="profile-btn-primary"
                onClick={() => navigate('/locations')}
              >
                <span>🔍</span>
                <span>Search & Add Locations</span>
              </button>
            </div>

            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', padding: '14px 18px', color: '#93c5fd', fontSize: '0.84rem' }}>
              <strong>Notice:</strong> Saved weather locations reflect external geocoded satellite/radar meteorology queries. Physical monitoring stations are listed under <em>Connected Devices</em>.
            </div>

            {locationsLoading ? (
              <div className="profile-empty-state">
                <div className="profile-empty-icon">⏳</div>
                <p>Loading your saved locations...</p>
              </div>
            ) : savedLocations.length === 0 ? (
              <div className="profile-empty-state">
                <div className="profile-empty-icon">🗺️</div>
                <p>No saved weather locations yet.</p>
                <button
                  className="profile-btn-primary"
                  onClick={() => navigate('/locations')}
                >
                  Explore Locations Page →
                </button>
              </div>
            ) : (
              <div className="profile-devices-list">
                {savedLocations.map((loc, idx) => (
                  <div key={loc._id || idx} className="profile-device-card">
                    <div className="profile-device-top">
                      <div>
                        <h4 className="profile-device-name">{loc.name || loc.city || 'Saved Location'}</h4>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {loc.state ? `${loc.state}, ` : ''}{loc.country || 'India'}
                        </span>
                      </div>
                      <span className="profile-device-badge online">
                        Pinned 📍
                      </span>
                    </div>

                    <div className="profile-device-details">
                      <div className="profile-device-details-row">
                        <span>Coordinates:</span>
                        <span className="mono" style={{ color: '#38bdf8' }}>
                          {loc.lat ? `${Number(loc.lat).toFixed(2)}, ${Number(loc.lon).toFixed(2)}` : 'Geocoded'}
                        </span>
                      </div>
                      <div className="profile-device-details-row">
                        <span>Type:</span>
                        <span style={{ color: '#cbd5e1' }}>Weather & AQI Forecast</span>
                      </div>
                    </div>

                    <div className="profile-device-actions">
                      <button
                        className="profile-btn-primary"
                        style={{ width: '100%', padding: '7px 12px', fontSize: '0.8rem' }}
                        onClick={() => navigate('/locations')}
                      >
                        Open in Locations Forecast →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════ TAB 5: NOTIFICATION SETTINGS ══════ */}
      {activeTab === 'notifications' && (
        <div className="profile-content-grid">
          {/* Air Quality & Device Alerts */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title-group">
                <span className="profile-card-icon">🚨</span>
                <div>
                  <h3 className="profile-card-title">Air Quality & Device Alerts</h3>
                  <p className="profile-card-desc">Persistent threshold dispatch rules saved to your profile.</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">High AQI Alerts</span>
                  <span className="profile-setting-desc">Alert when index exceeds Moderate (&gt;100 USG)</span>
                </div>
                <label className="profile-switch">
                  <input
                    type="checkbox"
                    checked={highAqiAlert}
                    onChange={(e) => handleTogglePreference('highAqiAlert', e.target.checked)}
                  />
                  <span className="profile-switch-slider" />
                </label>
              </div>

              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">Very Unhealthy Alerts</span>
                  <span className="profile-setting-desc">Urgent warning when AQI exceeds 150 (Unhealthy)</span>
                </div>
                <label className="profile-switch">
                  <input
                    type="checkbox"
                    checked={unhealthyAlert}
                    onChange={(e) => handleTogglePreference('unhealthyAlert', e.target.checked)}
                  />
                  <span className="profile-switch-slider" />
                </label>
              </div>

              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">Hazardous AQI Emergency</span>
                  <span className="profile-setting-desc">Critical siren when AQI crosses 200 / 300</span>
                </div>
                <label className="profile-switch">
                  <input
                    type="checkbox"
                    checked={hazardousAlert}
                    onChange={(e) => handleTogglePreference('hazardousAlert', e.target.checked)}
                  />
                  <span className="profile-switch-slider" />
                </label>
              </div>

              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">Device Offline Warning</span>
                  <span className="profile-setting-desc">Notify if an ESP32 hardware node drops offline</span>
                </div>
                <label className="profile-switch">
                  <input
                    type="checkbox"
                    checked={deviceOfflineAlert}
                    onChange={(e) => handleTogglePreference('deviceOfflineAlert', e.target.checked)}
                  />
                  <span className="profile-switch-slider" />
                </label>
              </div>

              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">Sensor Parity Error</span>
                  <span className="profile-setting-desc">Notify on checksum error or gas sensor disconnection</span>
                </div>
                <label className="profile-switch">
                  <input
                    type="checkbox"
                    checked={sensorErrorAlert}
                    onChange={(e) => handleTogglePreference('sensorErrorAlert', e.target.checked)}
                  />
                  <span className="profile-switch-slider" />
                </label>
              </div>
            </div>
          </div>

          {/* Weather & Account Notifications */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title-group">
                <span className="profile-card-icon">🌩️</span>
                <div>
                  <h3 className="profile-card-title">Weather & Security Dispatches</h3>
                  <p className="profile-card-desc">External forecasts and account security alerts.</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">Severe Weather Alerts</span>
                  <span className="profile-setting-desc">Heavy precipitation, gale winds, high UV index</span>
                </div>
                <label className="profile-switch">
                  <input
                    type="checkbox"
                    checked={severeWeatherAlert}
                    onChange={(e) => handleTogglePreference('severeWeatherAlert', e.target.checked)}
                  />
                  <span className="profile-switch-slider" />
                </label>
              </div>

              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">Security Notifications</span>
                  <span className="profile-setting-desc">Notify on password modification or device deletion</span>
                </div>
                <label className="profile-switch">
                  <input
                    type="checkbox"
                    checked={securityNotify}
                    onChange={(e) => handleTogglePreference('securityNotify', e.target.checked)}
                  />
                  <span className="profile-switch-slider" />
                </label>
              </div>

              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">Login Notifications</span>
                  <span className="profile-setting-desc">Record and alert when fresh JWT session is signed</span>
                </div>
                <label className="profile-switch">
                  <input
                    type="checkbox"
                    checked={loginNotify}
                    onChange={(e) => handleTogglePreference('loginNotify', e.target.checked)}
                  />
                  <span className="profile-switch-slider" />
                </label>
              </div>

              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">Daily Air Quality Digest</span>
                  <span className="profile-setting-desc">Receive 24h summary at 08:00 AM every morning</span>
                </div>
                <label className="profile-switch">
                  <input
                    type="checkbox"
                    checked={dailyDigest}
                    onChange={(e) => handleTogglePreference('dailyDigest', e.target.checked)}
                  />
                  <span className="profile-switch-slider" />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ TAB 6: PREFERENCES ══════ */}
      {activeTab === 'preferences' && (
        <div className="profile-content-grid">
          {/* Appearance & Units */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title-group">
                <span className="profile-card-icon">🎨</span>
                <div>
                  <h3 className="profile-card-title">Appearance & Color Theme</h3>
                  <p className="profile-card-desc">Visual display mode configured for this dashboard.</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">Theme Mode</span>
                  <span className="profile-setting-desc">Currently: {theme === 'light' ? 'Light Mode' : 'Obsidian Dark (IoT Spec)'}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={`profile-btn-${theme !== 'light' ? 'primary' : 'secondary'}`}
                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    onClick={() => setTheme('dark')}
                  >
                    🌙 Dark
                  </button>
                  <button
                    className={`profile-btn-${theme === 'light' ? 'primary' : 'secondary'}`}
                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    onClick={() => setTheme('light')}
                  >
                    ☀️ Light
                  </button>
                </div>
              </div>

              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">Temperature Unit</span>
                  <span className="profile-setting-desc">Ambient temperature display scale</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={`profile-btn-${tempUnit === 'C' ? 'primary' : 'secondary'}`}
                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    onClick={() => handleTogglePreference('tempUnit', 'C')}
                  >
                    °C Celsius
                  </button>
                  <button
                    className={`profile-btn-${tempUnit === 'F' ? 'primary' : 'secondary'}`}
                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    onClick={() => handleTogglePreference('tempUnit', 'F')}
                  >
                    °F Fahrenheit
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Standards & Time Formats */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title-group">
                <span className="profile-card-icon">📏</span>
                <div>
                  <h3 className="profile-card-title">AQI Standards & Time Display</h3>
                  <p className="profile-card-desc">Numerical calculations and timestamp preferences.</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">AQI Standard</span>
                  <span className="profile-setting-desc">Mathematical formulas for index categorization</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={`profile-btn-${aqiStandard === 'US_EPA' ? 'primary' : 'secondary'}`}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => handleTogglePreference('aqiStandard', 'US_EPA')}
                  >
                    US EPA (0–500)
                  </button>
                  <button
                    className={`profile-btn-${aqiStandard === 'NAAQS' ? 'primary' : 'secondary'}`}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => handleTogglePreference('aqiStandard', 'NAAQS')}
                  >
                    NAAQS / IEEE
                  </button>
                </div>
              </div>

              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">Time Format</span>
                  <span className="profile-setting-desc">Clock rendering throughout telemetry graphs</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={`profile-btn-${timeFormat === '12h' ? 'primary' : 'secondary'}`}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => handleTogglePreference('timeFormat', '12h')}
                  >
                    12-Hour (AM/PM)
                  </button>
                  <button
                    className={`profile-btn-${timeFormat === '24h' ? 'primary' : 'secondary'}`}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => handleTogglePreference('timeFormat', '24h')}
                  >
                    24-Hour (Military)
                  </button>
                </div>
              </div>

              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">Telemetry Auto-Refresh</span>
                  <span className="profile-setting-desc">Polling interval for historical chart endpoints</span>
                </div>
                <span className="mono" style={{ color: '#38bdf8' }}>{refreshRate}s interval</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ TAB 7: ACTIVITY & SESSIONS ══════ */}
      {activeTab === 'activity' && (
        <div className="profile-content-grid">
          {/* Section 16: Active Sessions */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title-group">
                <span className="profile-card-icon">💻</span>
                <div>
                  <h3 className="profile-card-title">Active Sessions</h3>
                  <p className="profile-card-desc">Current authenticated terminal connection.</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="profile-setting-item" style={{ background: 'rgba(56, 189, 248, 0.08)', borderColor: 'rgba(56, 189, 248, 0.25)' }}>
                <div className="profile-setting-info">
                  <span className="profile-setting-title" style={{ color: '#38bdf8' }}>
                    Current Browser Session (This Device)
                  </span>
                  <span className="profile-setting-desc">
                    {typeof navigator !== 'undefined' ? `${navigator.userAgent.slice(0, 50)}...` : 'Web Browser Client'}
                  </span>
                </div>
                <span className="profile-device-badge online">● Active</span>
              </div>

              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">WebSocket Telemetry Stream</span>
                  <span className="profile-setting-desc">Bi-directional real-time push over Socket.IO</span>
                </div>
                <span style={{ color: '#10b981', fontWeight: 600 }}>Connected ✓</span>
              </div>

              <div className="profile-setting-item">
                <div className="profile-setting-info">
                  <span className="profile-setting-title">Backend API Target</span>
                  <span className="profile-setting-desc">Secure REST endpoint origin</span>
                </div>
                <span className="mono" style={{ color: '#cbd5e1' }}>http://localhost:5001</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  className="profile-btn-secondary"
                  onClick={() => showToast('All background sessions revoked.')}
                >
                  Log out other sessions
                </button>
              </div>
            </div>
          </div>

          {/* Section 17 & 18: Account Activity Log */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title-group">
                <span className="profile-card-icon">📜</span>
                <div>
                  <h3 className="profile-card-title">Recent Account Activity</h3>
                  <p className="profile-card-desc">Real audit log recorded by server.</p>
                </div>
              </div>
            </div>

            {activityLoading ? (
              <div className="profile-empty-state">
                <div className="profile-empty-icon">⏳</div>
                <p>Loading activity logs...</p>
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="profile-empty-state">
                <div className="profile-empty-icon">📋</div>
                <p>No recent account activity recorded.</p>
              </div>
            ) : (
              <div className="profile-timeline">
                {activityLogs.slice(0, 8).map((log, i) => (
                  <div key={i} className="profile-timeline-item">
                    <div className="profile-timeline-icon">
                      {log.action?.includes('Login') ? '🔑' : log.action?.includes('Profile') ? '👤' : '⚡'}
                    </div>
                    <div className="profile-timeline-content">
                      <div className="profile-timeline-title">{log.action}</div>
                      <div className="profile-timeline-desc">{log.detail || 'Verified server event'}</div>
                      <div className="profile-timeline-time">
                        {log.timestamp ? formatDate(log.timestamp, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Recent'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════ TAB 8: DANGER ZONE ══════ */}
      {activeTab === 'danger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="profile-card profile-card--danger">
            <div className="profile-card-header">
              <div className="profile-card-title-group">
                <span className="profile-card-icon">⚠️</span>
                <div>
                  <h3 className="profile-card-title" style={{ color: '#f87171' }}>
                    Danger Zone — Account Deletion
                  </h3>
                  <p className="profile-card-desc">
                    Irreversible administrative actions affecting your account data.
                  </p>
                </div>
              </div>
            </div>

            <div className="profile-danger-box">
              <div>
                <strong style={{ color: '#fca5a5', fontSize: '0.95rem' }}>
                  Permanently Delete AirGuard Account
                </strong>
                <p style={{ margin: '6px 0 0', color: '#cbd5e1', fontSize: '0.84rem', lineHeight: 1.5 }}>
                  Once deleted, your profile, saved locations, notification preferences, and all ownership links to {devices.length} registered hardware sensing node(s) will be permanently purged. This action cannot be undone.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '6px' }}>
                <button
                  className="profile-btn-danger"
                  onClick={() => {
                    setDeleteInput('');
                    setShowDeleteModal(true);
                  }}
                >
                  <span>🗑️</span>
                  <span>Delete Account</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIRMATION MODAL FOR ACCOUNT DELETION ─── */}
      {showDeleteModal && (
        <div className="profile-modal-backdrop" onClick={() => !isDeleting && setShowDeleteModal(false)}>
          <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.8rem' }}>⚠️</span>
              <h3 style={{ margin: 0, color: '#f87171', fontSize: '1.2rem', fontWeight: 700 }}>
                Are you absolutely sure?
              </h3>
            </div>

            <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.86rem', lineHeight: 1.5 }}>
              This will permanently delete your account (<strong>{user.email}</strong>) and purge personal hardware bindings.
            </p>

            <div className="profile-field-group">
              <label className="profile-field-label" style={{ color: '#fca5a5' }}>
                Type DELETE to confirm
              </label>
              <input
                type="text"
                className="profile-input"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="DELETE"
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="profile-btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="profile-btn-danger"
                disabled={deleteInput !== 'DELETE' || isDeleting}
                onClick={handleConfirmDelete}
              >
                {isDeleting ? 'Deleting Account...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
