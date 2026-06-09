const { Router } = require('express');
const BatchStockController = require('../controllers/batchStock.controller.js');
const { requireAuth } = require('../middlewares/auth.js');
const { validate } = require('../middlewares/validate.js');
const { batchStockIdParamSchema, batchStockListQuerySchema, manualBatchStockCreateSchema, manualBatchStockUpdateSchema } = require('../validators/batchStock.validators.js');
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

module.exports = router;
