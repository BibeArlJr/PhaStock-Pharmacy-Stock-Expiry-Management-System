import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import { JWT_EXPIRES_IN, JWT_SECRET } from '../config/env.js';
import Pharmacy from '../models/Pharmacy.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import {
  confirm,
  createVerificationForUser,
  findLatestPendingVerificationByEmail,
  getVerificationByToken,
  issueFreshVerificationForUser,
  resendWithOptionalEmailUpdate,
} from './emailVerification.service.js';
import { sendVerificationEmail } from '../utils/mailer.js';

const SALT_ROUNDS = 10;
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

const toUserProfile = (user) => ({
  id: user._id.toString(),
  full_name: user.fullName,
  email: user.email,
  phone: user.phone,
});

const toPharmacyProfile = (pharmacy) => ({
  id: pharmacy._id.toString(),
  name: pharmacy.name,
});

const buildAuthResponse = (token, user, pharmacy) => ({
  token,
  user: toUserProfile(user),
  pharmacy: toPharmacyProfile(pharmacy),
});

const normalizeIdentifier = (identifier) => identifier.trim();

export const hashPassword = async (plain) => bcrypt.hash(plain, SALT_ROUNDS);

export const verifyPassword = async (plain, hash) => bcrypt.compare(plain, hash);

export const signupPharmacy = async ({
  pharmacyName,
  ownerFullName,
  email,
  phone,
  password,
}) => {
  const resolvedPharmacyName = pharmacyName.trim();
  const resolvedOwnerName = ownerFullName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.trim();

  if (!resolvedPharmacyName || !resolvedOwnerName || !normalizedEmail || !normalizedPhone || !password) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed');
  }

  if (!PHONE_REGEX.test(normalizedPhone)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed');
  }

  const [existingUserByEmail, existingUserByPhone] = await Promise.all([
    User.findOne({ email: normalizedEmail }, { _id: 1 }).lean(),
    User.findOne({ phone: normalizedPhone }, { _id: 1 }).lean(),
  ]);

  if (existingUserByEmail) {
    throw new ApiError(409, 'EMAIL_TAKEN', 'Email already exists');
  }

  if (existingUserByPhone) {
    throw new ApiError(409, 'PHONE_TAKEN', 'Phone already exists');
  }

  const passwordHash = await hashPassword(password);

  const session = await mongoose.startSession();
  let createdUser = null;
  let createdPharmacy = null;

  try {
    await session.startTransaction();

    const pharmacy = await Pharmacy.create(
      [
        {
          name: resolvedPharmacyName,
        },
      ],
      { session }
    );

    const user = await User.create(
      [
        {
          pharmacyId: pharmacy[0]._id,
          fullName: resolvedOwnerName,
          email: normalizedEmail,
          phone: normalizedPhone,
          emailVerified: false,
          passwordHash,
          isActive: true,
        },
      ],
      { session }
    );

    createdUser = user[0];
    createdPharmacy = pharmacy[0];

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();

    if (error?.code === 11000) {
      const isEmail = Boolean(error?.keyValue?.email);
      const isPhone = Boolean(error?.keyValue?.phone);
      throw new ApiError(
        409,
        isEmail ? 'EMAIL_TAKEN' : isPhone ? 'PHONE_TAKEN' : 'DUPLICATE_KEY',
        isEmail ? 'Email already exists' : isPhone ? 'Phone already exists' : 'Duplicate key error'
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }

  if (!createdUser) {
    throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Failed to create account');
  }

  const verification = await createVerificationForUser(createdUser._id);
  const latestVerification = await getVerificationByToken(verification.token);

  await sendVerificationEmail({
    to: createdUser.email,
    code: latestVerification.code,
  });

  return {
    token: null,
    user: toUserProfile(createdUser),
    pharmacy: toPharmacyProfile(createdPharmacy),
    verification_token: verification.token,
    message: 'Verification email sent',
  };
};

export const getVerificationInfo = async ({ token }) => {
  const verification = await getVerificationByToken(token);
  const user = await User.findById(verification.userId, { email: 1 }).lean();

  if (!user) {
    throw new ApiError(404, 'VERIFICATION_NOT_FOUND', 'Verification not found');
  }

  return {
    email: user.email,
    expires_at: verification.expiresAt.toISOString(),
  };
};

export const resendVerification = async ({ token, email }) => {
  const result = await resendWithOptionalEmailUpdate({
    token,
    newEmail: email,
  });

  return {
    token: result.token,
    email: result.email,
    expires_at: result.expiresAt.toISOString(),
    message: 'Verification code sent',
  };
};

export const resendVerificationAlias = async ({ token, email }) => {
  if (token) {
    return resendVerification({ token, email });
  }

  if (!email) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed');
  }

  const latest = await findLatestPendingVerificationByEmail(email);

  return resendVerification({ token: latest.token, email });
};

export const confirmVerification = async ({ token, code }) => confirm({ token, code });

export const login = async ({ identifier, password }) => {
  const normalizedIdentifier = normalizeIdentifier(identifier);

  const user = await User.findOne({
    $or: [{ email: normalizedIdentifier.toLowerCase() }, { phone: normalizedIdentifier }],
  }).populate({
    path: 'pharmacyId',
    select: 'name isActive',
  });

  if (!user) {
    throw new ApiError(400, 'INVALID_CREDENTIALS', 'Invalid email/phone or password');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'ACCOUNT_INACTIVE', 'Account is inactive');
  }

  if (!user.pharmacyId || !user.pharmacyId.isActive) {
    throw new ApiError(403, 'ACCOUNT_INACTIVE', 'Account is inactive');
  }

  const passwordMatched = await verifyPassword(password, user.passwordHash);

  if (!passwordMatched) {
    throw new ApiError(400, 'INVALID_CREDENTIALS', 'Invalid email/phone or password');
  }

  if (!user.emailVerified) {
    const freshVerification = await issueFreshVerificationForUser(user);
    throw new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email before logging in', {
      verification_token: freshVerification.token,
      email: user.email,
    });
  }

  if (!JWT_SECRET) {
    throw new ApiError(500, 'AUTH_CONFIG_ERROR', 'JWT secret is not configured');
  }

  const token = jwt.sign({ sub: user._id.toString() }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return buildAuthResponse(token, user, user.pharmacyId);
};

export const getMe = async (userId) => {
  const user = await User.findById(userId).populate({
    path: 'pharmacyId',
    select: 'name isActive',
  });

  if (!user) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'ACCOUNT_INACTIVE', 'Account is inactive');
  }

  if (!user.pharmacyId || !user.pharmacyId.isActive) {
    throw new ApiError(403, 'ACCOUNT_INACTIVE', 'Account is inactive');
  }

  return {
    ...toUserProfile(user),
    pharmacy: toPharmacyProfile(user.pharmacyId),
  };
};
