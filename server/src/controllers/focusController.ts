import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest, ApiResponse } from '../types';

const startSessionSchema = z.object({
  taskId: z.string().optional(),
  taskTitle: z.string().optional(),
  duration: z.number().int().min(1).max(120),
});

export const startSession = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const data = startSessionSchema.parse(req.body);

    const session = await prisma.focusSession.create({
      data: {
        userId: req.userId!,
        taskId: data.taskId,
        taskTitle: data.taskTitle,
        duration: data.duration,
      },
    });

    return res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

export const completeSession = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const session = await prisma.focusSession.findFirst({
      where: { id, userId: req.userId },
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const updated = await prisma.focusSession.update({
      where: { id },
      data: { completed: true, endedAt: new Date() },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const getStats = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const todaySessions = await prisma.focusSession.findMany({
      where: {
        userId: req.userId,
        completed: true,
        startedAt: { gte: todayStart },
      },
    });

    const weekSessions = await prisma.focusSession.findMany({
      where: {
        userId: req.userId,
        completed: true,
        startedAt: { gte: weekStart },
      },
    });

    const totalSessions = await prisma.focusSession.count({
      where: { userId: req.userId, completed: true },
    });

    const todayMinutes = todaySessions.reduce((sum: number, s: any) => sum + s.duration, 0);
    const weekMinutes = weekSessions.reduce((sum: number, s: any) => sum + s.duration, 0);

    // Calculate streak (consecutive days with at least 1 completed session)
    let streak = 0;
    const checkDate = new Date(todayStart);
    while (true) {
      const dayEnd = new Date(checkDate);
      dayEnd.setDate(checkDate.getDate() + 1);
      const hasSession = await prisma.focusSession.findFirst({
        where: {
          userId: req.userId,
          completed: true,
          startedAt: { gte: checkDate, lt: dayEnd },
        },
      });
      if (hasSession) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Last 7 days breakdown
    const dailyBreakdown: { date: string; minutes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(todayStart);
      dayStart.setDate(todayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      const sessions = await prisma.focusSession.findMany({
        where: {
          userId: req.userId,
          completed: true,
          startedAt: { gte: dayStart, lt: dayEnd },
        },
      });
      dailyBreakdown.push({
        date: dayStart.toISOString().split('T')[0],
        minutes: sessions.reduce((sum: number, s: any) => sum + s.duration, 0),
      });
    }

    return res.json({
      success: true,
      data: {
        todayMinutes,
        weekMinutes,
        totalSessions,
        streak,
        dailyBreakdown,
        todayCount: todaySessions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSessions = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const sessions = await prisma.focusSession.findMany({
      where: { userId: req.userId },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    return res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
};
