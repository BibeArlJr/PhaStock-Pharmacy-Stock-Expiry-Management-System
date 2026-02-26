import { z } from 'zod';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

const optionalTrimmedString = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  });

export const batchStockListQuerySchema = z.object({
  q: optionalTrimmedString,
  expiry_status: z.enum(['all', 'valid', 'expiring', 'expired']).default('all'),
  stock_status: z.enum(['all', 'in', 'low', 'out']).default('all'),
  sort: z
    .enum(['expiry_stock', 'stock_expiry', 'expiry', 'stock', 'medicine', 'updated'])
    .default('expiry_stock'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const batchStockIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid id format'),
});

export const manualBatchStockCreateSchema = z.object({
  medicine_id: z.string().regex(objectIdRegex, 'Invalid medicine_id format'),
  pack: z.string().trim().min(1),
  batch_no: z.string().trim().min(1),
  expiry_date: z.coerce.date(),
  available_boxes: z.coerce.number().int().min(1),
  purchase_price: z.coerce.number().min(0).optional(),
  mrp: z.coerce.number().min(0).optional(),
});

export const manualBatchStockUpdateSchema = z.object({
  medicine_id: z.string().regex(objectIdRegex, 'Invalid medicine_id format'),
  pack: z.string().trim().min(1),
  batch_no: z.string().trim().min(1),
  expiry_date: z.coerce.date(),
  available_boxes: z.coerce.number().int().min(0),
  purchase_price: z.coerce.number().min(0),
  mrp: z.coerce.number().min(0),
});
