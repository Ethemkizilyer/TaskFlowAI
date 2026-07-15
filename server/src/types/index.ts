import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    unreadCount?: number;
  };
}

export interface BoardWithDetails {
  id: string;
  title: string;
  description: string | null;
  color: string;
  ownerId: string;
  columns: any[];
  tasks: any[];
  members: any[];
  activity: any[];
}

export interface SocketEventData {
  boardId: string;
  type: string;
  payload: any;
}
