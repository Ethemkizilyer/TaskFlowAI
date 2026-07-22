import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest, ApiResponse } from '../types';

// ─── Schemas ───────────────────────────────────────────────

const createTimeEntrySchema = z.object({
  taskTitle: z.string().min(1, 'Task title is required').max(200),
  boardId: z.string().nullable().optional(),
  duration: z.number().int().min(0).optional().default(0),
  description: z.string().optional(),
  billable: z.boolean().optional().default(true),
  hourlyRate: z.number().positive().optional(),
  tags: z.array(z.string()).optional().default([]),
  date: z.string().datetime().optional(),
});

const updateTimeEntrySchema = z.object({
  taskTitle: z.string().min(1).max(200).optional(),
  boardId: z.string().nullable().optional(),
  duration: z.number().int().min(0).optional(),
  description: z.string().nullable().optional(),
  billable: z.boolean().optional(),
  hourlyRate: z.number().positive().nullable().optional(),
  tags: z.array(z.string()).optional(),
  date: z.string().datetime().optional(),
});

const startTimerSchema = z.object({
  taskTitle: z.string().min(1, 'Task title is required').max(200),
  boardId: z.string().nullable().optional(),
  billable: z.boolean().optional().default(true),
  hourlyRate: z.number().positive().optional(),
  tags: z.array(z.string()).optional().default([]),
});

// ─── Helpers ───────────────────────────────────────────────

const serializeEntry = (e: any) => ({
  ...e,
  date: e.date.toISOString(),
  startedAt: e.startedAt ? e.startedAt.toISOString() : null,
  endedAt: e.endedAt ? e.endedAt.toISOString() : null,
  hourlyRate: e.hourlyRate ? Number(e.hourlyRate) : null,
});

const getWeekBounds = (date = new Date()) => {
  const day = date.getDay() || 7; // Monday = 1
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 7);
  return { start: monday, end: sunday };
};

// ─── Get Time Entries (with filtering & pagination) ────────

export const getTimeEntries = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const { startDate, endDate, boardId, billable, tag, page, limit } = req.query;

    const where: any = { userId, isRunning: false };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }
    if (boardId) where.boardId = boardId as string;
    if (billable !== undefined) where.billable = billable === 'true';
    if (tag) where.tags = { has: tag as string };

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, parseInt(limit as string) || 50);
    const skip = (pageNum - 1) * limitNum;

    const [entries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limitNum,
        include: {
          board: { select: { id: true, title: true, color: true } },
        },
      }),
      prisma.timeEntry.count({ where }),
    ]);

    return res.json({
      success: true,
      data: entries.map(serializeEntry),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Create Manual Entry ───────────────────────────────────

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
        duration: data.duration || 0,
        description: data.description || null,
        billable: data.billable ?? true,
        hourlyRate: data.hourlyRate || null,
        tags: data.tags || [],
        date: data.date ? new Date(data.date) : new Date(),
        isRunning: false,
      },
      include: {
        board: { select: { id: true, title: true, color: true } },
      },
    });

    return res.status(201).json({
      success: true,
      data: serializeEntry(entry),
    });
  } catch (error) {
    next(error);
  }
};

// ─── Update Entry ──────────────────────────────────────────

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

    const updateData: any = {};
    if (data.taskTitle !== undefined) updateData.taskTitle = data.taskTitle;
    if (data.boardId !== undefined) updateData.boardId = data.boardId;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.billable !== undefined) updateData.billable = data.billable;
    if (data.hourlyRate !== undefined) updateData.hourlyRate = data.hourlyRate;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.date !== undefined) updateData.date = new Date(data.date);

    const entry = await prisma.timeEntry.update({
      where: { id },
      data: updateData,
      include: {
        board: { select: { id: true, title: true, color: true } },
      },
    });

    return res.json({
      success: true,
      data: serializeEntry(entry),
    });
  } catch (error) {
    next(error);
  }
};

// ─── Delete Entry ──────────────────────────────────────────

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

// ─── Start Timer (creates running entry in DB) ─────────────

