const { Router } = require('express');
const SearchController = require('../controllers/search.controller.js');
const { requireAuth } = require('../middlewares/auth.js');
const { validate } = require('../middlewares/validate.js');
const { priceHistoryQuerySchema, receiptSearchQuerySchema } = require('../validators/search.validators.js');
const router = Router();

router.get('/receipt-search', requireAuth, validate({ query: receiptSearchQuerySchema }), SearchController.receiptSearch);
router.get('/price-history', requireAuth, validate({ query: priceHistoryQuerySchema }), SearchController.priceHistory);

module.exports = router;
