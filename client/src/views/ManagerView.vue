<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { adminApi } from '@/api'
import { Briefcase, Users, CheckSquare, TrendingUp } from 'lucide-vue-next'

const authStore = useAuthStore()
const stats = ref<any>({})
const loading = ref(true)

const fetchStats = async () => {
  try {
    const res = await adminApi.getStats()
    stats.value = res.data.data
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStats()
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
    <div class="flex items-center gap-3 mb-6">
      <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
        <Briefcase :size="20" class="text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <h1 class="text-2xl font-bold">Manager Panel</h1>
        <p class="text-sm text-surface-500">Team management and task oversight</p>
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
            <p class="text-xs text-surface-500">Team Members</p>
          </div>
        </div>
      </div>
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center">
            <CheckSquare :size="18" class="text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stats.totalTasks || 0 }}</p>
            <p class="text-xs text-surface-500">Total Tasks</p>
          </div>
        </div>
      </div>
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
            <TrendingUp :size="18" class="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stats.completedTasks || 0 }}</p>
            <p class="text-xs text-surface-500">Completed Tasks</p>
          </div>
        </div>
      </div>
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center">
            <Briefcase :size="18" class="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stats.totalBoards || 0 }}</p>
            <p class="text-xs text-surface-500">Active Projects</p>
          </div>
        </div>
      </div>
    </div>

    <div class="card p-6">
      <h2 class="font-semibold text-lg mb-2">Welcome, {{ authStore.user?.name }}</h2>
      <p class="text-sm text-surface-500">
        As a Manager, you can manage teams, create boards, assign tasks, and view team analytics.
        Use the navigation menu to access different sections of the application.
      </p>
    </div>
  </div>
</template>