export const startTimer = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const data = startTimerSchema.parse(req.body);

    // Stop any existing running timer first
    const running = await prisma.timeEntry.findFirst({
      where: { userId, isRunning: true },
    });

    if (running) {
      const elapsed = Math.round((Date.now() - running.startedAt!.getTime()) / 60000);
      await prisma.timeEntry.update({
        where: { id: running.id },
        data: {
          isRunning: false,
          endedAt: new Date(),
          duration: Math.max(1, elapsed),
        },
      });
    }

    const entry = await prisma.timeEntry.create({
      data: {
        userId,
        taskTitle: data.taskTitle,
        boardId: data.boardId || null,
        billable: data.billable ?? true,
        hourlyRate: data.hourlyRate || null,
        tags: data.tags || [],
        duration: 0,
        isRunning: true,
        startedAt: new Date(),
        date: new Date(),
      },
      include: {
        board: { select: { id: true, title: true, color: true } },
      },
    });

    return res.status(201).json({
      success: true,
      data: serializeEntry(entry),
    });
  } catch (error) {
    next(error);
  }
};

// ─── Stop Timer ────────────────────────────────────────────

export const stopTimer = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;

    const running = await prisma.timeEntry.findFirst({
      where: { userId, isRunning: true },
    });

    if (!running) {
      return res.status(404).json({ success: false, error: 'No running timer found' });
    }

    const now = new Date();
    const elapsedMinutes = Math.max(1, Math.round((now.getTime() - running.startedAt!.getTime()) / 60000));

    const entry = await prisma.timeEntry.update({
      where: { id: running.id },
      data: {
        isRunning: false,
        endedAt: now,
        duration: elapsedMinutes,
      },
      include: {
        board: { select: { id: true, title: true, color: true } },
      },
    });

    return res.json({
      success: true,
      data: serializeEntry(entry),
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Active Timer ──────────────────────────────────────

export const getActiveTimer = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;

    const running = await prisma.timeEntry.findFirst({
      where: { userId, isRunning: true },
      include: {
        board: { select: { id: true, title: true, color: true } },
      },
    });

    if (!running) {
      return res.json({ success: true, data: null });
    }

    return res.json({
      success: true,
      data: serializeEntry(running),
    });
  } catch (error) {
    next(error);
  }
};

// ─── Enhanced Stats ────────────────────────────────────────

