<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { userApi } from '@/api'
import { useI18n } from 'vue-i18n'
import {
  Activity, Loader2, Plus, Edit, Trash2, Move, MessageSquare,
  UserPlus, Bot, CheckCircle, Clock
} from 'lucide-vue-next'

const { t, locale } = useI18n()

const loading = ref(true)
const activities = ref<any[]>([])
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)

const activityIcons: Record<string, any> = {
  TASK_CREATED: Plus,
  TASK_UPDATED: Edit,
  TASK_DELETED: Trash2,
  TASK_MOVED: Move,
  COMMENT_ADDED: MessageSquare,
  MEMBER_ADDED: UserPlus,
  BOARD_CREATED: CheckCircle,
  AI_SUGGESTION: Bot,
}

const activityColors: Record<string, string> = {
  TASK_CREATED: 'text-green-500 bg-green-50 dark:bg-green-950/30',
  TASK_UPDATED: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30',
  TASK_DELETED: 'text-red-500 bg-red-50 dark:bg-red-950/30',
  TASK_MOVED: 'text-orange-500 bg-orange-50 dark:bg-orange-950/30',
  COMMENT_ADDED: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30',
  MEMBER_ADDED: 'text-primary-500 bg-primary-50 dark:bg-primary-950/30',
  BOARD_CREATED: 'text-teal-500 bg-teal-50 dark:bg-teal-950/30',
  AI_SUGGESTION: 'text-pink-500 bg-pink-50 dark:bg-pink-950/30',
}

const formatTime = (date: string) => {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return t('activity.justNow')
  if (mins < 60) return t('activity.minutesAgo', { count: mins })
  if (hours < 24) return t('activity.hoursAgo', { count: hours })
  if (days < 7) return t('activity.daysAgo', { count: days })
  return d.toLocaleDateString(locale.value)
}

const fetchActivity = async () => {
  loading.value = true
  try {
    const res = await userApi.getActivity(page.value, 30)
    activities.value = res.data.data
    totalPages.value = res.data.meta?.totalPages || 1
    total.value = res.data.meta?.total || 0
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  if (page.value < totalPages.value) {
    page.value++
    fetchActivity()
  }
}

onMounted(() => {
  fetchActivity()
})
</script>

<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-950">
    <div class="max-w-3xl mx-auto p-4 sm:p-6">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center">
          <Activity :size="20" class="text-primary-600" />
        </div>
        <div>
          <h1 class="text-xl font-bold">{{ t('activity.feedTitle') }}</h1>
          <p class="text-sm text-surface-500">{{ t('activity.feedSubtitle') }}</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading && activities.length === 0" class="flex justify-center py-12">
        <Loader2 :size="24" class="animate-spin text-primary-500" />
      </div>

      <!-- Empty -->
      <div v-else-if="activities.length === 0" class="card p-12 text-center">
        <Clock :size="48" class="mx-auto text-surface-300 dark:text-surface-600 mb-3" />
        <p class="text-surface-500">{{ t('activity.noActivity') }}. {{ t('activity.noActivityHint') }}</p>
      </div>

      <!-- Activity timeline -->
      <div v-else class="space-y-2">
        <div
          v-for="item in activities"
          :key="item.id"
          class="card p-4 flex items-start gap-3"
        >
          <div
            class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            :class="activityColors[item.type] || 'text-surface-400 bg-surface-100 dark:bg-surface-800'"
          >
            <component :is="activityIcons[item.type] || Activity" :size="16" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <img
                v-if="item.user?.avatar"
                :src="item.user.avatar"
                :alt="item.user.name"
                class="w-5 h-5 rounded-full bg-surface-200"
              />
              <span class="text-sm font-medium">{{ item.user?.name || t('common.unknown') }}</span>
            </div>
            <p class="text-sm text-surface-600 dark:text-surface-300 mt-1">{{ item.description }}</p>
            <div class="flex items-center gap-3 mt-2">
              <span class="text-xs text-surface-400">{{ formatTime(item.createdAt) }}</span>
              <span
                v-if="item.board"
                class="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300"
              >
                {{ item.board.title }}
              </span>
            </div>
          </div>
        </div>

        <!-- Load more -->
        <div v-if="page < totalPages" class="text-center pt-4">
          <button @click="loadMore" class="btn-secondary">
            {{ t('activity.loadMore', { remaining: total - activities.length }) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
