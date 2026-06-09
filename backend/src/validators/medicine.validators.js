const { z } = require('zod');
const objectIdRegex = /^[a-fA-F0-9]{24}$/;

const normalizeOptionalString = (value) => {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const optionalTrimmedString = () =>
  z
    .string()
    .optional()
    .transform((value) => normalizeOptionalString(value));
const createMedicineSchema = z.object({
  name: z.string().trim().min(1),
  strength: optionalTrimmedString(),
  category: optionalTrimmedString(),
  notes: optionalTrimmedString(),
});
const patchMedicineSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    strength: optionalTrimmedString(),
    category: optionalTrimmedString(),
    notes: optionalTrimmedString(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.strength !== undefined ||
      data.category !== undefined ||
      data.notes !== undefined,
    {
      message: 'At least one field is required',
    }
  );
const medicineListQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .transform((value) => normalizeOptionalString(value)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .enum(['name_asc', 'name_desc', 'newest', 'oldest'])
    .default('name_asc'),
});
const idParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid id format'),
});

module.exports = { createMedicineSchema, patchMedicineSchema, medicineListQuerySchema, idParamSchema };
