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

export const batchLookupQuerySchema = z.object({
  medicine_id: z.string().regex(objectIdRegex, 'Invalid medicine_id format'),
  pack: z.string().trim().min(1),
  batch_no: z.string().trim().min(1),
  expiry_date: z.coerce.date(),
});

export const batchListQuerySchema = z.object({
  q: optionalTrimmedString,
  medicine_id: z.string().regex(objectIdRegex, 'Invalid medicine_id format').optional(),
  pack: optionalTrimmedString,
  batch_no: optionalTrimmedString,
  expiry_status: z.enum(['valid', 'expiring_soon', 'expired']).optional(),
  stock_status: z.enum(['in_stock', 'low_stock', 'out_of_stock']).optional(),
  include_out_of_stock: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return true;
      }

      if (typeof value === 'boolean') {
        return value;
      }

      return value === 'true';
    }),
  sort: z.enum(['expiry_asc', 'expiry_desc', 'stock_asc', 'stock_desc']).default('expiry_asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
