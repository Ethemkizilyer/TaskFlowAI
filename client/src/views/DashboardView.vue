<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBoardStore } from '@/stores/board'
import { userApi, adminApi, dashboardApi } from '@/api'
import { Sparkles, Plus, Users, Clock, MoreVertical, Trash2, X, Activity, TrendingUp, LayoutDashboard, Shield, CheckCircle, Circle, AlertCircle, Flame } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { BoardListItem } from '@/types'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const boardStore = useBoardStore()

const showCreate = ref(false)
const newBoard = ref({ title: '', description: '', color: '#6366f1', memberEmails: [] as string[] })
const creating = ref(false)
const memberEmailInput = ref('')
const menuOpen = ref<string | null>(null)
const recentActivity = ref<any[]>([])
const dashStats = ref<any>(null)

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  TODO: { label: t('task.status.TODO'), color: 'text-surface-600', bg: 'bg-surface-400', icon: Circle },
  IN_PROGRESS: { label: t('task.status.IN_PROGRESS'), color: 'text-blue-600', bg: 'bg-blue-500', icon: AlertCircle },
  REVIEW: { label: t('task.status.REVIEW'), color: 'text-yellow-600', bg: 'bg-yellow-500', icon: AlertCircle },
  DONE: { label: t('task.status.DONE'), color: 'text-green-600', bg: 'bg-green-500', icon: CheckCircle },
}

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  LOW: { label: t('task.priority.LOW'), color: 'text-surface-500', bg: 'bg-surface-400' },
  MEDIUM: { label: t('task.priority.MEDIUM'), color: 'text-blue-500', bg: 'bg-blue-400' },
  HIGH: { label: t('task.priority.HIGH'), color: 'text-orange-500', bg: 'bg-orange-400' },
  URGENT: { label: t('task.priority.URGENT'), color: 'text-red-500', bg: 'bg-red-500' },
}

const maxActivityCount = computed(() => {
  if (!dashStats.value?.activityLast7Days) return 1
  return Math.max(...dashStats.value.activityLast7Days.map((d: any) => d.count), 1)
})

const totalTasksFromStats = computed(() => {
  if (!dashStats.value?.taskStatus) return 0
  return Object.values(dashStats.value.taskStatus).reduce((a: number, b: any) => a + b, 0)
})

const dayLabels = computed(() => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const trDays = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
  return t('common.appName') === 'TaskFlow AI' && localStorage.getItem('taskflow-lang') === 'en' ? days : trDays
})

const statusColors: Record<string, string> = {
  TODO: '#9ca3af',
  IN_PROGRESS: '#3b82f6',
  REVIEW: '#eab308',
  DONE: '#22c55e',
}

const getDashOffset = (key: string) => {
  if (!dashStats.value?.taskStatus) return 0
  const entries = Object.entries(dashStats.value.taskStatus)
  const idx = entries.findIndex(([k]) => k === key)
  let offset = 0
  for (let i = 0; i < idx; i++) {
    offset += (entries[i][1] as number / totalTasksFromStats.value) * 251.2
  }
  return -offset
}

const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ef4444', '#3b82f6']

const isAdmin = computed(() => authStore.user?.role === 'ADMIN')

const totalTasks = computed(() => {
  return boardStore.boards.reduce((sum, b) => sum + (b._count?.tasks || 0), 0)
})

const totalMembers = computed(() => {
  const ids = new Set<string>()
  boardStore.boards.forEach((b) => b.members.forEach((m) => ids.add(m.userId)))
  return ids.size
})

const fetchDashStats = async () => {
  try {
    const res = await dashboardApi.getStats()
    dashStats.value = res.data.data
  } catch {
    // ignore
  }
}

onMounted(() => {
  boardStore.fetchBoards()
  fetchRecentActivity()
  fetchDashStats()
})

const fetchRecentActivity = async () => {
  try {
    const res = await userApi.getActivity(1, 5)
    recentActivity.value = res.data.data
  } catch {
    // ignore
  }
}

const handleCreate = async () => {
  if (!newBoard.value.title.trim()) return
  creating.value = true
  try {
    const board = await boardStore.createBoard(newBoard.value)
    showCreate.value = false
    newBoard.value = { title: '', description: '', color: '#6366f1', memberEmails: [] }
    memberEmailInput.value = ''
    router.push(`/board/${board.id}`)
  } catch (e: any) {
    console.error(e)
  } finally {
    creating.value = false
  }
}

const addMemberEmail = () => {
  const email = memberEmailInput.value.trim()
  if (!email) return
  if (!newBoard.value.memberEmails.includes(email)) {
    newBoard.value.memberEmails.push(email)
  }
  memberEmailInput.value = ''
}

