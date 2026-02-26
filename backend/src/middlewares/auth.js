import jwt from 'jsonwebtoken';

import { JWT_SECRET } from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authorization token is missing.'));
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authorization token is missing.'));
  }

  if (!JWT_SECRET) {
    return next(new ApiError(500, 'AUTH_CONFIG_ERROR', 'JWT secret is not configured.'));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload?.sub;

    if (!userId) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired token.'));
    }

    const user = await User.findById(userId).populate({
      path: 'pharmacyId',
      select: 'name isActive',
    });

    if (!user) {
      return next(new ApiError(401, 'USER_NOT_FOUND', 'User not found.'));
    }

    if (!user.isActive) {
      return next(new ApiError(403, 'ACCOUNT_INACTIVE', 'Account is inactive'));
    }

    if (!user.pharmacyId || !user.pharmacyId.isActive) {
      return next(new ApiError(403, 'ACCOUNT_INACTIVE', 'Account is inactive'));
    }

    req.user = {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      pharmacy: {
        id: user.pharmacyId._id.toString(),
        name: user.pharmacyId.name,
      },
    };

    return next();
  } catch (error) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired token.'));
  }
};
