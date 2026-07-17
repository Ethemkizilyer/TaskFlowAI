import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest, ApiResponse } from '../types';

const triggers = [
  'TASK_STALE_3D',
  'TASK_OVERDUE',
  'TASK_HIGH_PRIORITY',
  'TASK_NO_ASSIGNEE',
  'BOARD_NO_ACTIVITY_7D',
] as const;

const actions = [
  'NOTIFY_TEAM',
  'ASSIGN_TO_LEADER',
  'MOVE_TO_REVIEW',
  'CHANGE_PRIORITY',
] as const;

const createAutomationSchema = z.object({
  name: z.string().min(1).max(100),
  boardId: z.string().optional(),
  trigger: z.enum(triggers),
  triggerConfig: z.record(z.any()).optional(),
  action: z.enum(actions),
  actionConfig: z.record(z.any()).optional(),
});

export const getAutomations = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const automations = await prisma.automation.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: automations });
  } catch (error) {
    next(error);
  }
};

export const createAutomation = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const data = createAutomationSchema.parse(req.body);

    const automation = await prisma.automation.create({
      data: {
        userId: req.userId!,
        boardId: data.boardId || null,
        name: data.name,
        trigger: data.trigger,
        triggerConfig: data.triggerConfig || {},
        action: data.action,
        actionConfig: data.actionConfig || {},
      },
    });

    return res.json({ success: true, data: automation });
  } catch (error) {
    next(error);
  }
};

export const toggleAutomation = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const automation = await prisma.automation.findFirst({
      where: { id, userId: req.userId },
    });

    if (!automation) {
      return res.status(404).json({ success: false, error: 'Automation not found' });
    }

    const updated = await prisma.automation.update({
      where: { id },
      data: { enabled: !automation.enabled },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteAutomation = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const automation = await prisma.automation.findFirst({
      where: { id, userId: req.userId },
    });

    if (!automation) {
      return res.status(404).json({ success: false, error: 'Automation not found' });
    }

    await prisma.automation.delete({ where: { id } });
    return res.json({ success: true, message: 'Automation deleted' });
  } catch (error) {
    next(error);
  }
};

export const getTriggersAndActions = async (
  _req: AuthenticatedRequest,
  res: Response<ApiResponse>
) => {
  return res.json({
    success: true,
    data: {
      triggers: triggers.map(t => ({ value: t, label: t.replace(/_/g, ' ').toLowerCase() })),
      actions: actions.map(a => ({ value: a, label: a.replace(/_/g, ' ').toLowerCase() })),
    },
  });
};
