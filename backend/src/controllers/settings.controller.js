const SettingsService = require('../services/settings.service.js');
const asyncHandler = require('../utils/asyncHandler.js');
const toResponse = (settings) => ({
  expiry_alert_days: settings.expiryAlertDays,
  low_stock_limit: settings.lowStockLimitBoxes,
  fefo_mode: settings.fefoMode || 'STRICT',
  default_page_size: settings.defaultPageSize ?? 20,
  updated_at: settings.updatedAt.toISOString(),
});

const toUpdatePayload = (body) => {
  const payload = {};

  // frontend uses low_stock_limit; accept both keys
  if (body.low_stock_limit !== undefined) {
    payload.lowStockLimitBoxes = body.low_stock_limit;
  }

  if (body.low_stock_limit_boxes !== undefined) {
    payload.lowStockLimitBoxes = body.low_stock_limit_boxes;
  }

  if (body.expiry_alert_days !== undefined) {
    payload.expiryAlertDays = body.expiry_alert_days;
  }

  if (body.fefo_mode !== undefined) {
    payload.fefoMode = body.fefo_mode;
  }

  if (body.default_page_size !== undefined) {
    payload.defaultPageSize = body.default_page_size;
  }

  return payload;
};
const getSettings = asyncHandler(async (req, res) => {
  const settings = await SettingsService.getSettings(req.user.pharmacy.id);
  return res.status(200).json({
    success: true,
    data: {
      settings: toResponse(settings),
    },
  });
});
const patchSettings = asyncHandler(async (req, res) => {
  const payload = toUpdatePayload(req.body);

  const updated = await SettingsService.updateSettings(payload, req.user.id, req.user.pharmacy.id);

  return res.status(200).json({
    success: true,
    data: {
      settings: toResponse(updated),
    },
  });
});

module.exports = { getSettings, patchSettings };
