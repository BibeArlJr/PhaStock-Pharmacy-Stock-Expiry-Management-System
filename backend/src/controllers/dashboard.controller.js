import * as DashboardService from '../services/dashboard.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getSummary = asyncHandler(async (req, res) => {
  const data = await DashboardService.getDashboardSummary();
  return ApiResponse.ok(res, data);
});
