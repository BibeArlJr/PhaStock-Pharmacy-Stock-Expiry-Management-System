import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { JWT_EXPIRES_IN, JWT_SECRET } from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

const SALT_ROUNDS = 10;

const toUserProfile = (user) => ({
  id: user._id.toString(),
  fullName: user.fullName,
  username: user.username,
});

export const hashPassword = async (plain) => bcrypt.hash(plain, SALT_ROUNDS);

export const verifyPassword = async (plain, hash) => bcrypt.compare(plain, hash);

export const login = async ({ username, password }) => {
  const normalizedUsername = username.trim().toLowerCase();

  const user = await User.findOne({ username: normalizedUsername });

  if (!user) {
    throw new ApiError(400, 'INVALID_CREDENTIALS', 'Invalid username or password');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'ACCOUNT_INACTIVE', 'Account is inactive');
  }

  const passwordMatched = await verifyPassword(password, user.passwordHash);

  if (!passwordMatched) {
    throw new ApiError(400, 'INVALID_CREDENTIALS', 'Invalid username or password');
  }

  if (!JWT_SECRET) {
    throw new ApiError(500, 'AUTH_CONFIG_ERROR', 'JWT secret is not configured');
  }

  const token = jwt.sign({ sub: user._id.toString() }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return {
    token,
    user: toUserProfile(user),
  };
};

export const getMe = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'ACCOUNT_INACTIVE', 'Account is inactive');
  }

  return toUserProfile(user);
};
