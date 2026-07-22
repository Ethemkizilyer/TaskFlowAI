<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import { timeTrackingApi, boardApi } from '@/api'
import {
  Timer, Play, Pause, Square, Plus, Clock, TrendingUp,
  Calendar, Download, Loader2, Target, DollarSign,
  Tag as TagIcon, BarChart3, Edit3, Check, X, Filter
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const timeEntries = ref<any[]>([])
const boards = ref<any[]>([])
const statsData = ref<any>(null)

// Active timer state (persisted in DB)
const activeTimer = ref<any>(null)
const elapsedSeconds = ref(0)
const timerInterval = ref<number | null>(null)

// New entry form
const showAddForm = ref(false)
const newEntry = ref({
  taskTitle: '',
  boardId: '',
  duration: 30,
  description: '',
  billable: true,
  hourlyRate: 0,
  tags: [] as string[],
  tagInput: '',
})

// Timer form
const timerForm = ref({
  taskTitle: '',
  boardId: '',
  billable: true,
  hourlyRate: 0,
  tags: [] as string[],
  tagInput: '',
})

// Filters
const filters = ref({
  startDate: '',
  endDate: '',
  boardId: '',
  billable: '',
})

// Inline edit
const editingId = ref<string | null>(null)
const editEntry = ref<any>(null)

// ─── Helpers ───────────────────────────────────────────

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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat(locale.value === 'tr' ? 'tr-TR' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString(locale.value === 'tr' ? 'tr-TR' : 'en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

// ─── Stats ─────────────────────────────────────────────

const stats = computed(() => {
  if (!statsData.value) return []
  const s = statsData.value
  return [
    { label: t('timeTracking.today'), value: formatDuration(s.today), icon: Clock, color: 'from-primary-500 to-primary-700', sub: s.todayEarnings > 0 ? formatCurrency(s.todayEarnings) : '' },
    { label: t('timeTracking.thisWeek'), value: formatDuration(s.thisWeek), icon: TrendingUp, color: 'from-emerald-500 to-green-700', sub: s.weekEarnings > 0 ? formatCurrency(s.weekEarnings) : '' },
    { label: t('timeTracking.allTime'), value: formatDuration(s.allTime), icon: Target, color: 'from-violet-500 to-purple-700', sub: `${s.totalEntries || 0} ${t('timeTracking.entries')}` },
    { label: t('timeTracking.billable'), value: formatDuration(s.billableMinutes || 0), icon: DollarSign, color: 'from-amber-500 to-orange-700', sub: formatDuration(s.nonBillableMinutes || 0) + ' ' + t('timeTracking.nonBillable') },
  ]
})

const dailyChart = computed(() => {
  if (!statsData.value?.dailyBreakdown) return []
  const max = Math.max(...statsData.value.dailyBreakdown.map((d: any) => d.minutes), 1)
  return statsData.value.dailyBreakdown.map((d: any) => ({
    ...d,
    height: Math.round((d.minutes / max) * 100),
    label: new Date(d.date).toLocaleDateString(locale.value === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'short', day: 'numeric' }),
  }))
})

const boardBreakdown = computed(() => {
  if (!statsData.value?.boardBreakdown) return []
  const total = statsData.value.boardBreakdown.reduce((s: number, b: any) => s + b.totalMinutes, 0) || 1
  return statsData.value.boardBreakdown.map((b: any) => ({
    ...b,
    percent: Math.round((b.totalMinutes / total) * 100),
  }))
})

const tagBreakdown = computed(() => statsData.value?.tagBreakdown || [])

// ─── Grouped entries ───────────────────────────────────

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

// ─── Timer logic (DB-persisted) ────────────────────────

const startTimer = async () => {
  if (!timerForm.value.taskTitle) return
  try {
    const res = await timeTrackingApi.startTimer({
      taskTitle: timerForm.value.taskTitle,
      boardId: timerForm.value.boardId || undefined,
      billable: timerForm.value.billable,
      hourlyRate: timerForm.value.hourlyRate || undefined,
      tags: timerForm.value.tags,
    })
    activeTimer.value = res.data.data
    elapsedSeconds.value = 0
    timerInterval.value = window.setInterval(() => {
      elapsedSeconds.value++
    }, 1000)
    timerForm.value = { taskTitle: '', boardId: '', billable: true, hourlyRate: 0, tags: [], tagInput: '' }
  } catch {
    // ignore
  }
}

const stopTimer = async () => {
  if (!activeTimer.value) return
  try {
    const res = await timeTrackingApi.stopTimer()
    timeEntries.value.unshift(res.data.data)
    activeTimer.value = null
    elapsedSeconds.value = 0
    if (timerInterval.value) {
      clearInterval(timerInterval.value)
      timerInterval.value = null
    }
    await loadStats()
  } catch {
    // ignore
  }
}

const resumeTimerTick = () => {
  if (activeTimer.value?.startedAt) {
    elapsedSeconds.value = Math.floor((Date.now() - new Date(activeTimer.value.startedAt).getTime()) / 1000)
    timerInterval.value = window.setInterval(() => {
      elapsedSeconds.value++
    }, 1000)
  }
}

// ─── Tag management ────────────────────────────────────

const addTag = (target: 'timer' | 'entry') => {
  const ref = target === 'timer' ? timerForm : newEntry
  const input = ref.value.tagInput.trim()
  if (input && !ref.value.tags.includes(input)) {
    ref.value.tags.push(input)
  }
  ref.value.tagInput = ''
}

const removeTag = (target: 'timer' | 'entry', tag: string) => {
  const ref = target === 'timer' ? timerForm : newEntry
  ref.value.tags = ref.value.tags.filter((t: string) => t !== tag)
}

// ─── CRUD ──────────────────────────────────────────────

const addManualEntry = async () => {
  if (!newEntry.value.taskTitle || newEntry.value.duration <= 0) return
  try {
    const res = await timeTrackingApi.create({
      taskTitle: newEntry.value.taskTitle,
      boardId: newEntry.value.boardId || undefined,
      duration: newEntry.value.duration,
      description: newEntry.value.description,
      billable: newEntry.value.billable,
      hourlyRate: newEntry.value.hourlyRate || undefined,
      tags: newEntry.value.tags,
    })
    timeEntries.value.unshift(res.data.data)
    showAddForm.value = false
    await loadStats()
  } catch {
    // ignore
  }
  newEntry.value = { taskTitle: '', boardId: '', duration: 30, description: '', billable: true, hourlyRate: 0, tags: [], tagInput: '' }
}

const deleteEntry = async (id: string) => {
  try {
    await timeTrackingApi.delete(id)
  } catch {
    // proceed
  }
  timeEntries.value = timeEntries.value.filter(e => e.id !== id)
  await loadStats()
}

const startEdit = (entry: any) => {
  editingId.value = entry.id
  editEntry.value = { ...entry, tags: [...(entry.tags || [])] }
}

const saveEdit = async () => {
  if (!editEntry.value || !editingId.value) return
  try {
    const res = await timeTrackingApi.update(editingId.value, {
      taskTitle: editEntry.value.taskTitle,
      boardId: editEntry.value.boardId || null,
      duration: editEntry.value.duration,
      description: editEntry.value.description || null,
      billable: editEntry.value.billable,
      hourlyRate: editEntry.value.hourlyRate || null,
      tags: editEntry.value.tags,
    })
    const idx = timeEntries.value.findIndex(e => e.id === editingId.value)
    if (idx !== -1) timeEntries.value[idx] = res.data.data
    editingId.value = null
    editEntry.value = null
    await loadStats()
  } catch {
    // ignore
  }
}

const cancelEdit = () => {
  editingId.value = null
  editEntry.value = null
}

// ─── Export ────────────────────────────────────────────

const exportTimesheet = async () => {
  try {
    const params: any = {}
    if (filters.value.startDate) params.startDate = filters.value.startDate
    if (filters.value.endDate) params.endDate = filters.value.endDate
    const res = await timeTrackingApi.exportCsv(params)
    const blob = new Blob([res.data.data.csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timesheet-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    // ignore
  }
}

// ─── Data loading ──────────────────────────────────────

const loadEntries = async () => {
  const params: any = {}
  if (filters.value.startDate) params.startDate = filters.value.startDate
  if (filters.value.endDate) params.endDate = filters.value.endDate
  if (filters.value.boardId) params.boardId = filters.value.boardId
  if (filters.value.billable !== '') params.billable = filters.value.billable === 'true'
  const res = await timeTrackingApi.getAll(params)
  timeEntries.value = res.data.data || []
}

const loadStats = async () => {
  const params: any = {}
  if (filters.value.startDate) params.startDate = filters.value.startDate
  if (filters.value.endDate) params.endDate = filters.value.endDate
  const res = await timeTrackingApi.getStats(params)
  statsData.value = res.data.data
}

const applyFilters = async () => {
  loading.value = true
  try {
    await Promise.all([loadEntries(), loadStats()])
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

const clearFilters = () => {
  filters.value = { startDate: '', endDate: '', boardId: '', billable: '' }
  applyFilters()
}

// ─── Lifecycle ─────────────────────────────────────────

onMounted(async () => {
  loading.value = true
  try {
    const [entriesRes, boardRes, statsRes, activeRes] = await Promise.all([
      timeTrackingApi.getAll(),
      boardApi.getAll(),
      timeTrackingApi.getStats(),
      timeTrackingApi.getActiveTimer(),
    ])
    timeEntries.value = entriesRes.data.data || []
    boards.value = boardRes.data.data || []
    statsData.value = statsRes.data.data
    activeTimer.value = activeRes.data.data
    if (activeTimer.value) {
      resumeTimerTick()
    }
  } catch {
    // ignore
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
        <div class="flex items-center gap-2">
          <button @click="showAddForm = !showAddForm" class="btn-glow text-sm px-4 py-2 flex items-center gap-2">
            <Plus :size="16" /> {{ t('timeTracking.addEntry') }}
          </button>
          <button @click="exportTimesheet" class="btn-ghost text-sm px-4 py-2 flex items-center gap-2">
            <Download :size="16" /> {{ t('timeTracking.export') }}
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div v-for="(stat, i) in stats" :key="i" class="glass-card p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0" :class="stat.color">
            <component :is="stat.icon" :size="20" class="text-white" />
          </div>
          <div class="min-w-0">
            <p class="text-xl font-bold truncate">{{ stat.value }}</p>
            <p class="text-xs text-surface-500 truncate">{{ stat.label }}</p>
            <p v-if="stat.sub" class="text-xs text-primary-500 font-medium truncate">{{ stat.sub }}</p>
          </div>
        </div>
      </div>

      <!-- Charts row -->
      <div class="grid lg:grid-cols-3 gap-6 mb-6">
        <!-- Daily chart -->
        <div class="glass-card p-6 lg:col-span-2">
          <h3 class="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 :size="18" class="text-primary-500" /> {{ t('timeTracking.last14Days') }}
          </h3>
          <div v-if="dailyChart.length > 0" class="flex items-end gap-1 h-40">
            <div v-for="(d, i) in dailyChart" :key="i" class="flex-1 flex flex-col items-center gap-1 group">
              <div class="w-full relative flex items-end" style="height: 120px">
                <div class="w-full rounded-t-md bg-gradient-to-t from-primary-500 to-primary-400 transition-all group-hover:from-primary-600 group-hover:to-primary-500" :style="{ height: d.height + '%' }">
                  <div class="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold bg-surface-800 text-white px-2 py-1 rounded whitespace-nowrap">{{ formatDuration(d.minutes) }}</div>
                </div>
              </div>
              <span class="text-[10px] text-surface-400 truncate w-full text-center">{{ d.label }}</span>
            </div>
          </div>
          <div v-else class="text-center py-8 text-sm text-surface-400">{{ t('timeTracking.noData') }}</div>
        </div>

        <!-- Board breakdown -->
        <div class="glass-card p-6">
          <h3 class="font-semibold mb-4 flex items-center gap-2">
            <Target :size="18" class="text-primary-500" /> {{ t('timeTracking.boardBreakdown') }}
          </h3>
          <div v-if="boardBreakdown.length > 0" class="space-y-3">
            <div v-for="b in boardBreakdown" :key="b.boardId" class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="font-medium truncate">{{ b.title }}</span>
                <span class="text-surface-400">{{ formatDuration(b.totalMinutes) }}</span>
              </div>
              <div class="h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
                <div class="h-full rounded-full transition-all" :style="{ width: b.percent + '%', backgroundColor: b.color }" />
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-sm text-surface-400">{{ t('timeTracking.noData') }}</div>
        </div>
      </div>

      <!-- Tags breakdown -->
      <div v-if="tagBreakdown.length > 0" class="glass-card p-4 mb-6">
        <div class="flex flex-wrap gap-2">
          <div v-for="tag in tagBreakdown" :key="tag.tag" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-medium">
            <TagIcon :size="12" /> {{ tag.tag }} <span class="text-surface-400">{{ formatDuration(tag.minutes) }}</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="glass-card p-4 mb-6">
        <div class="flex flex-wrap items-end gap-3">
          <div class="flex items-center gap-2 text-sm text-surface-400">
            <Filter :size="16" /> {{ t('timeTracking.filters') }}
          </div>
          <div>
            <label class="text-xs text-surface-400 block mb-1">{{ t('timeTracking.startDate') }}</label>
            <input v-model="filters.startDate" type="date" class="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
          </div>
          <div>
            <label class="text-xs text-surface-400 block mb-1">{{ t('timeTracking.endDate') }}</label>
            <input v-model="filters.endDate" type="date" class="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
          </div>
          <div>
            <label class="text-xs text-surface-400 block mb-1">{{ t('timeTracking.board') }}</label>
            <select v-model="filters.boardId" class="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
              <option value="">{{ t('timeTracking.allBoards') }}</option>
              <option v-for="b in boards" :key="b.id" :value="b.id">{{ b.title }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-surface-400 block mb-1">{{ t('timeTracking.billable') }}</label>
            <select v-model="filters.billable" class="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
              <option value="">{{ t('timeTracking.all') }}</option>
              <option value="true">{{ t('timeTracking.billableOnly') }}</option>
              <option value="false">{{ t('timeTracking.nonBillableOnly') }}</option>
            </select>
          </div>
          <button @click="applyFilters" class="btn-glow text-sm px-4 py-1.5">{{ t('timeTracking.apply') }}</button>
          <button @click="clearFilters" class="btn-ghost text-sm px-4 py-1.5">{{ t('timeTracking.clear') }}</button>
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

            <div v-if="activeTimer" class="mb-4">
              <p class="text-xs text-surface-400 mb-1 truncate">{{ activeTimer.taskTitle }}</p>
              <p class="text-4xl font-bold font-mono gradient-text">{{ formatTimer(elapsedSeconds) }}</p>
              <div class="flex items-center justify-center gap-2 mt-2">
                <span v-if="activeTimer.billable" class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">{{ t('timeTracking.billable') }}</span>
                <span v-for="tag in (activeTimer.tags || [])" :key="tag" class="text-xs px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-500 font-medium">{{ tag }}</span>
              </div>
            </div>
            <div v-else class="mb-4">
              <p class="text-4xl font-bold font-mono text-surface-300 dark:text-surface-600">00:00</p>
            </div>

            <!-- Timer form (when no active timer) -->
            <div v-if="!activeTimer" class="space-y-3 mb-4 text-left">
              <input v-model="timerForm.taskTitle" type="text" :placeholder="t('timeTracking.taskTitle')" class="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
              <select v-model="timerForm.boardId" class="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                <option value="">{{ t('timeTracking.selectBoard') }}</option>
                <option v-for="b in boards" :key="b.id" :value="b.id">{{ b.title }}</option>
              </select>
              <div class="flex items-center gap-2">
                <label class="flex items-center gap-2 text-xs cursor-pointer">
                  <input v-model="timerForm.billable" type="checkbox" class="rounded" /> {{ t('timeTracking.billable') }}
                </label>
                <input v-if="timerForm.billable" v-model.number="timerForm.hourlyRate" type="number" :placeholder="t('timeTracking.hourlyRate')" class="flex-1 px-2 py-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
              </div>
              <div>
                <div class="flex flex-wrap gap-1 mb-1">
                  <span v-for="tag in timerForm.tags" :key="tag" class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-500">
                    {{ tag }} <button @click="removeTag('timer', tag)" class="hover:text-red-500"><X :size="10" /></button>
                  </span>
                </div>
                <div class="flex gap-1">
                  <input v-model="timerForm.tagInput" type="text" :placeholder="t('timeTracking.addTag')" class="flex-1 px-2 py-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/50" @keydown.enter.prevent="addTag('timer')" />
                  <button @click="addTag('timer')" class="btn-ghost px-2 py-1"><Plus :size="14" /></button>
                </div>
              </div>
            </div>

            <div class="flex gap-2 justify-center">
              <button v-if="!activeTimer" @click="startTimer" :disabled="!timerForm.taskTitle" class="btn-glow px-6 py-2.5 flex items-center gap-2 text-sm disabled:opacity-50">
                <Play :size="16" /> {{ t('timeTracking.start') }}
              </button>
              <button v-else @click="stopTimer" class="px-6 py-2.5 rounded-xl bg-red-500 text-white font-semibold flex items-center gap-2 text-sm hover:bg-red-600 transition-colors">
                <Square :size="16" /> {{ t('timeTracking.stop') }}
              </button>
            </div>
          </div>

          <!-- Add manual entry -->
          <div v-if="showAddForm" class="glass-card p-6">
            <h3 class="font-semibold mb-4 flex items-center gap-2">
              <Plus :size="18" class="text-primary-500" /> {{ t('timeTracking.addEntry') }}
            </h3>
            <div class="space-y-3">
              <input v-model="newEntry.taskTitle" type="text" :placeholder="t('timeTracking.taskTitle')" class="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
              <select v-model="newEntry.boardId" class="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                <option value="">{{ t('timeTracking.selectBoard') }}</option>
                <option v-for="b in boards" :key="b.id" :value="b.id">{{ b.title }}</option>
              </select>
              <div class="flex gap-2">
                <input v-model.number="newEntry.duration" type="number" :placeholder="t('timeTracking.minutes')" class="flex-1 px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
                <span class="text-sm text-surface-400 self-center">min</span>
              </div>
              <textarea v-model="newEntry.description" :placeholder="t('timeTracking.description')" rows="2" class="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none" />
              <div class="flex items-center gap-2">
                <label class="flex items-center gap-2 text-xs cursor-pointer">
                  <input v-model="newEntry.billable" type="checkbox" class="rounded" /> {{ t('timeTracking.billable') }}
                </label>
                <input v-if="newEntry.billable" v-model.number="newEntry.hourlyRate" type="number" :placeholder="t('timeTracking.hourlyRate')" class="flex-1 px-2 py-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
              </div>
              <div>
                <div class="flex flex-wrap gap-1 mb-1">
                  <span v-for="tag in newEntry.tags" :key="tag" class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-500">
                    {{ tag }} <button @click="removeTag('entry', tag)" class="hover:text-red-500"><X :size="10" /></button>
                  </span>
                </div>
                <div class="flex gap-1">
                  <input v-model="newEntry.tagInput" type="text" :placeholder="t('timeTracking.addTag')" class="flex-1 px-2 py-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/50" @keydown.enter.prevent="addTag('entry')" />
                  <button @click="addTag('entry')" class="btn-ghost px-2 py-1"><Plus :size="14" /></button>
                </div>
              </div>
              <button @click="addManualEntry" class="w-full btn-glow py-2.5 text-sm flex items-center justify-center gap-2">
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
                  <span class="text-xs font-bold text-primary-500">{{ formatDuration(entries.reduce((s, e) => s + e.duration, 0)) }}</span>
                </div>
                <div class="space-y-2">
                  <div v-for="entry in entries" :key="entry.id" class="flex items-center gap-3 p-3 rounded-xl glass-strong hover:shadow-md transition-all group">
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" :style="{ backgroundColor: entry.board?.color || '#06b6d4' }">
                      <Clock :size="16" class="text-white" />
                    </div>

                    <!-- Normal view -->
                    <div v-if="editingId !== entry.id" class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <p class="text-sm font-medium truncate">{{ entry.taskTitle }}</p>
                        <span v-if="entry.billable" class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium shrink-0">{{ t('timeTracking.billable') }}</span>
                      </div>
                      <div class="flex items-center gap-2 mt-0.5">
                        <p v-if="entry.board" class="text-xs text-surface-400 truncate">{{ entry.board.title }}</p>
                        <span v-for="tag in (entry.tags || [])" :key="tag" class="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-500/10 text-primary-500">{{ tag }}</span>
                      </div>
                      <p v-if="entry.description" class="text-xs text-surface-400 truncate mt-0.5">{{ entry.description }}</p>
                    </div>

                    <!-- Inline edit view -->
                    <div v-else class="flex-1 min-w-0 space-y-2">
                      <input v-model="editEntry.taskTitle" type="text" class="w-full px-2 py-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
                      <div class="flex gap-2">
                        <input v-model.number="editEntry.duration" type="number" class="w-20 px-2 py-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
                        <select v-model="editEntry.boardId" class="flex-1 px-2 py-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                          <option value="">—</option>
                          <option v-for="b in boards" :key="b.id" :value="b.id">{{ b.title }}</option>
                        </select>
                      </div>
                      <input v-model="editEntry.description" type="text" :placeholder="t('timeTracking.description')" class="w-full px-2 py-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
                      <label class="flex items-center gap-2 text-xs">
                        <input v-model="editEntry.billable" type="checkbox" class="rounded" /> {{ t('timeTracking.billable') }}
                      </label>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-1 shrink-0">
                      <template v-if="editingId === entry.id">
                        <button @click="saveEdit" class="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors">
                          <Check :size="14" />
                        </button>
                        <button @click="cancelEdit" class="p-1.5 rounded-lg text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                          <X :size="14" />
                        </button>
                      </template>
                      <template v-else>
                        <span class="text-sm font-bold text-primary-500 mr-1">{{ formatDuration(entry.duration) }}</span>
                        <button @click="startEdit(entry)" class="p-1.5 rounded-lg text-surface-300 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-colors opacity-0 group-hover:opacity-100">
                          <Edit3 :size="12" />
                        </button>
                        <button @click="deleteEntry(entry.id)" class="p-1.5 rounded-lg text-surface-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors opacity-0 group-hover:opacity-100">
                          <Square :size="12" />
                        </button>
                      </template>
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
