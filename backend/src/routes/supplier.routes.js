const { Router } = require('express');
const SupplierController = require('../controllers/supplier.controller.js');
const { requireAuth } = require('../middlewares/auth.js');
const { validate } = require('../middlewares/validate.js');
const { createSupplierSchema, idParamSchema, patchSupplierSchema, supplierListQuerySchema } = require('../validators/supplier.validators.js');
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
router.delete('/:id', validate({ params: idParamSchema }), SupplierController.deleteSupplier);

module.exports = router;
