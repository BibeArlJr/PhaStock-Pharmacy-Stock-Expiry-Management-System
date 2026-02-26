import { Router } from 'express';

import * as BatchStockController from '../controllers/batchStock.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  batchStockIdParamSchema,
  batchStockListQuerySchema,
  manualBatchStockCreateSchema,
  manualBatchStockUpdateSchema,
} from '../validators/batchStock.validators.js';

const router = Router();

router.get('/', requireAuth, validate({ query: batchStockListQuerySchema }), BatchStockController.listBatchStocks);
router.post('/manual', requireAuth, validate({ body: manualBatchStockCreateSchema }), BatchStockController.manualAddBatchStock);
router.get('/:id/source', requireAuth, validate({ params: batchStockIdParamSchema }), BatchStockController.getBatchStockSource);
router.put(
  '/:id',
  requireAuth,
  validate({ params: batchStockIdParamSchema, body: manualBatchStockUpdateSchema }),
  BatchStockController.updateManualBatchStock
);
router.delete('/:id', requireAuth, validate({ params: batchStockIdParamSchema }), BatchStockController.deleteBatchStock);
router.get('/:id', requireAuth, validate({ params: batchStockIdParamSchema }), BatchStockController.getBatchStockDetail);

export default router;
