import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import gamificationService from '../services/gamificationService';

export const getMyStats = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  _next: NextFunction
) => {
  try {
    const userId = req.userId!;
    await gamificationService.ensureAchievementsSeeded();
    const stats = await gamificationService.getUserStats(userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch gamification stats' });
  }
};

export const getLeaderboard = async (
  _req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  _next: NextFunction
) => {
  try {
    await gamificationService.ensureAchievementsSeeded();
    const leaderboard = await gamificationService.getLeaderboard(10);
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
};

export const getUserAchievements = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  _next: NextFunction
) => {
  try {
    const userId = req.userId!;
    await gamificationService.ensureAchievementsSeeded();
    const stats = await gamificationService.getUserStats(userId);
    res.json({
      success: true,
      data: {
        unlocked: stats.unlockedAchievements,
        locked: stats.lockedAchievements,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch achievements' });
  }
};
