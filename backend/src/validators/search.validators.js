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

export const receiptSearchQuerySchema = z.object({
  supplier_id: z.string().regex(objectIdRegex, 'Invalid supplier_id format').optional(),
  invoice_number: optionalTrimmedString,
  medicine_id: z.string().regex(objectIdRegex, 'Invalid medicine_id format').optional(),
  pack: optionalTrimmedString,
  batch_no: optionalTrimmedString,
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const priceHistoryQuerySchema = z.object({
  medicine_id: z.string().regex(objectIdRegex, 'Invalid medicine_id format'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
