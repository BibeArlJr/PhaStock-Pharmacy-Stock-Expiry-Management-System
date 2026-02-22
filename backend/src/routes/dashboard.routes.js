import { Router } from 'express';

import * as DashboardController from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/summary', requireAuth, DashboardController.getSummary);

export default router;
