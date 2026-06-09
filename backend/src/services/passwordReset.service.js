const crypto = require('crypto');
const { FRONTEND_URL } = require('../config/env.js');
const User = require('../models/User.js');
const PasswordResetToken = require('../models/PasswordResetToken.js');
const ApiError = require('../utils/ApiError.js');
const { sendPasswordResetEmail } = require('../utils/mailer.js');
const { hashPassword } = require('./auth.service.js');
const ONE_HOUR_MS = 60 * 60 * 1000;
const requestReset = async (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    // Generic success (do not leak)
    return { success: true };
  }

  const user = await User.findOne({ email: normalizedEmail }).select('_id email').lean();

  if (!user) {
    // Generic success (do not leak)
    return { success: true };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ONE_HOUR_MS);

  await PasswordResetToken.create({
    userId: user._id,
    token,
    expiresAt,
    used: false,
  });

  const resetLink = `${FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

  await sendPasswordResetEmail({
    to: user.email,
    resetLink,
  });

  return { success: true };
};
const resetPassword = async (token, newPassword) => {
  const normalizedToken = String(token || '').trim();
  const normalizedPassword = String(newPassword || '');

  if (!normalizedToken || !normalizedPassword) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed');
  }

  const now = new Date();

  const tokenDoc = await PasswordResetToken.findOne({
    token: normalizedToken,
    used: false,
    expiresAt: { $gt: now },
  }).select('_id userId');

  if (!tokenDoc) {
    throw new ApiError(400, 'INVALID_OR_EXPIRED_TOKEN', 'Invalid or expired token');
  }

  const passwordHash = await hashPassword(normalizedPassword);

  await User.updateOne(
    { _id: tokenDoc.userId },
    { $set: { passwordHash } }
  );

  tokenDoc.used = true;
  await tokenDoc.save();

  return { success: true };
};

module.exports = { requestReset, resetPassword };
