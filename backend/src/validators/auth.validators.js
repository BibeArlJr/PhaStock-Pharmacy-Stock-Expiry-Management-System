import { z } from 'zod';

const phoneRegex = /^\+?[0-9]{7,15}$/;
const tokenSchema = z.string().trim().min(10);
const codeSchema = z.string().regex(/^\d{6}$/);

export const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

export const signupPharmacySchema = z.object({
  pharmacyName: z.string().trim().min(1),
  ownerFullName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().regex(phoneRegex, 'Phone format is invalid'),
  password: z.string().min(6),
});

export const verificationInfoQuerySchema = z.object({
  token: tokenSchema,
});

export const verificationResendBodySchema = z.object({
  token: tokenSchema,
  email: z.string().trim().email().optional(),
});

export const verificationResendAliasBodySchema = z
  .object({
    token: tokenSchema.optional(),
    email: z.string().trim().email().optional(),
  })
  .refine((data) => Boolean(data.token || data.email), {
    message: 'token or email is required',
    path: ['token'],
  });

export const verificationConfirmBodySchema = z.object({
  token: tokenSchema,
  code: codeSchema,
});
