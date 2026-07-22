import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../config/prisma';
import { config } from '../config';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { ROLE_PERMISSIONS, Role } from '../config/permissions';
import {
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
} from '../services/tokenService';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const buildAuthResponse = (user: any, tokens: { accessToken: string; refreshToken: string } | null) => {
  const permissions = ROLE_PERMISSIONS[user.role as Role] || [];
  return {
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
    ...(tokens && { token: tokens.accessToken, refreshToken: tokens.refreshToken }),
  };
};

const tokenMeta = (req: AuthenticatedRequest) => ({
  userAgent: req.headers['user-agent'],
  ip: req.ip || undefined,
});

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
        tokenVersion: true, departmentId: true, teamId: true,
      },
    });

    const tokens = user.status === 'ACTIVE'
      ? await issueTokenPair(user.id, user.tokenVersion, tokenMeta(req))
      : null;

    return res.status(201).json({
      success: true,
      data: buildAuthResponse(user, tokens),
      message: isFirstUser
        ? 'Account created successfully'
        : 'Account created successfully. Await admin approval.',
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

    const tokens = await issueTokenPair(user.id, user.tokenVersion, tokenMeta(req));

    return res.json({
      success: true,
      data: buildAuthResponse(user, tokens),
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

export const refresh = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await rotateRefreshToken(refreshToken, tokenMeta(req));
    return res.json({ success: true, data: tokens });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0]?.message || 'Validation error',
      });
    }
    return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
  }
};

export const logout = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { refreshToken } = logoutSchema.parse(req.body);
    await revokeRefreshToken(refreshToken);
    return res.json({ success: true, message: 'Logged out successfully' });
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
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { ...(name && { name }), ...(avatar && { avatar }) },
      select: { id: true, name: true, email: true, avatar: true, role: true },
    });

    return res.json({ success: true, data: user, message: 'Profile updated' });
  } catch (error) {
    next(error);
  }
};
