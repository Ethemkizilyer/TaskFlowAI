import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest, ApiResponse } from '../types';

const moods = ['GREAT', 'GOOD', 'OKAY', 'STRESSED', 'OVERWHELMED'] as const;

const checkinSchema = z.object({
  mood: z.enum(moods),
  note: z.string().max(500).optional(),
  stress: z.number().int().min(1).max(5).optional(),
  workload: z.number().int().min(1).max(5).optional(),
});

export const createCheckin = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const data = checkinSchema.parse(req.body);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const existing = await prisma.moodCheckin.findFirst({
      where: { userId: req.userId, createdAt: { gte: todayStart } },
    });

    if (existing) {
      const updated = await prisma.moodCheckin.update({
        where: { id: existing.id },
        data: { mood: data.mood, note: data.note, stress: data.stress, workload: data.workload },
      });
      return res.json({ success: true, data: updated });
    }

    const checkin = await prisma.moodCheckin.create({
      data: {
        userId: req.userId!,
        mood: data.mood,
        note: data.note,
        stress: data.stress,
        workload: data.workload,
      },
    });

    return res.json({ success: true, data: checkin });
  } catch (error) {
    next(error);
  }
};

export const getTodayCheckin = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const checkin = await prisma.moodCheckin.findFirst({
      where: { userId: req.userId, createdAt: { gte: todayStart } },
    });

    return res.json({ success: true, data: checkin });
  } catch (error) {
    next(error);
  }
};

export const getTeamPulse = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get user's boards to find team members
    const boards = await prisma.board.findMany({
      where: {
        OR: [{ ownerId: req.userId }, { members: { some: { userId: req.userId } } }],
      },
      select: { id: true, ownerId: true },
    });

    const boardIds = boards.map(b => b.id);
    const memberIds = new Set<string>(boards.map(b => b.ownerId));

    const boardMembers = await prisma.boardMember.findMany({
      where: { boardId: { in: boardIds } },
      select: { userId: true },
    });
    boardMembers.forEach(m => memberIds.add(m.userId));

    const memberIdsArr = Array.from(memberIds);

    // Get all checkins for team in date range
    const checkins = await prisma.moodCheckin.findMany({
      where: {
        userId: { in: memberIdsArr },
        createdAt: { gte: startDate },
      },
      include: {
        user: { select: { id: true, name: true, avatar: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Today's checkins
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCheckins = checkins.filter(c => c.createdAt >= todayStart);

    // Mood distribution
    const moodCounts: Record<string, number> = {};
    checkins.forEach(c => {
      moodCounts[c.mood] = (moodCounts[c.mood] || 0) + 1;
    });

    // Average stress and workload
    const stressValues = checkins.filter(c => c.stress != null).map(c => c.stress!);
    const workloadValues = checkins.filter(c => c.workload != null).map(c => c.workload!);

    const avgStress = stressValues.length > 0
      ? stressValues.reduce((a: number, b: number) => a + b, 0) / stressValues.length
      : null;
    const avgWorkload = workloadValues.length > 0
      ? workloadValues.reduce((a: number, b: number) => a + b, 0) / workloadValues.length
      : null;

    // Burnout risk: users with stress >= 4 or mood = burnout/stressed
    const atRiskUsers = todayCheckins
      .filter(c => c.mood === 'burnout' || c.mood === 'stressed' || (c.stress != null && c.stress >= 4))
      .map(c => ({
        userId: c.user.id,
        name: c.user.name,
        avatar: c.user.avatar,
        mood: c.mood,
        stress: c.stress,
      }));

    // Daily trend
    const dailyTrend: { date: string; avgMoodScore: number; count: number }[] = [];
    const moodScoreMap: Record<string, number> = { great: 5, good: 4, okay: 3, stressed: 2, burnout: 1 };
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      const dayCheckins = checkins.filter(c => c.createdAt >= dayStart && c.createdAt < dayEnd);
      const scores = dayCheckins.map(c => moodScoreMap[c.mood] || 3);
      dailyTrend.push({
        date: dayStart.toISOString().split('T')[0],
        avgMoodScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        count: dayCheckins.length,
      });
    }

    return res.json({
      success: true,
      data: {
        totalMembers: memberIdsArr.length,
        checkedInToday: todayCheckins.length,
        todayRate: memberIdsArr.length > 0 ? (todayCheckins.length / memberIdsArr.length) * 100 : 0,
        moodCounts,
        avgStress,
        avgWorkload,
        atRiskUsers,
        dailyTrend,
        recentCheckins: checkins.slice(0, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyHistory = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const checkins = await prisma.moodCheckin.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return res.json({ success: true, data: checkins });
  } catch (error) {
    next(error);
  }
};
