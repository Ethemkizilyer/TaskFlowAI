import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import auditLogService from '../services/auditLogService';

export const getAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { page, limit, userId, entity, action, startDate, endDate } = req.query;
    const data = await auditLogService.getLogs({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      userId: userId as string | undefined,
      entity: entity as string | undefined,
      action: action as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    });
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getAuditStats = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const stats = await auditLogService.getStats();
    return res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};
