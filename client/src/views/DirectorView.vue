<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { adminApi } from '@/api'
import { Building2, Users, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-vue-next'
import { ROLE_LABELS, ROLE_COLORS } from '@/types'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const authStore = useAuthStore()
const stats = ref<any>({})
const users = ref<any[]>([])
const loading = ref(true)

const roleLabel = computed(() => authStore.user ? t(`roles.${authStore.user.role}`) : '')
const roleColor = computed(() => authStore.user ? ROLE_COLORS[authStore.user.role] : '')

const fetchStats = async () => {
  try {
    const res = await adminApi.getStats()
    stats.value = res.data.data
  } catch {
    // ignore
  }
}

const fetchUsers = async () => {
  try {
    const res = await adminApi.getUsers(1, 10)
    users.value = res.data.data
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStats()
  fetchUsers()
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
    <div class="flex items-center gap-3 mb-6">
      <div class="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center">
        <Building2 :size="20" class="text-purple-600 dark:text-purple-400" />
      </div>
      <div>
        <h1 class="text-2xl font-bold">{{ t('panels.director.title') }}</h1>
        <p class="text-sm text-surface-500">{{ t('panels.director.subtitle') }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
            <Users :size="18" class="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stats.totalUsers || 0 }}</p>
            <p class="text-xs text-surface-500">{{ t('panels.director.totalUsers') }}</p>
          </div>
        </div>
      </div>
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
            <CheckCircle :size="18" class="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stats.activeUsers || 0 }}</p>
            <p class="text-xs text-surface-500">{{ t('panels.director.activeUsers') }}</p>
          </div>
        </div>
      </div>
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-950/40 flex items-center justify-center">
            <Clock :size="18" class="text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stats.pendingUsers || 0 }}</p>
            <p class="text-xs text-surface-500">{{ t('panels.director.pendingApprovals') }}</p>
          </div>
        </div>
      </div>
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center">
            <TrendingUp :size="18" class="text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stats.totalBoards || 0 }}</p>
            <p class="text-xs text-surface-500">{{ t('panels.director.activeBoards') }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="card p-4">
      <h2 class="font-semibold text-lg mb-4">{{ t('panels.director.userOverview') }}</h2>
      <div v-if="loading" class="flex items-center justify-center py-8">
        <div class="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="user in users"
          :key="user.id"
          class="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50"
        >
          <img :src="user.avatar" class="w-9 h-9 rounded-full bg-surface-200" />
          <div class="flex-1">
            <p class="text-sm font-medium">{{ user.name }}</p>
            <p class="text-xs text-surface-500">{{ user.email }}</p>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" :class="ROLE_COLORS[user.role as keyof typeof ROLE_COLORS]">
            {{ t(`roles.${user.role}`) }}
          </span>
          <span
            class="text-[10px] font-medium px-2 py-0.5 rounded-full"
            :class="{
              'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300': user.status === 'ACTIVE',
              'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300': user.status === 'PENDING',
              'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300': user.status === 'BANNED',
            }"
          >
            {{ user.status }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
