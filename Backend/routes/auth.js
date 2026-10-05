const express = require('express');
const router = express.Router();
const { register, login, getMe, updatePreferences } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/me', getMe);
router.patch('/preferences', updatePreferences);

module.exports = router;
