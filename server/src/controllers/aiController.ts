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

    const analysis = await aiService.analyzeBoardTasks(
      board.tasks.map(t => ({ ...t, description: t.description ?? undefined }))
    );
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

export const getDailyBriefing = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const now = new Date();
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(now.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Yesterday's activities
    const yesterdayActivities = await prisma.activity.findMany({
      where: {
        userId: req.userId,
        createdAt: { gte: yesterdayStart, lt: todayStart },
      },
      include: { task: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // User's boards
    const boards = await prisma.board.findMany({
      where: {
        OR: [{ ownerId: req.userId }, { members: { some: { userId: req.userId } } }],
      },
      include: {
        tasks: { select: { id: true, status: true } },
      },
    });

    // All tasks assigned to user
    const allTasks = await prisma.task.findMany({
      where: { assigneeId: req.userId },
      include: { board: { select: { title: true } } },
    });

    const todayTasks = allTasks
      .filter(t => t.status !== 'DONE')
      .map(t => ({
        title: t.title,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate?.toISOString() || undefined,
        boardTitle: t.board.title,
      }));

    const overdueTasks = allTasks
      .filter(t => t.status !== 'DONE' && t.dueDate && t.dueDate < todayStart)
      .map(t => ({
        title: t.title,
        priority: t.priority,
        boardTitle: t.board.title,
        daysOverdue: Math.floor((todayStart.getTime() - t.dueDate!.getTime()) / (1000 * 60 * 60 * 24)),
      }));

    const boardSummaries = boards.map(b => ({
      title: b.title,
      taskCount: b.tasks.length,
      doneCount: b.tasks.filter(t => t.status === 'DONE').length,
    }));

    // Team stats
    const teamMemberIds = new Set<string>();
    boards.forEach(b => {
      teamMemberIds.add(b.ownerId);
    });
    const boardMembers = await prisma.boardMember.findMany({
      where: { boardId: { in: boards.map(b => b.id) } },
      select: { userId: true },
    });
    boardMembers.forEach(m => teamMemberIds.add(m.userId));

    const completedToday = await prisma.activity.count({
      where: {
        createdAt: { gte: todayStart },
        type: 'TASK_UPDATED',
        description: { contains: 'DONE' },
      },
    });

    const briefing = await aiService.generateDailyBriefing({
      userName: user.name,
      role: user.role,
      yesterdayActivities: yesterdayActivities.map(a => ({
        type: a.type,
        description: a.description,
        taskTitle: a.task?.title,
      })),
      todayTasks,
      overdueTasks,
      teamStats: {
        totalMembers: teamMemberIds.size,
        activeTasks: todayTasks.length,
        completedToday,
      },
      boards: boardSummaries,
    });

    return res.json({ success: true, data: briefing });
  } catch (error) {
    next(error);
  }
};

const chatSchema = z.object({
  message: z.string().min(1),
  history: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })).optional().default([]),
});

export const chatWithAI = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { message, history } = chatSchema.parse(req.body);
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const boards = await prisma.board.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
        deletedAt: null,
      },
      select: { id: true, title: true },
      take: 10,
    });

    const recentTasks = await prisma.task.findMany({
      where: {
        OR: [
          { assigneeId: userId },
          { board: { ownerId: userId } },
        ],
        deletedAt: null,
      },
      include: {
        board: { select: { title: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    const result = await aiService.chat(
      message,
      { userName: user?.name || 'User', boards, recentTasks },
      history
    );

    return res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation error' });
    }
    next(error);
  }
};
