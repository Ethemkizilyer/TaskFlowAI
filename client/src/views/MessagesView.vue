<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMessageStore } from '@/stores/message'
import { messageApi } from '@/api'
import {
  joinConversation, leaveConversation, emitTyping,
  onMessageReceived, onTyping, onConversationCreated, onAnyMessage
} from '@/api/socket'
import { Send, ArrowLeft, Users, Search, Plus, Circle, Check, UserPlus } from 'lucide-vue-next'
import type { Conversation, Message, User } from '@/types'
import { useI18n } from 'vue-i18n'

const authStore = useAuthStore()
const messageStore = useMessageStore()
const { t } = useI18n({ useScope: 'global' })

const conversations = ref<Conversation[]>([])
const activeConversation = ref<Conversation | null>(null)
const messages = ref<Message[]>([])
const newMessage = ref('')
const loading = ref(false)
const sending = ref(false)
const onlineUserIds = computed(() => messageStore.onlineUserIds)
const typingUsers = ref<Map<string, { name: string; isTyping: boolean }>>(new Map())
const showNewChat = ref(false)
const onlineUsers = ref<User[]>([])
const searchQuery = ref('')
const selectedUsers = ref<string[]>([])
const messagesContainer = ref<HTMLElement | null>(null)
const isGroupChat = ref(false)
const groupTitle = ref('')
const typingUsersMap = ref<Map<string, { name: string; isTyping: boolean }>>(new Map())
const showGroupMembers = ref(false)

const startDirectMessage = async (userId: string) => {
  const existing = conversations.value.find(
    (c) => c.type === 'DIRECT' && c.members.some((m) => m.userId === userId)
  )
  if (existing) {
    await selectConversation(existing)
    return
  }
  try {
    const res = await messageApi.createConversation({
      type: 'DIRECT',
      participantIds: [userId],
    })
    const conv = res.data.data
    if (!conversations.value.find((c) => c.id === conv.id)) {
      conversations.value.unshift(conv)
    }
    showGroupMembers.value = false
    await selectConversation(conv)
  } catch (err) {
    console.error('[MessagesView] startDirectMessage error:', err)
  }
}

const filteredConversations = computed(() => {
  const sorted = [...conversations.value].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.messages?.[0]?.createdAt || 0).getTime()
    const bTime = new Date(b.updatedAt || b.messages?.[0]?.createdAt || 0).getTime()
    return bTime - aTime
  })
  if (!searchQuery.value) return sorted
  return sorted.filter((c) => {
    const name = getConversationName(c)
    return name.toLowerCase().includes(searchQuery.value.toLowerCase())
  })
})

const typingDisplay = computed(() => {
  if (!activeConversation.value) return ''
  const typers: string[] = []
  typingUsersMap.value.forEach((data, key) => {
    if (data.isTyping && key !== authStore.user?.id) {
      typers.push(data.name)
    }
  })
  if (typers.length === 0) return ''
  if (typers.length === 1) return t('messages.typingOne', { name: typers[0] })
  if (typers.length === 2) return t('messages.typingTwo', { first: typers[0], second: typers[1] })
  return t('messages.typingMany', { first: typers[0], count: typers.length - 1 })
})

const getConversationName = (conv: Conversation) => {
  if (conv.title) return conv.title
  const otherUser = conv.members.find((m) => m.userId !== authStore.user?.id)
  return otherUser?.user.name || t('common.unknown')
}

const getConversationAvatar = (conv: Conversation) => {
  if (conv.type === 'GROUP') return ''
  const otherUser = conv.members.find((m) => m.userId !== authStore.user?.id)
  return otherUser?.user.avatar || ''
}

const getOnlineMembers = (conv: Conversation) => {
  return conv.members.filter((m) => m.userId !== authStore.user?.id && isUserOnline(m.userId))
}

