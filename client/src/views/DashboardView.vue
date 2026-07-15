<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBoardStore } from '@/stores/board'
import { userApi, adminApi } from '@/api'
import { Sparkles, Plus, Users, Clock, MoreVertical, Trash2, X, Activity, TrendingUp, LayoutDashboard, Shield } from 'lucide-vue-next'
import type { BoardListItem } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const boardStore = useBoardStore()

const showCreate = ref(false)
const newBoard = ref({ title: '', description: '', color: '#6366f1' })
const creating = ref(false)
const menuOpen = ref<string | null>(null)
const recentActivity = ref<any[]>([])

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

onMounted(() => {
  boardStore.fetchBoards()
  fetchRecentActivity()
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
    newBoard.value = { title: '', description: '', color: '#6366f1' }
    router.push(`/board/${board.id}`)
  } catch (e: any) {
    console.error(e)
  } finally {
    creating.value = false
  }
}

const handleDelete = async (id: string) => {
  if (!confirm('Delete this board? All tasks will be lost.')) return
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
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold">Welcome back, {{ authStore.user?.name?.split(' ')[0] }}!</h1>
          <p class="text-surface-500 dark:text-surface-400 text-sm mt-1">Manage your projects with AI-powered insights</p>
        </div>
        <button @click="showCreate = true" class="btn-primary">
          <Plus :size="18" />
          <span class="hidden sm:inline">New Board</span>
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="card p-4">
          <div class="flex items-center justify-between mb-1">
            <LayoutDashboard :size="18" class="text-primary-500" />
            <span class="text-2xl font-bold">{{ boardStore.boards.length }}</span>
          </div>
          <p class="text-xs text-surface-500">Boards</p>
        </div>
        <div class="card p-4">
          <div class="flex items-center justify-between mb-1">
            <TrendingUp :size="18" class="text-green-500" />
            <span class="text-2xl font-bold">{{ totalTasks }}</span>
          </div>
          <p class="text-xs text-surface-500">Total Tasks</p>
        </div>
        <div class="card p-4">
          <div class="flex items-center justify-between mb-1">
            <Users :size="18" class="text-blue-500" />
            <span class="text-2xl font-bold">{{ totalMembers }}</span>
          </div>
          <p class="text-xs text-surface-500">Collaborators</p>
        </div>
        <div v-if="isAdmin" class="card p-4 cursor-pointer hover:shadow-md transition-all" @click="router.push('/admin')">
          <div class="flex items-center justify-between mb-1">
            <Shield :size="18" class="text-orange-500" />
            <span class="text-2xl font-bold">Admin</span>
          </div>
          <p class="text-xs text-surface-500">Panel</p>
        </div>
        <div v-else class="card p-4">
          <div class="flex items-center justify-between mb-1">
            <Activity :size="18" class="text-purple-500" />
            <span class="text-2xl font-bold">{{ recentActivity.length }}</span>
          </div>
          <p class="text-xs text-surface-500">Recent Actions</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Boards -->
        <div class="lg:col-span-2">
          <h2 class="font-semibold text-lg mb-4">Your Boards</h2>

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
            <h3 class="text-lg font-semibold mb-1">No boards yet</h3>
            <p class="text-surface-500 dark:text-surface-400 text-sm mb-4">Create your first board to get started</p>
            <button @click="showCreate = true" class="btn-primary">
              <Plus :size="18" /> Create Board
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
                      <Trash2 :size="14" /> Delete
                    </button>
                  </div>
                </div>
              </div>

              <h3 class="font-semibold text-lg mb-1">{{ board.title }}</h3>
              <p class="text-sm text-surface-500 dark:text-surface-400 line-clamp-2 mb-4">{{ board.description || 'No description' }}</p>

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
            <h2 class="font-semibold text-lg">Recent Activity</h2>
            <router-link to="/activity" class="text-xs text-primary-500 hover:text-primary-600">View all</router-link>
          </div>

          <div v-if="recentActivity.length === 0" class="card p-6 text-center text-sm text-surface-400">
            No recent activity
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
          <h2 class="text-lg font-semibold">Create New Board</h2>
          <button @click="showCreate = false" class="btn-ghost p-1"><X :size="18" /></button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5">Title</label>
            <input v-model="newBoard.title" type="text" placeholder="e.g. Product Sprint" class="input" @keyup.enter="handleCreate" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">Description</label>
            <textarea v-model="newBoard.description" placeholder="Brief description..." class="input resize-none" rows="3"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">Color</label>
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
          <button @click="handleCreate" :disabled="creating || !newBoard.title.trim()" class="btn-primary w-full">
            {{ creating ? 'Creating...' : 'Create Board' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
