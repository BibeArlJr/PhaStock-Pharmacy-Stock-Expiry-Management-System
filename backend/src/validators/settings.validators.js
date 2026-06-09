const { z } = require('zod');
const patchSettingsSchema = z
  .object({
    // frontend sends low_stock_limit; keep low_stock_limit_boxes for backwards compatibility
    low_stock_limit: z.number().int().min(0).optional(),
    low_stock_limit_boxes: z.number().int().min(0).optional(),
    expiry_alert_days: z.number().int().min(0).optional(),
    fefo_mode: z.boolean().optional(),
    default_page_size: z.number().int().min(5).max(100).optional(),
  })
  .refine(
    (data) =>
      data.low_stock_limit !== undefined ||
      data.low_stock_limit_boxes !== undefined ||
      data.expiry_alert_days !== undefined ||
      data.fefo_mode !== undefined ||
      data.default_page_size !== undefined,
    {
      message: 'At least one field is required',
    }
  );

module.exports = { patchSettingsSchema };
