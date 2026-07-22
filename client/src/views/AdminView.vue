<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { adminApi } from '@/api'
import { useMessageStore } from '@/stores/message'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import {
  Shield, Users, CheckCircle, Ban, Search, Loader2, UserCheck,
  UserX, Crown, Activity as ActivityIcon, LayoutDashboard, TrendingUp, UserPlus, X,
  Edit, Trash2, KeyRound, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreVertical
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const authStore = useAuthStore()
const messageStore = useMessageStore()

const loading = ref(true)
const stats = ref<any>(null)
const users = ref<any[]>([])
const pendingUsers = ref<any[]>([])
const searchQuery = ref('')
const statusFilter = ref('')
const page = ref(1)
const pageSize = ref(10)
const totalPages = ref(1)
const total = ref(0)
const activeTab = ref<'overview' | 'users' | 'pending'>('overview')

const pageSizeOptions = [10, 20, 50, 100]

// Create modal
const showCreateModal = ref(false)
const creating = ref(false)
const createForm = ref({ name: '', email: '', role: 'PERSONNEL' })
const createError = ref('')
const createSuccess = ref('')

// Edit modal
const showEditModal = ref(false)
const editing = ref(false)
const editForm = ref({ id: '', name: '', email: '', role: 'PERSONNEL', status: 'ACTIVE', bio: '' })
const editError = ref('')
const editSuccess = ref('')

// Detail drawer
const showDetailDrawer = ref(false)
const detailLoading = ref(false)
const detailUser = ref<any>(null)

// Bulk selection
const selectedIds = ref<Set<string>>(new Set())
const showBulkBar = ref(false)
const bulkActionLoading = ref(false)

// Reset password
const resettingPassword = ref<string | null>(null)

const roleOptions = [
  { value: 'ADMIN', label: 'System Administrator' },
  { value: 'DIRECTOR', label: 'Director' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'TEAM_LEADER', label: 'Team Leader' },
  { value: 'TEAM_MEMBER', label: 'Team Member' },
  { value: 'PERSONNEL', label: 'Personnel' },
]

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  DIRECTOR: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  MANAGER: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  TEAM_LEADER: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
  TEAM_MEMBER: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
  PERSONNEL: 'bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300',
}

const isUserOnline = (userId: string) => messageStore.onlineUserIds.has(userId)

const fetchStats = async () => {
  try {
    const res = await adminApi.getStats()
    stats.value = res.data.data
  } catch (e) {
    console.error(e)
  }
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await adminApi.getUsers(page.value, pageSize.value, statusFilter.value, searchQuery.value)
    users.value = res.data.data
    totalPages.value = res.data.meta?.totalPages || 1
    total.value = res.data.meta?.total || 0
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const fetchPending = async () => {
  try {
    const res = await adminApi.getPendingUsers()
    pendingUsers.value = res.data.data
  } catch (e) {
    console.error(e)
  }
}

const approveUser = async (id: string) => {
  try {
    await adminApi.approveUser(id)
    pendingUsers.value = pendingUsers.value.filter((u) => u.id !== id)
    users.value = users.value.map((u) => u.id === id ? { ...u, status: 'ACTIVE' } : u)
    if (stats.value) stats.value.users.pending = Math.max(0, stats.value.users.pending - 1)
  } catch (e) {
    console.error(e)
  }
}

const banUser = async (id: string) => {
  if (!confirm(t('admin.confirmBan'))) return
  try {
    await adminApi.banUser(id)
    users.value = users.value.map((u) => u.id === id ? { ...u, status: 'BANNED' } : u)
  } catch (e) {
    console.error(e)
  }
}

const unbanUser = async (id: string) => {
  if (!confirm(t('admin.confirmUnban'))) return
  try {
    await adminApi.unbanUser(id)
    users.value = users.value.map((u) => u.id === id ? { ...u, status: 'ACTIVE' } : u)
  } catch (e) {
    console.error(e)
  }
}

const changeRole = async (id: string, role: string) => {
  try {
    await adminApi.updateUserRole(id, role)
    users.value = users.value.map((u) => u.id === id ? { ...u, role } : u)
  } catch (e) {
    console.error(e)
  }
}

const handleCreateUser = async () => {
  createError.value = ''
  createSuccess.value = ''
  if (!createForm.value.name.trim() || !createForm.value.email.trim()) {
    createError.value = t('admin.nameRequired')
    return
  }
  creating.value = true
  try {
    const res = await adminApi.createUser(createForm.value)
    createSuccess.value = res.data.message || t('admin.userCreated')
    users.value.unshift(res.data.data)
    if (stats.value) stats.value.users.total++
    setTimeout(() => {
      showCreateModal.value = false
      createForm.value = { name: '', email: '', role: 'PERSONNEL' }
      createSuccess.value = ''
    }, 2000)
  } catch (err: any) {
    createError.value = err.response?.data?.error || t('admin.createFailed')
  } finally {
    creating.value = false
  }
}

const openEditModal = (user: any) => {
  editForm.value = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    bio: user.bio || '',
  }
  editError.value = ''
  editSuccess.value = ''
  showEditModal.value = true
}

