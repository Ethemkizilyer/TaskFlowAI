import { Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AuthenticatedRequest, ApiResponse } from '../types';

export const globalSearch = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (q.length < 2) {
      return res.json({ success: true, data: { boards: [], tasks: [], users: [], comments: [] } });
    }

    const userId = req.userId!;
    const searchStr = q;
    const limit = 8;

    const [boards, tasks, users, comments] = await Promise.all([
      prisma.board.findMany({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: searchStr, mode: 'insensitive' } },
                { description: { contains: searchStr, mode: 'insensitive' } },
              ],
            },
            {
              OR: [
                { ownerId: userId },
                { members: { some: { userId } } },
                { isPrivate: false },
              ],
            },
          ],
        },
        take: limit,
        select: {
          id: true, title: true, description: true, color: true,
          _count: { select: { tasks: true } },
        },
      }),
      prisma.task.findMany({
        where: {
          AND: [
            {
              board: {
                OR: [
                  { ownerId: userId },
                  { members: { some: { userId } } },
                  { isPrivate: false },
                ],
              },
            },
            {
              OR: [
                { title: { contains: searchStr, mode: 'insensitive' } },
                { description: { contains: searchStr, mode: 'insensitive' } },
              ],
            },
          ],
        },
        take: limit,
        select: {
          id: true, title: true, description: true, status: true, priority: true,
          boardId: true,
          board: { select: { id: true, title: true, color: true } },
        },
      }),
      prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { name: { contains: searchStr, mode: 'insensitive' } },
            { email: { contains: searchStr, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: { id: true, name: true, email: true, avatar: true, role: true },
      }),
      prisma.comment.findMany({
        where: {
          AND: [
            {
              task: {
                board: {
                  OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                    { isPrivate: false },
                  ],
                },
              },
            },
            { content: { contains: searchStr, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: {
          id: true, content: true, createdAt: true,
          user: { select: { id: true, name: true, avatar: true } },
          task: { select: { id: true, title: true, boardId: true } },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: { boards, tasks, users, comments },
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;

    const userBoards = await prisma.board.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      select: { id: true },
    });
    const boardIds = userBoards.map((b) => b.id);

    const [taskStatusCounts, taskPriorityCounts, recentActivity, boardsWithTasks] = await Promise.all([
      prisma.task.groupBy({
        by: ['status'],
        where: { boardId: { in: boardIds } },
        _count: true,
      }),
      prisma.task.groupBy({
        by: ['priority'],
        where: { boardId: { in: boardIds } },
        _count: true,
      }),
      prisma.activity.findMany({
        where: { userId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, type: true, description: true, createdAt: true,
          board: { select: { id: true, title: true, color: true } },
        },
      }),
      prisma.board.findMany({
        where: { id: { in: boardIds } },
        select: {
          id: true, title: true, color: true,
          _count: { select: { tasks: true } },
          tasks: {
            select: { status: true },
          },
        },
      }),
    ]);

    const statusData: Record<string, number> = {};
    taskStatusCounts.forEach((s) => { statusData[s.status] = s._count; });

    const priorityData: Record<string, number> = {};
    taskPriorityCounts.forEach((p) => { priorityData[p.priority] = p._count; });

    const boardProgress = boardsWithTasks.map((b) => {
      const total = b.tasks.length;
      const done = b.tasks.filter((t) => t.status === 'DONE').length;
      return {
        id: b.id,
        title: b.title,
        color: b.color,
        total,
        done,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });

    const last7Days: Array<{ date: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const count = await prisma.activity.count({
        where: {
          userId,
          createdAt: { gte: date, lt: nextDay },
        },
      });
      last7Days.push({
        date: date.toISOString().split('T')[0],
        count,
      });
    }

    return res.json({
      success: true,
      data: {
        taskStatus: statusData,
        taskPriority: priorityData,
        boardProgress,
        recentActivity,
        activityLast7Days: last7Days,
      },
    });
  } catch (error) {
    next(error);
  }
};
