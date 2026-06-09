const { Router } = require('express');
const StockIssueController = require('../controllers/stockIssue.controller.js');
const { requireAuth } = require('../middlewares/auth.js');
const { validate } = require('../middlewares/validate.js');
const { fefoSuggestQuerySchema, createStockIssueSchema, listStockIssueQuerySchema, voidStockIssueSchema, voidStockIssuesBulkSchema, updateStockIssueSchema } = require('../validators/stockIssue.validators.js');
const router = Router();

router.use(requireAuth);

router.get('/fefo-suggest', validate({ query: fefoSuggestQuerySchema }), StockIssueController.fefoSuggest);

router.post('/', validate({ body: createStockIssueSchema }), StockIssueController.createStockIssue);
router.get('/', validate({ query: listStockIssueQuerySchema }), StockIssueController.listStockIssues);
router.get('/:id', StockIssueController.getStockIssue);
router.patch('/:id', validate({ body: updateStockIssueSchema }), StockIssueController.updateStockIssue);
router.post('/:id/void', validate({ body: voidStockIssueSchema }), StockIssueController.voidStockIssue);
router.post('/void-bulk', validate({ body: voidStockIssuesBulkSchema }), StockIssueController.voidStockIssuesBulk);

module.exports = router;