const getOnlineStatusText = (conv: Conversation) => {
  const online = getOnlineMembers(conv)
  if (conv.type === 'DIRECT') {
    return online.length > 0 ? t('common.online') : t('common.offline')
  }
  if (online.length === 0) return t('messages.memberCount', { count: conv.members.length - 1 })
  if (online.length === 1) return t('messages.onlineStatus', { name: online[0].user.name })
  return t('messages.onlineCount', { online: online.length, total: conv.members.length - 1 })
}

const isUserOnline = (userId: string) => onlineUserIds.value.has(userId)

const formatTime = (date: string) => {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (mins < 1) return t('messages.justNow')
  if (mins < 60) return `${mins}m`
  if (hours < 24) return `${hours}h`
  return d.toLocaleDateString()
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const fetchConversations = async () => {
  try {
    const res = await messageApi.getConversations()
    conversations.value = res.data.data
  } catch {
    // ignore
  }
}

const fetchMessages = async (conversationId: string) => {
  loading.value = true
  try {
    const res = await messageApi.getMessages(conversationId)
    messages.value = res.data.data
    await messageApi.markRead(conversationId)
    messageStore.decrementUnread(conversationId)
    scrollToBottom()
  } finally {
    loading.value = false
  }
}

const selectConversation = async (conv: Conversation) => {
  if (activeConversation.value) {
    leaveConversation(activeConversation.value.id)
  }
  activeConversation.value = conv
  typingUsers.value.delete(conv.id)
  typingUsersMap.value.clear()
  await fetchMessages(conv.id)
  joinConversation(conv.id)
  const c = conversations.value.find((c) => c.id === conv.id)
  if (c) c.unreadCount = 0
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || !activeConversation.value) return
  sending.value = true
  const content = newMessage.value.trim()
  newMessage.value = ''
  try {
    const res = await messageApi.sendMessage(activeConversation.value.id, content)
    messages.value.push(res.data.data)
    scrollToBottom()
    const conv = conversations.value.find((c) => c.id === activeConversation.value?.id)
    if (conv) conv.unreadCount = 0
  } finally {
    sending.value = false
  }
}

const handleTyping = () => {
  if (!activeConversation.value) return
  emitTyping(activeConversation.value.id, true)
  setTimeout(() => {
    if (activeConversation.value) {
      emitTyping(activeConversation.value.id, false)
    }
  }, 2000)
}

const startNewChat = async () => {
  try {
    const res = await messageApi.getOnlineUsers()
    onlineUsers.value = res.data.data
    showNewChat.value = true
  } catch {
    // ignore
  }
}

const createConversation = async () => {
  if (selectedUsers.value.length === 0) return
  try {
    const payload: { type: 'DIRECT' | 'GROUP'; title?: string; participantIds: string[] } = {
      type: isGroupChat.value ? 'GROUP' : 'DIRECT',
      participantIds: selectedUsers.value,
    }
    if (isGroupChat.value && groupTitle.value.trim()) {
      payload.title = groupTitle.value.trim()
    }
    const res = await messageApi.createConversation(payload)
    const conv = res.data.data
    if (!conversations.value.find((c) => c.id === conv.id)) {
      conversations.value.unshift(conv)
    }
    showNewChat.value = false
    selectedUsers.value = []
    isGroupChat.value = false
    groupTitle.value = ''
    await selectConversation(conv)
  } catch (err) {
    console.error('[MessagesView] createConversation error:', err)
  }
}

const toggleUserSelection = (userId: string) => {
  const idx = selectedUsers.value.indexOf(userId)
  if (idx >= 0) {
    selectedUsers.value.splice(idx, 1)
  } else {
    selectedUsers.value.push(userId)
  }
}

const showBrowserNotification = (senderName: string, content: string) => {
  if (document.hasFocus()) return
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(t('messages.newMessageFrom', { name: senderName }), {
      body: content.length > 50 ? content.substring(0, 50) + '...' : content,
      icon: '/favicon.ico',
    })
  }
}

