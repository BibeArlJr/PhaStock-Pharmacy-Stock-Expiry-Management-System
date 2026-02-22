import { Router } from 'express';

import * as AuthController from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema } from '../validators/auth.validators.js';

const router = Router();

router.post('/login', validate({ body: loginSchema }), AuthController.login);
router.get('/me', requireAuth, AuthController.getMe);

export default router;
