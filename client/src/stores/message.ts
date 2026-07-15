import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { messageApi } from '@/api'
import { onAnyMessage, onConversationCreated, onPresenceChange } from '@/api/socket'
import { useAuthStore } from '@/stores/auth'

export const useMessageStore = defineStore('message', () => {
  const totalUnread = ref(0)
  const conversations = ref<any[]>([])
  const onlineUserIds = ref<Set<string>>(new Set())
  let unsubMessage: (() => void) | null = null
  let unsubConversation: (() => void) | null = null
  let unsubPresence: (() => void) | null = null
  let initialized = false

  const fetchUnreadCount = async () => {
    try {
      const res = await messageApi.getConversations()
      conversations.value = res.data.data
      totalUnread.value = res.data.data.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0)
    } catch {
      // ignore
    }
  }

  const decrementUnread = (conversationId: string) => {
    const conv = conversations.value.find((c) => c.id === conversationId)
    if (conv && conv.unreadCount) {
      totalUnread.value -= conv.unreadCount
      conv.unreadCount = 0
    }
  }

  const incrementUnread = (conversationId: string) => {
    const conv = conversations.value.find((c) => c.id === conversationId)
    if (conv) {
      conv.unreadCount = (conv.unreadCount || 0) + 1
    } else {
      conversations.value.unshift({ id: conversationId, unreadCount: 1 })
    }
    totalUnread.value++
  }

  const init = () => {
    if (initialized) return
    initialized = true
    const authStore = useAuthStore()

    unsubMessage = onAnyMessage((message: any) => {
      if (message.senderId === authStore.user?.id) return
      incrementUnread(message.conversationId)

      const conv = conversations.value.find((c) => c.id === message.conversationId)
      if (conv) {
        conv.messages = [message]
        conv.updatedAt = message.createdAt
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        const senderName = message.sender?.name || 'Unknown'
        const content = message.content || ''
        new Notification(`New message from ${senderName}`, {
          body: content.length > 50 ? content.substring(0, 50) + '...' : content,
          icon: '/favicon.ico',
        })
      }
    })

    unsubConversation = onConversationCreated(() => {
      fetchUnreadCount()
    })

    unsubPresence = onPresenceChange((data) => {
      const newSet = new Set(onlineUserIds.value)
      if (data.online) {
        newSet.add(data.userId)
      } else {
        newSet.delete(data.userId)
      }
      onlineUserIds.value = newSet
    })
  }

  const destroy = () => {
    if (unsubMessage) { unsubMessage(); unsubMessage = null }
    if (unsubConversation) { unsubConversation(); unsubConversation = null }
    if (unsubPresence) { unsubPresence(); unsubPresence = null }
    initialized = false
    onlineUserIds.value = new Set()
  }

  return { totalUnread, conversations, onlineUserIds, fetchUnreadCount, decrementUnread, incrementUnread, init, destroy }
})
