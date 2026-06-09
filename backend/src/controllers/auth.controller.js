const ApiError = require('../utils/ApiError.js');
const AuthService = require('../services/auth.service.js');
const ApiResponse = require('../utils/ApiResponse.js');
const asyncHandler = require('../utils/asyncHandler.js');
const PasswordResetService = require('../services/passwordReset.service.js');
const signupPharmacy = asyncHandler(async (req, res) => {
  const data = await AuthService.signupPharmacy(req.body);
  return ApiResponse.created(res, data);
});
const getVerificationInfo = asyncHandler(async (req, res) => {
  const data = await AuthService.getVerificationInfo(req.query);
  return ApiResponse.ok(res, data);
});
const resendVerification = asyncHandler(async (req, res) => {
  const data = await AuthService.resendVerification(req.body);
  return ApiResponse.ok(res, data);
});
const resendVerificationAlias = asyncHandler(async (req, res) => {
  const data = await AuthService.resendVerificationAlias(req.body);
  return ApiResponse.ok(res, data);
});
const confirmVerification = asyncHandler(async (req, res) => {
  const data = await AuthService.confirmVerification(req.body);
  return ApiResponse.ok(res, data);
});
const login = async (req, res, next) => {
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
const getMe = asyncHandler(async (req, res) => {
  const data = await AuthService.getMe(req.user.id);
  return ApiResponse.ok(res, data);
});
const forgotPassword = async (req, res) => {
  try {
    await PasswordResetService.requestReset(req.body.email);
    return res.status(200).json({
      success: true,
      message: 'If an account exists for this email, a reset link has been sent.',
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      message: 'If an account exists for this email, a reset link has been sent.',
    });
  }
};
const resetPassword = async (req, res) => {
  try {
    await PasswordResetService.resetPassword(req.body.token, req.body.newPassword);
    return res.status(200).json({
      success: true,
      message: 'Password reset successful. Please log in.',
    });
  } catch (error) {
    if (error instanceof ApiError && error.code === 'INVALID_OR_EXPIRED_TOKEN') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token',
        code: 'INVALID_OR_EXPIRED_TOKEN',
      });
    }
    if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Unable to reset password',
      code: 'RESET_PASSWORD_FAILED',
    });
  }
};

module.exports = { signupPharmacy, getVerificationInfo, resendVerification, resendVerificationAlias, confirmVerification, login, getMe, forgotPassword, resetPassword };
