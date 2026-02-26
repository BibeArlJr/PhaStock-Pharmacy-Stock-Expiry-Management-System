import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as StockIssueService from '../services/stockIssue.service.js';

export const fefoSuggest = asyncHandler(async (req, res) => {
  const data = await StockIssueService.fefoSuggest({ medicineId: req.query.medicine_id });
  return ApiResponse.ok(res, data);
});

export const createStockIssue = asyncHandler(async (req, res) => {
  const data = await StockIssueService.createStockIssue(req.body, req.user);
  return ApiResponse.created(res, { stock_issue: data });
});

export const listStockIssues = asyncHandler(async (req, res) => {
  const result = await StockIssueService.listStockIssues({
    page: req.query.page,
    limit: req.query.limit,
    status: req.query.status,
    q: req.query.q,
    dateFrom: req.query.date_from,
    dateTo: req.query.date_to,
  });
  return ApiResponse.ok(res, result);
});

export const getStockIssue = asyncHandler(async (req, res) => {
  const data = await StockIssueService.getStockIssueById(req.params.id);
  if (!data) {
    throw new ApiError(404, 'NOT_FOUND', 'Stock issue not found');
  }
  return ApiResponse.ok(res, { stock_issue: data });
});

export const updateStockIssue = asyncHandler(async (req, res) => {
  const data = await StockIssueService.updateStockIssue(
    { id: req.params.id, ...req.body },
    req.user
  );
  return ApiResponse.ok(res, { stock_issue: data });
});

export const voidStockIssue = asyncHandler(async (req, res) => {
  const data = await StockIssueService.voidStockIssue(
    { id: req.params.id, reason: req.body.reason },
    req.user
  );
  return ApiResponse.ok(res, { stock_issue: data });
});

export const voidStockIssuesBulk = asyncHandler(async (req, res) => {
  const data = await StockIssueService.voidStockIssuesBulk(
    { ids: req.body.ids, reason: req.body.reason },
    req.user
  );
  return ApiResponse.ok(res, { result: data });
});
