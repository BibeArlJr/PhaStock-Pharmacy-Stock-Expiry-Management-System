const SearchService = require('../services/search.service.js');
const ApiResponse = require('../utils/ApiResponse.js');
const asyncHandler = require('../utils/asyncHandler.js');
const receiptSearch = asyncHandler(async (req, res) => {
  const pharmacyId = req.user?.pharmacy?.id || null;
  const data = await SearchService.receiptSearch(
    {
    supplierId: req.query.supplier_id,
    invoiceNumber: req.query.invoice_number,
    medicineId: req.query.medicine_id,
    pack: req.query.pack,
    batchNo: req.query.batch_no,
    dateFrom: req.query.date_from,
    dateTo: req.query.date_to,
    page: req.query.page,
    limit: req.query.limit,
    },
    pharmacyId
  );

  return ApiResponse.ok(res, data);
});
const priceHistory = asyncHandler(async (req, res) => {
  const pharmacyId = req.user?.pharmacy?.id || null;
  const data = await SearchService.priceHistory(req.query.medicine_id, pharmacyId, req.query.limit);

  return ApiResponse.ok(res, data);
});

module.exports = { receiptSearch, priceHistory };
