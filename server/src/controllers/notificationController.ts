import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { emitNotification, emitBroadcast } from '../sockets/socketHandler';

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unread === 'true';

    const where: any = { userId: req.userId };
    if (unreadOnly) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          fromUser: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.userId, isRead: false } }),
    ]);

    return res.json({
      success: true,
      data: notifications,
      meta: { page, limit, total, unreadCount, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id, userId: req.userId },
      data: { isRead: true },
    });

    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, isRead: false },
      data: { isRead: true },
    });

    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    await prisma.notification.delete({
      where: { id: req.params.id, userId: req.userId },
    });

    return res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};

export const createNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: any,
  fromUserId?: string,
  boardId?: string,
  taskId?: string
) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: type as any,
        title,
        message,
        data: data || undefined,
        fromUserId: fromUserId || undefined,
        boardId: boardId || undefined,
        taskId: taskId || undefined,
      },
      include: {
        fromUser: { select: { id: true, name: true, avatar: true } },
      },
    });
    emitNotification(userId, notification);
    return notification;
  } catch {
    // Silent fail - notifications are non-critical
  }
};

const broadcastSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  target: z.enum(['ALL', 'ACTIVE', 'ROLE']).default('ALL'),
  role: z.string().optional(),
});

export const broadcastNotification = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const data = broadcastSchema.parse(req.body);

    let users: { id: string }[];
    if (data.target === 'ALL') {
      users = await prisma.user.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
    } else if (data.target === 'ROLE' && data.role) {
      users = await prisma.user.findMany({ where: { status: 'ACTIVE', role: data.role as any }, select: { id: true } });
    } else {
      users = await prisma.user.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
    }

    const notifications = await Promise.all(
      users.map((u) =>
        prisma.notification.create({
          data: {
            userId: u.id,
            type: 'BROADCAST',
            title: data.title,
            message: data.message,
            fromUserId: req.userId,
            data: { target: data.target, role: data.role },
          },
          include: {
            fromUser: { select: { id: true, name: true, avatar: true } },
          },
        })
      )
    );

    notifications.forEach((n) => emitNotification(n.userId, n));

    return res.json({ success: true, message: `Broadcast sent to ${users.length} users`, data: { count: users.length } });
  } catch (error) {
    next(error);
  }
};
