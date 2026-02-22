import * as AlertsService from '../services/alerts.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const normalizePagination = (query) => ({
  page: query.page ? Math.max(1, Number(query.page)) : 1,
  limit: query.limit ? Math.min(100, Math.max(1, Number(query.limit))) : 20,
  sort: query.sort,
});

export const listExpiringSoonAlerts = asyncHandler(async (req, res) => {
  const data = await AlertsService.listAlertBatches({
    type: 'EXPIRING_SOON',
    ...normalizePagination(req.query),
  });

  return ApiResponse.ok(res, data);
});

export const listExpiredAlerts = asyncHandler(async (req, res) => {
  const data = await AlertsService.listAlertBatches({
    type: 'EXPIRED',
    ...normalizePagination(req.query),
  });

  return ApiResponse.ok(res, data);
});

export const listLowStockAlerts = asyncHandler(async (req, res) => {
  const data = await AlertsService.listAlertBatches({
    type: 'LOW_STOCK',
    ...normalizePagination(req.query),
  });

  return ApiResponse.ok(res, data);
});

export const listOutOfStockAlerts = asyncHandler(async (req, res) => {
  const data = await AlertsService.listAlertBatches({
    type: 'OUT_OF_STOCK',
    ...normalizePagination(req.query),
  });

  return ApiResponse.ok(res, data);
});
