import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/prisma';
import { config } from '../config';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { ROLE_PERMISSIONS, Role } from '../config/permissions';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

const generateToken = (userId: string, email: string, name: string, role: string) => {
  const permissions = ROLE_PERMISSIONS[role as Role] || [];
  return jwt.sign({ id: userId, email, name, role, permissions }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as string,
  });
};

export const register = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, config.bcryptRounds);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`;

    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    const user = await prisma.user.create({
      data: {
        name, email, password: hashedPassword, avatar,
        role: isFirstUser ? 'ADMIN' : 'PERSONNEL',
        status: isFirstUser ? 'ACTIVE' : 'PENDING',
      },
      select: {
        id: true, name: true, email: true, avatar: true, role: true, status: true,
        departmentId: true, teamId: true,
      },
    });

    const token = generateToken(user.id, user.email, user.name, user.role);

    return res.status(201).json({
      success: true,
      data: { user, token },
      message: 'Account created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0]?.message || 'Validation error',
      });
    }
    next(error);
  }
};

export const login = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: user.status === 'BANNED' ? 'Your account has been banned' : 'Your account has been suspended',
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = generateToken(user.id, user.email, user.name, user.role);
    const permissions = ROLE_PERMISSIONS[user.role as Role] || [];

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          status: user.status,
          departmentId: user.departmentId,
          teamId: user.teamId,
          permissions,
        },
        token,
      },
      message: 'Login successful',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0]?.message || 'Validation error',
      });
    }
    next(error);
  }
};

export const getMe = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, name: true, email: true, avatar: true, bio: true,
        role: true, status: true, createdAt: true,
        departmentId: true, teamId: true,
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const permissions = ROLE_PERMISSIONS[user.role as Role] || [];

    return res.json({ success: true, data: { ...user, permissions } });
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
    const updateSchema = z.object({
      name: z.string().min(2).optional(),
      avatar: z.string().optional(),
    });

    const { name, avatar } = updateSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { ...(name && { name }), ...(avatar && { avatar }) },
      select: { id: true, name: true, email: true, avatar: true, role: true },
    });

    return res.json({ success: true, data: user, message: 'Profile updated' });
  } catch (error) {
    next(error);
  }
};
