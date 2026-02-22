import { Router } from 'express';

import * as ReceiptController from '../controllers/receipt.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createReceiptSchema,
  receiptIdParamSchema,
  receiptListQuerySchema,
} from '../validators/receipt.validators.js';

const router = Router();

router.use(requireAuth);

router.post('/', validate({ body: createReceiptSchema }), ReceiptController.createReceipt);
router.get('/', validate({ query: receiptListQuerySchema }), ReceiptController.listReceipts);
router.get('/:id', validate({ params: receiptIdParamSchema }), ReceiptController.getReceiptDetail);

export default router;
