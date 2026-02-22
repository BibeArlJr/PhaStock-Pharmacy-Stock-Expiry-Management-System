import { Router } from 'express';

import * as MedicineController from '../controllers/medicine.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createMedicineSchema,
  idParamSchema,
  medicineListQuerySchema,
  patchMedicineSchema,
} from '../validators/medicine.validators.js';

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

export default router;
