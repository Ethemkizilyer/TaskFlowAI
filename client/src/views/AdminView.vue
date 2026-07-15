<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { adminApi } from '@/api'
import {
  Shield, Users, CheckCircle, Ban, Search, Loader2, UserCheck,
  UserX, Crown, Activity as ActivityIcon, LayoutDashboard, TrendingUp, UserPlus, X
} from 'lucide-vue-next'

const loading = ref(true)
const stats = ref<any>(null)
const users = ref<any[]>([])
const pendingUsers = ref<any[]>([])
const searchQuery = ref('')
const statusFilter = ref('')
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const activeTab = ref<'overview' | 'users' | 'pending'>('overview')
const showCreateModal = ref(false)
const creating = ref(false)
const createForm = ref({ name: '', email: '', role: 'PERSONNEL' })
const createError = ref('')
const createSuccess = ref('')

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
    const res = await adminApi.getUsers(page.value, 20, statusFilter.value, searchQuery.value)
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
  if (!confirm('Ban this user? They will lose access immediately.')) return
  try {
    await adminApi.banUser(id)
    users.value = users.value.map((u) => u.id === id ? { ...u, status: 'BANNED' } : u)
  } catch (e) {
    console.error(e)
  }
}

const unbanUser = async (id: string) => {
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
    createError.value = 'İsim ve e-posta zorunludur'
    return
  }
  creating.value = true
  try {
    const res = await adminApi.createUser(createForm.value)
    createSuccess.value = res.data.message || 'Kullanıcı oluşturuldu'
    users.value.unshift(res.data.data)
    if (stats.value) stats.value.users.total++
    setTimeout(() => {
      showCreateModal.value = false
      createForm.value = { name: '', email: '', role: 'PERSONNEL' }
      createSuccess.value = ''
    }, 2000)
  } catch (err: any) {
    createError.value = err.response?.data?.error || 'Kullanıcı oluşturulamadı'
  } finally {
    creating.value = false
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

const formatDate = (date: string) => new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })

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
            <h1 class="text-xl font-bold">Admin Panel</h1>
            <p class="text-sm text-surface-500">Manage users, approvals, and platform stats</p>
          </div>
        </div>
        <button @click="showCreateModal = true" class="btn-primary text-sm flex items-center gap-2">
          <UserPlus :size="16" /> Yeni Kullanıcı
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-6 p-1 bg-surface-100 dark:bg-surface-900 rounded-lg w-fit">
        <button
          @click="activeTab = 'overview'"
          class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
          :class="activeTab === 'overview' ? 'bg-white dark:bg-surface-800 shadow-sm' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'"
        >
          Overview
        </button>
        <button
          @click="activeTab = 'pending'"
          class="px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2"
          :class="activeTab === 'pending' ? 'bg-white dark:bg-surface-800 shadow-sm' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'"
        >
          Pending
          <span v-if="pendingUsers.length > 0" class="w-5 h-5 bg-yellow-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {{ pendingUsers.length }}
          </span>
        </button>
        <button
          @click="activeTab = 'users'"
          class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
          :class="activeTab === 'users' ? 'bg-white dark:bg-surface-800 shadow-sm' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'"
        >
          All Users
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
            <p class="text-xs text-surface-500">Total Users</p>
          </div>
          <div class="card p-4">
            <div class="flex items-center justify-between mb-2">
              <LayoutDashboard :size="18" class="text-blue-500" />
              <span class="text-2xl font-bold">{{ stats?.boards || 0 }}</span>
            </div>
            <p class="text-xs text-surface-500">Total Boards</p>
          </div>
          <div class="card p-4">
            <div class="flex items-center justify-between mb-2">
              <TrendingUp :size="18" class="text-green-500" />
              <span class="text-2xl font-bold">{{ stats?.tasks || 0 }}</span>
            </div>
            <p class="text-xs text-surface-500">Total Tasks</p>
          </div>
          <div class="card p-4">
            <div class="flex items-center justify-between mb-2">
              <ActivityIcon :size="18" class="text-orange-500" />
              <span class="text-2xl font-bold">{{ stats?.comments || 0 }}</span>
            </div>
            <p class="text-xs text-surface-500">Comments</p>
          </div>
        </div>

        <!-- User status breakdown -->
        <div class="card p-4">
          <h3 class="font-semibold text-sm mb-3">User Status Breakdown</h3>
          <div class="grid grid-cols-3 gap-3">
            <div class="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
              <p class="text-2xl font-bold text-green-600">{{ stats?.users?.active || 0 }}</p>
              <p class="text-xs text-surface-500 mt-1">Active</p>
            </div>
            <div class="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
              <p class="text-2xl font-bold text-yellow-600">{{ stats?.users?.pending || 0 }}</p>
              <p class="text-xs text-surface-500 mt-1">Pending</p>
            </div>
            <div class="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
              <p class="text-2xl font-bold text-red-600">{{ stats?.users?.banned || 0 }}</p>
              <p class="text-xs text-surface-500 mt-1">Banned</p>
            </div>
          </div>
        </div>

        <!-- Recent users -->
        <div class="card p-4">
          <h3 class="font-semibold text-sm mb-3">Recent Users</h3>
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
          <h3 class="font-semibold text-sm mb-3">Recent Boards</h3>
          <div class="space-y-2">
            <div v-for="board in stats?.recentBoards || []" :key="board.id" class="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/30">
              <div class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center">
                <LayoutDashboard :size="14" class="text-primary-600" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ board.title }}</p>
                <p class="text-xs text-surface-500">by {{ board.owner.name }}</p>
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
          <p class="text-surface-500">No pending users. Everyone is approved!</p>
        </div>
        <div v-for="user in pendingUsers" :key="user.id" class="card p-4 flex items-center gap-4">
          <img :src="user.avatar || ''" :alt="user.name" class="w-12 h-12 rounded-full bg-surface-200" />
          <div class="flex-1 min-w-0">
            <p class="font-medium">{{ user.name }}</p>
            <p class="text-sm text-surface-500">{{ user.email }}</p>
            <p class="text-xs text-surface-400 mt-1">Registered {{ formatDate(user.createdAt) }}</p>
          </div>
          <button @click="approveUser(user.id)" class="btn-primary text-sm">
            <UserCheck :size="16" /> Approve
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
              placeholder="Search by name or email..."
              class="input pl-10"
            />
          </div>
          <select v-model="statusFilter" @change="onFilterChange" class="input sm:w-40">
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="BANNED">Banned</option>
          </select>
        </div>

        <p class="text-sm text-surface-500">{{ total }} users found</p>

        <!-- Users table -->
        <div v-if="loading" class="flex justify-center py-12">
          <Loader2 :size="24" class="animate-spin text-primary-500" />
        </div>

        <div v-else-if="users.length === 0" class="card p-12 text-center text-surface-500">
          No users found
        </div>

        <div v-else class="card p-0 overflow-hidden">
          <!-- Desktop table -->
          <table class="w-full hidden sm:table">
            <thead class="bg-surface-50 dark:bg-surface-900/50 border-b border-surface-200 dark:border-surface-800">
              <tr>
                <th class="text-left text-xs font-semibold text-surface-500 px-4 py-3">User</th>
                <th class="text-left text-xs font-semibold text-surface-500 px-4 py-3">Status</th>
                <th class="text-left text-xs font-semibold text-surface-500 px-4 py-3">Role</th>
                <th class="text-left text-xs font-semibold text-surface-500 px-4 py-3">Stats</th>
                <th class="text-left text-xs font-semibold text-surface-500 px-4 py-3">Joined</th>
                <th class="text-right text-xs font-semibold text-surface-500 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-100 dark:divide-surface-800">
              <tr v-for="user in users" :key="user.id" class="hover:bg-surface-50 dark:hover:bg-surface-800/20">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <img :src="user.avatar || ''" :alt="user.name" class="w-9 h-9 rounded-full bg-surface-200" />
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
                  <select
                    :value="user.role"
                    @change="changeRole(user.id, ($event.target as HTMLSelectElement).value)"
                    class="text-xs bg-surface-100 dark:bg-surface-800 rounded-md px-2 py-1 border-0 focus:ring-1 focus:ring-primary-400"
                  >
                    <option value="MEMBER">MEMBER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td class="px-4 py-3">
                  <div class="flex gap-3 text-xs text-surface-500">
                    <span title="Boards">{{ user._count.boards }} boards</span>
                    <span title="Tasks">{{ user._count.tasks }} tasks</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-xs text-surface-500">{{ formatDate(user.createdAt) }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      v-if="user.status === 'PENDING'"
                      @click="approveUser(user.id)"
                      class="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/30 text-green-600"
                      title="Approve"
                    >
                      <UserCheck :size="16" />
                    </button>
                    <button
                      v-if="user.status !== 'BANNED'"
                      @click="banUser(user.id)"
                      class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600"
                      title="Ban"
                    >
                      <UserX :size="16" />
                    </button>
                    <button
                      v-if="user.status === 'BANNED'"
                      @click="unbanUser(user.id)"
                      class="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/30 text-green-600"
                      title="Unban"
                    >
                      <UserCheck :size="16" />
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
                <img :src="user.avatar || ''" :alt="user.name" class="w-10 h-10 rounded-full bg-surface-200" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate">{{ user.name }}</p>
                  <p class="text-xs text-surface-500 truncate">{{ user.email }}</p>
                </div>
                <span class="badge" :class="statusColors[user.status]">{{ user.status }}</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex gap-3 text-xs text-surface-500">
                  <span>{{ user._count.boards }} boards</span>
                  <span>{{ user._count.tasks }} tasks</span>
                </div>
                <div class="flex gap-1">
                  <button v-if="user.status === 'PENDING'" @click="approveUser(user.id)" class="p-1.5 rounded-lg text-green-600 bg-green-50 dark:bg-green-950/30">
                    <UserCheck :size="16" />
                  </button>
                  <button v-if="user.status !== 'BANNED'" @click="banUser(user.id)" class="p-1.5 rounded-lg text-red-600 bg-red-50 dark:bg-red-950/30">
                    <UserX :size="16" />
                  </button>
                  <button v-if="user.status === 'BANNED'" @click="unbanUser(user.id)" class="p-1.5 rounded-lg text-green-600 bg-green-50 dark:bg-green-950/30">
                    <UserCheck :size="16" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-2">
          <button
            v-for="p in totalPages"
            :key="p"
            @click="page = p; fetchUsers()"
            class="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
            :class="page === p ? 'bg-primary-600 text-white' : 'bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700'"
          >
            {{ p }}
          </button>
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
          <h3 class="font-bold text-lg">Yeni Kullanıcı Ekle</h3>
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
            <label class="block text-sm font-medium mb-1">İsim</label>
            <input
              v-model="createForm.name"
              type="text"
              placeholder="Ad Soyad"
              class="input w-full"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">E-posta</label>
            <input
              v-model="createForm.email"
              type="email"
              placeholder="kullanici@example.com"
              class="input w-full"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Rol</label>
            <select v-model="createForm.role" class="input w-full">
              <option value="ADMIN">System Administrator</option>
              <option value="DIRECTOR">Director</option>
              <option value="MANAGER">Manager</option>
              <option value="TEAM_LEADER">Team Leader</option>
              <option value="TEAM_MEMBER">Team Member</option>
              <option value="PERSONNEL">Personnel</option>
            </select>
          </div>
        </div>

        <div class="flex gap-2 mt-6">
          <button @click="showCreateModal = false" class="btn-secondary flex-1">İptal</button>
          <button
            @click="handleCreateUser"
            :disabled="creating"
            class="btn-primary flex-1 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Loader2 v-if="creating" :size="16" class="animate-spin" />
            <UserPlus v-else :size="16" />
            {{ creating ? 'Oluşturuluyor...' : 'Oluştur ve Gönder' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
