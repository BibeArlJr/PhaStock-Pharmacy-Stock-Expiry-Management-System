import { z } from 'zod';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

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

const receiptItemSchema = z.object({
  medicine_id: z.string().regex(objectIdRegex, 'Invalid medicine_id format'),
  pack: z.string().trim().min(1),
  batch_no: z.string().trim().min(1),
  expiry_date: z.coerce.date(),
  quantity_boxes: z.coerce.number().int().min(1),
  purchase_price: z.coerce.number().min(0),
  mrp: z.coerce.number().min(0),
});

export const createReceiptSchema = z.object({
  supplier_id: z.string().regex(objectIdRegex, 'Invalid supplier_id format'),
  invoice_number: z.string().trim().min(1),
  invoice_date: z.coerce.date(),
  payment_mode: z.enum(['CASH', 'CREDIT', 'BANK', 'OTHER']),
  receipt_type: z
    .enum(['NORMAL_PURCHASE', 'RETURN_CREDIT'])
    .refine((value) => value === 'NORMAL_PURCHASE', {
      message: 'Only NORMAL_PURCHASE is allowed in v1',
    }),
  items: z.array(receiptItemSchema).min(1),
});

export const receiptListQuerySchema = paginationSchema.extend({
  supplier_id: z.string().regex(objectIdRegex, 'Invalid supplier_id format').optional(),
  invoice_number: optionalTrimmedString,
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
});

export const receiptIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid id format'),
});