let unsubMessage: (() => void) | null = null
let unsubTyping: (() => void) | null = null
let unsubConversation: (() => void) | null = null
let unsubAnyMessage: (() => void) | null = null

watch(activeConversation, (conv) => {
  if (unsubMessage) unsubMessage()
  if (unsubTyping) unsubTyping()

  if (conv) {
    unsubMessage = onMessageReceived(conv.id, (message) => {
      if (message.senderId === authStore.user?.id) return
      messages.value.push(message)
      scrollToBottom()
      messageApi.markRead(conv.id)
      messageStore.decrementUnread(conv.id)
      showBrowserNotification(message.sender?.name || t('common.unknown'), message.content)
    })

    unsubTyping = onTyping(conv.id, (data) => {
      if (data.userId !== authStore.user?.id) {
        typingUsersMap.value.set(data.userId, { name: data.userName, isTyping: data.isTyping })
        if (!data.isTyping) {
          setTimeout(() => typingUsersMap.value.delete(data.userId), 1000)
        }
      }
    })
  }
})

onMounted(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
  fetchConversations()

  unsubAnyMessage = onAnyMessage((message: any) => {
    if (message.senderId === authStore.user?.id) return
    const conv = conversations.value.find((c) => c.id === message.conversationId)
    if (conv) {
      conv.messages = [message]
      conv.updatedAt = message.createdAt
    }
  })

  unsubConversation = onConversationCreated((conversation) => {
    if (!conversations.value.find((c) => c.id === conversation.id)) {
      conversations.value.unshift(conversation)
    }
  })
})

onUnmounted(() => {
  if (unsubMessage) unsubMessage()
  if (unsubTyping) unsubTyping()
  if (unsubConversation) unsubConversation()
  if (unsubAnyMessage) unsubAnyMessage()
  if (activeConversation.value) {
    leaveConversation(activeConversation.value.id)
  }
})
</script>

