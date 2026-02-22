import { Router } from 'express';

import * as AlertsController from '../controllers/alerts.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/expiring-soon', requireAuth, AlertsController.listExpiringSoonAlerts);
router.get('/expired', requireAuth, AlertsController.listExpiredAlerts);
router.get('/low-stock', requireAuth, AlertsController.listLowStockAlerts);
router.get('/out-of-stock', requireAuth, AlertsController.listOutOfStockAlerts);

export default router;
