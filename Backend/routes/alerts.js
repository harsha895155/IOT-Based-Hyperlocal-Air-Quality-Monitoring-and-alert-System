const express = require('express');
const router = express.Router();

const { getAlerts, acknowledgeAlert, acknowledgeAll } = require('../controllers/alertsController');
const { optionalAuth, protect } = require('../middleware/auth');

router.get('/', optionalAuth, getAlerts);
router.patch('/acknowledge-all', optionalAuth, acknowledgeAll);
router.patch('/:id/acknowledge', optionalAuth, acknowledgeAlert);

module.exports = router;
