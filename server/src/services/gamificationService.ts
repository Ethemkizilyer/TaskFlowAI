import { AchievementType } from '@prisma/client';
import prisma from '../config/prisma';

const ACHIEVEMENT_DEFINITIONS: Array<{
  type: AchievementType;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  threshold: number;
}> = [
  { type: 'FIRST_TASK', name: 'First Steps', description: 'Complete your first task', icon: '🎯', xpReward: 50, threshold: 1 },
  { type: 'TASKS_10', name: 'Getting Started', description: 'Complete 10 tasks', icon: '🌱', xpReward: 100, threshold: 10 },
  { type: 'TASKS_50', name: 'Task Master', description: 'Complete 50 tasks', icon: '⭐', xpReward: 250, threshold: 50 },
  { type: 'TASKS_100', name: 'Centurion', description: 'Complete 100 tasks', icon: '🏆', xpReward: 500, threshold: 100 },
  { type: 'STREAK_7', name: 'On Fire', description: '7-day activity streak', icon: '🔥', xpReward: 150, threshold: 7 },
  { type: 'STREAK_30', name: 'Unstoppable', description: '30-day activity streak', icon: '⚡', xpReward: 400, threshold: 30 },
  { type: 'POMODORO_MASTER', name: 'Pomodoro Master', description: 'Complete 25 focus sessions', icon: '🍅', xpReward: 200, threshold: 25 },
  { type: 'EARLY_BIRD', name: 'Early Bird', description: 'Active before 7 AM 5 times', icon: '🌅', xpReward: 100, threshold: 5 },
  { type: 'NIGHT_OWL', name: 'Night Owl', description: 'Active after 10 PM 5 times', icon: '🦉', xpReward: 100, threshold: 5 },
  { type: 'TEAM_PLAYER', name: 'Team Player', description: 'Complete 10 team-assigned tasks', icon: '🤝', xpReward: 200, threshold: 10 },
  { type: 'SPEED_RUNNER', name: 'Speed Runner', description: 'Complete 5 tasks within 1 hour of creation', icon: '💨', xpReward: 300, threshold: 5 },
  { type: 'ORGANIZER', name: 'Organizer', description: 'Create 5 boards', icon: '📋', xpReward: 150, threshold: 5 },
  { type: 'COMMUNICATOR', name: 'Communicator', description: 'Send 100 messages', icon: '💬', xpReward: 150, threshold: 100 },
  { type: 'FOCUS_GURU', name: 'Focus Guru', description: 'Accumulate 10 hours of focus time', icon: '🧘', xpReward: 250, threshold: 600 },
  { type: 'PERFECTIONIST', name: 'Perfectionist', description: 'Complete 20 tasks with zero re-open', icon: '💎', xpReward: 350, threshold: 20 },
];

const XP_PER_TASK = 25;
const XP_PER_COMMENT = 5;
const XP_PER_FOCUS_SESSION = 30;
const XP_PER_BOARD = 20;

function xpToLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function levelToXp(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}

class GamificationService {
  async ensureAchievementsSeeded(): Promise<void> {
    const count = await prisma.achievement.count();
    if (count > 0) return;
    await prisma.achievement.createMany({
      data: ACHIEVEMENT_DEFINITIONS.map((def) => ({
        type: def.type,
        name: def.name,
        description: def.description,
        icon: def.icon,
        xpReward: def.xpReward,
        threshold: def.threshold,
      })),
    });
  }

  async ensureUserLevel(userId: string): Promise<void> {
    const existing = await prisma.userLevel.findUnique({ where: { userId } });
    if (!existing) {
      await prisma.userLevel.create({ data: { userId } });
    }
  }

  async awardXp(userId: string, amount: number): Promise<{ newLevel: number; leveledUp: boolean }> {
    await this.ensureUserLevel(userId);
    const level = await prisma.userLevel.findUnique({ where: { userId } });
    if (!level) return { newLevel: 1, leveledUp: false };

    const oldLevel = level.level;
    const newXp = level.xp + amount;
    const newLevel = xpToLevel(newXp);

    await prisma.userLevel.update({
      where: { userId },
      data: {
        xp: newXp,
        level: newLevel,
        lastActiveAt: new Date(),
      },
    });

    return { newLevel, leveledUp: newLevel > oldLevel };
  }

  async updateStreak(userId: string): Promise<{ streak: number; milestone: boolean }> {
    await this.ensureUserLevel(userId);
    const level = await prisma.userLevel.findUnique({ where: { userId } });
    if (!level) return { streak: 0, milestone: false };

    const now = new Date();
    const lastActive = new Date(level.lastActiveAt);
    const diffMs = now.getTime() - lastActive.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let newStreak = level.streak;
    if (diffDays === 1) {
      newStreak = level.streak + 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }

    await prisma.userLevel.update({
      where: { userId },
      data: { streak: newStreak, lastActiveAt: now },
    });

    return { streak: newStreak, milestone: [7, 30].includes(newStreak) };
  }

