import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest, ApiResponse } from '../types';
import aiService from '../services/aiService';

export const getAIStatus = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
) => {
  return res.json({
    success: true,
    data: { configured: aiService.isConfigured() },
  });
};

export const suggestPriority = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
    });
    const { title, description } = schema.parse(req.body);

    const result = await aiService.suggestPriority(title, description);
    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const suggestTags = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
    });
    const { title, description } = schema.parse(req.body);

    const tags = await aiService.suggestTags(title, description);
    return res.json({ success: true, data: { tags } });
  } catch (error) {
    next(error);
  }
};

export const generateSubtasks = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
    });
    const { title, description } = schema.parse(req.body);

    const subtasks = await aiService.generateSubtasks(title, description);
    return res.json({ success: true, data: { subtasks } });
  } catch (error) {
    next(error);
  }
};

export const analyzeBoard = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { boardId } = req.params;

    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        OR: [{ ownerId: req.userId }, { members: { some: { userId: req.userId } } }],
      },
      include: {
        tasks: { select: { title: true, description: true, status: true, priority: true } },
      },
    });

    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found' });
    }

    const analysis = await aiService.analyzeBoardTasks(board.tasks);
    return res.json({ success: true, data: analysis });
  } catch (error) {
    next(error);
  }
};

export const generateTaskFromDescription = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const schema = z.object({ description: z.string().min(5) });
    const { description } = schema.parse(req.body);

    const task = await aiService.generateTaskFromDescription(description);
    return res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};