<template>
  <div class="flex h-[calc(100vh-3.5rem)]">
    <!-- Sidebar: Conversations -->
    <div class="w-80 border-r border-surface-200 dark:border-surface-800 flex flex-col shrink-0">
      <div class="p-4 border-b border-surface-200 dark:border-surface-800">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-bold text-lg">{{ t('messages.title') }}</h2>
          <button @click="startNewChat" class="btn-ghost p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800">
            <Plus :size="18" />
          </button>
        </div>
        <div class="relative">
          <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('messages.searchConversations')"
            class="input pl-9 py-1.5 text-sm"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div v-if="filteredConversations.length === 0" class="p-6 text-center text-sm text-surface-400">
          {{ t('messages.noConversations') }}
        </div>
        <button
          v-for="conv in filteredConversations"
          :key="conv.id"
          @click="selectConversation(conv)"
          class="w-full flex items-center gap-3 p-3 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors border-b border-surface-100 dark:border-surface-800/50"
          :class="{ 'bg-primary-50/50 dark:bg-primary-950/10': activeConversation?.id === conv.id }"
        >
          <div class="relative shrink-0">
            <img v-if="conv.type !== 'GROUP'" :src="getConversationAvatar(conv)" class="w-11 h-11 rounded-full bg-surface-200" />
            <div v-else class="w-11 h-11 rounded-full bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center">
              <Users :size="20" class="text-primary-600 dark:text-primary-400" />
            </div>
            <span
              v-if="conv.type !== 'GROUP' && isUserOnline(conv.members.find((m) => m.userId !== authStore.user?.id)?.userId || '')"
              class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-surface-900"
            />
          </div>
          <div class="flex-1 min-w-0 text-left">
            <p class="font-medium text-sm truncate">{{ getConversationName(conv) }}</p>
            <p v-if="conv.messages?.[0]" class="text-xs text-surface-500 truncate">
              {{ conv.messages[0].senderId === authStore.user?.id ? t('messages.you') + ': ' : '' }}{{ conv.messages[0].content }}
            </p>
            <p v-else class="text-xs text-surface-400">{{ t('messages.noMessages') }}</p>
          </div>
          <div class="flex flex-col items-end gap-1 shrink-0">
            <span class="text-[10px] text-surface-400">{{ formatTime(conv.updatedAt) }}</span>
            <span v-if="conv.unreadCount && conv.unreadCount > 0" class="w-5 h-5 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {{ conv.unreadCount > 9 ? '9+' : conv.unreadCount }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- Chat area -->
    <div class="flex-1 flex flex-col">
      <template v-if="activeConversation">
        <!-- Chat header -->
        <div class="px-4 py-3 border-b border-surface-200 dark:border-surface-800 flex items-center gap-3">
          <img v-if="activeConversation.type !== 'GROUP'" :src="getConversationAvatar(activeConversation)" class="w-9 h-9 rounded-full bg-surface-200" />
          <div v-else class="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center">
            <Users :size="18" class="text-primary-600 dark:text-primary-400" />
          </div>
          <div
            class="flex-1 cursor-pointer"
            :class="{ 'select-none': activeConversation.type !== 'GROUP' }"
            @click="activeConversation.type === 'GROUP' ? (showGroupMembers = !showGroupMembers) : null"
          >
            <p class="font-semibold text-sm">{{ getConversationName(activeConversation) }}</p>
            <p class="text-xs text-surface-500">
              <span v-if="getOnlineStatusText(activeConversation) === t('common.online')" class="text-green-500">● {{ getOnlineStatusText(activeConversation) }}</span>
              <span v-else class="text-surface-400">{{ getOnlineStatusText(activeConversation) }}</span>
            </p>
          </div>
          <div v-if="activeConversation.type === 'GROUP'" class="flex -space-x-2">
            <img
              v-for="member in activeConversation.members.filter((m) => m.userId !== authStore.user?.id).slice(0, 3)"
              :key="member.userId"
              :src="member.user.avatar || ''"
              class="w-6 h-6 rounded-full bg-surface-200 border-2 border-white dark:border-surface-900"
            />
          </div>
        </div>

        <!-- Group members panel -->
        <div v-if="showGroupMembers && activeConversation.type === 'GROUP'" class="border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900/50 max-h-64 overflow-y-auto">
          <div class="p-3 space-y-1">
            <p class="text-xs font-semibold text-surface-400 uppercase mb-2 px-2">{{ t('messages.members') }} ({{ activeConversation.members.length }})</p>
            <button
              v-for="member in activeConversation.members.filter((m) => m.userId !== authStore.user?.id)"
              :key="member.userId"
              @click="startDirectMessage(member.userId)"
              class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-left"
            >
              <div class="relative shrink-0">
                <img :src="member.user.avatar || ''" class="w-8 h-8 rounded-full bg-surface-200" />
                <span
                  v-if="isUserOnline(member.userId)"
                  class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-surface-900"
                />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ member.user.name }}</p>
                <p class="text-xs" :class="isUserOnline(member.userId) ? 'text-green-500' : 'text-surface-400'">
                  {{ isUserOnline(member.userId) ? t('common.online') : t('common.offline') }}
                </p>
              </div>
              <span class="text-[10px] text-primary-500 opacity-0 group-hover:opacity-100">{{ t('messages.sendMessage') }}</span>
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-3">
          <div v-if="loading" class="flex items-center justify-center h-full">
            <div class="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
          <template v-else>
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="flex gap-2"
              :class="msg.senderId === authStore.user?.id ? 'justify-end' : 'justify-start'"
            >
              <img
                v-if="msg.senderId !== authStore.user?.id"
                :src="msg.sender.avatar || ''"
                class="w-7 h-7 rounded-full bg-surface-200 shrink-0"
              />
              <div
                class="max-w-[70%] px-3 py-2 rounded-2xl text-sm"
                :class="msg.senderId === authStore.user?.id
                  ? 'bg-primary-500 text-white rounded-br-sm'
                  : 'bg-surface-100 dark:bg-surface-800 rounded-bl-sm'"
              >
                <p>{{ msg.content }}</p>
                <p class="text-[10px] mt-0.5 opacity-60">{{ formatTime(msg.createdAt) }}</p>
              </div>
            </div>
          </template>
        </div>

        <!-- Typing indicator -->
        <div v-if="typingDisplay" class="px-4 py-1 text-xs text-surface-400 italic">
          {{ typingDisplay }}
        </div>

        <!-- Input -->
        <div class="p-4 border-t border-surface-200 dark:border-surface-800">
          <div class="flex items-center gap-2">
            <input
              v-model="newMessage"
              type="text"
              :placeholder="t('messages.typeMessage')"
              class="input flex-1"
              @keyup.enter="sendMessage"
              @input="handleTyping"
            />
            <button
              @click="sendMessage"
              :disabled="!newMessage.trim() || sending"
              class="btn-primary p-2.5 rounded-xl disabled:opacity-50"
            >
              <Send :size="18" />
            </button>
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <div v-else class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <Users :size="48" class="mx-auto text-surface-300 dark:text-surface-700 mb-3" />
          <p class="text-surface-400">{{ t('messages.selectConversation') }}</p>
        </div>
      </div>
    </div>

    <!-- New chat modal -->
    <div
      v-if="showNewChat"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="showNewChat = false"
    >
      <div class="card p-6 w-96 max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-lg">{{ t('messages.newChat') }}</h3>
          <button
            @click="isGroupChat = !isGroupChat"
            class="btn-ghost p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
            :class="{ 'text-primary-500': isGroupChat }"
            :title="isGroupChat ? t('messages.singleChat') : t('messages.groupChat')"
          >
            <UserPlus :size="18" />
          </button>
        </div>

        <div v-if="isGroupChat" class="mb-4">
          <input
            v-model="groupTitle"
            type="text"
            :placeholder="t('messages.groupNamePlaceholder')"
            class="input w-full"
          />
        </div>

        <div v-if="isGroupChat && selectedUsers.length > 0" class="flex flex-wrap gap-2 mb-3">
          <span
            v-for="userId in selectedUsers"
            :key="userId"
            class="inline-flex items-center gap-1 bg-primary-100 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 text-xs px-2 py-1 rounded-full"
          >
            {{ onlineUsers.find((u) => u.id === userId)?.name || t('common.user') }}
            <button @click="toggleUserSelection(userId)" class="hover:text-red-500">×</button>
          </span>
        </div>

        <div class="flex-1 overflow-y-auto space-y-2 mb-4">
          <div v-if="onlineUsers.length === 0" class="text-center text-sm text-surface-400 py-4">
            {{ t('messages.noUsers') }}
          </div>
          <button
            v-for="user in onlineUsers"
            :key="user.id"
            @click="toggleUserSelection(user.id)"
            class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            :class="{ 'bg-primary-50 dark:bg-primary-950/30': selectedUsers.includes(user.id) }"
          >
            <img :src="user.avatar || ''" class="w-9 h-9 rounded-full bg-surface-200" />
            <div class="flex-1 text-left">
              <p class="text-sm font-medium">{{ user.name }}</p>
              <p class="text-xs text-surface-500">{{ user.role }}</p>
            </div>
            <Check
              v-if="selectedUsers.includes(user.id)"
              :size="16"
              class="text-primary-500"
            />
          </button>
        </div>
        <div class="flex gap-2">
          <button @click="showNewChat = false; selectedUsers = []; isGroupChat = false; groupTitle = ''" class="btn-secondary flex-1">{{ t('common.cancel') }}</button>
          <button
            @click="createConversation"
            :disabled="selectedUsers.length === 0 || (isGroupChat && !groupTitle.trim())"
            class="btn-primary flex-1 disabled:opacity-50"
          >
            {{ isGroupChat ? t('messages.createGroup') : t('messages.startChat') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
