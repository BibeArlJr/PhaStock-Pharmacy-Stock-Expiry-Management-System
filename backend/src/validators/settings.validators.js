import { z } from 'zod';

export const patchSettingsSchema = z
  .object({
    low_stock_limit_boxes: z.number().int().min(0).optional(),
    expiry_alert_days: z.number().int().min(0).optional(),
  })
  .refine(
    (data) =>
      data.low_stock_limit_boxes !== undefined ||
      data.expiry_alert_days !== undefined,
    {
      message: 'At least one field is required',
    }
  );
