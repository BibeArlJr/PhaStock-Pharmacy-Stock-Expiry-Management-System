import { z } from 'zod';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

const normalizeOptionalString = (value) => {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

export const patchSupplierSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    phone: z.string().trim().optional(),
    address: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.phone !== undefined ||
      data.address !== undefined,
    {
      message: 'At least one field is required',
    }
  );

export const supplierListQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .transform((value) => normalizeOptionalString(value)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid id format'),
});
