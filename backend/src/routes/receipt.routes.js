import { Router } from 'express';

import * as ReceiptController from '../controllers/receipt.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  receiptBulkDeleteSchema,
  createReceiptSchema,
  receiptIdParamSchema,
  receiptListQuerySchema,
  updateReceiptSchema,
} from '../validators/receipt.validators.js';

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

export default router;
