import { Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { sendCredentialsEmail } from '../services/emailService';

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  role: z.enum(['ADMIN', 'DIRECTOR', 'MANAGER', 'TEAM_LEADER', 'TEAM_MEMBER', 'PERSONNEL']).default('PERSONNEL'),
});

function generateRandomPassword(length: number = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'DIRECTOR', 'MANAGER', 'TEAM_LEADER', 'TEAM_MEMBER', 'PERSONNEL']),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

export const createUser = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { name, email, role } = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const rawPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        avatar,
        role,
        status: 'ACTIVE',
      },
      select: {
        id: true, name: true, email: true, avatar: true, role: true, status: true, createdAt: true,
      },
    });

    const emailSent = await sendCredentialsEmail(email, name, rawPassword);

    return res.status(201).json({
      success: true,
      data: user,
      message: emailSent
        ? 'User created and credentials sent to email'
        : 'User created but email could not be sent (SMTP not configured)',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation error' });
    }
    next(error);
  }
};

export const getAllUsers = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          bio: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              boards: true,
              tasks: true,
              boardMembers: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      success: true,
      data: users,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            boards: true,
            tasks: true,
            boardMembers: true,
            comments: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const approveUser = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE' },
      select: { id: true, name: true, email: true, status: true, role: true },
    });

    return res.json({ success: true, data: updated, message: 'User approved' });
  } catch (error) {
    next(error);
  }
};

export const banUser = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ success: false, error: 'Cannot ban yourself' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (user.role === 'ADMIN') {
      return res.status(400).json({ success: false, error: 'Cannot ban an admin' });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'BANNED' },
      select: { id: true, name: true, email: true, status: true },
    });

    return res.json({ success: true, data: updated, message: 'User banned' });
  } catch (error) {
    next(error);
  }
};

export const unbanUser = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE' },
      select: { id: true, name: true, email: true, status: true },
    });

    return res.json({ success: true, data: updated, message: 'User unbanned' });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { role } = updateRoleSchema.parse(req.body);

    if (req.params.id === req.userId && role !== 'ADMIN') {
      return res.status(400).json({ success: false, error: 'Cannot demote yourself' });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    return res.json({ success: true, data: updated, message: 'Role updated' });
  } catch (error) {
    next(error);
  }
};

export const getPendingUsers = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const users = await prisma.user.findMany({
      where: { status: 'PENDING' },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: users });
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
    const [totalUsers, pendingUsers, activeUsers, bannedUsers, totalBoards, totalTasks, totalComments] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'PENDING' } }),
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.user.count({ where: { status: 'BANNED' } }),
        prisma.board.count(),
        prisma.task.count(),
        prisma.comment.count(),
      ]);

    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, avatar: true, createdAt: true, status: true },
    });

    const recentBoards = await prisma.board.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, createdAt: true, owner: { select: { name: true } } },
    });

    return res.json({
      success: true,
      data: {
        users: { total: totalUsers, pending: pendingUsers, active: activeUsers, banned: bannedUsers },
        boards: totalBoards,
        tasks: totalTasks,
        comments: totalComments,
        recentUsers,
        recentBoards,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const data = updateUserSchema.parse(req.body);

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: { id: true, name: true, email: true, avatar: true, bio: true, role: true },
    });

    return res.json({ success: true, data: updated, message: 'Profile updated' });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashed },
    });

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};
