<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { dashboardApi, reportsApi } from '@/api'
import { useI18n } from 'vue-i18n'
import {
  TrendingUp, TrendingDown, CheckCircle, Clock, AlertCircle,
  Users, Target, Zap, Brain, Activity, Download, Calendar,
  BarChart3, PieChart, Timer, Flame
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const stats = ref<any>(null)
const timeRange = ref<'7d' | '30d' | '90d'>('30d')

const dayLabels = computed(() => {
  return locale.value === 'tr'
    ? ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
})

const maxActivity = computed(() => {
  if (!stats.value?.activityLast7Days) return 1
  return Math.max(...stats.value.activityLast7Days.map((d: any) => d.count), 1)
})

const totalTasks = computed(() => {
  if (!stats.value?.taskStatus) return 0
  return Object.values(stats.value.taskStatus).reduce((a: number, b: any) => a + b, 0)
})

const completionRate = computed(() => {
  if (!stats.value?.taskStatus || totalTasks.value === 0) return 0
  return Math.round((stats.value.taskStatus.DONE / totalTasks.value) * 100)
})

const statusBreakdown = computed(() => {
  if (!stats.value?.taskStatus) return []
  const colors: Record<string, string> = {
    TODO: '#94a3b8',
    IN_PROGRESS: '#3b82f6',
    REVIEW: '#eab308',
    DONE: '#10b981',
  }
  return Object.entries(stats.value.taskStatus).map(([key, value]: [string, any]) => ({
    label: t(`task.status.${key}`),
    value,
    color: colors[key] || '#94a3b8',
    percent: totalTasks.value > 0 ? Math.round((value / totalTasks.value) * 100) : 0,
  }))
})

const reportCards = computed(() => [
  {
    label: t('reports.totalTasks'),
    value: totalTasks.value,
    icon: Target,
    color: 'from-primary-500 to-primary-700',
  },
  {
    label: t('reports.completionRate'),
    value: `${completionRate.value}%`,
    icon: CheckCircle,
    color: 'from-emerald-500 to-green-700',
  },
  {
    label: t('reports.inProgress'),
    value: stats.value?.taskStatus?.IN_PROGRESS || 0,
    icon: Clock,
    color: 'from-blue-500 to-cyan-700',
  },
  {
    label: t('reports.overdue'),
    value: stats.value?.overdueTasks || 0,
    icon: AlertCircle,
    color: 'from-red-500 to-rose-700',
  },
])

const teamPerformance = ref<any[]>([])

const burndownData = computed(() => {
  const total = totalTasks.value || 0
  if (total === 0) return []
  const days = 14
  const data: { day: number; ideal: number; actual: number }[] = []
  const done = stats.value?.taskStatus?.DONE || 0
  for (let i = 0; i <= days; i++) {
    const ideal = Math.round(total * (1 - i / days))
    const progressFactor = done / total
    const actual = Math.max(0, Math.round(total * (1 - progressFactor * (i / days))))
    data.push({ day: i, ideal, actual })
  }
  return data
})

const maxBurndown = computed(() => {
  return Math.max(...burndownData.value.map(d => Math.max(d.ideal, d.actual)), 1)
})

const exportReport = () => {
  const dataStr = JSON.stringify(stats.value, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `taskflow-report-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  loading.value = true
  try {
    const [statsRes, teamRes] = await Promise.all([
      dashboardApi.getStats(),
      reportsApi.getTeamPerformance(),
    ])
    stats.value = statsRes.data.data
    teamPerformance.value = teamRes.data.data || []
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen p-4 sm:p-6 lg:p-8 relative z-10">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold flex items-center gap-2">
            <BarChart3 :size="24" class="text-primary-500" />
            {{ t('reports.title') }}
          </h1>
          <p class="text-sm text-surface-500 dark:text-surface-400 mt-1">
            {{ t('reports.subtitle') }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <div class="inline-flex glass-card p-1 rounded-lg">
            <button
              v-for="range in ['7d', '30d', '90d']"
              :key="range"
              @click="timeRange = range as any"
              class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
              :class="timeRange === range ? 'bg-primary-500 text-white' : 'text-surface-500'"
            >
              {{ range === '7d' ? t('reports.last7days') : range === '30d' ? t('reports.last30days') : t('reports.last90days') }}
            </button>
          </div>
          <button @click="exportReport" class="btn-ghost text-sm px-4 py-2 flex items-center gap-2">
            <Download :size="16" /> {{ t('reports.export') }}
          </button>
        </div>
      </div>

      <!-- Report cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div
          v-for="(card, i) in reportCards"
          :key="i"
          class="glass-card p-5 hover:shadow-xl transition-all"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center" :class="card.color">
              <component :is="card.icon" :size="20" class="text-white" />
            </div>
          </div>
          <p class="text-2xl font-bold">{{ card.value }}</p>
          <p class="text-xs text-surface-500 mt-1">{{ card.label }}</p>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-6 mb-6">
        <!-- Activity chart -->
        <div class="glass-card p-6">
          <h3 class="font-semibold mb-4 flex items-center gap-2">
            <Activity :size="18" class="text-primary-500" /> {{ t('reports.weeklyActivity') }}
          </h3>
          <div class="flex items-end justify-between gap-2 h-48">
            <div
              v-for="(day, i) in stats?.activityLast7Days || []"
              :key="i"
              class="flex-1 flex flex-col items-center gap-2"
            >
              <div class="w-full flex-1 flex items-end">
                <div
                  class="w-full rounded-t-lg bg-gradient-to-t from-primary-500 to-primary-400 transition-all hover:opacity-80 relative group"
                  :style="{ height: ((day.count / maxActivity) * 100) + '%' }"
                >
                  <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    {{ day.count }}
                  </span>
                </div>
              </div>
              <span class="text-xs text-surface-400">{{ dayLabels[Number(i) % 7] }}</span>
            </div>
          </div>
        </div>

        <!-- Status breakdown -->
        <div class="glass-card p-6">
          <h3 class="font-semibold mb-4 flex items-center gap-2">
            <PieChart :size="18" class="text-violet-500" /> {{ t('reports.taskStatusBreakdown') }}
          </h3>
          <div class="space-y-3">
            <div v-for="item in statusBreakdown" :key="item.label">
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-medium">{{ item.label }}</span>
                <span class="text-sm text-surface-400">{{ item.value }} ({{ item.percent }}%)</span>
              </div>
              <div class="h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-700"
                  :style="{ width: item.percent + '%', backgroundColor: item.color }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Burndown chart -->
      <div class="glass-card p-6 mb-6">
        <h3 class="font-semibold mb-4 flex items-center gap-2">
          <TrendingDown :size="18" class="text-emerald-500" /> {{ t('reports.burndownChart') }}
        </h3>
        <div class="relative h-64">
          <svg class="w-full h-full" viewBox="0 0 700 250" preserveAspectRatio="none">
            <!-- Grid lines -->
            <line v-for="i in 5" :key="'grid-' + i" :x1="0" :y1="(i - 1) * 50" :x2="700" :y2="(i - 1) * 50" stroke="currentColor" class="text-surface-200 dark:text-surface-700" stroke-width="1" stroke-dasharray="4 4" />
            <!-- Ideal line -->
            <polyline
              :points="burndownData.map((d, i) => `${(i / (burndownData.length - 1)) * 700},${250 - (d.ideal / maxBurndown) * 230}`).join(' ')"
              fill="none"
              stroke="#94a3b8"
              stroke-width="2"
              stroke-dasharray="6 4"
            />
            <!-- Actual line -->
            <polyline
              :points="burndownData.map((d, i) => `${(i / (burndownData.length - 1)) * 700},${250 - (d.actual / maxBurndown) * 230}`).join(' ')"
              fill="none"
              stroke="#06b6d4"
              stroke-width="3"
            />
            <!-- Actual area -->
            <polygon
              :points="`0,250 ${burndownData.map((d, i) => `${(i / (burndownData.length - 1)) * 700},${250 - (d.actual / maxBurndown) * 230}`).join(' ')} 700,250`"
              fill="url(#burndownGradient)"
              opacity="0.2"
            />
            <defs>
              <linearGradient id="burndownGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.3" />
                <stop offset="100%" stop-color="#06b6d4" stop-opacity="0" />
              </linearGradient>
            </defs>
          </svg>
          <div class="flex items-center gap-4 mt-2 text-xs">
            <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-surface-400"></span> {{ t('reports.ideal') }}</span>
            <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-primary-500"></span> {{ t('reports.actual') }}</span>
          </div>
        </div>
      </div>

      <!-- Team performance -->
      <div class="glass-card p-6">
        <h3 class="font-semibold mb-4 flex items-center gap-2">
          <Users :size="18" class="text-primary-500" /> {{ t('reports.teamPerformance') }}
        </h3>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-surface-200 dark:border-surface-800 text-left">
                <th class="pb-3 text-sm font-medium text-surface-400">{{ t('reports.member') }}</th>
                <th class="pb-3 text-sm font-medium text-surface-400">{{ t('task.status.TODO') }}</th>
                <th class="pb-3 text-sm font-medium text-surface-400">{{ t('reports.completed') }}</th>
                <th class="pb-3 text-sm font-medium text-surface-400">{{ t('reports.completionRate') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="member in teamPerformance"
                :key="member.name"
                class="border-b border-surface-100 dark:border-surface-800/50"
              >
                <td class="py-3">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold">
                      {{ member.name.split(' ').map((n: string) => n[0]).join('') }}
                    </div>
                    <span class="text-sm font-medium">{{ member.name }}</span>
                  </div>
                </td>
                <td class="py-3 text-sm">{{ member.tasks }}</td>
                <td class="py-3 text-sm">{{ member.completed }}</td>
                <td class="py-3">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden max-w-[120px]">
                      <div
                        class="h-full rounded-full transition-all"
                        :class="member.rate >= 80 ? 'bg-emerald-500' : member.rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'"
                        :style="{ width: member.rate + '%' }"
                      />
                    </div>
                    <span class="text-xs font-medium">{{ member.rate }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
