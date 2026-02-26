import { Router } from 'express';

import * as AuthController from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  loginSchema,
  signupPharmacySchema,
  verificationConfirmBodySchema,
  verificationInfoQuerySchema,
  verificationResendAliasBodySchema,
  verificationResendBodySchema,
} from '../validators/auth.validators.js';

const router = Router();

router.post('/signup-pharmacy', validate({ body: signupPharmacySchema }), AuthController.signupPharmacy);

router.get('/verification', validate({ query: verificationInfoQuerySchema }), AuthController.getVerificationInfo);
router.post(
  '/verification/resend',
  validate({ body: verificationResendBodySchema }),
  AuthController.resendVerification
);
router.post(
  '/verification/confirm',
  validate({ body: verificationConfirmBodySchema }),
  AuthController.confirmVerification
);

router.post(
  '/resend-verification-code',
  validate({ body: verificationResendAliasBodySchema }),
  AuthController.resendVerificationAlias
);
router.post(
  '/verify-email-code',
  validate({ body: verificationConfirmBodySchema }),
  AuthController.confirmVerification
);

router.post('/login', validate({ body: loginSchema }), AuthController.login);
router.get('/me', requireAuth, AuthController.getMe);

export default router;
