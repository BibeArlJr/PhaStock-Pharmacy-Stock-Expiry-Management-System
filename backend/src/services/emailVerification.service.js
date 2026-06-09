const crypto = require('crypto');const EmailVerification = require('../models/EmailVerification.js');
const User = require('../models/User.js');
const ApiError = require('../utils/ApiError.js');
const { sendVerificationEmail } = require('../utils/mailer.js');
const TTL_MS = 15 * 60 * 1000;

const generateToken = () => crypto.randomBytes(32).toString('hex');
const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

const now = () => new Date();

const ensureActiveVerification = (verification) => {
  if (!verification) {
    throw new ApiError(404, 'VERIFICATION_NOT_FOUND', 'Verification not found');
  }

  if (verification.expiresAt.getTime() <= Date.now() || verification.used) {
    throw new ApiError(400, 'VERIFICATION_EXPIRED', 'Verification expired');
  }
};
const createVerificationForUser = async (userId) => {
  const token = generateToken();
  const code = generateCode();
  const expiresAt = new Date(Date.now() + TTL_MS);

  await EmailVerification.create({
    userId,
    token,
    code,
    expiresAt,
    used: false,
  });

  return {
    token,
    expiresAt,
    code,
  };
};
const getVerificationByToken = async (token) => {
  const verification = await EmailVerification.findOne({ token });
  ensureActiveVerification(verification);
  return verification;
};
const getVerificationByTokenAnyState = async (token) => {
  const verification = await EmailVerification.findOne({ token });

  if (!verification || !verification.userId) {
    throw new ApiError(404, 'VERIFICATION_NOT_FOUND', 'Verification not found');
  }

  return verification;
};
const findLatestPendingVerificationByEmail = async (email) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }, { _id: 1 }).lean();

  if (!user) {
    throw new ApiError(404, 'VERIFICATION_NOT_FOUND', 'Verification not found');
  }

  const verification = await EmailVerification.findOne({
    userId: user._id,
    used: false,
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!verification) {
    throw new ApiError(404, 'VERIFICATION_NOT_FOUND', 'Verification not found');
  }

  return verification;
};
const resendWithOptionalEmailUpdate = async ({ token, newEmail }) => {
  const verification = await getVerificationByTokenAnyState(token);
  const user = await User.findById(verification.userId);

  if (!user) {
    throw new ApiError(404, 'VERIFICATION_NOT_FOUND', 'Verification not found');
  }

  if (newEmail) {
    const normalizedNewEmail = newEmail.trim().toLowerCase();

    if (normalizedNewEmail !== user.email) {
      const existing = await User.findOne({
        email: normalizedNewEmail,
        _id: { $ne: user._id },
      }).lean();

      if (existing) {
        throw new ApiError(409, 'EMAIL_TAKEN', 'Email already exists');
      }

      user.email = normalizedNewEmail;
      user.emailVerified = false;
      await user.save();
    }
  }

  verification.used = true;
  await verification.save();

  const newToken = generateToken();
  const newCode = generateCode();
  const expiresAt = new Date(Date.now() + TTL_MS);

  await EmailVerification.create({
    userId: user._id,
    token: newToken,
    code: newCode,
    expiresAt,
    used: false,
  });

  await sendVerificationEmail({ to: user.email, code: newCode });

  return {
    token: newToken,
    email: user.email,
    expiresAt,
  };
};
const confirm = async ({ token, code }) => {
  const verification = await getVerificationByToken(token);

  if (verification.code !== code) {
    throw new ApiError(400, 'INVALID_CODE', 'Invalid verification code');
  }

  const user = await User.findById(verification.userId);

  if (!user) {
    throw new ApiError(404, 'VERIFICATION_NOT_FOUND', 'Verification not found');
  }

  user.emailVerified = true;
  await user.save();

  verification.used = true;
  await verification.save();

  return {
    message: 'Email verified',
  };
};
const issueFreshVerificationForUser = async (user) => {
  await EmailVerification.updateMany(
    {
      userId: user._id,
      used: false,
      expiresAt: { $gt: now() },
    },
    { $set: { used: true } }
  );

  const created = await createVerificationForUser(user._id);

  await sendVerificationEmail({ to: user.email, code: created.code });

  return {
    token: created.token,
    expiresAt: created.expiresAt,
  };
};

module.exports = { createVerificationForUser, getVerificationByToken, getVerificationByTokenAnyState, findLatestPendingVerificationByEmail, resendWithOptionalEmailUpdate, confirm, issueFreshVerificationForUser };
