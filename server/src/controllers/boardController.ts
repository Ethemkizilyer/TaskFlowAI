import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest, ApiResponse } from '../types';

const createBoardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const updateBoardSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const getBoards = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const boards = await prisma.board.findMany({
      where: {
        OR: [
          { ownerId: req.userId },
          { members: { some: { userId: req.userId } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        _count: { select: { tasks: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json({ success: true, data: boards });
  } catch (error) {
    next(error);
  }
};

export const getBoard = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const board = await prisma.board.findFirst({
      where: {
        id,
        OR: [
          { ownerId: req.userId },
          { members: { some: { userId: req.userId } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        columns: { orderBy: { order: 'asc' } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, avatar: true } },
            comments: {
              include: { user: { select: { id: true, name: true, avatar: true } } },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { position: 'asc' },
        },
        activity: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found' });
    }

    return res.json({ success: true, data: board });
  } catch (error) {
    next(error);
  }
};

export const createBoard = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { title, description, color } = createBoardSchema.parse(req.body);

    const board = await prisma.board.create({
      data: {
        title,
        description,
        color: color || '#6366f1',
        ownerId: req.userId!,
        members: { create: { userId: req.userId!, role: 'ADMIN' } },
        columns: {
          create: [
            { title: 'Backlog', status: 'BACKLOG', order: 0 },
            { title: 'To Do', status: 'TODO', order: 1 },
            { title: 'In Progress', status: 'IN_PROGRESS', order: 2 },
            { title: 'Review', status: 'REVIEW', order: 3 },
            { title: 'Done', status: 'DONE', order: 4 },
          ],
        },
      },
      include: {
        columns: true,
        owner: { select: { id: true, name: true, avatar: true } },
      },
    });

    await prisma.activity.create({
      data: {
        type: 'BOARD_CREATED',
        description: `created board "${title}"`,
        boardId: board.id,
        userId: req.userId!,
      },
    });

    return res.status(201).json({ success: true, data: board, message: 'Board created' });
  } catch (error) {
    next(error);
  }
};

export const updateBoard = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const data = updateBoardSchema.parse(req.body);

    const board = await prisma.board.findFirst({
      where: { id, OR: [{ ownerId: req.userId }, { members: { some: { userId: req.userId, role: 'ADMIN' } } }] },
    });

    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found or insufficient permissions' });
    }

    const updated = await prisma.board.update({
      where: { id },
      data,
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
    });

    return res.json({ success: true, data: updated, message: 'Board updated' });
  } catch (error) {
    next(error);
  }
};

export const deleteBoard = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const board = await prisma.board.findFirst({
      where: { id, ownerId: req.userId },
    });

    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found or insufficient permissions' });
    }

    await prisma.board.delete({ where: { id } });

    return res.json({ success: true, message: 'Board deleted' });
  } catch (error) {
    next(error);
  }
};

export const addMember = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const schema = z.object({ email: z.string().email() });
    const { email } = schema.parse(req.body);

    const board = await prisma.board.findFirst({
      where: { id, OR: [{ ownerId: req.userId }, { members: { some: { userId: req.userId, role: 'ADMIN' } } }] },
    });

    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found or insufficient permissions' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found with that email' });
    }

    const existing = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: id, userId: user.id } },
    });

    if (existing) {
      return res.status(409).json({ success: false, error: 'User is already a member' });
    }

    await prisma.boardMember.create({
      data: { boardId: id, userId: user.id, role: 'MEMBER' },
    });

    await prisma.activity.create({
      data: {
        type: 'MEMBER_ADDED',
        description: `added ${user.name} to the board`,
        boardId: id,
        userId: req.userId!,
      },
    });

    return res.json({ success: true, message: 'Member added' });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { id, userId } = req.params;

    const board = await prisma.board.findFirst({
      where: { id, OR: [{ ownerId: req.userId }, { members: { some: { userId: req.userId, role: 'ADMIN' } } }] },
    });

    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found or insufficient permissions' });
    }

    await prisma.boardMember.delete({
      where: { boardId_userId: { boardId: id, userId } },
    });

    return res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    next(error);
  }
};
