import { Router } from 'express';

import * as SearchController from '../controllers/search.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  priceHistoryQuerySchema,
  receiptSearchQuerySchema,
} from '../validators/search.validators.js';

const router = Router();

router.get('/receipt-search', requireAuth, validate({ query: receiptSearchQuerySchema }), SearchController.receiptSearch);
router.get('/price-history', requireAuth, validate({ query: priceHistoryQuerySchema }), SearchController.priceHistory);

export default router;
