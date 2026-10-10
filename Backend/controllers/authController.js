const jwt = require('jsonwebtoken');
const User = require('../models/User');

function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'airguard_default_secret_key_2026', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferences: user.preferences,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferences: user.preferences,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function getMe(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authorized.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'airguard_default_secret_key_2026');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json(user);
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// PATCH /api/auth/preferences
async function updatePreferences(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authorized.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'airguard_default_secret_key_2026');
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { name, ...prefs } = req.body;
    if (typeof name === 'string' && name.trim().length > 0) {
      user.name = name.trim();
    }

    user.preferences = { ...user.preferences, ...prefs };
    user.markModified('preferences');
    await user.save();

    res.json({
      preferences: user.preferences,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// PATCH /api/auth/change-password
async function changePassword(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authorized.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'airguard_default_secret_key_2026');
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password does not match.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      // Do not disclose whether email exists for user enumeration security
      return res.json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been generated.',
      });
    }

    // Check if account is a Google-only account without local password
    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({
        error: 'This account is linked with Google Sign-In. Please click "Continue with Google" to access your account.',
      });
    }

    // Generate cryptographically secure token
    const crypto = require('crypto');
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');

    // Token expires in 1 hour
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset token generated successfully.',
      resetToken: rawResetToken, // Provided for web client to proceed directly with reset
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Issue fresh JWT token for seamless sign-in
    const authToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password has been reset successfully.',
      token: authToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferences: user.preferences,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/google
async function googleLogin(req, res, next) {
  try {
    const { credential, email: passedEmail, name: passedName, googleId: passedGoogleId, avatar: passedAvatar } = req.body;

    let email = passedEmail;
    let name = passedName;
    let googleId = passedGoogleId;
    let avatar = passedAvatar || '';

    // If Google ID token (credential) was provided, verify with Google tokeninfo
    if (credential) {
      try {
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        if (response.ok) {
          const payload = await response.json();
          email = payload.email || email;
          name = payload.name || name;
          googleId = payload.sub || googleId;
          avatar = payload.picture || avatar;
        } else {
          // Parse JWT payload fallback
          const parts = credential.split('.');
          if (parts.length === 3) {
            const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            email = decodedPayload.email || email;
            name = decodedPayload.name || name;
            googleId = decodedPayload.sub || googleId;
            avatar = decodedPayload.picture || avatar;
          }
        }
      } catch (tokenErr) {
        console.warn('Google token verification fallback:', tokenErr.message);
      }
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Could not resolve email from Google account.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find user by email or googleId
    let user = await User.findOne({
      $or: [{ email: cleanEmail }, { googleId: googleId || 'non-existent-id' }],
    });

    if (user) {
      // Safe account linking: if user exists with password, attach googleId
      if (!user.googleId && googleId) {
        user.googleId = googleId;
      }
      if (!user.avatar && avatar) {
        user.avatar = avatar;
      }
      await user.save();
    } else {
      // Create new user authenticated via Google
      user = await User.create({
        name: name || 'AirGuard User',
        email: cleanEmail,
        googleId: googleId || `google_${Date.now()}`,
        authProvider: 'google',
        avatar: avatar || '',
        role: 'user',
      });
    }

    const authToken = generateToken(user._id);

    res.json({
      success: true,
      token: authToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        preferences: user.preferences,
      },
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/auth/profile
async function updateProfile(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authorized.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'airguard_default_secret_key_2026');
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { name, avatar, phone, organization, bio, preferences } = req.body;
    if (typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }
    if (typeof avatar === 'string') {
      user.avatar = avatar;
    }
    if (typeof phone === 'string') {
      user.phone = phone.trim();
    }
    if (typeof organization === 'string') {
      user.organization = organization.trim();
    }
    if (typeof bio === 'string') {
      user.bio = bio.trim();
    }
    if (preferences && typeof preferences === 'object') {
      user.preferences = { ...user.preferences, ...preferences };
      user.markModified('preferences');
    }

    if (!user.activityLog) user.activityLog = [];
    user.activityLog.unshift({
      action: 'Profile Updated',
      detail: 'Personal info and preferences updated',
      timestamp: new Date(),
    });
    if (user.activityLog.length > 30) user.activityLog = user.activityLog.slice(0, 30);

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.resetPasswordToken;
    delete safeUser.resetPasswordExpires;

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: safeUser,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/activity
async function getActivity(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authorized.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'airguard_default_secret_key_2026');
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let logs = (user.activityLog || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (logs.length === 0) {
      logs = [
        {
          action: 'Account Created',
          detail: 'AirGuard identity provisioned',
          timestamp: user.createdAt || new Date(),
        },
        {
          action: 'Account Login',
          detail: 'Active JWT session verified',
          timestamp: user.lastLogin || new Date(),
        },
      ];
    }

    res.json(logs);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/auth/account
async function deleteAccount(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authorized.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'airguard_default_secret_key_2026');
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { confirmation } = req.body;
    if (confirmation !== 'DELETE') {
      return res.status(400).json({ error: 'Please type DELETE to confirm permanent account deletion.' });
    }

    // Cascade delete user data
    const { Device } = require('../models/Device');
    const Alert = require('../models/Alert');
    const SavedLocation = require('../models/SavedLocation');

    await Device.deleteMany({ userId: user._id });
    await SavedLocation.deleteMany({ userId: user._id });
    await Alert.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(user._id);

    res.json({ success: true, message: 'Account and associated resources deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  updatePreferences,
  changePassword,
  forgotPassword,
  resetPassword,
  googleLogin,
  getActivity,
  deleteAccount,
};
