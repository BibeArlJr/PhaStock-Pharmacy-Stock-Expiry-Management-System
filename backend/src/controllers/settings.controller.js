import * as SettingsService from '../services/settings.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const toResponse = (settings) => ({
  low_stock_limit_boxes: settings.lowStockLimitBoxes,
  expiry_alert_days: settings.expiryAlertDays,
  updated_at: settings.updatedAt.toISOString(),
});

const toUpdatePayload = (body) => {
  const payload = {};

  if (body.low_stock_limit_boxes !== undefined) {
    payload.lowStockLimitBoxes = body.low_stock_limit_boxes;
  }

  if (body.expiry_alert_days !== undefined) {
    payload.expiryAlertDays = body.expiry_alert_days;
  }

  return payload;
};

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await SettingsService.getSettings();
  return ApiResponse.ok(res, toResponse(settings));
});

export const patchSettings = asyncHandler(async (req, res) => {
  const payload = toUpdatePayload(req.body);
  await SettingsService.updateSettings(payload, req.user.id);

  return ApiResponse.ok(res, {
    message: 'Settings updated',
  });
});
