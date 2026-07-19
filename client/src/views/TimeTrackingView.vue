<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import { timeTrackingApi, boardApi } from '@/api'
import {
  Timer, Play, Pause, Square, Plus, Clock, TrendingUp,
  Calendar, Download, Loader2, Coffee, Brain, Flame, Target
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const timeEntries = ref<any[]>([])
const runningTimer = ref<any>(null)
const elapsedTime = ref(0)
const timerInterval = ref<number | null>(null)

const newEntry = ref({
  taskTitle: '',
  boardId: '',
  duration: 30,
  description: '',
})

const boards = ref<any[]>([])

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const formatTimer = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const stats = computed(() => {
  const today = new Date().toDateString()
  const todayEntries = timeEntries.value.filter(e => new Date(e.date).toDateString() === today)
  const todayMinutes = todayEntries.reduce((sum, e) => sum + e.duration, 0)

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  const weekEntries = timeEntries.value.filter(e => new Date(e.date) >= weekStart)
  const weekMinutes = weekEntries.reduce((sum, e) => sum + e.duration, 0)

  const totalMinutes = timeEntries.value.reduce((sum, e) => sum + e.duration, 0)

  return [
    { label: t('timeTracking.today'), value: formatDuration(todayMinutes), icon: Clock, color: 'from-primary-500 to-primary-700' },
    { label: t('timeTracking.thisWeek'), value: formatDuration(weekMinutes), icon: TrendingUp, color: 'from-emerald-500 to-green-700' },
    { label: t('timeTracking.allTime'), value: formatDuration(totalMinutes), icon: Flame, color: 'from-violet-500 to-purple-700' },
    { label: t('timeTracking.avgDay'), value: formatDuration(Math.round(weekMinutes / 7)), icon: Target, color: 'from-cyan-500 to-blue-700' },
  ]
})

const groupedByDay = computed(() => {
  const groups: Record<string, any[]> = {}
  timeEntries.value.forEach(entry => {
    const dateKey = new Date(entry.date).toLocaleDateString(locale.value === 'tr' ? 'tr-TR' : 'en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(entry)
  })
  return groups
})

const startTimer = () => {
  if (!newEntry.value.taskTitle) return
  runningTimer.value = {
    taskTitle: newEntry.value.taskTitle,
    boardId: newEntry.value.boardId,
    startedAt: new Date(),
  }
  elapsedTime.value = 0
  timerInterval.value = window.setInterval(() => {
    elapsedTime.value++
  }, 1000)
}

const stopTimer = async () => {
  if (!runningTimer.value) return
  const minutes = Math.max(1, Math.round(elapsedTime.value / 60))
  try {
    const res = await timeTrackingApi.create({
      taskTitle: runningTimer.value.taskTitle,
      boardId: runningTimer.value.boardId || undefined,
      duration: minutes,
    })
    timeEntries.value.unshift(res.data.data)
  } catch {
    // fallback to local entry if API fails
    timeEntries.value.unshift({
      id: Date.now().toString(),
      taskTitle: runningTimer.value.taskTitle,
      boardId: runningTimer.value.boardId || null,
      duration: minutes,
      date: new Date().toISOString(),
      description: '',
    })
  }
  runningTimer.value = null
  elapsedTime.value = 0
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

const addManualEntry = async () => {
  if (!newEntry.value.taskTitle || newEntry.value.duration <= 0) return
  try {
    const res = await timeTrackingApi.create({
      taskTitle: newEntry.value.taskTitle,
      boardId: newEntry.value.boardId || undefined,
      duration: newEntry.value.duration,
      description: newEntry.value.description,
    })
    timeEntries.value.unshift(res.data.data)
  } catch {
    // fallback
    timeEntries.value.unshift({
      id: Date.now().toString(),
      taskTitle: newEntry.value.taskTitle,
      boardId: newEntry.value.boardId || null,
      duration: newEntry.value.duration,
      date: new Date().toISOString(),
      description: newEntry.value.description,
    })
  }
  newEntry.value = { taskTitle: '', boardId: '', duration: 30, description: '' }
}

const deleteEntry = async (id: string) => {
  try {
    await timeTrackingApi.delete(id)
  } catch {
    // proceed with local removal anyway
  }
  timeEntries.value = timeEntries.value.filter(e => e.id !== id)
}

const exportTimesheet = () => {
  const csv = ['Task,Duration (min),Date,Description']
  timeEntries.value.forEach(e => {
    csv.push(`"${e.taskTitle}",${e.duration},${new Date(e.date).toISOString()},"${e.description || ''}"`)
  })
  const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `timesheet-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  loading.value = true
  try {
    const [entriesRes, boardRes] = await Promise.all([
      timeTrackingApi.getAll(),
      boardApi.getAll(),
    ])
    timeEntries.value = entriesRes.data.data || []
    boards.value = boardRes.data.data || []
  } catch {
    // leave empty
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (timerInterval.value) clearInterval(timerInterval.value)
})
</script>

<template>
  <div class="min-h-screen p-4 sm:p-6 lg:p-8 relative z-10">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold flex items-center gap-2">
            <Timer :size="24" class="text-primary-500" />
            {{ t('timeTracking.title') }}
          </h1>
          <p class="text-sm text-surface-500 dark:text-surface-400 mt-1">
            {{ t('timeTracking.subtitle') }}
          </p>
        </div>
        <button @click="exportTimesheet" class="btn-ghost text-sm px-4 py-2 flex items-center gap-2">
          <Download :size="16" /> {{ t('timeTracking.export') }}
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div v-for="(stat, i) in stats" :key="i" class="glass-card p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0" :class="stat.color">
            <component :is="stat.icon" :size="20" class="text-white" />
          </div>
          <div>
            <p class="text-xl font-bold">{{ stat.value }}</p>
            <p class="text-xs text-surface-500">{{ stat.label }}</p>
          </div>
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <!-- Timer + Add entry -->
        <div class="lg:col-span-1 space-y-6">
          <!-- Live timer -->
          <div class="glass-card p-6 text-center">
            <h3 class="font-semibold mb-4 flex items-center justify-center gap-2">
              <Clock :size="18" class="text-primary-500" /> {{ t('timeTracking.timer') }}
            </h3>

            <div v-if="runningTimer" class="mb-4">
              <p class="text-xs text-surface-400 mb-1 truncate">{{ runningTimer.taskTitle }}</p>
              <p class="text-4xl font-bold font-mono gradient-text">{{ formatTimer(elapsedTime) }}</p>
            </div>
            <div v-else class="mb-4">
              <p class="text-4xl font-bold font-mono text-surface-300 dark:text-surface-600">00:00</p>
            </div>

            <div class="flex gap-2 justify-center">
              <button
                v-if="!runningTimer"
                @click="startTimer"
                :disabled="!newEntry.taskTitle"
                class="btn-glow px-6 py-2.5 flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <Play :size="16" /> {{ t('timeTracking.start') }}
              </button>
              <button
                v-else
                @click="stopTimer"
                class="px-6 py-2.5 rounded-xl bg-red-500 text-white font-semibold flex items-center gap-2 text-sm hover:bg-red-600 transition-colors"
              >
                <Square :size="16" /> {{ t('timeTracking.stop') }}
              </button>
            </div>
          </div>

          <!-- Add manual entry -->
          <div class="glass-card p-6">
            <h3 class="font-semibold mb-4 flex items-center gap-2">
              <Plus :size="18" class="text-primary-500" /> {{ t('timeTracking.addEntry') }}
            </h3>
            <div class="space-y-3">
              <input
                v-model="newEntry.taskTitle"
                type="text"
                :placeholder="t('timeTracking.taskTitle')"
                class="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              />
              <div class="flex gap-2">
                <input
                  v-model.number="newEntry.duration"
                  type="number"
                    :placeholder="t('timeTracking.minutes')"
                  class="flex-1 px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                />
                <span class="text-sm text-surface-400 self-center">min</span>
              </div>
              <textarea
                v-model="newEntry.description"
                :placeholder="t('timeTracking.description')"
                rows="2"
                class="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
              />
              <button @click="addManualEntry" class="w-full btn-ghost py-2.5 text-sm flex items-center justify-center gap-2">
                <Plus :size="16" /> {{ t('timeTracking.addEntry') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Time entries -->
        <div class="lg:col-span-2">
          <div class="glass-card p-6">
            <h3 class="font-semibold mb-4 flex items-center gap-2">
              <Calendar :size="18" class="text-primary-500" /> {{ t('timeTracking.timeEntries') }}
            </h3>

            <div v-if="loading" class="flex items-center justify-center py-12">
              <Loader2 :size="24" class="animate-spin text-primary-500" />
            </div>

            <div v-else-if="Object.keys(groupedByDay).length === 0" class="text-center py-12">
              <Clock :size="40" class="mx-auto text-surface-300 dark:text-surface-600 mb-3" />
              <p class="text-sm text-surface-400">{{ t('timeTracking.noEntries') }}</p>
            </div>

            <div v-else class="space-y-6 max-h-[600px] overflow-y-auto pr-2">
              <div v-for="(entries, day) in groupedByDay" :key="day">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-xs font-semibold text-surface-400 uppercase tracking-wide">{{ day }}</p>
                  <span class="text-xs font-bold text-primary-500">
                    {{ formatDuration(entries.reduce((s, e) => s + e.duration, 0)) }}
                  </span>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="entry in entries"
                    :key="entry.id"
                    class="flex items-center gap-3 p-3 rounded-xl glass-strong hover:shadow-md transition-all group"
                  >
                    <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0">
                      <Clock :size="16" class="text-white" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium truncate">{{ entry.taskTitle }}</p>
                      <p v-if="entry.description" class="text-xs text-surface-400 truncate">{{ entry.description }}</p>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <span class="text-sm font-bold text-primary-500">{{ formatDuration(entry.duration) }}</span>
                      <button
                        @click="deleteEntry(entry.id)"
                        class="p-1.5 rounded-lg text-surface-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Square :size="12" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