const handleDelete = async (id: string) => {
  if (!confirm(t('dashboard.confirmDelete'))) return
  await boardStore.deleteBoard(id)
  menuOpen.value = null
}

const formatDate = (date: string) => {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

const formatActivityTime = (date: string) => {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return d.toLocaleDateString()
}
</script>

<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-950">
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Welcome -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 class="text-2xl font-bold">{{ t('dashboard.welcome') }}, {{ authStore.user?.name?.split(' ')[0] }}! 👋</h1>
          <p class="text-surface-500 dark:text-surface-400 text-sm mt-1">{{ t('dashboard.subtitle') }}</p>
        </div>
        <div class="flex items-center gap-3">
          <div v-if="dashStats" class="card px-4 py-2 flex items-center gap-3">
            <div class="relative w-10 h-10">
              <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" stroke-width="3" class="text-surface-200 dark:text-surface-700" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round"
                  :stroke-dasharray="`${(totalTasksFromStats > 0 ? (dashStats.taskStatus.DONE || 0) / totalTasksFromStats : 0) * 94.2} 94.2`"
                  class="transition-all duration-700"
                />
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-xs font-bold">{{ totalTasksFromStats > 0 ? Math.round((dashStats.taskStatus.DONE || 0) / totalTasksFromStats * 100) : 0 }}%</span>
              </div>
            </div>
            <div>
              <p class="text-xs font-semibold">{{ t('dashboard.completion') }}</p>
              <p class="text-[10px] text-surface-400">{{ dashStats.taskStatus.DONE || 0 }} / {{ totalTasksFromStats }} {{ t('dashboard.done') }}</p>
            </div>
          </div>
          <button @click="showCreate = true" class="btn-primary">
            <Plus :size="18" />
            <span class="hidden sm:inline">{{ t('dashboard.newBoard') }}</span>
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="card p-4">
          <div class="flex items-center justify-between mb-1">
            <LayoutDashboard :size="18" class="text-primary-500" />
            <span class="text-2xl font-bold">{{ boardStore.boards.length }}</span>
          </div>
          <p class="text-xs text-surface-500">{{ t('dashboard.boards') }}</p>
        </div>
        <div class="card p-4">
          <div class="flex items-center justify-between mb-1">
            <TrendingUp :size="18" class="text-green-500" />
            <span class="text-2xl font-bold">{{ totalTasks }}</span>
          </div>
          <p class="text-xs text-surface-500">{{ t('dashboard.tasks') }}</p>
        </div>
        <div class="card p-4">
          <div class="flex items-center justify-between mb-1">
            <Users :size="18" class="text-blue-500" />
            <span class="text-2xl font-bold">{{ totalMembers }}</span>
          </div>
          <p class="text-xs text-surface-500">{{ t('dashboard.teamMembers') }}</p>
        </div>
        <div v-if="isAdmin" class="card p-4 cursor-pointer hover:shadow-md transition-all" @click="router.push('/admin')">
          <div class="flex items-center justify-between mb-1">
            <Shield :size="18" class="text-orange-500" />
            <span class="text-2xl font-bold">Admin</span>
          </div>
          <p class="text-xs text-surface-500">{{ t('nav.admin') }}</p>
        </div>
        <div v-else class="card p-4">
          <div class="flex items-center justify-between mb-1">
            <Activity :size="18" class="text-purple-500" />
            <span class="text-2xl font-bold">{{ recentActivity.length }}</span>
          </div>
          <p class="text-xs text-surface-500">{{ t('dashboard.recentActivity') }}</p>
        </div>
      </div>

      <!-- Analytics Row -->
      <div v-if="dashStats" class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <!-- Task Status Distribution (Donut) -->
        <div class="card p-5">
          <h3 class="font-semibold text-sm mb-4">{{ t('dashboard.taskStatus') }}</h3>
          <div class="flex items-center justify-center mb-4">
            <div class="relative w-36 h-36">
              <svg class="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="12" class="text-surface-200 dark:text-surface-800" />
                <template v-for="(s, key) in dashStats.taskStatus" :key="key">
                  <circle
                    v-if="totalTasksFromStats > 0"
                    cx="50" cy="50" r="40" fill="none"
                    :stroke="statusColors[key as string] || '#9ca3af'"
                    :stroke-width="12"
                    :stroke-dasharray="`${(s / totalTasksFromStats) * 251.2} 251.2`"
                    :stroke-dashoffset="getDashOffset(key as string)"
                    class="transition-all duration-500"
                  />
                </template>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-2xl font-bold">{{ totalTasksFromStats }}</span>
                <span class="text-xs text-surface-500">{{ t('common.all') }}</span>
              </div>
            </div>
          </div>
          <div class="space-y-2">
            <div v-for="(count, key) in dashStats.taskStatus" :key="key" class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full" :class="statusConfig[key]?.bg || 'bg-gray-400'" />
                <span class="text-surface-600 dark:text-surface-300">{{ statusConfig[key]?.label || key }}</span>
              </div>
              <span class="font-medium">{{ count }}</span>
            </div>
          </div>
        </div>

        <!-- Activity Last 7 Days (Bar Chart) -->
        <div class="card p-5">
          <h3 class="font-semibold text-sm mb-4">{{ t('dashboard.weeklyActivity') }}</h3>
          <div class="flex items-end justify-between gap-2 h-32 mb-3">
            <div v-for="d in dashStats.activityLast7Days" :key="d.date" class="flex-1 flex flex-col items-center gap-1">
              <div class="w-full flex items-end justify-center" style="height: 100%">
                <div
                  class="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-primary-400 to-primary-600 transition-all duration-500 hover:from-primary-500 hover:to-primary-700"
                  :style="{ height: `${(d.count / maxActivityCount) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }"
                  :title="`${d.count} activities`"
                />
              </div>
              <span class="text-[10px] text-surface-400">{{ dayLabels[new Date(d.date).getDay()] }}</span>
            </div>
          </div>
          <div class="flex items-center justify-between text-xs text-surface-500">
            <span>Total: {{ dashStats.activityLast7Days.reduce((a: number, d: any) => a + d.count, 0) }}</span>
            <span>Avg: {{ Math.round(dashStats.activityLast7Days.reduce((a: number, d: any) => a + d.count, 0) / 7) }}/day</span>
          </div>
        </div>

        <!-- Task Priority Distribution -->
        <div class="card p-5">
          <h3 class="font-semibold text-sm mb-4">{{ t('dashboard.priorityDistribution') }}</h3>
          <div class="space-y-3">
            <div v-for="(count, key) in dashStats.taskPriority" :key="key">
              <div class="flex items-center justify-between text-sm mb-1">
                <div class="flex items-center gap-2">
                  <Flame v-if="key === 'URGENT'" :size="14" class="text-red-500" />
                  <span class="text-surface-600 dark:text-surface-300">{{ priorityConfig[key]?.label || key }}</span>
                </div>
                <span class="font-medium">{{ count }}</span>
              </div>
              <div class="h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="priorityConfig[key]?.bg || 'bg-gray-400'"
                  :style="{ width: `${totalTasksFromStats > 0 ? (count / totalTasksFromStats) * 100 : 0}%` }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Board Progress -->
      <div v-if="dashStats?.boardProgress?.length" class="mb-8">
        <h2 class="font-semibold text-lg mb-4">{{ t('dashboard.boardProgress') }}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="bp in dashStats.boardProgress"
            :key="bp.id"
            class="card p-4 cursor-pointer hover:shadow-md transition-all"
            @click="router.push(`/board/${bp.id}`)"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: bp.color }" />
                <span class="text-sm font-medium truncate">{{ bp.title }}</span>
              </div>
              <span class="text-xs font-bold" :class="bp.progress === 100 ? 'text-green-500' : 'text-surface-400'">{{ bp.progress }}%</span>
            </div>
            <div class="h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden mb-1">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{ width: `${bp.progress}%`, backgroundColor: bp.color }"
              />
            </div>
            <p class="text-xs text-surface-400">{{ bp.done }} / {{ bp.total }} {{ t('dashboard.done') }}</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Boards -->
        <div class="lg:col-span-2">
          <h2 class="font-semibold text-lg mb-4">{{ t('dashboard.boards') }}</h2>

          <div v-if="boardStore.loading && !boardStore.boards.length" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div v-for="i in 4" :key="i" class="card p-6 animate-pulse">
              <div class="h-4 bg-surface-200 dark:bg-surface-800 rounded w-1/2 mb-3"></div>
              <div class="h-3 bg-surface-200 dark:bg-surface-800 rounded w-3/4 mb-2"></div>
              <div class="h-3 bg-surface-200 dark:bg-surface-800 rounded w-1/3"></div>
            </div>
          </div>

          <div v-else-if="!boardStore.boards.length" class="card p-12 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800 mb-4">
              <Sparkles :size="28" class="text-surface-400" />
            </div>
            <h3 class="text-lg font-semibold mb-1">{{ t('dashboard.noBoards') }}</h3>
            <p class="text-surface-500 dark:text-surface-400 text-sm mb-4">{{ t('dashboard.createFirst') }}</p>
            <button @click="showCreate = true" class="btn-primary">
              <Plus :size="18" /> {{ t('dashboard.newBoard') }}
            </button>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              v-for="board in boardStore.boards"
              :key="board.id"
              class="card p-6 cursor-pointer hover:shadow-md transition-all duration-200 group relative animate-fade-in"
              @click="router.push(`/board/${board.id}`)"
            >
              <div class="flex items-start justify-between mb-3">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center" :style="{ backgroundColor: board.color + '20', color: board.color }">
                  <Sparkles :size="20" />
                </div>
                <div class="relative">
                  <button @click.stop="menuOpen = menuOpen === board.id ? null : board.id" class="btn-ghost p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical :size="16" />
                  </button>
                  <div v-if="menuOpen === board.id" class="absolute right-0 top-full mt-1 z-10 card p-1 shadow-lg" @click.stop>
                    <button @click.stop="handleDelete(board.id)" class="flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md w-full">
                      <Trash2 :size="14" /> {{ t('common.delete') }}
                    </button>
                  </div>
                </div>
              </div>

              <h3 class="font-semibold text-lg mb-1">{{ board.title }}</h3>
              <p class="text-sm text-surface-500 dark:text-surface-400 line-clamp-2 mb-4">{{ board.description || t('common.nothingHere') }}</p>

              <div class="flex items-center justify-between text-xs text-surface-400">
                <div class="flex items-center gap-3">
                  <span class="flex items-center gap-1"><Users :size="14" /> {{ board.members.length }}</span>
                  <span class="flex items-center gap-1"><Sparkles :size="14" /> {{ board._count?.tasks || 0 }} tasks</span>
                </div>
                <span class="flex items-center gap-1"><Clock :size="14" /> {{ formatDate(board.updatedAt) }}</span>
              </div>

              <div class="flex -space-x-2 mt-3">
                <img v-for="member in board.members.slice(0, 4)" :key="member.id" :src="member.user.avatar || ''" :alt="member.user.name" class="w-7 h-7 rounded-full border-2 border-white dark:border-surface-900 bg-surface-200" />
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-lg">{{ t('dashboard.recentActivity') }}</h2>
            <router-link to="/activity" class="text-xs text-primary-500 hover:text-primary-600">{{ t('common.viewAll') }}</router-link>
          </div>

          <div v-if="recentActivity.length === 0" class="card p-6 text-center text-sm text-surface-400">
            {{ t('dashboard.noActivity') }}
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="item in recentActivity"
              :key="item.id"
              class="card p-3 flex items-start gap-3"
            >
              <img
                v-if="item.user?.avatar"
                :src="item.user.avatar"
                :alt="item.user.name"
                class="w-7 h-7 rounded-full bg-surface-200 shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="text-xs font-medium">{{ item.user?.name }}</p>
                <p class="text-xs text-surface-500 dark:text-surface-400 line-clamp-2 mt-0.5">{{ item.description }}</p>
                <p class="text-[10px] text-surface-400 mt-1">{{ formatActivityTime(item.createdAt) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Create Modal -->
    <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" @click.self="showCreate = false">
      <div class="card p-6 w-full max-w-md animate-scale-in">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">{{ t('dashboard.newBoard') }}</h2>
          <button @click="showCreate = false" class="btn-ghost p-1"><X :size="18" /></button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5">{{ t('common.title') }}</label>
            <input v-model="newBoard.title" type="text" :placeholder="t('dashboard.boardNamePlaceholder')" class="input" @keyup.enter="handleCreate" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">{{ t('common.description') }}</label>
            <textarea v-model="newBoard.description" :placeholder="t('dashboard.boardDescPlaceholder')" class="input resize-none" rows="3"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">{{ t('common.name') }}</label>
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="color in colors"
                :key="color"
                @click="newBoard.color = color"
                class="w-8 h-8 rounded-lg transition-transform hover:scale-110"
                :style="{ backgroundColor: color }"
                :class="{ 'ring-2 ring-offset-2 ring-surface-400 dark:ring-offset-surface-900': newBoard.color === color }"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">{{ t('board.addMembers') }}</label>
            <div class="flex gap-2">
              <input
                v-model="memberEmailInput"
                type="email"
                placeholder="user@example.com"
                class="input flex-1"
                @keyup.enter="addMemberEmail"
              />
              <button @click="addMemberEmail" :disabled="!memberEmailInput.trim()" class="btn-ghost px-3">
                <Plus :size="18" />
              </button>
            </div>
            <div v-if="newBoard.memberEmails.length" class="flex flex-wrap gap-2 mt-2">
              <span
                v-for="(email, i) in newBoard.memberEmails"
                :key="i"
                class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-100 dark:bg-surface-800 text-xs"
              >
                {{ email }}
                <button @click="newBoard.memberEmails.splice(i, 1)" class="text-surface-400 hover:text-red-500">
                  <X :size="12" />
                </button>
              </span>
            </div>
          </div>
          <button @click="handleCreate" :disabled="creating || !newBoard.title.trim()" class="btn-primary w-full">
            {{ creating ? t('common.loading') : t('dashboard.newBoard') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
