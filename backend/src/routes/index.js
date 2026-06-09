const { Router } = require('express');const { NODE_ENV } = require('../config/env.js');
const alertsRoutes = require('./alerts.routes.js');
const authRoutes = require('./auth.routes.js');
const batchStockRoutes = require('./batchStock.routes.js');
const dashboardRoutes = require('./dashboard.routes.js');
const debugRoutes = require('./debug.routes.js');
const medicineRoutes = require('./medicine.routes.js');
const receiptRoutes = require('./receipt.routes.js');
const searchRoutes = require('./search.routes.js');
const settingsRoutes = require('./settings.routes.js');
const stockIssueRoutes = require('./stockIssue.routes.js');
const supplierRoutes = require('./supplier.routes.js');
const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({ ok: true, env: NODE_ENV });
});

router.use('/auth', authRoutes);
router.use('/settings', settingsRoutes);
router.use('/medicines', medicineRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/purchase-receipts', receiptRoutes);
router.use('/receipts', receiptRoutes);
router.use('/batch-stocks', batchStockRoutes);
router.use('/stock-issues', stockIssueRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/alerts', alertsRoutes);
router.use('/debug', debugRoutes);
router.use('/', searchRoutes);

module.exports = router;