  async onTaskCompleted(userId: string): Promise<void> {
    await this.awardXp(userId, XP_PER_TASK);
    await this.updateStreak(userId);

    const completedCount = await prisma.task.count({
      where: { assigneeId: userId, status: 'DONE' },
    });

    const achievementsToCheck: AchievementType[] = ['FIRST_TASK', 'TASKS_10', 'TASKS_50', 'TASKS_100'];
    for (const type of achievementsToCheck) {
      const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.type === type)!;
      if (completedCount >= def.threshold) {
        await this.unlockAchievement(userId, type);
      }
    }
  }

  async onCommentAdded(userId: string): Promise<void> {
    await this.awardXp(userId, XP_PER_COMMENT);
  }

  async onFocusSessionCompleted(userId: string, totalDurationMinutes: number): Promise<void> {
    await this.awardXp(userId, XP_PER_FOCUS_SESSION);

    const sessionCount = await prisma.focusSession.count({
      where: { userId, completed: true },
    });

    if (sessionCount >= 25) {
      await this.unlockAchievement(userId, 'POMODORO_MASTER');
    }

    if (totalDurationMinutes >= 600) {
      await this.unlockAchievement(userId, 'FOCUS_GURU');
    }
  }

  async onBoardCreated(userId: string): Promise<void> {
    await this.awardXp(userId, XP_PER_BOARD);

    const boardCount = await prisma.board.count({
      where: { ownerId: userId },
    });

    if (boardCount >= 5) {
      await this.unlockAchievement(userId, 'ORGANIZER');
    }
  }

  async onMessageSent(userId: string): Promise<void> {
    const messageCount = await prisma.message.count({
      where: { senderId: userId },
    });

    if (messageCount >= 100) {
      await this.unlockAchievement(userId, 'COMMUNICATOR');
    }
  }

  async unlockAchievement(userId: string, type: AchievementType): Promise<boolean> {
    const achievement = await prisma.achievement.findUnique({ where: { type } });
    if (!achievement) return false;

    const existing = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: { userId, achievementId: achievement.id },
      },
    });
    if (existing) return false;

    await prisma.userAchievement.create({
      data: { userId, achievementId: achievement.id },
    });

    await this.awardXp(userId, achievement.xpReward);
    return true;
  }

  async getUserStats(userId: string) {
    await this.ensureUserLevel(userId);
    const level = await prisma.userLevel.findUnique({ where: { userId } });
    const achievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });
    const allAchievements = await prisma.achievement.findMany({
      orderBy: { threshold: 'asc' },
    });

    const unlockedTypes = new Set(achievements.map((a) => a.achievement.type));
    const locked = allAchievements.filter((a) => !unlockedTypes.has(a.type));

    const currentLevelXp = level ? levelToXp(level.level) : 0;
    const nextLevelXp = level ? levelToXp(level.level + 1) : 100;
    const xpInLevel = (level?.xp || 0) - currentLevelXp;
    const xpForNextLevel = nextLevelXp - currentLevelXp;
    const progressPct = Math.round((xpInLevel / xpForNextLevel) * 100);

    return {
      xp: level?.xp || 0,
      level: level?.level || 1,
      streak: level?.streak || 0,
      progressPct,
      xpInLevel,
      xpForNextLevel,
      unlockedAchievements: achievements.map((a) => ({
        id: a.achievement.id,
        type: a.achievement.type,
        name: a.achievement.name,
        description: a.achievement.description,
        icon: a.achievement.icon,
        xpReward: a.achievement.xpReward,
        unlockedAt: a.unlockedAt,
      })),
      lockedAchievements: locked.map((a) => ({
        id: a.id,
        type: a.type,
        name: a.name,
        description: a.description,
        icon: a.icon,
        xpReward: a.xpReward,
        threshold: a.threshold,
      })),
    };
  }

  async getLeaderboard(limit = 10) {
    const levels = await prisma.userLevel.findMany({
      take: limit,
      orderBy: { xp: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, role: true },
        },
      },
    });

    return levels.map((l, idx) => ({
      rank: idx + 1,
      userId: l.user.id,
      name: l.user.name,
      avatar: l.user.avatar,
      role: l.user.role,
      xp: l.xp,
      level: l.level,
      streak: l.streak,
    }));
  }
}

export default new GamificationService();