export const getTimeStats = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const { startDate, endDate } = req.query;

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const { start: weekStart, end: weekEnd } = getWeekBounds(now);

    // Custom range or default to all
    const rangeStart = startDate ? new Date(startDate as string) : undefined;
    const rangeEnd = endDate ? new Date(endDate as string) : undefined;

    const rangeWhere: any = { userId, isRunning: false };
    if (rangeStart || rangeEnd) {
      rangeWhere.date = {};
      if (rangeStart) rangeWhere.date.gte = rangeStart;
      if (rangeEnd) rangeWhere.date.lte = rangeEnd;
    }

    const [
      todayEntries,
      weekEntries,
      allEntries,
      rangeEntries,
      billableEntries,
      boardAgg,
      dailyAgg,
      tagAgg,
    ] = await Promise.all([
      // Today
      prisma.timeEntry.findMany({
        where: { userId, date: { gte: todayStart }, isRunning: false },
        select: { duration: true, billable: true, hourlyRate: true },
      }),
      // This week
      prisma.timeEntry.findMany({
        where: { userId, date: { gte: weekStart, lt: weekEnd }, isRunning: false },
        select: { duration: true, billable: true, hourlyRate: true },
      }),
      // All time
      prisma.timeEntry.aggregate({
        where: { userId, isRunning: false },
        _sum: { duration: true },
        _count: true,
      }),
      // Range entries (for custom period)
      rangeStart || rangeEnd
        ? prisma.timeEntry.findMany({
            where: rangeWhere,
            select: { duration: true, billable: true, hourlyRate: true, boardId: true, tags: true, date: true },
          })
        : Promise.resolve([]),
      // Billable total
      prisma.timeEntry.aggregate({
        where: { userId, billable: true, isRunning: false },
        _sum: { duration: true },
      }),
      // Board breakdown
      prisma.timeEntry.groupBy({
        by: ['boardId'],
        where: { userId, isRunning: false, boardId: { not: null } },
        _sum: { duration: true },
        _count: true,
      }),
      // Daily breakdown (last 14 days)
      prisma.timeEntry.findMany({
        where: { userId, isRunning: false, date: { gte: new Date(now.getTime() - 14 * 86400000) } },
        select: { duration: true, date: true },
      }),
      // Tag breakdown
      prisma.timeEntry.findMany({
        where: { userId, isRunning: false },
        select: { duration: true, tags: true },
      }),
    ]);

    const todayMinutes = todayEntries.reduce((s, e) => s + e.duration, 0);
    const weekMinutes = weekEntries.reduce((s, e) => s + e.duration, 0);
    const totalMinutes = allEntries._sum.duration || 0;
    const billableMinutes = billableEntries._sum.duration || 0;

    // Calculate earnings
    const todayEarnings = todayEntries.reduce((s, e) => {
      if (!e.billable || !e.hourlyRate) return s;
      return s + (e.duration / 60) * Number(e.hourlyRate);
    }, 0);
    const weekEarnings = weekEntries.reduce((s, e) => {
      if (!e.billable || !e.hourlyRate) return s;
      return s + (e.duration / 60) * Number(e.hourlyRate);
    }, 0);

    // Board breakdown with titles
    const boardIds = boardAgg.map((b) => b.boardId!).filter(Boolean);
    const boards = await prisma.board.findMany({
      where: { id: { in: boardIds } },
      select: { id: true, title: true, color: true },
    });
    const boardMap = new Map(boards.map((b) => [b.id, b]));
    const boardBreakdown = boardAgg
      .filter((b) => b.boardId)
      .map((b) => ({
        boardId: b.boardId,
        title: boardMap.get(b.boardId!)?.title || 'Unknown',
        color: boardMap.get(b.boardId!)?.color || '#06b6d4',
        totalMinutes: b._sum.duration || 0,
        entryCount: b._count,
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    // Daily breakdown
    const dailyMap = new Map<string, number>();
    dailyAgg.forEach((e) => {
      const key = e.date.toISOString().split('T')[0];
      dailyMap.set(key, (dailyMap.get(key) || 0) + e.duration);
    });
    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, minutes]) => ({ date, minutes }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Tag breakdown
    const tagMap = new Map<string, number>();
    tagAgg.forEach((e) => {
      e.tags.forEach((tag) => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + e.duration);
      });
    });
    const tagBreakdown = Array.from(tagMap.entries())
      .map(([tag, minutes]) => ({ tag, minutes }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 10);

    // Range stats
    let rangeMinutes = 0;
    let rangeEarnings = 0;
    if (Array.isArray(rangeEntries) && rangeEntries.length > 0) {
      rangeMinutes = rangeEntries.reduce((s, e) => s + e.duration, 0);
      rangeEarnings = rangeEntries.reduce((s, e) => {
        if (!e.billable || !e.hourlyRate) return s;
        return s + (e.duration / 60) * Number(e.hourlyRate);
      }, 0);
    }

    return res.json({
      success: true,
      data: {
        today: todayMinutes,
        thisWeek: weekMinutes,
        allTime: totalMinutes,
        avgDay: Math.round(weekMinutes / 7),
        totalEntries: allEntries._count,
        billableMinutes,
        nonBillableMinutes: totalMinutes - billableMinutes,
        todayEarnings: Math.round(todayEarnings * 100) / 100,
        weekEarnings: Math.round(weekEarnings * 100) / 100,
        rangeMinutes,
        rangeEarnings: Math.round(rangeEarnings * 100) / 100,
        boardBreakdown,
        dailyBreakdown,
        tagBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Export Timesheet (CSV) ────────────────────────────────

export const exportTimesheet = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const { startDate, endDate } = req.query;

    const where: any = { userId, isRunning: false };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        board: { select: { title: true } },
      },
    });

    const header = 'Task,Board,Duration (min),Billable,Hourly Rate,Tags,Date,Description';
    const rows = entries.map((e) => {
      const task = `"${e.taskTitle.replace(/"/g, '""')}"`;
      const board = `"${e.board?.title || ''}"`;
      const duration = e.duration;
      const billable = e.billable ? 'Yes' : 'No';
      const rate = e.hourlyRate ? Number(e.hourlyRate) : '';
      const tags = `"${e.tags.join(', ')}"`;
      const date = e.date.toISOString();
      const desc = `"${(e.description || '').replace(/"/g, '""')}"`;
      return [task, board, duration, billable, rate, tags, date, desc].join(',');
    });

    const csv = [header, ...rows].join('\n');

    return res.json({
      success: true,
      data: { csv, count: entries.length },
    });
  } catch (error) {
    next(error);
  }
};
