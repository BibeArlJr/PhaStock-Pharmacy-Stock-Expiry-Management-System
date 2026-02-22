import { Router } from 'express';

import * as BatchController from '../controllers/batch.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { batchListQuerySchema, batchLookupQuerySchema } from '../validators/batch.validators.js';

const router = Router();

router.get('/', requireAuth, validate({ query: batchListQuerySchema }), BatchController.listBatches);
router.get('/lookup', requireAuth, validate({ query: batchLookupQuerySchema }), BatchController.lookupBatch);

export default router;