const handleEditUser = async () => {
  editError.value = ''
  editSuccess.value = ''
  if (!editForm.value.name.trim() || !editForm.value.email.trim()) {
    editError.value = t('admin.nameRequired')
    return
  }
  editing.value = true
  try {
    const res = await adminApi.updateUser(editForm.value.id, {
      name: editForm.value.name,
      email: editForm.value.email,
      role: editForm.value.role,
      status: editForm.value.status,
      bio: editForm.value.bio,
    })
    editSuccess.value = res.data.message || t('admin.userUpdated')
    users.value = users.value.map((u) =>
      u.id === editForm.value.id ? { ...u, ...res.data.data } : u
    )
    setTimeout(() => {
      showEditModal.value = false
      editSuccess.value = ''
    }, 1500)
  } catch (err: any) {
    editError.value = err.response?.data?.error || t('admin.updateFailed')
  } finally {
    editing.value = false
  }
}

const handleDeleteUser = async (id: string, name: string) => {
  if (!confirm(t('admin.confirmDeleteUser', { name }))) return
  try {
    await adminApi.deleteUser(id)
    users.value = users.value.filter((u) => u.id !== id)
    selectedIds.value.delete(id)
    if (stats.value) stats.value.users.total = Math.max(0, stats.value.users.total - 1)
  } catch (err: any) {
    alert(err.response?.data?.error || t('admin.deleteFailed'))
  }
}

const handleResetPassword = async (id: string, name: string) => {
  if (!confirm(t('admin.confirmResetPassword', { name }))) return
  resettingPassword.value = id
  try {
    const res = await adminApi.resetPassword(id)
    alert(res.data.message || t('admin.passwordResetSuccess'))
  } catch (err: any) {
    alert(err.response?.data?.error || t('admin.passwordResetFailed'))
  } finally {
    resettingPassword.value = null
  }
}

const openDetailDrawer = async (id: string) => {
  showDetailDrawer.value = true
  detailLoading.value = true
  detailUser.value = null
  try {
    const res = await adminApi.getUserById(id)
    detailUser.value = res.data.data
  } catch (e) {
    console.error(e)
  } finally {
    detailLoading.value = false
  }
}

// Bulk selection
const toggleSelect = (id: string) => {
  const newSet = new Set(selectedIds.value)
  if (newSet.has(id)) {
    newSet.delete(id)
  } else {
    newSet.add(id)
  }
  selectedIds.value = newSet
  showBulkBar.value = newSet.size > 0
}

const toggleSelectAll = () => {
  if (selectedIds.value.size === users.value.length) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(users.value.map((u) => u.id))
  }
  showBulkBar.value = selectedIds.value.size > 0
}

const handleBulkAction = async (action: string, role?: string) => {
  const ids = Array.from(selectedIds.value)
  if (ids.length === 0) return
  const actionKey = action === 'setRole' ? 'setRole' : action
  const actionText = t(`admin.bulkActions.${actionKey}`)
  if (!confirm(t('admin.confirmBulkAction', { count: ids.length, action: actionText }))) return
  bulkActionLoading.value = true
  try {
    await adminApi.bulkAction({ userIds: ids, action, role })
    selectedIds.value = new Set()
    showBulkBar.value = false
    await fetchUsers()
    await fetchStats()
  } catch (err: any) {
    alert(err.response?.data?.error || t('admin.bulkActionFailed'))
  } finally {
    bulkActionLoading.value = false
  }
}

const onSearch = () => {
  page.value = 1
  fetchUsers()
}

const onFilterChange = () => {
  page.value = 1
  fetchUsers()
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300',
  BANNED: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
}

