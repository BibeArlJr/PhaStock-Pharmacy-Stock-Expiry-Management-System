import { Router } from 'express';

import { NODE_ENV } from '../config/env.js';
import alertsRoutes from './alerts.routes.js';
import authRoutes from './auth.routes.js';
import batchRoutes from './batch.routes.js';
import batchStockRoutes from './batchStock.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import debugRoutes from './debug.routes.js';
import medicineRoutes from './medicine.routes.js';
import receiptRoutes from './receipt.routes.js';
import searchRoutes from './search.routes.js';
import settingsRoutes from './settings.routes.js';
import stockIssueRoutes from './stockIssue.routes.js';
import supplierRoutes from './supplier.routes.js';

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
router.use('/batches', batchRoutes);
router.use('/batch-stocks', batchStockRoutes);
router.use('/stock-issues', stockIssueRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/alerts', alertsRoutes);
router.use('/debug', debugRoutes);
router.use('/', searchRoutes);

export default router;
