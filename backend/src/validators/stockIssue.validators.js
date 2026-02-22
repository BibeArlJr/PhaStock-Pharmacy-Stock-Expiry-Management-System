import { z } from 'zod';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

export const fefoSuggestQuerySchema = z.object({
  medicine_id: z.string().regex(objectIdRegex, 'Invalid medicine_id format'),
});

export const createStockIssueSchema = z.object({
  batch_stock_id: z.string().regex(objectIdRegex, 'Invalid batch_stock_id format'),
  issued_boxes: z.coerce.number().int().min(1),
  issued_date: z.coerce.date(),
  remark: z.string().trim().optional(),
});

export const listStockIssueQuerySchema = z.object({
  medicine_id: z.string().regex(objectIdRegex, 'Invalid medicine_id format').optional(),
  batch_stock_id: z.string().regex(objectIdRegex, 'Invalid batch_stock_id format').optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