const formatDate = (date: string) => new Date(date).toLocaleDateString(locale.value, { month: 'short', day: 'numeric', year: 'numeric' })
const formatDateTime = (date: string) => new Date(date).toLocaleString(locale.value, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

const startItem = computed(() => (page.value - 1) * pageSize.value + 1)
const endItem = computed(() => Math.min(page.value * pageSize.value, total.value))

const onPageSizeChange = () => {
  page.value = 1
  fetchUsers()
}

onMounted(() => {
  fetchStats()
  fetchUsers()
  fetchPending()
})
</script>

<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-950">
    <div class="max-w-6xl mx-auto p-4 sm:p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center">
            <Shield :size="20" class="text-primary-600" />
          </div>
          <div>
            <h1 class="text-xl font-bold">{{ t('admin.title') }}</h1>
            <p class="text-sm text-surface-500">{{ t('admin.subtitle') }}</p>
          </div>
        </div>
        <button @click="showCreateModal = true" class="btn-primary text-sm flex items-center gap-2">
          <UserPlus :size="16" /> {{ t('admin.newButton') }}
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-6 p-1 bg-surface-100 dark:bg-surface-900 rounded-lg w-fit">
        <button
          @click="activeTab = 'overview'"
          class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
          :class="activeTab === 'overview' ? 'bg-white dark:bg-surface-800 shadow-sm' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'"
        >
          {{ t('admin.overview') }}
        </button>
        <button
          @click="activeTab = 'pending'"
          class="px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2"
          :class="activeTab === 'pending' ? 'bg-white dark:bg-surface-800 shadow-sm' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'"
        >
          {{ t('admin.pending') }}
          <span v-if="pendingUsers.length > 0" class="w-5 h-5 bg-yellow-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {{ pendingUsers.length }}
          </span>
        </button>
        <button
          @click="activeTab = 'users'"
          class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
          :class="activeTab === 'users' ? 'bg-white dark:bg-surface-800 shadow-sm' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'"
        >
          {{ t('admin.allUsers') }}
        </button>
      </div>

      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="space-y-6">
        <!-- Stats cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="card p-4">
            <div class="flex items-center justify-between mb-2">
              <Users :size="18" class="text-primary-500" />
              <span class="text-2xl font-bold">{{ stats?.users?.total || 0 }}</span>
            </div>
            <p class="text-xs text-surface-500">{{ t('admin.totalUsers') }}</p>
          </div>
          <div class="card p-4">
            <div class="flex items-center justify-between mb-2">
              <LayoutDashboard :size="18" class="text-blue-500" />
              <span class="text-2xl font-bold">{{ stats?.boards || 0 }}</span>
            </div>
            <p class="text-xs text-surface-500">{{ t('admin.totalBoards') }}</p>
          </div>
          <div class="card p-4">
            <div class="flex items-center justify-between mb-2">
              <TrendingUp :size="18" class="text-green-500" />
              <span class="text-2xl font-bold">{{ stats?.tasks || 0 }}</span>
            </div>
            <p class="text-xs text-surface-500">{{ t('admin.totalTasks') }}</p>
          </div>
          <div class="card p-4">
            <div class="flex items-center justify-between mb-2">
              <ActivityIcon :size="18" class="text-orange-500" />
              <span class="text-2xl font-bold">{{ stats?.comments || 0 }}</span>
            </div>
            <p class="text-xs text-surface-500">{{ t('admin.totalComments') }}</p>
          </div>
        </div>

        <!-- User status breakdown -->
        <div class="card p-4">
          <h3 class="font-semibold text-sm mb-3">{{ t('admin.userStatusBreakdown') }}</h3>
          <div class="grid grid-cols-3 gap-3">
            <div class="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
              <p class="text-2xl font-bold text-green-600">{{ stats?.users?.active || 0 }}</p>
              <p class="text-xs text-surface-500 mt-1">{{ t('admin.active') }}</p>
            </div>
            <div class="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
              <p class="text-2xl font-bold text-yellow-600">{{ stats?.users?.pending || 0 }}</p>
              <p class="text-xs text-surface-500 mt-1">{{ t('admin.pending') }}</p>
            </div>
            <div class="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
              <p class="text-2xl font-bold text-red-600">{{ stats?.users?.banned || 0 }}</p>
              <p class="text-xs text-surface-500 mt-1">{{ t('admin.banned') }}</p>
            </div>
          </div>
        </div>

        <!-- Recent users -->
        <div class="card p-4">
          <h3 class="font-semibold text-sm mb-3">{{ t('admin.recentUsers') }}</h3>
          <div class="space-y-2">
            <div v-for="user in stats?.recentUsers || []" :key="user.id" class="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/30">
              <img :src="user.avatar || ''" :alt="user.name" class="w-8 h-8 rounded-full bg-surface-200" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ user.name }}</p>
                <p class="text-xs text-surface-500 truncate">{{ user.email }}</p>
              </div>
              <span class="badge" :class="statusColors[user.status]">{{ user.status }}</span>
              <span class="text-xs text-surface-400">{{ formatDate(user.createdAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Recent boards -->
        <div class="card p-4">
          <h3 class="font-semibold text-sm mb-3">{{ t('admin.recentBoards') }}</h3>
          <div class="space-y-2">
            <div v-for="board in stats?.recentBoards || []" :key="board.id" class="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/30">
              <div class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center">
                <LayoutDashboard :size="14" class="text-primary-600" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ board.title }}</p>
                <p class="text-xs text-surface-500">{{ board.owner.name }}</p>
              </div>
              <span class="text-xs text-surface-400">{{ formatDate(board.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pending Tab -->
      <div v-if="activeTab === 'pending'" class="space-y-3">
        <div v-if="pendingUsers.length === 0" class="card p-12 text-center">
          <CheckCircle :size="48" class="mx-auto text-green-500 mb-3" />
          <p class="text-surface-500">{{ t('admin.noPendingUsers') }}</p>
        </div>
        <div v-for="user in pendingUsers" :key="user.id" class="card p-4 flex items-center gap-4">
          <img :src="user.avatar || ''" :alt="user.name" class="w-12 h-12 rounded-full bg-surface-200" />
          <div class="flex-1 min-w-0">
            <p class="font-medium">{{ user.name }}</p>
            <p class="text-sm text-surface-500">{{ user.email }}</p>
            <p class="text-xs text-surface-400 mt-1">{{ t('admin.joined') }} {{ formatDate(user.createdAt) }}</p>
          </div>
          <button @click="approveUser(user.id)" class="btn-primary text-sm">
            <UserCheck :size="16" /> {{ t('admin.approve') }}
          </button>
        </div>
      </div>

      <!-- All Users Tab -->
      <div v-if="activeTab === 'users'" class="space-y-4">
        <!-- Search & filter -->
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="relative flex-1">
            <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              v-model="searchQuery"
              @input="onSearch"
              type="text"
              :placeholder="t('admin.searchPlaceholder')"
              class="input pl-10"
            />
          </div>
          <select v-model="statusFilter" @change="onFilterChange" class="input sm:w-40">
            <option value="">{{ t('admin.allStatus') }}</option>
            <option value="ACTIVE">{{ t('admin.active') }}</option>
            <option value="PENDING">{{ t('admin.pending') }}</option>
            <option value="BANNED">{{ t('admin.banned') }}</option>
          </select>
        </div>

        <p class="text-sm text-surface-500">{{ t('admin.usersFound', { count: total }) }}</p>

        <!-- Users table -->
        <div v-if="loading" class="flex justify-center py-12">
          <Loader2 :size="24" class="animate-spin text-primary-500" />
        </div>

        <div v-else-if="users.length === 0" class="card p-12 text-center text-surface-500">
          {{ t('admin.noUsersFound') }}
        </div>

        <!-- Bulk action bar -->
        <div v-if="showBulkBar" class="flex items-center gap-3 p-3 rounded-lg bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800">
          <span class="text-sm font-medium">{{ t('admin.selected', { count: selectedIds.size }) }}</span>
          <div class="flex-1" />
          <button @click="handleBulkAction('approve')" class="btn-ghost text-xs px-2 py-1 text-green-600">{{ t('admin.approveAll') }}</button>
          <button @click="handleBulkAction('ban')" class="btn-ghost text-xs px-2 py-1 text-red-600">{{ t('admin.banAll') }}</button>
          <button @click="handleBulkAction('unban')" class="btn-ghost text-xs px-2 py-1 text-green-600">{{ t('admin.unbanAll') }}</button>
          <select @change="handleBulkAction('setRole', ($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''" class="text-xs bg-surface-100 dark:bg-surface-800 rounded-md px-2 py-1 border-0">
            <option value="">{{ t('admin.setRole') }}</option>
            <option v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
          </select>
          <button @click="handleBulkAction('delete')" class="btn-ghost text-xs px-2 py-1 text-red-600">{{ t('admin.deleteAll') }}</button>
          <button @click="selectedIds = new Set(); showBulkBar = false" class="btn-ghost text-xs px-2 py-1">{{ t('admin.clear') }}</button>
        </div>

        <div v-else class="card p-0 overflow-hidden">
          <!-- Desktop table -->
          <table class="w-full hidden sm:table">
            <thead class="bg-surface-50 dark:bg-surface-900/50 border-b border-surface-200 dark:border-surface-800">
              <tr>
                <th class="text-left text-xs font-semibold text-surface-500 px-4 py-3 w-10">
                  <input type="checkbox" :checked="selectedIds.size === users.length && users.length > 0" @change="toggleSelectAll" class="rounded border-surface-300" />
                </th>
                <th class="text-left text-xs font-semibold text-surface-500 px-4 py-3">{{ t('admin.user') }}</th>
                <th class="text-left text-xs font-semibold text-surface-500 px-4 py-3">{{ t('admin.status') }}</th>
                <th class="text-left text-xs font-semibold text-surface-500 px-4 py-3">{{ t('admin.role') }}</th>
                <th class="text-left text-xs font-semibold text-surface-500 px-4 py-3">{{ t('admin.stats') }}</th>
                <th class="text-left text-xs font-semibold text-surface-500 px-4 py-3">{{ t('admin.joined') }}</th>
                <th class="text-right text-xs font-semibold text-surface-500 px-4 py-3">{{ t('admin.actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-100 dark:divide-surface-800">
              <tr v-for="user in users" :key="user.id" class="hover:bg-surface-50 dark:hover:bg-surface-800/20" :class="{ 'bg-primary-50/30 dark:bg-primary-950/10': selectedIds.has(user.id) }">
                <td class="px-4 py-3">
                  <input type="checkbox" :checked="selectedIds.has(user.id)" @change="toggleSelect(user.id)" class="rounded border-surface-300" />
                </td>
                <td class="px-4 py-3 cursor-pointer" @click="openDetailDrawer(user.id)">
                  <div class="flex items-center gap-3">
                    <div class="relative shrink-0">
                      <img :src="user.avatar || ''" :alt="user.name" class="w-9 h-9 rounded-full bg-surface-200" />
                      <span v-if="isUserOnline(user.id)" class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-surface-900" />
                    </div>
                    <div>
                      <p class="text-sm font-medium">{{ user.name }}</p>
                      <p class="text-xs text-surface-500">{{ user.email }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="badge" :class="statusColors[user.status]">{{ user.status }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="badge" :class="roleColors[user.role]">{{ user.role }}</span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex gap-3 text-xs text-surface-500">
                    <span title="Boards">{{ user._count.boards }} {{ t('admin.boardsCount') }}</span>
                    <span title="Tasks">{{ user._count.tasks }} {{ t('admin.tasksCount') }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-xs text-surface-500">{{ formatDate(user.createdAt) }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-1">
                    <button @click="openDetailDrawer(user.id)" class="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600" :title="t('admin.viewDetails')">
                      <Eye :size="16" />
                    </button>
                    <button @click="openEditModal(user)" class="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600" :title="t('admin.edit')">
                      <Edit :size="16" />
                    </button>
                    <button
                      v-if="user.status === 'PENDING'"
                      @click="approveUser(user.id)"
                      class="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/30 text-green-600"
                      :title="t('admin.approve')"
                    >
                      <UserCheck :size="16" />
                    </button>
                    <button
                      v-if="user.status !== 'BANNED'"
                      @click="banUser(user.id)"
                      class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600"
                      :title="t('admin.ban')"
                    >
                      <UserX :size="16" />
                    </button>
                    <button
                      v-if="user.status === 'BANNED'"
                      @click="unbanUser(user.id)"
                      class="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/30 text-green-600"
                      :title="t('admin.unban')"
                    >
                      <UserCheck :size="16" />
                    </button>
                    <button
                      @click="handleResetPassword(user.id, user.name)"
                      :disabled="resettingPassword === user.id"
                      class="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-950/30 text-yellow-600 disabled:opacity-50"
                      :title="t('admin.resetPassword')"
                    >
                      <Loader2 v-if="resettingPassword === user.id" :size="16" class="animate-spin" />
                      <KeyRound v-else :size="16" />
                    </button>
                    <button
                      v-if="user.id !== authStore.user?.id && user.role !== 'ADMIN'"
                      @click="handleDeleteUser(user.id, user.name)"
                      class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600"
                      :title="t('admin.delete')"
                    >
                      <Trash2 :size="16" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Mobile cards -->
          <div class="sm:hidden divide-y divide-surface-100 dark:divide-surface-800">
            <div v-for="user in users" :key="user.id" class="p-4">
              <div class="flex items-center gap-3 mb-3">
                <input type="checkbox" :checked="selectedIds.has(user.id)" @change="toggleSelect(user.id)" class="rounded border-surface-300 shrink-0" />
                <div class="relative shrink-0">
                  <img :src="user.avatar || ''" :alt="user.name" class="w-10 h-10 rounded-full bg-surface-200" />
                  <span v-if="isUserOnline(user.id)" class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-surface-900" />
                </div>
                <div class="flex-1 min-w-0" @click="openDetailDrawer(user.id)">
                  <p class="text-sm font-medium truncate">{{ user.name }}</p>
                  <p class="text-xs text-surface-500 truncate">{{ user.email }}</p>
                </div>
                <span class="badge" :class="statusColors[user.status]">{{ user.status }}</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex gap-3 text-xs text-surface-500">
                  <span>{{ user._count.boards }} {{ t('admin.boardsCount') }}</span>
                  <span>{{ user._count.tasks }} {{ t('admin.tasksCount') }}</span>
                </div>
                <div class="flex gap-1 flex-wrap">
                  <button @click="openEditModal(user)" class="p-1.5 rounded-lg text-blue-600 bg-blue-50 dark:bg-blue-950/30">
                    <Edit :size="16" />
                  </button>
                  <button v-if="user.status === 'PENDING'" @click="approveUser(user.id)" class="p-1.5 rounded-lg text-green-600 bg-green-50 dark:bg-green-950/30">
                    <UserCheck :size="16" />
                  </button>
                  <button v-if="user.status !== 'BANNED'" @click="banUser(user.id)" class="p-1.5 rounded-lg text-red-600 bg-red-50 dark:bg-red-950/30">
                    <UserX :size="16" />
                  </button>
                  <button v-if="user.status === 'BANNED'" @click="unbanUser(user.id)" class="p-1.5 rounded-lg text-green-600 bg-green-50 dark:bg-green-950/30">
                    <UserCheck :size="16" />
                  </button>
                  <button @click="handleResetPassword(user.id, user.name)" class="p-1.5 rounded-lg text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30">
                    <KeyRound :size="16" />
                  </button>
                  <button v-if="user.id !== authStore.user?.id && user.role !== 'ADMIN'" @click="handleDeleteUser(user.id, user.name)" class="p-1.5 rounded-lg text-red-600 bg-red-50 dark:bg-red-950/30">
                    <Trash2 :size="16" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="total > 0" class="flex items-center justify-between mt-4 gap-4 flex-wrap">
          <div class="flex items-center gap-3">
            <span class="text-xs text-surface-400">{{ t('admin.rowsPerPage') }}</span>
            <select v-model="pageSize" @change="onPageSizeChange" class="text-xs bg-surface-100 dark:bg-surface-800 rounded-md px-2 py-1 border-0">
              <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
            </select>
            <span class="text-xs text-surface-400">{{ t('admin.showing', { from: startItem, to: endItem, total }) }}</span>
          </div>
          <div v-if="totalPages > 1" class="flex items-center gap-1">
            <button @click="page = 1; fetchUsers()" :disabled="page === 1" class="p-1.5 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronsLeft :size="16" />
            </button>
            <button @click="page = Math.max(1, page - 1); fetchUsers()" :disabled="page === 1" class="p-1.5 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft :size="16" />
            </button>
            <span class="px-3 py-1 text-xs font-medium">{{ page }} / {{ totalPages }}</span>
            <button @click="page = Math.min(totalPages, page + 1); fetchUsers()" :disabled="page === totalPages" class="p-1.5 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight :size="16" />
            </button>
            <button @click="page = totalPages; fetchUsers()" :disabled="page === totalPages" class="p-1.5 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronsRight :size="16" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create User Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="showCreateModal = false"
    >
      <div class="card p-6 w-96 max-w-[90vw]">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-lg">{{ t('admin.addNewUser') }}</h3>
          <button @click="showCreateModal = false" class="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800">
            <X :size="18" />
          </button>
        </div>

        <div v-if="createSuccess" class="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 text-sm">
          {{ createSuccess }}
        </div>
        <div v-if="createError" class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">
          {{ createError }}
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">{{ t('common.name') }}</label>
            <input v-model="createForm.name" type="text" :placeholder="t('register.namePlaceholder')" class="input w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">{{ t('common.email') }}</label>
            <input v-model="createForm.email" type="email" placeholder="user@example.com" class="input w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">{{ t('common.role') }}</label>
            <select v-model="createForm.role" class="input w-full">
              <option v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
            </select>
          </div>
        </div>

        <div class="flex gap-2 mt-6">
          <button @click="showCreateModal = false" class="btn-secondary flex-1">{{ t('common.cancel') }}</button>
          <button @click="handleCreateUser" :disabled="creating" class="btn-primary flex-1 disabled:opacity-50 flex items-center justify-center gap-2">
            <Loader2 v-if="creating" :size="16" class="animate-spin" />
            <UserPlus v-else :size="16" />
            {{ creating ? t('admin.creating') : t('admin.createAndSend') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="showEditModal = false"
    >
      <div class="card p-6 w-96 max-w-[90vw]">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-lg">{{ t('admin.editUser') }}</h3>
          <button @click="showEditModal = false" class="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800">
            <X :size="18" />
          </button>
        </div>

        <div v-if="editSuccess" class="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 text-sm">
          {{ editSuccess }}
        </div>
        <div v-if="editError" class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">
          {{ editError }}
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">{{ t('common.name') }}</label>
            <input v-model="editForm.name" type="text" class="input w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">{{ t('common.email') }}</label>
            <input v-model="editForm.email" type="email" class="input w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">{{ t('common.role') }}</label>
            <select v-model="editForm.role" class="input w-full">
              <option v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">{{ t('common.status') }}</label>
            <select v-model="editForm.status" class="input w-full">
              <option value="ACTIVE">{{ t('admin.active') }}</option>
              <option value="PENDING">{{ t('admin.pending') }}</option>
              <option value="BANNED">{{ t('admin.banned') }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">{{ t('admin.bio') }}</label>
            <textarea v-model="editForm.bio" rows="3" :placeholder="t('profile.bioPlaceholder')" class="input w-full"></textarea>
          </div>
        </div>

        <div class="flex gap-2 mt-6">
          <button @click="showEditModal = false" class="btn-secondary flex-1">{{ t('common.cancel') }}</button>
          <button @click="handleEditUser" :disabled="editing" class="btn-primary flex-1 disabled:opacity-50 flex items-center justify-center gap-2">
            <Loader2 v-if="editing" :size="16" class="animate-spin" />
            <Edit v-else :size="16" />
            {{ editing ? t('admin.editing') : t('common.save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- User Detail Drawer -->
    <div
      v-if="showDetailDrawer"
      class="fixed inset-0 bg-black/40 z-50"
      @click.self="showDetailDrawer = false"
    >
      <div class="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-surface-900 overflow-y-auto">
        <div class="sticky top-0 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 p-4 flex items-center gap-3 z-10">
          <button @click="showDetailDrawer = false" class="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800">
            <ChevronLeft :size="20" />
          </button>
          <h3 class="font-bold text-lg">{{ t('admin.userDetail') }}</h3>
        </div>

        <div v-if="detailLoading" class="flex justify-center py-12">
          <Loader2 :size="24" class="animate-spin text-primary-500" />
        </div>

        <div v-else-if="detailUser" class="p-6 space-y-6">
          <!-- Profile header -->
          <div class="flex items-center gap-4">
            <div class="relative shrink-0">
              <img :src="detailUser.avatar || ''" :alt="detailUser.name" class="w-20 h-20 rounded-full bg-surface-200" />
              <span v-if="isUserOnline(detailUser.id)" class="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-surface-900" />
            </div>
            <div class="flex-1 min-w-0">
              <h2 class="text-xl font-bold truncate">{{ detailUser.name }}</h2>
              <p class="text-sm text-surface-500 truncate">{{ detailUser.email }}</p>
              <div class="flex gap-2 mt-2">
                <span class="badge" :class="statusColors[detailUser.status]">{{ detailUser.status }}</span>
                <span class="badge" :class="roleColors[detailUser.role]">{{ detailUser.role }}</span>
              </div>
            </div>
          </div>

          <!-- Bio -->
          <div v-if="detailUser.bio">
            <h4 class="text-xs font-semibold text-surface-400 uppercase mb-2">{{ t('admin.bio') }}</h4>
            <p class="text-sm text-surface-600 dark:text-surface-300">{{ detailUser.bio }}</p>
          </div>

          <!-- Info grid -->
          <div class="grid grid-cols-2 gap-4">
            <div class="card p-3">
              <p class="text-xs text-surface-400">{{ t('admin.lastLogin') }}</p>
              <p class="text-sm font-medium">{{ detailUser.lastLoginAt ? formatDateTime(detailUser.lastLoginAt) : t('admin.never') }}</p>
            </div>
            <div class="card p-3">
              <p class="text-xs text-surface-400">{{ t('admin.joined') }}</p>
              <p class="text-sm font-medium">{{ formatDate(detailUser.createdAt) }}</p>
            </div>
            <div v-if="detailUser.department" class="card p-3">
              <p class="text-xs text-surface-400">{{ t('admin.department') }}</p>
              <p class="text-sm font-medium">{{ detailUser.department.name }}</p>
            </div>
            <div v-if="detailUser.team" class="card p-3">
              <p class="text-xs text-surface-400">{{ t('admin.team') }}</p>
              <p class="text-sm font-medium">{{ detailUser.team.name }}</p>
            </div>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-4 gap-3">
            <div class="text-center p-3 rounded-lg bg-primary-50 dark:bg-primary-950/20">
              <p class="text-2xl font-bold text-primary-600">{{ detailUser._count?.boards || 0 }}</p>
              <p class="text-xs text-surface-500">{{ t('admin.boardsCount') }}</p>
            </div>
            <div class="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <p class="text-2xl font-bold text-blue-600">{{ detailUser._count?.tasks || 0 }}</p>
              <p class="text-xs text-surface-500">{{ t('admin.tasksCount') }}</p>
            </div>
            <div class="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
              <p class="text-2xl font-bold text-green-600">{{ detailUser._count?.comments || 0 }}</p>
              <p class="text-xs text-surface-500">{{ t('admin.comments') }}</p>
            </div>
            <div class="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
              <p class="text-2xl font-bold text-orange-600">{{ detailUser._count?.activity || 0 }}</p>
              <p class="text-xs text-surface-500">{{ t('admin.activity') }}</p>
            </div>
          </div>

          <!-- Recent tasks -->
          <div v-if="detailUser.recentTasks?.length">
            <h4 class="text-xs font-semibold text-surface-400 uppercase mb-2">{{ t('admin.recentTasks') }}</h4>
            <div class="space-y-2">
              <div v-for="task in detailUser.recentTasks" :key="task.id" class="card p-3">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium truncate">{{ task.title }}</p>
                  <span class="badge text-xs" :class="statusColors[task.status] || 'bg-gray-100 text-gray-700'">{{ task.status }}</span>
                </div>
                <p class="text-xs text-surface-500 mt-1">{{ task.board?.title }}</p>
              </div>
            </div>
          </div>

          <!-- Recent activity -->
          <div v-if="detailUser.recentActivity?.length">
            <h4 class="text-xs font-semibold text-surface-400 uppercase mb-2">{{ t('admin.recentActivity') }}</h4>
            <div class="space-y-2">
              <div v-for="act in detailUser.recentActivity" :key="act.id" class="flex items-start gap-3 p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/30">
                <ActivityIcon :size="14" class="text-surface-400 mt-0.5 shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm">{{ act.description }}</p>
                  <p class="text-xs text-surface-400">{{ formatDateTime(act.createdAt) }}{{ act.board ? ' · ' + act.board.title : '' }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex gap-2 pt-4 border-t border-surface-200 dark:border-surface-800">
            <button @click="openEditModal(detailUser); showDetailDrawer = false" class="btn-secondary flex-1 text-sm flex items-center justify-center gap-2">
              <Edit :size="16" /> {{ t('admin.edit') }}
            </button>
            <button @click="handleResetPassword(detailUser.id, detailUser.name)" class="btn-secondary flex-1 text-sm flex items-center justify-center gap-2">
              <KeyRound :size="16" /> {{ t('admin.resetPassword') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
