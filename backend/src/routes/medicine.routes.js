const { Router } = require('express');
const MedicineController = require('../controllers/medicine.controller.js');
const { requireAuth } = require('../middlewares/auth.js');
const { validate } = require('../middlewares/validate.js');
const { createMedicineSchema, idParamSchema, medicineListQuerySchema, patchMedicineSchema } = require('../validators/medicine.validators.js');
const router = Router();

router.use(requireAuth);

router.post('/', validate({ body: createMedicineSchema }), MedicineController.createMedicine);
router.get('/', validate({ query: medicineListQuerySchema }), MedicineController.listMedicines);
router.get('/:id', validate({ params: idParamSchema }), MedicineController.getMedicineById);
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: patchMedicineSchema }),
  MedicineController.patchMedicine
);
router.delete('/:id', validate({ params: idParamSchema }), MedicineController.deleteMedicine);

module.exports = router;
