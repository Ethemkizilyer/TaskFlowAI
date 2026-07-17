<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { adminApi } from '@/api'
import { UserCog, Users, CheckSquare, Activity } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
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
      <div class="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
        <UserCog :size="20" class="text-green-600 dark:text-green-400" />
      </div>
      <div>
        <h1 class="text-2xl font-bold">{{ t('panels.teamLeader.title') }}</h1>
        <p class="text-sm text-surface-500">{{ t('panels.teamLeader.subtitle') }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-950/40 flex items-center justify-center">
            <Users :size="18" class="text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stats.totalUsers || 0 }}</p>
            <p class="text-xs text-surface-500">{{ t('panels.teamLeader.teamMembers') }}</p>
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
            <p class="text-xs text-surface-500">{{ t('panels.teamLeader.teamTasks') }}</p>
          </div>
        </div>
      </div>
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
            <Activity :size="18" class="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stats.completedTasks || 0 }}</p>
            <p class="text-xs text-surface-500">{{ t('panels.teamLeader.completed') }}</p>
          </div>
        </div>
      </div>
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center">
            <UserCog :size="18" class="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stats.totalBoards || 0 }}</p>
            <p class="text-xs text-surface-500">{{ t('panels.teamLeader.teamBoards') }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="card p-6">
      <h2 class="font-semibold text-lg mb-2">{{ t('panels.teamLeader.welcome') }}, {{ authStore.user?.name }}</h2>
      <p class="text-sm text-surface-500">
        {{ t('panels.teamLeader.description') }}
      </p>
    </div>
  </div>
</template>
