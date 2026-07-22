import { Request } from 'express';

export interface RequestUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  tokenVersion: number;
  avatar: string | null;
  bio: string | null;
  departmentId: string | null;
  teamId: string | null;
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
  user?: RequestUser;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: Array<{ field: string; message: string }>;
  field?: string[];
  code?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    unreadCount?: number;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
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
