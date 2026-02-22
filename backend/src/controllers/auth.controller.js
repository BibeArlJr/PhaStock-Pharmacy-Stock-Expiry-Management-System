import * as AuthService from '../services/auth.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const login = asyncHandler(async (req, res) => {
  const data = await AuthService.login(req.body);
  return ApiResponse.ok(res, data);
});

export const getMe = asyncHandler(async (req, res) => ApiResponse.ok(res, req.user));
