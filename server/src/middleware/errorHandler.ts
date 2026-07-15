import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';

export const errorHandler = (
  err: Error,
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: err.message,
    });
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      success: false,
      error: 'Database error',
      message: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};

export const notFound = (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  return res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};
