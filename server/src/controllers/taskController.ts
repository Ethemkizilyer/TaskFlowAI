import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { emitBoardEvent } from '../sockets/socketHandler';
import { createNotification } from './notificationController';
import gamificationService from '../services/gamificationService';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional(),
  columnId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  columnId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  position: z.number().optional(),
});

const moveTaskSchema = z.object({
  columnId: z.string().nullable(),
  position: z.number(),
});

const hasBoardAccess = async (boardId: string, userId: string) => {
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
  });
  return !!board;
};

export const createTask = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { boardId } = req.params;
    const data = createTaskSchema.parse(req.body);

    if (!(await hasBoardAccess(boardId, req.userId!))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const maxPosition = await prisma.task.aggregate({
      where: { boardId, columnId: data.columnId || null },
      _max: { position: true },
    });

    const task = await prisma.task.create({
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        boardId,
        position: (maxPosition._max.position || 0) + 1,
      },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        comments: { include: { user: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });

    await prisma.activity.create({
      data: {
        type: 'TASK_CREATED',
        description: `created task "${task.title}"`,
        boardId,
        taskId: task.id,
        userId: req.userId!,
      },
    });

    emitBoardEvent(boardId, 'task:created', task);

    return res.status(201).json({ success: true, data: task, message: 'Task created' });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { boardId, taskId } = req.params;
    const data = updateTaskSchema.parse(req.body);

    if (!(await hasBoardAccess(boardId, req.userId!))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const task = await prisma.task.findFirst({ where: { id: taskId, boardId } });
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    let statusToSet = data.status;
    if (data.columnId !== undefined && data.columnId !== task.columnId) {
      if (data.columnId) {
        const newColumn = await prisma.column.findUnique({ where: { id: data.columnId } });
        if (newColumn) {
          statusToSet = newColumn.status;
        }
      } else {
        statusToSet = 'BACKLOG' as any;
      }
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...data,
        status: statusToSet,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        comments: { include: { user: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });

    const changes: string[] = [];
    if (data.title && data.title !== task.title) changes.push(`renamed to "${data.title}"`);
    if (data.priority && data.priority !== task.priority) changes.push(`priority set to ${data.priority}`);
    if (data.status && data.status !== task.status) changes.push(`status changed to ${data.status}`);
    if (data.assigneeId !== undefined && data.assigneeId !== task.assigneeId) {
      changes.push(data.assigneeId ? 'assigned to a member' : 'unassigned');
      if (data.assigneeId && data.assigneeId !== req.userId) {
        await createNotification(
          data.assigneeId,
          'TASK_ASSIGNED',
          'New task assigned',
          `You have been assigned to "${task.title}"`,
          { taskId, boardId, taskTitle: task.title },
          req.userId,
          boardId,
          taskId
        );
      }
    }

    if (changes.length > 0) {
      await prisma.activity.create({
        data: {
          type: 'TASK_UPDATED',
          description: `updated task "${task.title}": ${changes.join(', ')}`,
          boardId,
          taskId,
          userId: req.userId!,
        },
      });
    }

    // Notify board members when task is marked as DONE
    if (statusToSet === 'DONE' && task.status !== 'DONE') {
      const board = await prisma.board.findUnique({
        where: { id: boardId },
        select: {
          ownerId: true,
          members: { select: { userId: true } },
        },
      });
      if (board) {
        const memberIds = [
          board.ownerId,
          ...board.members.map((m) => m.userId),
        ].filter((id) => id !== req.userId);
        await Promise.all(
          memberIds.map((userId) =>
            createNotification(
              userId,
              'TASK_UPDATED',
              'Task completed',
              `"${task.title}" has been marked as done`,
              { taskId, boardId, taskTitle: task.title },
              req.userId,
              boardId,
              taskId
            )
          )
        );
      }

      if (updated.assigneeId) {
        gamificationService.onTaskCompleted(updated.assigneeId).catch(() => {});
      }
    }

    emitBoardEvent(boardId, 'task:updated', updated);

    return res.json({ success: true, data: updated, message: 'Task updated' });
  } catch (error) {
    next(error);
  }
};

export const moveTask = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { boardId, taskId } = req.params;
    const { columnId, position } = moveTaskSchema.parse(req.body);

    if (!(await hasBoardAccess(boardId, req.userId!))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const task = await prisma.task.findFirst({ where: { id: taskId, boardId } });
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    await prisma.$transaction(async (tx) => {
      if (task.columnId !== columnId) {
        await tx.task.updateMany({
          where: { boardId, columnId: task.columnId, position: { gt: task.position } },
          data: { position: { decrement: 1 } },
        });

        await tx.task.updateMany({
          where: { boardId, columnId, position: { gte: position } },
          data: { position: { increment: 1 } },
        });

        const column = columnId ? await tx.column.findUnique({ where: { id: columnId } }) : null;
        await tx.task.update({
          where: { id: taskId },
          data: { columnId, position, status: column?.status || 'BACKLOG' },
        });
        await tx.activity.create({
          data: {
            type: 'TASK_MOVED',
            description: `moved "${task.title}" to ${column?.title || 'Backlog'}`,
            boardId,
            taskId,
            userId: req.userId!,
          },
        });
      } else {
        if (task.position < position) {
          await tx.task.updateMany({
            where: { boardId, columnId, position: { gt: task.position, lte: position } },
            data: { position: { decrement: 1 } },
          });
        } else {
          await tx.task.updateMany({
            where: { boardId, columnId, position: { gte: position, lt: task.position } },
            data: { position: { increment: 1 } },
          });
        }

        await tx.task.update({
          where: { id: taskId },
          data: { position },
        });
      }
    });

    const updated = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        comments: { include: { user: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });

    // Notify board members when task is moved to DONE column
    if (updated?.status === 'DONE' && task.status !== 'DONE') {
      const board = await prisma.board.findUnique({
        where: { id: boardId },
        select: {
          ownerId: true,
          members: { select: { userId: true } },
        },
      });
      if (board) {
        const memberIds = [
          board.ownerId,
          ...board.members.map((m) => m.userId),
        ].filter((id) => id !== req.userId);
        await Promise.all(
          memberIds.map((userId) =>
            createNotification(
              userId,
              'TASK_UPDATED',
              'Task completed',
              `"${task.title}" has been marked as done`,
              { taskId, boardId, taskTitle: task.title },
              req.userId,
              boardId,
              taskId
            )
          )
        );
      }

      if (updated.assigneeId) {
        gamificationService.onTaskCompleted(updated.assigneeId).catch(() => {});
      }
    }

    emitBoardEvent(boardId, 'task:moved', { taskId, columnId, position, task: updated });

    return res.json({ success: true, data: updated, message: 'Task moved' });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { boardId, taskId } = req.params;

    if (!(await hasBoardAccess(boardId, req.userId!))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const task = await prisma.task.findFirst({ where: { id: taskId, boardId } });
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    await prisma.task.delete({ where: { id: taskId } });

    await prisma.activity.create({
      data: {
        type: 'TASK_DELETED',
        description: `deleted task "${task.title}"`,
        boardId,
        userId: req.userId!,
      },
    });

    emitBoardEvent(boardId, 'task:deleted', { taskId });

    return res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
};

export const addComment = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { boardId, taskId } = req.params;
    const schema = z.object({ content: z.string().min(1).max(1000) });
    const { content } = schema.parse(req.body);

    if (!(await hasBoardAccess(boardId, req.userId!))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const comment = await prisma.comment.create({
      data: { content, taskId, userId: req.userId! },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    emitBoardEvent(boardId, 'comment:added', { taskId, comment });

    gamificationService.onCommentAdded(req.userId!).catch(() => {});

    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { title: true, assigneeId: true } });
    if (task?.assigneeId && task.assigneeId !== req.userId) {
      await createNotification(
        task.assigneeId,
        'COMMENT_RECEIVED',
        'New comment on your task',
        `Someone commented on "${task.title}"`,
        { taskId, boardId, commentId: comment.id },
        req.userId,
        boardId,
        taskId
      );
    }

    return res.status(201).json({ success: true, data: comment, message: 'Comment added' });
  } catch (error) {
    next(error);
  }
};

export const getComments = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { boardId, taskId } = req.params;

    if (!(await hasBoardAccess(boardId, req.userId!))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: comments });
  } catch (error) {
    next(error);
  }
};
