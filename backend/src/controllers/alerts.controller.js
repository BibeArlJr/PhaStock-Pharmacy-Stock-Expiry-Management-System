const AlertsService = require('../services/alerts.service.js');
const ApiResponse = require('../utils/ApiResponse.js');
const asyncHandler = require('../utils/asyncHandler.js');
const getAlerts = asyncHandler(async (req, res) => {
  const pharmacyId = req.user?.pharmacyId ?? req.user?.pharmacy?.id ?? null;
  const data = await AlertsService.getAlerts({ pharmacyId });
  return ApiResponse.ok(res, data);
});

module.exports = { getAlerts };
