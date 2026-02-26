import ApiError from '../utils/ApiError.js';
import * as AuthService from '../services/auth.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const signupPharmacy = asyncHandler(async (req, res) => {
  const data = await AuthService.signupPharmacy(req.body);
  return ApiResponse.created(res, data);
});

export const getVerificationInfo = asyncHandler(async (req, res) => {
  const data = await AuthService.getVerificationInfo(req.query);
  return ApiResponse.ok(res, data);
});

export const resendVerification = asyncHandler(async (req, res) => {
  const data = await AuthService.resendVerification(req.body);
  return ApiResponse.ok(res, data);
});

export const resendVerificationAlias = asyncHandler(async (req, res) => {
  const data = await AuthService.resendVerificationAlias(req.body);
  return ApiResponse.ok(res, data);
});

export const confirmVerification = asyncHandler(async (req, res) => {
  const data = await AuthService.confirmVerification(req.body);
  return ApiResponse.ok(res, data);
});

export const login = async (req, res, next) => {
  try {
    const data = await AuthService.login(req.body);
    return ApiResponse.ok(res, data);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'EMAIL_NOT_VERIFIED') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email before logging in',
          verification_token: error.details?.verification_token,
          email: error.details?.email,
        },
      });
    }

    return next(error);
  }
};

export const getMe = asyncHandler(async (req, res) => {
  const data = await AuthService.getMe(req.user.id);
  return ApiResponse.ok(res, data);
});
