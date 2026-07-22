import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiResponse } from '../types';
import taskDependencyService from '../services/taskDependencyService';
import { emitBoardEvent } from '../sockets/socketHandler';

const addDependencySchema = z.object({
  dependsOnId: z.string().min(1),
});

export const addDependency = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { boardId, taskId } = req.params;
    const { dependsOnId } = addDependencySchema.parse(req.body);

    const dep = await taskDependencyService.addDependency(boardId, taskId, dependsOnId);
    emitBoardEvent(boardId, 'task:dependency:added', { taskId, dependsOnId });
    return res.status(201).json({ success: true, data: dep, message: 'Dependency added' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation error' });
    }
    if (error.message?.includes('circular') || error.message?.includes('depend on itself') || error.message?.includes('already exists')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (error.message?.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
};

export const removeDependency = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { boardId, taskId, dependsOnId } = req.params;

    await taskDependencyService.removeDependency(boardId, taskId, dependsOnId);
    emitBoardEvent(boardId, 'task:dependency:removed', { taskId, dependsOnId });
    return res.json({ success: true, message: 'Dependency removed' });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
};

export const getDependencies = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { boardId, taskId } = req.params;
    const deps = await taskDependencyService.getDependencies(boardId, taskId);
    return res.json({ success: true, data: deps });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
};

export const getBoardDependencies = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { boardId } = req.params;
    const deps = await taskDependencyService.getBoardDependencies(boardId);
    return res.json({ success: true, data: deps });
  } catch (error) {
    next(error);
  }
};
