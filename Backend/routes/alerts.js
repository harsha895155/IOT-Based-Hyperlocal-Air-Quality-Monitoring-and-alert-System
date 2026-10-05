const express = require('express');
const router = express.Router();

const { getAlerts, acknowledgeAlert } = require('../controllers/alertsController');

router.get('/', getAlerts);
router.patch('/:id/acknowledge', acknowledgeAlert);

module.exports = router;
