import { Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AuthenticatedRequest, ApiResponse } from '../types';

export const getBoardActivity = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { boardId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const type = req.query.type as string | undefined;

    const where: any = { boardId };
    if (type) where.type = type;

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          task: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activity.count({ where }),
    ]);

    return res.json({
      success: true,
      data: activities,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserActivity = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const boards = await prisma.boardMember.findMany({
      where: { userId: req.userId },
      select: { boardId: true },
    });
    const boardIds = boards.map((b) => b.boardId);

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where: { boardId: { in: boardIds } },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          board: { select: { id: true, title: true, color: true } },
          task: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activity.count({ where: { boardId: { in: boardIds } } }),
    ]);

    return res.json({
      success: true,
      data: activities,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};
