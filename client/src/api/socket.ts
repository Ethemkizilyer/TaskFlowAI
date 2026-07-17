import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth'
import { useBoardStore } from '@/stores/board'

let socket: Socket | null = null

type MessageHandler = (message: any) => void
type TypingHandler = (data: { userId: string; userName: string; isTyping: boolean }) => void
type PresenceHandler = (data: { userId: string; online: boolean }) => void
type ConversationHandler = (conversation: any) => void
type NotificationHandler = (notification: any) => void

const messageHandlers: Map<string, MessageHandler[]> = new Map()
const typingHandlers: Map<string, TypingHandler[]> = new Map()
const presenceHandlers: PresenceHandler[] = []
const conversationHandlers: ConversationHandler[] = []
const globalMessageHandlers: MessageHandler[] = []
const notificationHandlers: NotificationHandler[] = []

export function connectSocket(): Socket {
  const authStore = useAuthStore()

  if (socket?.connected) return socket

  socket = io({
    auth: { token: authStore.token },
    transports: ['websocket', 'polling'],
  })

  socket.on('connect', () => {
    console.log('[Socket] Connected')
  })

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected')
  })

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message)
  })

  const boardStore = useBoardStore()

  socket.on('task:created', (task) => boardStore.handleSocketTaskCreated(task))
  socket.on('task:updated', (task) => boardStore.handleSocketTaskUpdated(task))
  socket.on('task:moved', (data) => boardStore.handleSocketTaskMoved(data))
  socket.on('task:deleted', (data) => boardStore.handleSocketTaskDeleted(data))
  socket.on('comment:added', (data) => boardStore.handleSocketCommentAdded(data))

  socket.on('message:received', (message) => {
    globalMessageHandlers.forEach((h) => h(message))
    const handlers = messageHandlers.get(message.conversationId) || []
    handlers.forEach((h) => h(message))
  })

  socket.on('message:typing', (data) => {
    const handlers = typingHandlers.get(data.conversationId) || []
    handlers.forEach((h) => h(data))
  })

  socket.on('user:online', (data) => {
    presenceHandlers.forEach((h) => h({ userId: data.userId, online: true }))
  })

  socket.on('user:offline', (data) => {
    presenceHandlers.forEach((h) => h({ userId: data.userId, online: false }))
  })

  socket.on('users:online', (data: { userIds: string[] }) => {
    data.userIds.forEach((userId) => {
      presenceHandlers.forEach((h) => h({ userId, online: true }))
    })
  })

  socket.on('conversation:created', (conversation) => {
    conversationHandlers.forEach((h) => h(conversation))
  })

  socket.on('notification:received', (notification) => {
    notificationHandlers.forEach((h) => h(notification))
  })

  return socket
}

export function joinBoard(boardId: string) {
  socket?.emit('board:join', boardId)
}

export function leaveBoard(boardId: string) {
  socket?.emit('board:leave', boardId)
}

export function joinConversation(conversationId: string) {
  socket?.emit('conversation:join', conversationId)
}

export function leaveConversation(conversationId: string) {
  socket?.emit('conversation:leave', conversationId)
}

export function emitTyping(conversationId: string, isTyping: boolean) {
  socket?.emit('message:typing', { conversationId, isTyping })
}

export function onMessageReceived(conversationId: string, handler: MessageHandler) {
  if (!messageHandlers.has(conversationId)) messageHandlers.set(conversationId, [])
  messageHandlers.get(conversationId)!.push(handler)
  return () => {
    const handlers = messageHandlers.get(conversationId)
    if (handlers) {
      const idx = handlers.indexOf(handler)
      if (idx >= 0) handlers.splice(idx, 1)
    }
  }
}

export function onAnyMessage(handler: MessageHandler) {
  globalMessageHandlers.push(handler)
  return () => {
    const idx = globalMessageHandlers.indexOf(handler)
    if (idx >= 0) globalMessageHandlers.splice(idx, 1)
  }
}

export function onTyping(conversationId: string, handler: TypingHandler) {
  if (!typingHandlers.has(conversationId)) typingHandlers.set(conversationId, [])
  typingHandlers.get(conversationId)!.push(handler)
  return () => {
    const handlers = typingHandlers.get(conversationId)
    if (handlers) {
      const idx = handlers.indexOf(handler)
      if (idx >= 0) handlers.splice(idx, 1)
    }
  }
}

export function onPresenceChange(handler: PresenceHandler) {
  presenceHandlers.push(handler)
  return () => {
    const idx = presenceHandlers.indexOf(handler)
    if (idx >= 0) presenceHandlers.splice(idx, 1)
  }
}

export function onConversationCreated(handler: ConversationHandler) {
  conversationHandlers.push(handler)
  return () => {
    const idx = conversationHandlers.indexOf(handler)
    if (idx >= 0) conversationHandlers.splice(idx, 1)
  }
}

export function onNotificationReceived(handler: NotificationHandler) {
  notificationHandlers.push(handler)
  return () => {
    const idx = notificationHandlers.indexOf(handler)
    if (idx >= 0) notificationHandlers.splice(idx, 1)
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function getSocket(): Socket | null {
  return socket
}
