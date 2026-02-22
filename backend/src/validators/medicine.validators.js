import { z } from 'zod';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

const normalizeOptionalString = (value) => {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const createMedicineSchema = z.object({
  name: z.string().trim().min(1),
  strength: z.string().trim().optional(),
  category: z.string().trim().optional(),
});

export const patchMedicineSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    strength: z.string().trim().optional(),
    category: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.strength !== undefined ||
      data.category !== undefined,
    {
      message: 'At least one field is required',
    }
  );

export const medicineListQuerySchema = z.object({
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
