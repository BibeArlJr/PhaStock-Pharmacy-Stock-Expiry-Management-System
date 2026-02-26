import { z } from 'zod';

const objectId = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId')
  .describe('ObjectId');

const stockItemSchema = z.object({
  medicine_id: objectId,
  batch_stock_id: objectId,
  qty_boxes: z.coerce.number().int().min(1),
  rate: z.coerce.number().min(0).optional(),
  amount: z.coerce.number().min(0).optional(),
});

export const fefoSuggestQuerySchema = z.object({
  medicine_id: objectId,
});

export const createStockIssueSchema = z.object({
  issue_date: z.string().optional(),
  reference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  from_store_id: objectId.optional(),
  to_store_id: objectId.optional(),
  items: z.array(stockItemSchema).min(1),
});

export const updateStockIssueSchema = z.object({
  issue_date: z.string().optional(),
  reference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  items: z.array(stockItemSchema).min(1),
});

export const listStockIssueQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['all', 'active', 'voided']).default('all'),
  q: z.string().trim().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export const voidStockIssueSchema = z.object({
  reason: z.string().trim().optional(),
});

export const voidStockIssuesBulkSchema = z.object({
  ids: z.array(objectId).min(1),
  reason: z.string().trim().optional(),
});
