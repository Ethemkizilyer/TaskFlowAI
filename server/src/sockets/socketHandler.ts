import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../config/prisma';

let io: SocketServer | null = null;

const boardRooms = new Map<string, Set<string>>();
const onlineUsers = new Map<string, Set<string>>();

export function initSocketServer(server: any): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: config.clientUrl,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { id: string; name: string; role: string };
      (socket as any).userId = decoded.id;
      (socket as any).userName = decoded.name;
      (socket as any).userRole = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    const userName = (socket as any).userName;
    console.log(`[Socket] User connected: ${userId}`);

    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId)!.add(socket.id);
    socket.join(`user:${userId}`);
    io?.emit('user:online', { userId, online: true });

    const currentOnlineUserIds = Array.from(onlineUsers.keys()).filter((id) => id !== userId);
    socket.emit('users:online', { userIds: currentOnlineUserIds });

    socket.on('board:join', (boardId: string) => {
      socket.join(`board:${boardId}`);
      if (!boardRooms.has(boardId)) boardRooms.set(boardId, new Set());
      boardRooms.get(boardId)!.add(userId);
      socket.to(`board:${boardId}`).emit('user:joined', { userId, userName, onlineUsers: Array.from(boardRooms.get(boardId) || []) });
      socket.emit('board:online-users', { boardId, users: Array.from(boardRooms.get(boardId) || []) });
    });

    socket.on('board:leave', (boardId: string) => {
      socket.leave(`board:${boardId}`);
      boardRooms.get(boardId)?.delete(userId);
      socket.to(`board:${boardId}`).emit('user:left', { userId });
    });

    socket.on('task:typing', (data: { boardId: string; taskId: string; isTyping: boolean }) => {
      socket.to(`board:${data.boardId}`).emit('task:typing', { taskId: data.taskId, userId, userName, isTyping: data.isTyping });
    });

    socket.on('cursor:move', (data: { boardId: string; x: number; y: number }) => {
      socket.to(`board:${data.boardId}`).emit('cursor:move', { userId, userName, x: data.x, y: data.y });
    });

    socket.on('conversation:join', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('message:typing', async (data: { conversationId: string; isTyping: boolean }) => {
      const members = await prisma.conversationMember.findMany({
        where: { conversationId: data.conversationId },
        select: { userId: true },
      });
      members.forEach((member) => {
        if (member.userId !== userId) {
          io?.to(`user:${member.userId}`).emit('message:typing', {
            conversationId: data.conversationId,
            userId,
            userName,
            isTyping: data.isTyping,
          });
        }
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${userId}`);
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          io?.emit('user:offline', { userId });
        }
      }
      boardRooms.forEach((users, boardId) => {
        if (users.delete(userId)) {
          socket.to(`board:${boardId}`).emit('user:left', { userId });
        }
      });
    });
  });

  return io;
}

export function emitBoardEvent(boardId: string, event: string, data: any) {
  if (io) io.to(`board:${boardId}`).emit(event, data);
}

export function emitNotification(userId: string, notification: any) {
  if (io) io.to(`user:${userId}`).emit('notification:received', notification);
}

export function emitBroadcast(notification: any) {
  if (io) io.emit('notification:received', notification);
}

export function getIO(): SocketServer | null {
  return io;
}
