const { Router } = require('express');const { NODE_ENV } = require('../config/env.js');
const { getBatchStockCountDebug } = require('../controllers/debug.controller.js');
const { requireAuth } = require('../middlewares/auth.js');
const router = Router();

if (NODE_ENV === 'development') {
  router.get('/batch-stock-count', requireAuth, getBatchStockCountDebug);
}

module.exports = router;
