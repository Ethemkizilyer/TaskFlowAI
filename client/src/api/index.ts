import api from './client'
import type { Board, BoardListItem, Task, Comment, AIAnalysis, AISubtask, TaskPriority, Conversation, Message } from '@/types'

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: { name?: string; avatar?: string }) =>
    api.patch('/auth/me', data),
}

export const boardApi = {
  getAll: () => api.get<{ success: boolean; data: BoardListItem[] }>('/boards'),
  get: (id: string) => api.get<{ success: boolean; data: Board }>(`/boards/${id}`),
  create: (data: { title: string; description?: string; color?: string; memberEmails?: string[] }) =>
    api.post('/boards', data),
  update: (id: string, data: { title?: string; description?: string; color?: string }) =>
    api.patch(`/boards/${id}`, data),
  delete: (id: string) => api.delete(`/boards/${id}`),
  addMember: (id: string, email: string) =>
    api.post(`/boards/${id}/members`, { email }),
  removeMember: (id: string, userId: string) =>
    api.delete(`/boards/${id}/members/${userId}`),
}

export const taskApi = {
  create: (boardId: string, data: any) =>
    api.post<{ success: boolean; data: Task }>(`/boards/${boardId}/tasks`, data),
  update: (boardId: string, taskId: string, data: any) =>
    api.patch(`/boards/${boardId}/tasks/${taskId}`, data),
  move: (boardId: string, taskId: string, data: { columnId: string | null; position: number }) =>
    api.patch(`/boards/${boardId}/tasks/${taskId}/move`, data),
  delete: (boardId: string, taskId: string) =>
    api.delete(`/boards/${boardId}/tasks/${taskId}`),
  addComment: (boardId: string, taskId: string, content: string) =>
    api.post(`/boards/${boardId}/tasks/${taskId}/comments`, { content }),
  getComments: (boardId: string, taskId: string) =>
    api.get(`/boards/${boardId}/tasks/${taskId}/comments`),
}

export const aiApi = {
  getStatus: () => api.get('/ai/status'),
  getDailyBriefing: () => api.get('/ai/daily-briefing'),
  suggestPriority: (title: string, description?: string) =>
    api.post('/ai/suggest-priority', { title, description }),
  suggestTags: (title: string, description?: string) =>
    api.post('/ai/suggest-tags', { title, description }),
  generateSubtasks: (title: string, description?: string) =>
    api.post('/ai/generate-subtasks', { title, description }),
  analyzeBoard: (boardId: string) =>
    api.post<{ success: boolean; data: AIAnalysis }>(`/ai/analyze-board/${boardId}`),
  generateTask: (description: string) =>
    api.post('/ai/generate-task', { description }),
}

export const userApi = {
  updateProfile: (data: { name?: string; email?: string; bio?: string; avatar?: string | null }) =>
    api.patch('/users/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch('/users/profile/password', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getActivity: (page = 1, limit = 20) =>
    api.get(`/users/activity?page=${page}&limit=${limit}`),
  getBoardActivity: (boardId: string, page = 1, limit = 30) =>
    api.get(`/users/activity/board/${boardId}?page=${page}&limit=${limit}`),
  getNotifications: (unread = false) =>
    api.get(`/users/notifications${unread ? '?unread=true' : ''}`),
  markNotificationRead: (id: string) =>
    api.patch(`/users/notifications/${id}/read`),
  markAllNotificationsRead: () =>
    api.patch('/users/notifications/read-all'),
  deleteNotification: (id: string) =>
    api.delete(`/users/notifications/${id}`),
  broadcastNotification: (data: { title: string; message: string; target?: string; role?: string }) =>
    api.post('/users/notifications/broadcast', data),
}

export const adminApi = {
  getStats: () => api.get('/users/admin/stats'),
  createUser: (data: { name: string; email: string; role: string }) =>
    api.post('/users/admin/users', data),
  getUsers: (page = 1, limit = 20, status?: string, search?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (status) params.set('status', status)
    if (search) params.set('search', search)
    return api.get(`/users/admin/users?${params}`)
  },
  getPendingUsers: () => api.get('/users/admin/users/pending'),
  getUserById: (id: string) => api.get(`/users/admin/users/${id}`),
  updateUser: (id: string, data: { name?: string; email?: string; role?: string; status?: string; bio?: string }) =>
    api.patch(`/users/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/admin/users/${id}`),
  approveUser: (id: string) => api.patch(`/users/admin/users/${id}/approve`),
  banUser: (id: string) => api.patch(`/users/admin/users/${id}/ban`),
  unbanUser: (id: string) => api.patch(`/users/admin/users/${id}/unban`),
  updateUserRole: (id: string, role: string) =>
    api.patch(`/users/admin/users/${id}/role`, { role }),
  resetPassword: (id: string) =>
    api.post(`/users/admin/users/${id}/reset-password`),
  bulkAction: (data: { userIds: string[]; action: string; role?: string }) =>
    api.post('/users/admin/users/bulk', data),
}

export const messageApi = {
  getConversations: () =>
    api.get<{ success: boolean; data: Conversation[] }>('/messages/conversations'),
  getConversation: (id: string) =>
    api.get(`/messages/conversations/${id}`),
  createConversation: (data: { type: 'DIRECT' | 'GROUP'; title?: string; participantIds: string[] }) =>
    api.post('/messages/conversations', data),
  getMessages: (conversationId: string, page = 1, limit = 50) =>
    api.get(`/messages/conversations/${conversationId}/messages?page=${page}&limit=${limit}`),
  sendMessage: (conversationId: string, content: string) =>
    api.post(`/messages/conversations/${conversationId}/messages`, { content }),
  markRead: (conversationId: string) =>
    api.patch(`/messages/conversations/${conversationId}/read`),
  getOnlineUsers: () =>
    api.get('/messages/online-users'),
}

export const searchApi = {
  global: (q: string) => api.get(`/search?q=${encodeURIComponent(q)}`),
}

export const focusApi = {
  startSession: (data: { taskId?: string; taskTitle?: string; duration: number }) =>
    api.post('/focus/start', data),
  completeSession: (id: string) =>
    api.patch(`/focus/${id}/complete`),
  getStats: () => api.get('/focus/stats'),
  getSessions: () => api.get('/focus/sessions'),
}

export const automationApi = {
  getAll: () => api.get('/automations'),
  getOptions: () => api.get('/automations/options'),
  create: (data: { name: string; trigger: string; action: string; boardId?: string; triggerConfig?: any; actionConfig?: any }) =>
    api.post('/automations', data),
  toggle: (id: string) => api.patch(`/automations/${id}/toggle`),
  delete: (id: string) => api.delete(`/automations/${id}`),
}

export const moodApi = {
  checkin: (data: { mood: string; note?: string; stress?: number; workload?: number }) =>
    api.post('/mood/checkin', data),
  getToday: () => api.get('/mood/today'),
  getTeamPulse: (days = 7) => api.get(`/mood/team?days=${days}`),
  getHistory: () => api.get('/mood/history'),
}

export const dashboardApi = {
  getStats: () => api.get('/dashboard-stats'),
}
