import { Router } from 'express';

import * as StockIssueController from '../controllers/stockIssue.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  fefoSuggestQuerySchema,
  createStockIssueSchema,
  listStockIssueQuerySchema,
  voidStockIssueSchema,
  voidStockIssuesBulkSchema,
  updateStockIssueSchema,
} from '../validators/stockIssue.validators.js';

const router = Router();

router.use(requireAuth);

router.get('/fefo-suggest', validate({ query: fefoSuggestQuerySchema }), StockIssueController.fefoSuggest);

router.post('/', validate({ body: createStockIssueSchema }), StockIssueController.createStockIssue);
router.get('/', validate({ query: listStockIssueQuerySchema }), StockIssueController.listStockIssues);
router.get('/:id', StockIssueController.getStockIssue);
router.patch('/:id', validate({ body: updateStockIssueSchema }), StockIssueController.updateStockIssue);
router.post('/:id/void', validate({ body: voidStockIssueSchema }), StockIssueController.voidStockIssue);
router.post('/void-bulk', validate({ body: voidStockIssuesBulkSchema }), StockIssueController.voidStockIssuesBulk);

export default router;
