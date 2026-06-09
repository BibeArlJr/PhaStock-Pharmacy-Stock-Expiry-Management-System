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
const createSupplierSchema = z.object({
  name: z.string().trim().min(1),
  phone: optionalTrimmedString(),
  email: optionalTrimmedString(),
  address: optionalTrimmedString(),
  pan_vat: optionalTrimmedString(),
  notes: optionalTrimmedString(),
  status: z.enum(['active', 'inactive']).optional(),
});
const patchSupplierSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    phone: optionalTrimmedString(),
    email: optionalTrimmedString(),
    address: optionalTrimmedString(),
    pan_vat: optionalTrimmedString(),
    notes: optionalTrimmedString(),
    status: z.enum(['active', 'inactive']).optional(),
  })
  .refine((data) => {
    return (
      data.name !== undefined ||
      data.phone !== undefined ||
      data.email !== undefined ||
      data.address !== undefined ||
      data.pan_vat !== undefined ||
      data.notes !== undefined ||
      data.status !== undefined
    );
  }, { message: 'At least one field is required' });
const supplierListQuerySchema = z.object({
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

module.exports = { createSupplierSchema, patchSupplierSchema, supplierListQuerySchema, idParamSchema };
