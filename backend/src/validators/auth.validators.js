const { z } = require('zod');
const phoneRegex = /^\+?[0-9]{7,15}$/;
const tokenSchema = z.string().trim().min(10);
const codeSchema = z.string().regex(/^\d{6}$/);
const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});
const signupPharmacySchema = z.object({
  pharmacyName: z.string().trim().min(1),
  ownerFullName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().regex(phoneRegex, 'Phone format is invalid'),
  password: z.string().min(6),
});
const verificationInfoQuerySchema = z.object({
  token: tokenSchema,
});
const verificationResendBodySchema = z.object({
  token: tokenSchema,
  email: z.string().trim().email().optional(),
});
const verificationResendAliasBodySchema = z
  .object({
    token: tokenSchema.optional(),
    email: z.string().trim().email().optional(),
  })
  .refine((data) => Boolean(data.token || data.email), {
    message: 'token or email is required',
    path: ['token'],
  });
const verificationConfirmBodySchema = z.object({
  token: tokenSchema,
  code: codeSchema,
});
const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});
const resetPasswordSchema = z.object({
  token: tokenSchema,
  newPassword: z.string().min(6),
});

module.exports = { loginSchema, signupPharmacySchema, verificationInfoQuerySchema, verificationResendBodySchema, verificationResendAliasBodySchema, verificationConfirmBodySchema, forgotPasswordSchema, resetPasswordSchema };
