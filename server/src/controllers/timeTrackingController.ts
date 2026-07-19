import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest, ApiResponse } from '../types';

const createTimeEntrySchema = z.object({
  taskTitle: z.string().min(1, 'Task title is required').max(200),
  boardId: z.string().nullable().optional(),
  duration: z.number().int().min(1, 'Duration must be at least 1 minute'),
  description: z.string().optional(),
  date: z.string().datetime().optional(),
});

const updateTimeEntrySchema = z.object({
  taskTitle: z.string().min(1).max(200).optional(),
  boardId: z.string().nullable().optional(),
  duration: z.number().int().min(1).optional(),
  description: z.string().optional(),
  date: z.string().datetime().optional(),
});

export const getTimeEntries = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;

    const entries = await prisma.timeEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: {
        board: { select: { id: true, title: true, color: true } },
      },
    });

    return res.json({
      success: true,
      data: entries.map((e) => ({
        ...e,
        date: e.date.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const createTimeEntry = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const data = createTimeEntrySchema.parse(req.body);

    const entry = await prisma.timeEntry.create({
      data: {
        userId,
        taskTitle: data.taskTitle,
        boardId: data.boardId || null,
        duration: data.duration,
        description: data.description || null,
        date: data.date ? new Date(data.date) : new Date(),
      },
      include: {
        board: { select: { id: true, title: true, color: true } },
      },
    });

    return res.status(201).json({
      success: true,
      data: { ...entry, date: entry.date.toISOString() },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTimeEntry = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const data = updateTimeEntrySchema.parse(req.body);

    const existing = await prisma.timeEntry.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Time entry not found' });
    }

    const entry = await prisma.timeEntry.update({
      where: { id },
      data: {
        ...(data.taskTitle !== undefined && { taskTitle: data.taskTitle }),
        ...(data.boardId !== undefined && { boardId: data.boardId }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
      },
      include: {
        board: { select: { id: true, title: true, color: true } },
      },
    });

    return res.json({
      success: true,
      data: { ...entry, date: entry.date.toISOString() },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTimeEntry = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = await prisma.timeEntry.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Time entry not found' });
    }

    await prisma.timeEntry.delete({ where: { id } });

    return res.json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
};

export const getTimeStats = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const [todayEntries, weekEntries, allEntries] = await Promise.all([
      prisma.timeEntry.findMany({
        where: { userId, date: { gte: todayStart } },
        select: { duration: true },
      }),
      prisma.timeEntry.findMany({
        where: { userId, date: { gte: weekStart } },
        select: { duration: true },
      }),
      prisma.timeEntry.findMany({
        where: { userId },
        select: { duration: true },
      }),
    ]);

    const todayMinutes = todayEntries.reduce((sum, e) => sum + e.duration, 0);
    const weekMinutes = weekEntries.reduce((sum, e) => sum + e.duration, 0);
    const totalMinutes = allEntries.reduce((sum, e) => sum + e.duration, 0);

    return res.json({
      success: true,
      data: {
        today: todayMinutes,
        thisWeek: weekMinutes,
        allTime: totalMinutes,
        avgDay: Math.round(weekMinutes / 7),
      },
    });
  } catch (error) {
    next(error);
  }
};
