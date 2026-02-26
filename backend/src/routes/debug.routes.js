import { Router } from 'express';

import { getBatchStockCountDebug } from '../controllers/debug.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/batch-stock-count', requireAuth, getBatchStockCountDebug);

export default router;
