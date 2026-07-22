import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiResponse } from '../types';
import recurringTaskService from '../services/recurringTaskService';

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  columnId: z.string().optional(),
  assigneeId: z.string().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  interval: z.number().int().min(1).default(1),
  nextRunAt: z.string(),
});

const updateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  columnId: z.string().optional(),
  assigneeId: z.string().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  interval: z.number().int().min(1).optional(),
  nextRunAt: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const createRecurringTask = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { boardId } = req.params;
    const data = createSchema.parse(req.body);
    const rt = await recurringTaskService.create({
      ...data,
      boardId,
      createdById: req.userId!,
    });
    return res.status(201).json({ success: true, data: rt, message: 'Recurring task created' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation error' });
    }
    next(error);
  }
};

export const getRecurringTasks = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { boardId } = req.params;
    const tasks = await recurringTaskService.getByBoard(boardId);
    return res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

export const updateRecurringTask = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { recurringTaskId } = req.params;
    const data = updateSchema.parse(req.body);
    const rt = await recurringTaskService.update(recurringTaskId, data);
    return res.json({ success: true, data: rt });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation error' });
    }
    next(error);
  }
};

export const deleteRecurringTask = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { recurringTaskId } = req.params;
    await recurringTaskService.delete(recurringTaskId);
    return res.json({ success: true, message: 'Recurring task deleted' });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
};

export const toggleRecurringTask = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { recurringTaskId } = req.params;
    const rt = await recurringTaskService.toggle(recurringTaskId);
    return res.json({ success: true, data: rt });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
};
