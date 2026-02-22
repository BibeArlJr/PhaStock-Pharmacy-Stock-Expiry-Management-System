import { Router } from 'express';

import * as SettingsController from '../controllers/settings.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { patchSettingsSchema } from '../validators/settings.validators.js';

const router = Router();

router.get('/', requireAuth, SettingsController.getSettings);
router.patch('/', requireAuth, validate({ body: patchSettingsSchema }), SettingsController.patchSettings);

export default router;
