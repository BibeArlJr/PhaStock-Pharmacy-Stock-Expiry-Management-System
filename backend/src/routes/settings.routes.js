const { Router } = require('express');
const SettingsController = require('../controllers/settings.controller.js');
const { requireAuth } = require('../middlewares/auth.js');
const { validate } = require('../middlewares/validate.js');
const { patchSettingsSchema } = require('../validators/settings.validators.js');
const router = Router();

router.get('/', requireAuth, SettingsController.getSettings);
router.patch('/', requireAuth, validate({ body: patchSettingsSchema }), SettingsController.patchSettings);

module.exports = router;
