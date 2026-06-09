const { Router } = require('express');
const ReceiptController = require('../controllers/receipt.controller.js');
const { requireAuth } = require('../middlewares/auth.js');
const { validate } = require('../middlewares/validate.js');
const { receiptBulkDeleteSchema, createReceiptSchema, receiptIdParamSchema, receiptListQuerySchema, updateReceiptSchema } = require('../validators/receipt.validators.js');
const router = Router();

router.use(requireAuth);

router.post('/', validate({ body: createReceiptSchema }), ReceiptController.createReceipt);
router.get('/', validate({ query: receiptListQuerySchema }), ReceiptController.listReceipts);
router.delete('/', validate({ body: receiptBulkDeleteSchema }), ReceiptController.deleteReceiptsBulk);
router.get('/:id', validate({ params: receiptIdParamSchema }), ReceiptController.getReceiptDetail);
router.put(
  '/:id',
  validate({ params: receiptIdParamSchema, body: updateReceiptSchema }),
  ReceiptController.updateReceipt
);
router.delete('/:id', validate({ params: receiptIdParamSchema }), ReceiptController.deleteReceipt);

module.exports = router;
