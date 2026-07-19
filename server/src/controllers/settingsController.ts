import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest, ApiResponse } from '../types';

const settingsSchema = z.object({
  orgName: z.string().max(255).nullable().optional(),
  orgDomain: z.string().max(255).nullable().optional(),
  timezone: z.string().max(100).nullable().optional(),
  language: z.string().max(10).nullable().optional(),
  defaultBoardColor: z.string().max(7).nullable().optional(),
  autoArchiveDays: z.number().int().optional(),
  allowGuestAccess: z.boolean().optional(),
  requireApproval: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  taskAssigned: z.boolean().optional(),
  taskDueSoon: z.boolean().optional(),
  taskOverdue: z.boolean().optional(),
  boardUpdates: z.boolean().optional(),
  teamPulseReminders: z.boolean().optional(),
  aiBriefingDaily: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  mentionsOnly: z.boolean().optional(),
  density: z.string().max(20).optional(),
  accentColor: z.string().max(20).optional(),
  reduceMotion: z.boolean().optional(),
  highContrast: z.boolean().optional(),
  twoFactor: z.boolean().optional(),
  sessionTimeout: z.string().max(10).optional(),
  passwordExpiry: z.string().max(10).optional(),
  ipWhitelist: z.string().nullable().optional(),
  apiAccess: z.boolean().optional(),
  auditLog: z.boolean().optional(),
  intSlack: z.boolean().optional(),
  intGithub: z.boolean().optional(),
  intGoogleCalendar: z.boolean().optional(),
  intWebhooks: z.boolean().optional(),
});

export const getSettings = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;

    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId },
      });
    }

    return res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const data = settingsSchema.parse(req.body);

    const existing = await prisma.userSettings.findUnique({
      where: { userId },
    });

    let settings;
    if (existing) {
      settings = await prisma.userSettings.update({
        where: { userId },
        data,
      });
    } else {
      settings = await prisma.userSettings.create({
        data: { userId, ...data },
      });
    }

    return res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};
