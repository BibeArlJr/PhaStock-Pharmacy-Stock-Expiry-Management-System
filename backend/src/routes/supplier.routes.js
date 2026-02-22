import { Router } from 'express';

import * as SupplierController from '../controllers/supplier.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createSupplierSchema,
  idParamSchema,
  patchSupplierSchema,
  supplierListQuerySchema,
} from '../validators/supplier.validators.js';

const router = Router();

router.use(requireAuth);

router.post('/', validate({ body: createSupplierSchema }), SupplierController.createSupplier);
router.get('/', validate({ query: supplierListQuerySchema }), SupplierController.listSuppliers);
router.get('/:id', validate({ params: idParamSchema }), SupplierController.getSupplierById);
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: patchSupplierSchema }),
  SupplierController.patchSupplier
);

export default router;
