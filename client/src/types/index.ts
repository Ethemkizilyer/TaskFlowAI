export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
export type Role = 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'TEAM_LEADER' | 'TEAM_MEMBER' | 'PERSONNEL'
export type UserStatus = 'ACTIVE' | 'PENDING' | 'BANNED' | 'SUSPENDED'
export type BoardRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
export type ConversationType = 'DIRECT' | 'GROUP' | 'TEAM' | 'DEPARTMENT'
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ'

export type Permission =
  | 'system:manage'
  | 'users:manage'
  | 'users:approve'
  | 'users:ban'
  | 'users:role:change'
  | 'departments:manage'
  | 'departments:view'
  | 'teams:manage'
  | 'teams:view'
  | 'boards:create'
  | 'boards:delete:any'
  | 'boards:delete:own'
  | 'tasks:assign'
  | 'tasks:delete:any'
  | 'tasks:delete:own'
  | 'messages:send'
  | 'messages:view'
  | 'analytics:view'
  | 'analytics:view:team'
  | 'analytics:view:department'
  | 'analytics:view:global'
  | 'activity:view:all'
  | 'activity:view:team'
  | 'activity:view:own'

export interface User {
  id: string
  name: string
  email: string
  avatar: string | null
  bio?: string | null
  role: Role
  status?: UserStatus
  createdAt?: string
  departmentId?: string | null
  teamId?: string | null
  department?: { id: string; name: string } | null
  team?: { id: string; name: string } | null
  permissions?: Permission[]
}

export interface BoardMember {
  id: string
  userId: string
  role: BoardRole
  user: User
}

export interface Column {
  id: string
  title: string
  status: TaskStatus
  boardId: string
  order: number
}

export interface Comment {
  id: string
  content: string
  taskId: string
  userId: string
  user: User
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  tags: string[]
  dueDate: string | null
  position: number
  boardId: string
  columnId: string | null
  assigneeId: string | null
  assignee: User | null
  comments: Comment[]
  aiGenerated: boolean
  aiPriority: string | null
  aiTags: string[]
  createdAt: string
  updatedAt: string
}

export interface Activity {
  id: string
  type: string
  description: string
  boardId: string
  taskId: string | null
  userId: string
  user: User
  createdAt: string
}

export interface Board {
  id: string
  title: string
  description: string | null
  color: string
  ownerId: string
  owner: User
  members: BoardMember[]
  columns: Column[]
  tasks: Task[]
  activity: Activity[]
  createdAt: string
  updatedAt: string
  _count?: { tasks: number }
}

export interface BoardListItem {
  id: string
  title: string
  description: string | null
  color: string
  ownerId: string
  owner: User
  members: BoardMember[]
  _count: { tasks: number }
  createdAt: string
  updatedAt: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
    unreadCount?: number
  }
}

export interface AIAnalysis {
  summary: string
  recommendations: string[]
  riskTasks: string[]
}

export interface AISubtask {
  title: string
  description: string
}

export interface ConversationMember {
  id: string
  conversationId: string
  userId: string
  user: User
  lastReadAt: string | null
  joinedAt: string
}

export interface Conversation {
  id: string
  type: ConversationType
  title: string | null
  avatar: string | null
  members: ConversationMember[]
  messages?: Message[]
  unreadCount?: number
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  content: string
  conversationId: string
  senderId: string
  sender: { id: string; name: string; avatar: string | null }
  recipientId?: string | null
  status: MessageStatus
  attachments?: any
  createdAt: string
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'System Administrator',
  DIRECTOR: 'Director',
  MANAGER: 'Manager',
  TEAM_LEADER: 'Team Leader',
  TEAM_MEMBER: 'Team Member',
  PERSONNEL: 'Personnel',
}

export const ROLE_COLORS: Record<Role, string> = {
  ADMIN: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  DIRECTOR: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  MANAGER: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  TEAM_LEADER: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
  TEAM_MEMBER: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
  PERSONNEL: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

export const ROLE_HIERARCHY: Record<Role, number> = {
  ADMIN: 100,
  DIRECTOR: 80,
  MANAGER: 60,
  TEAM_LEADER: 40,
  TEAM_MEMBER: 20,
  PERSONNEL: 10,
}
