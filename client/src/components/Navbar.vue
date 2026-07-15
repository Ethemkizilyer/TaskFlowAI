<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useMessageStore } from '@/stores/message'
import { userApi } from '@/api'
import {
  LayoutDashboard, Settings, LogOut, Bell, Users, Activity,
  ChevronDown, Shield, Check, Trash2, MessageSquare, Sun, Moon,
  Briefcase, Building2, UserCog, Search
} from 'lucide-vue-next'
import { ROLE_LABELS, ROLE_COLORS } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const messageStore = useMessageStore()

const showUserMenu = ref(false)
const showNotifications = ref(false)
const showSearch = ref(false)
const notifications = ref<any[]>([])
const unreadCount = ref(0)

const roleLabel = computed(() => authStore.user ? ROLE_LABELS[authStore.user.role] : '')
const roleColor = computed(() => authStore.user ? ROLE_COLORS[authStore.user.role] : '')

const canSeeAdmin = computed(() => authStore.user?.role === 'ADMIN')
const canSeeDirector = computed(() => authStore.isAtLeastDirector)
const canSeeManager = computed(() => authStore.isAtLeastManager)
const canSeeTeamLeader = computed(() => authStore.isAtLeastTeamLeader)

const triggerSearch = () => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
}

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
  showNotifications.value = false
}

const toggleNotifications = async () => {
  showNotifications.value = !showNotifications.value
  showUserMenu.value = false
  if (showNotifications.value && notifications.value.length === 0) {
    await fetchNotifications()
  }
}

const fetchNotifications = async () => {
  try {
    const res = await userApi.getNotifications()
    notifications.value = res.data.data
    unreadCount.value = res.data.meta?.unreadCount || 0
  } catch {
    // ignore
  }
}

const markAsRead = async (id: string) => {
  await userApi.markNotificationRead(id)
  const n = notifications.value.find((x) => x.id === id)
  if (n) n.isRead = true
  unreadCount.value = Math.max(0, unreadCount.value - 1)
}

const markAllRead = async () => {
  await userApi.markAllNotificationsRead()
  notifications.value.forEach((n) => (n.isRead = true))
  unreadCount.value = 0
}

const deleteNotification = async (id: string) => {
  await userApi.deleteNotification(id)
  notifications.value = notifications.value.filter((n) => n.id !== id)
}

const logout = () => {
  authStore.logout()
  router.push('/login')
}

const navigate = (path: string) => {
  showUserMenu.value = false
  showNotifications.value = false
  router.push(path)
}

