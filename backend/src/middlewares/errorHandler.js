import ApiError from '../utils/ApiError.js';

export const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      details: err.details,
    });
  }

  if (err?.code === 11000) {
    return res.status(409).json({
      success: false,
      code: 'DUPLICATE_KEY',
      message: 'Duplicate key error.',
      details: err.keyValue || null,
    });
  }

  console.error(err);

  return res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Something went wrong.',
  });
};
