const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', getMe);
router.put('/profile', updateProfile);
router.patch('/profile', updateProfile);
router.patch('/preferences', updatePreferences);
router.patch('/change-password', changePassword);
router.get('/activity', getActivity);
router.delete('/account', deleteAccount);

module.exports = router;
