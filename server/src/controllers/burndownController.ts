import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import burndownService from '../services/burndownService';

export const getBurndown = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { boardId } = req.params;
    const { startDate, endDate } = req.query;
    const data = await burndownService.getBurndownData(
      boardId,
      startDate as string | undefined,
      endDate as string | undefined
    );
    return res.json({ success: true, data });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
};