const formatTime = (date: string) => {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

onMounted(() => {
  fetchNotifications()
})
</script>

<template>
  <nav class="glass sticky top-0 z-40 border-b border-surface-200 dark:border-surface-800">
    <div class="px-4 sm:px-6 h-14 flex items-center justify-between">
      <!-- Logo -->
      <router-link to="/" class="flex items-center gap-2 shrink-0">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm">
          TF
        </div>
        <span class="font-bold text-lg hidden sm:block">TaskFlow<span class="text-primary-500"> AI</span></span>
      </router-link>

      <!-- Right actions -->
      <div class="flex items-center gap-2">
        <!-- Search trigger -->
        <button
          @click="triggerSearch"
          class="btn-ghost px-2.5 py-1.5 flex items-center gap-2 text-sm text-surface-400 hidden sm:flex"
          title="Search (Ctrl+K)"
        >
          <Search :size="16" />
          <span class="text-xs">Search</span>
          <kbd class="px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-[10px] font-mono">⌘K</kbd>
        </button>

        <!-- Theme toggle -->
        <button @click="themeStore.toggle()" class="btn-ghost p-2" :title="themeStore.isDark ? 'Switch to light mode' : 'Switch to dark mode'">
          <Sun v-if="themeStore.isDark" :size="18" />
          <Moon v-else :size="18" />
        </button>

        <!-- Messages -->
        <router-link to="/messages" class="btn-ghost p-2 relative" title="Messages">
          <MessageSquare :size="18" />
          <span v-if="messageStore.totalUnread > 0" class="absolute top-1 right-1 w-4 h-4 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {{ messageStore.totalUnread > 9 ? '9+' : messageStore.totalUnread }}
          </span>
        </router-link>

        <!-- Notifications -->
        <div class="relative">
          <button @click="toggleNotifications" class="btn-ghost p-2 relative">
            <Bell :size="18" />
            <span v-if="unreadCount > 0" class="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {{ unreadCount > 9 ? '9+' : unreadCount }}
            </span>
          </button>

          <div
            v-if="showNotifications"
            class="absolute right-0 mt-2 w-80 card p-0 shadow-xl overflow-hidden"
          >
            <div class="flex items-center justify-between p-3 border-b border-surface-200 dark:border-surface-800">
              <span class="font-semibold text-sm">Notifications</span>
              <button v-if="unreadCount > 0" @click="markAllRead" class="text-xs text-primary-500 hover:text-primary-600">
                Mark all read
              </button>
            </div>
            <div class="max-h-80 overflow-y-auto">
              <div v-if="notifications.length === 0" class="p-6 text-center text-sm text-surface-400">
                No notifications yet
              </div>
              <div
                v-for="n in notifications"
                :key="n.id"
                class="p-3 border-b border-surface-100 dark:border-surface-800/50 hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors"
                :class="{ 'bg-primary-50/50 dark:bg-primary-950/10': !n.isRead }"
              >
                <div class="flex items-start gap-2">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium">{{ n.title }}</p>
                    <p class="text-xs text-surface-500 dark:text-surface-400 line-clamp-2">{{ n.message }}</p>
                    <p class="text-[10px] text-surface-400 mt-1">{{ formatTime(n.createdAt) }}</p>
                  </div>
                  <div class="flex flex-col gap-1 shrink-0">
                    <button v-if="!n.isRead" @click="markAsRead(n.id)" class="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded">
                      <Check :size="12" class="text-surface-400" />
                    </button>
                    <button @click="deleteNotification(n.id)" class="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded">
                      <Trash2 :size="12" class="text-surface-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- User menu -->
        <div class="relative">
          <button @click="toggleUserMenu" class="flex items-center gap-2 btn-ghost py-1.5 px-2">
            <img :src="authStore.user?.avatar || ''" :alt="authStore.user?.name" class="w-7 h-7 rounded-full bg-surface-200" />
            <span class="text-sm font-medium hidden sm:block">{{ authStore.user?.name }}</span>
            <ChevronDown :size="14" class="text-surface-400" />
          </button>

          <div
            v-if="showUserMenu"
            class="absolute right-0 mt-2 w-56 card p-2 shadow-xl"
          >
            <div class="px-3 py-2 border-b border-surface-200 dark:border-surface-800 mb-1">
              <p class="text-sm font-semibold">{{ authStore.user?.name }}</p>
              <p class="text-xs text-surface-500">{{ authStore.user?.email }}</p>
              <span class="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full" :class="roleColor">
                <Shield :size="10" /> {{ roleLabel }}
              </span>
            </div>

            <button @click="navigate('/')" class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
              <LayoutDashboard :size="16" class="text-surface-400" /> Dashboard
            </button>
            <button @click="navigate('/messages')" class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
              <MessageSquare :size="16" class="text-surface-400" /> Messages
            </button>
            <button @click="navigate('/activity')" class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
              <Activity :size="16" class="text-surface-400" /> Activity Feed
            </button>
            <button @click="navigate('/profile')" class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
              <Settings :size="16" class="text-surface-400" /> Profile & Settings
            </button>

            <div v-if="canSeeAdmin || canSeeDirector || canSeeManager || canSeeTeamLeader" class="border-t border-surface-200 dark:border-surface-800 mt-1 pt-1">
              <button v-if="canSeeAdmin" @click="navigate('/admin')" class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                <Users :size="16" class="text-surface-400" /> Admin Panel
              </button>
              <button v-if="canSeeDirector" @click="navigate('/director')" class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                <Building2 :size="16" class="text-surface-400" /> Director Panel
              </button>
              <button v-if="canSeeManager" @click="navigate('/manager')" class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                <Briefcase :size="16" class="text-surface-400" /> Manager Panel
              </button>
              <button v-if="canSeeTeamLeader" @click="navigate('/team-leader')" class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                <UserCog :size="16" class="text-surface-400" /> Team Leader Panel
              </button>
            </div>

            <div class="border-t border-surface-200 dark:border-surface-800 mt-1 pt-1">
              <button @click="logout" class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 transition-colors">
                <LogOut :size="16" /> Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>
