import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { getIO } from '../sockets/socketHandler';

const createConversationSchema = z.object({
  type: z.enum(['DIRECT', 'GROUP']).default('DIRECT'),
  title: z.string().max(100).optional(),
  participantIds: z.array(z.string()).min(1, 'At least one participant required'),
});

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(5000),
  attachments: z.any().optional(),
});

export const getConversations = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        members: { some: { userId: req.userId } },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true, role: true, status: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const member = conv.members.find((m) => m.userId === req.userId);
        const lastReadAt = member?.lastReadAt;
        const unreadCount = lastReadAt
          ? await prisma.message.count({
              where: {
                conversationId: conv.id,
                senderId: { not: req.userId },
                createdAt: { gt: lastReadAt },
              },
            })
          : await prisma.message.count({
              where: {
                conversationId: conv.id,
                senderId: { not: req.userId },
              },
            });
        return { ...conv, unreadCount };
      })
    );

    return res.json({ success: true, data: conversationsWithUnread });
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: req.params.id,
        members: { some: { userId: req.userId } },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true, role: true, status: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    return res.json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const membership = await prisma.conversationMember.findFirst({
      where: { conversationId: req.params.id, userId: req.userId },
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: 'Not a member of this conversation' });
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: req.params.id },
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.message.count({ where: { conversationId: req.params.id } }),
    ]);

    await prisma.conversationMember.update({
      where: { id: membership.id },
      data: { lastReadAt: new Date() },
    });

    return res.json({
      success: true,
      data: messages.reverse(),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

export const createConversation = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { type, title, participantIds } = createConversationSchema.parse(req.body);

    if (type === 'DIRECT') {
      const existing = await prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          AND: [
            { members: { some: { userId: req.userId } } },
            { members: { some: { userId: participantIds[0] } } },
          ],
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, avatar: true, role: true } },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (existing) {
        return res.json({ success: true, data: existing, message: 'Conversation already exists' });
      }
    }

    const allParticipantIds = [...new Set([req.userId, ...participantIds])];

    const conversation = await prisma.conversation.create({
      data: {
        type,
        title: type === 'GROUP' ? title : null,
        members: {
          create: allParticipantIds.map((userId) => ({ userId })),
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true, role: true } },
          },
        },
      },
    });

    const io = getIO();
    if (io) {
      participantIds.forEach((userId) => {
        io.to(`user:${userId}`).emit('conversation:created', conversation);
      });
    }

    return res.status(201).json({ success: true, data: conversation, message: 'Conversation created' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation error' });
    }
    next(error);
  }
};

export const sendMessage = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const { content, attachments } = sendMessageSchema.parse(req.body);
    const conversationId = req.params.id;

    const membership = await prisma.conversationMember.findFirst({
      where: { conversationId, userId: req.userId },
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: 'Not a member of this conversation' });
    }

    const message = await prisma.message.create({
      data: {
        content,
        attachments: attachments || null,
        conversationId,
        senderId: req.userId,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const members = await prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });

    const io = getIO();
    if (io) {
      members.forEach((member) => {
        if (member.userId !== req.userId) {
          io.to(`user:${member.userId}`).emit('message:received', message);
        }
      });
    }

    return res.status(201).json({ success: true, data: message, message: 'Message sent' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation error' });
    }
    next(error);
  }
};

export const markConversationRead = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const membership = await prisma.conversationMember.findFirst({
      where: { conversationId: req.params.id, userId: req.userId },
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: 'Not a member of this conversation' });
    }

    await prisma.conversationMember.update({
      where: { id: membership.id },
      data: { lastReadAt: new Date() },
    });

    await prisma.message.updateMany({
      where: {
        conversationId: req.params.id,
        senderId: { not: req.userId },
        status: { not: 'READ' },
      },
      data: { status: 'READ' },
    });

    return res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    next(error);
  }
};

export const getOnlineUsers = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        id: { not: req.userId },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true,
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};
