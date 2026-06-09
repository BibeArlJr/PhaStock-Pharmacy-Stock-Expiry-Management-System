const DashboardService = require('../services/dashboard.service.js');
const ApiResponse = require('../utils/ApiResponse.js');
const asyncHandler = require('../utils/asyncHandler.js');
const getSummary = asyncHandler(async (req, res) => {
  const data = await DashboardService.getDashboardSummary(req.user?.pharmacy?.id || null);
  return ApiResponse.ok(res, data);
});

module.exports = { getSummary };
