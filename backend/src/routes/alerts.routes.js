const { Router } = require('express');
const AlertsController = require('../controllers/alerts.controller.js');
const { requireAuth } = require('../middlewares/auth.js');
const router = Router();

router.get('/', requireAuth, AlertsController.getAlerts);

module.exports = router;
