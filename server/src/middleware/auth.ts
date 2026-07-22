import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import { verifyAccessToken } from '../services/tokenService';
import { AuthenticatedRequest, ApiResponse } from '../types';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  tokenVersion: true,
  avatar: true,
  bio: true,
  departmentId: true,
  teamId: true,
};

async function resolveUserFromAccessToken(token: string) {
  const payload = verifyAccessToken(token);
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: userSelect,
  });

  if (!user) return null;
  if (user.status !== 'ACTIVE') return null;
  if (user.tokenVersion !== payload.v) return null;

  return user;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const user = await resolveUserFromAccessToken(token);
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid or expired session' });
      return;
    }

    req.userId = user.id;
    req.userRole = user.role;
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
      return;
    }
    res.status(500).json({ success: false, error: 'Authentication error' });
    return;
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const user = await resolveUserFromAccessToken(token);
      if (user) {
        req.userId = user.id;
        req.userRole = user.role;
        req.user = user;
      }
    } catch {
      // Ignore invalid token for optional auth
    }
  }

  next();
};
