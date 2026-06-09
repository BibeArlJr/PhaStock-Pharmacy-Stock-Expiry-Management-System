const ApiError = require('../utils/ApiError.js');
const ApiResponse = require('../utils/ApiResponse.js');
const asyncHandler = require('../utils/asyncHandler.js');
const StockIssueService = require('../services/stockIssue.service.js');
const fefoSuggest = asyncHandler(async (req, res) => {
  const data = await StockIssueService.fefoSuggest({
    medicineId: req.query.medicine_id,
    pharmacyId: req.user?.pharmacy?.id || null,
  });
  return ApiResponse.ok(res, data);
});
const createStockIssue = asyncHandler(async (req, res) => {
  const data = await StockIssueService.createStockIssue(req.body, req.user?.pharmacy?.id, req.user);
  return ApiResponse.created(res, { stock_issue: data });
});
const listStockIssues = asyncHandler(async (req, res) => {
  const result = await StockIssueService.listStockIssues({
    pharmacyId: req.user?.pharmacy?.id || null,
    page: req.query.page,
    limit: req.query.limit,
    status: req.query.status,
    q: req.query.q,
    dateFrom: req.query.date_from,
    dateTo: req.query.date_to,
  });
  return ApiResponse.ok(res, result);
});
const getStockIssue = asyncHandler(async (req, res) => {
  const data = await StockIssueService.getStockIssueById(req.params.id, req.user?.pharmacy?.id || null);
  if (!data) {
    throw new ApiError(404, 'NOT_FOUND', 'Stock issue not found');
  }
  return ApiResponse.ok(res, { stock_issue: data });
});
const updateStockIssue = asyncHandler(async (req, res) => {
  const data = await StockIssueService.updateStockIssue({ id: req.params.id, ...req.body }, req.user);
  return ApiResponse.ok(res, { stock_issue: data });
});
const voidStockIssue = asyncHandler(async (req, res) => {
  const data = await StockIssueService.voidStockIssue(
    { id: req.params.id, reason: req.body.reason },
    req.user?.pharmacy?.id,
    req.user
  );
  return ApiResponse.ok(res, { stock_issue: data });
});
const voidStockIssuesBulk = asyncHandler(async (req, res) => {
  const data = await StockIssueService.voidStockIssuesBulk(
    { ids: req.body.ids, reason: req.body.reason },
    req.user
  );
  return ApiResponse.ok(res, { result: data });
});

module.exports = { fefoSuggest, createStockIssue, listStockIssues, getStockIssue, updateStockIssue, voidStockIssue, voidStockIssuesBulk };
