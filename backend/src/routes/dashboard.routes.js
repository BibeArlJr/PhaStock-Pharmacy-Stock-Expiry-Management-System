const { Router } = require('express');
const DashboardController = require('../controllers/dashboard.controller.js');
const { requireAuth } = require('../middlewares/auth.js');
const router = Router();

router.get('/summary', requireAuth, DashboardController.getSummary);

module.exports = router;
