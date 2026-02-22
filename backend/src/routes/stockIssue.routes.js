import { Router } from 'express';

import * as StockIssueController from '../controllers/stockIssue.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createStockIssueSchema,
  fefoSuggestQuerySchema,
  listStockIssueQuerySchema,
} from '../validators/stockIssue.validators.js';

const router = Router();

router.use(requireAuth);

router.get('/fefo-suggest', validate({ query: fefoSuggestQuerySchema }), StockIssueController.fefoSuggest);
router.post('/', validate({ body: createStockIssueSchema }), StockIssueController.createStockIssue);
router.get('/', validate({ query: listStockIssueQuerySchema }), StockIssueController.listStockIssues);

export default router;
