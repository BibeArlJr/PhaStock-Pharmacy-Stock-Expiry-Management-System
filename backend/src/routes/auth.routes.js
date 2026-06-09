const { Router } = require('express');
const AuthController = require('../controllers/auth.controller.js');
const { forgotPassword, resetPassword } = require('../controllers/passwordReset.controller.js');
const { requireAuth } = require('../middlewares/auth.js');
const { validate } = require('../middlewares/validate.js');
const { loginSchema, signupPharmacySchema, verificationConfirmBodySchema, verificationInfoQuerySchema, verificationResendBodySchema, forgotPasswordSchema, resetPasswordSchema } = require('../validators/auth.validators.js');
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

router.post('/login', validate({ body: loginSchema }), AuthController.login);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', validate({ body: resetPasswordSchema }), AuthController.resetPassword);
router.put('/reset-password/:token', resetPassword);

router.get('/me', requireAuth, AuthController.getMe);

module.exports = router;
