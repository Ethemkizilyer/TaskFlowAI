<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { calendarApi, boardApi, taskApi } from '@/api'
import { useI18n } from 'vue-i18n'
import {
  ChevronLeft, ChevronRight, Clock, AlertCircle,
  CheckCircle, Circle, Calendar as CalendarIcon, LayoutDashboard,
  Loader2, Users, Filter, X, Plus, Flag
} from 'lucide-vue-next'

interface CalendarTask {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  boardId: string
  board: { id: string; title: string; color: string }
  assignee: { id: string; name: string; avatar: string } | null
}

const { t, locale } = useI18n()
const router = useRouter()

const currentDate = ref(new Date())
const tasks = ref<CalendarTask[]>([])
const loading = ref(true)
const error = ref('')
const selectedDayTasks = ref<CalendarTask[] | null>(null)
const selectedDate = ref<Date | null>(null)
const boardFilter = ref('')
const boards = ref<any[]>([])
const showCreateForm = ref(false)
const creating = ref(false)
const createError = ref('')
const newTask = ref({
  title: '',
  boardId: '',
  priority: 'MEDIUM',
  time: '09:00',
})

const monthNames = computed(() => {
  const names = locale.value === 'tr'
    ? ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return names
})

const dayNames = computed(() => {
  return locale.value === 'tr'
    ? ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
})

const currentMonthYear = computed(() => {
  return `${monthNames.value[currentDate.value.getMonth()]} ${currentDate.value.getFullYear()}`
})

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  let startDay = firstDay.getDay() - 1
  if (startDay < 0) startDay = 6

  const days: { date: Date | null; day: number; tasks: CalendarTask[]; isToday: boolean }[] = []

  for (let i = 0; i < startDay; i++) {
    days.push({ date: null, day: 0, tasks: [], isToday: false })
  }

  const today = new Date()
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d)
    const dayTasks = filteredTasks.value.filter(task => {
      if (!task.dueDate) return false
      const due = new Date(task.dueDate)
      return due.toDateString() === date.toDateString()
    })
    days.push({
      date,
      day: d,
      tasks: dayTasks,
      isToday: date.toDateString() === today.toDateString(),
    })
  }

  while (days.length % 7 !== 0) {
    days.push({ date: null, day: 0, tasks: [], isToday: false })
  }

  return days
})

const upcomingTasks = computed(() => {
  const now = new Date()
  return filteredTasks.value
    .filter(task => task.dueDate && new Date(task.dueDate) >= now && task.status !== 'DONE')
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 8)
})

const overdueTasks = computed(() => {
  const now = new Date()
  return filteredTasks.value.filter(task => {
    if (!task.dueDate) return false
    return new Date(task.dueDate) < now && task.status !== 'DONE'
  })
})

const monthTaskCount = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  return filteredTasks.value.filter(task => {
    if (!task.dueDate) return false
    const due = new Date(task.dueDate)
    return due.getFullYear() === year && due.getMonth() === month
  }).length
})

const openDayDetail = (dayTasks: CalendarTask[], date: Date | null) => {
  selectedDayTasks.value = dayTasks.length > 0 ? dayTasks : []
  selectedDate.value = date
  showCreateForm.value = false
  createError.value = ''
  newTask.value = { title: '', boardId: '', priority: 'MEDIUM', time: '09:00' }
}

const closeDayDetail = () => {
  selectedDayTasks.value = null
  selectedDate.value = null
  showCreateForm.value = false
}

const toggleCreateForm = () => {
  showCreateForm.value = !showCreateForm.value
  if (showCreateForm.value && boards.value.length > 0 && !newTask.value.boardId) {
    newTask.value.boardId = boards.value[0].id
  }
}

const createTask = async () => {
  if (!newTask.value.title.trim() || !newTask.value.boardId || !selectedDate.value) return
  creating.value = true
  createError.value = ''
  try {
    const date = new Date(selectedDate.value)
    const [hours, minutes] = newTask.value.time.split(':').map(Number)
    date.setHours(hours, minutes, 0, 0)
    await taskApi.create(newTask.value.boardId, {
      title: newTask.value.title.trim(),
      priority: newTask.value.priority,
      dueDate: date.toISOString(),
      status: 'TODO',
    })
    await loadTasks()
    showCreateForm.value = false
    newTask.value = { title: '', boardId: '', priority: 'MEDIUM', time: '09:00' }
    if (selectedDate.value) {
      const sd = selectedDate.value
      const dayTasks = tasks.value.filter(task => {
        if (!task.dueDate) return false
        return new Date(task.dueDate).toDateString() === sd.toDateString()
      })
      selectedDayTasks.value = dayTasks
    }
  } catch (e: any) {
    createError.value = e.response?.data?.error || 'Failed to create task'
  } finally {
    creating.value = false
  }
}

const selectedDateLabel = computed(() => {
  if (!selectedDate.value) return ''
  return selectedDate.value.toLocaleDateString(locale.value === 'tr' ? 'tr-TR' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
})

const prevMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
}

const nextMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
}

const goToday = () => {
  currentDate.value = new Date()
}

const statusConfig: Record<string, { icon: any; color: string; bg: string; dot: string }> = {
  TODO: { icon: Circle, color: 'text-surface-500', bg: 'bg-surface-400', dot: 'bg-surface-400' },
  IN_PROGRESS: { icon: AlertCircle, color: 'text-blue-500', bg: 'bg-blue-500', dot: 'bg-blue-500' },
  REVIEW: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500', dot: 'bg-yellow-500' },
  DONE: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500', dot: 'bg-emerald-500' },
}

const priorityConfig: Record<string, { border: string; label: string; bg: string }> = {
  LOW: { border: 'border-l-surface-300', label: 'text-surface-400', bg: 'bg-surface-100 dark:bg-surface-800' },
  MEDIUM: { border: 'border-l-blue-400', label: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20' },
  HIGH: { border: 'border-l-orange-400', label: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20' },
  URGENT: { border: 'border-l-red-500', label: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/20' },
}

const uniqueBoards = computed(() => {
  const boards = new Map<string, { id: string; title: string; color: string }>()
  tasks.value.forEach(task => {
    if (task.board && !boards.has(task.board.id)) {
      boards.set(task.board.id, task.board)
    }
  })
  return Array.from(boards.values())
})

const filteredTasks = computed(() => {
  if (!boardFilter.value) return tasks.value
  return tasks.value.filter(task => task.boardId === boardFilter.value)
})

const formatDate = (date: string) => {
  const d = new Date(date)
  return d.toLocaleDateString(locale.value === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const loadTasks = async () => {
  loading.value = true
  error.value = ''
  try {
    const [taskRes, boardRes] = await Promise.all([
      calendarApi.getTasks(),
      boardApi.getAll(),
    ])
    tasks.value = taskRes.data.data || []
    boards.value = boardRes.data.data || []
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Failed to load calendar tasks'
  } finally {
    loading.value = false
  }
}

onMounted(loadTasks)
</script>

<template>
  <div class="min-h-screen p-4 sm:p-6 lg:p-8 relative z-10">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon :size="24" class="text-primary-500" />
            {{ t('nav.calendar') || 'Calendar' }}
          </h1>
          <p class="text-sm text-surface-500 dark:text-surface-400 mt-1">
            {{ t('calendar.subtitle') }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button @click="goToday" class="btn-ghost text-sm px-4 py-2">{{ t('calendar.today') }}</button>
          <button @click="router.push('/')" class="btn-ghost text-sm px-4 py-2 flex items-center gap-2">
            <LayoutDashboard :size="16" /> {{ t('calendar.dashboard') }}
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <Loader2 :size="32" class="animate-spin text-primary-500 mb-3" />
        <p class="text-sm text-surface-400">{{ t('calendar.loading') }}</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="glass-card p-8 text-center">
        <AlertCircle :size="32" class="mx-auto text-red-500 mb-3" />
        <p class="text-sm text-red-500 mb-4">{{ error }}</p>
        <button @click="loadTasks" class="btn-ghost text-sm px-4 py-2">{{ t('calendar.retry') }}</button>
      </div>

      <!-- Calendar content -->
      <template v-else>
        <!-- Board filter -->
        <div v-if="uniqueBoards.length > 0" class="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <span class="text-xs font-medium text-surface-400 shrink-0 flex items-center gap-1">
            <Filter :size="12" /> {{ t('calendar.filter') }}:
          </span>
          <button
            @click="boardFilter = ''"
            class="px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0"
            :class="!boardFilter ? 'bg-primary-500 text-white' : 'glass-card text-surface-500 hover:text-primary-500'"
          >
            {{ t('calendar.allBoards') }} ({{ tasks.length }})
          </button>
          <button
            v-for="board in uniqueBoards"
            :key="board.id"
            @click="boardFilter = board.id"
            class="px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 flex items-center gap-1.5"
            :class="boardFilter === board.id ? 'bg-primary-500 text-white' : 'glass-card text-surface-500 hover:text-primary-500'"
          >
            <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: board.color }" />
            {{ board.title }}
          </button>
        </div>

        <div class="grid lg:grid-cols-3 gap-6">
          <!-- Calendar -->
          <div class="lg:col-span-2 glass-card p-6">
            <!-- Month navigation -->
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center gap-3">
                <h2 class="text-xl font-bold">{{ currentMonthYear }}</h2>
                <span class="text-xs font-medium text-surface-400 px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800">
                  {{ monthTaskCount }} {{ t('calendar.tasks') }}
                </span>
              </div>
              <div class="flex items-center gap-1">
                <button @click="prevMonth" class="btn-ghost p-2">
                  <ChevronLeft :size="20" />
                </button>
                <button @click="goToday" class="btn-ghost text-xs px-3 py-2">{{ t('calendar.today') }}</button>
                <button @click="nextMonth" class="btn-ghost p-2">
                  <ChevronRight :size="20" />
                </button>
              </div>
            </div>

            <!-- Day headers -->
            <div class="grid grid-cols-7 gap-1 mb-2">
              <div v-for="day in dayNames" :key="day" class="text-center text-xs font-semibold text-surface-400 py-2">
                {{ day }}
              </div>
            </div>

            <!-- Calendar grid -->
            <div class="grid grid-cols-7 gap-1">
              <div
                v-for="(day, i) in calendarDays"
                :key="i"
                class="min-h-[80px] sm:min-h-[100px] rounded-lg p-1.5 border transition-all"
                :class="[
                  day.date ? 'border-surface-100 dark:border-surface-800 hover:border-primary-300 dark:hover:border-primary-700 cursor-pointer' : 'border-transparent',
                  day.isToday ? 'bg-primary-50 dark:bg-primary-950/20 border-primary-300 dark:border-primary-700' : '',
                  day.tasks.length > 0 && !day.isToday ? 'bg-surface-50/50 dark:bg-surface-900/30' : ''
                ]"
                @click="day.date && openDayDetail(day.tasks, day.date)"
              >
                <template v-if="day.date">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-medium" :class="day.isToday ? 'text-primary-600 dark:text-primary-400' : 'text-surface-500'">
                      {{ day.day }}
                    </span>
                    <span v-if="day.tasks.length > 0" class="text-[9px] font-bold px-1.5 py-0.5 rounded-full" :class="day.isToday ? 'bg-primary-200 text-primary-700 dark:bg-primary-800 dark:text-primary-300' : 'bg-surface-200 text-surface-500 dark:bg-surface-700 dark:text-surface-300'">
                      {{ day.tasks.length }}
                    </span>
                  </div>
                  <div class="space-y-1">
                    <div
                      v-for="task in day.tasks.slice(0, 3)"
                      :key="task.id"
                      class="text-[10px] px-1.5 py-1 rounded truncate cursor-pointer hover:scale-105 transition-transform border-l-2"
                      :class="[
                        (priorityConfig[task.priority] || priorityConfig.LOW).border,
                        (priorityConfig[task.priority] || priorityConfig.LOW).bg
                      ]"
                      @click.stop="router.push(`/board/${task.boardId}`)"
                    >
                      <span class="flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ backgroundColor: task.board?.color || '#06b6d4' }" />
                        <span class="truncate">{{ task.title }}</span>
                      </span>
                    </div>
                    <div v-if="day.tasks.length > 3" class="text-[10px] text-surface-400 px-1.5 font-medium">
                      +{{ day.tasks.length - 3 }} {{ t('calendar.more') }}
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Overdue -->
            <div v-if="overdueTasks.length > 0" class="glass-card p-4 border-l-4 border-red-500">
              <h3 class="font-semibold text-sm mb-3 flex items-center gap-2 text-red-500">
                <AlertCircle :size="16" /> {{ t('calendar.overdue') }} ({{ overdueTasks.length }})
              </h3>
              <div class="space-y-2">
                <div
                  v-for="task in overdueTasks.slice(0, 5)"
                  :key="task.id"
                  class="text-xs p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 cursor-pointer hover:scale-[1.02] transition-transform"
                  @click="router.push(`/board/${task.boardId}`)"
                >
                  <div class="flex items-center gap-1.5 mb-1">
                    <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: task.board?.color || '#06b6d4' }" />
                    <p class="font-medium truncate flex-1">{{ task.title }}</p>
                  </div>
                  <p class="text-red-400 ml-3.5">{{ formatDate(task.dueDate!) }}</p>
                </div>
              </div>
            </div>

            <!-- Upcoming -->
            <div class="glass-card p-4">
              <h3 class="font-semibold text-sm mb-3 flex items-center gap-2">
                <Clock :size="16" class="text-primary-500" /> {{ t('calendar.upcoming') }}
              </h3>
              <div v-if="upcomingTasks.length === 0" class="text-xs text-surface-400 py-6 text-center">
                <CalendarIcon :size="24" class="mx-auto mb-2 opacity-30" />
                {{ t('calendar.noUpcoming') }}
              </div>
              <div class="space-y-2">
                <div
                  v-for="task in upcomingTasks"
                  :key="task.id"
                  class="flex items-start gap-2 text-xs p-2.5 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/30 cursor-pointer transition-colors"
                  @click="router.push(`/board/${task.boardId}`)"
                >
                  <div class="w-2 h-2 rounded-full mt-1.5 shrink-0" :class="(statusConfig[task.status] || statusConfig.TODO).dot" />
                  <div class="flex-1 min-w-0">
                    <p class="font-medium truncate">{{ task.title }}</p>
                    <div class="flex items-center gap-1.5 mt-0.5">
                      <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: task.board?.color || '#06b6d4' }" />
                      <p class="text-surface-400 truncate">{{ task.board?.title }}</p>
                    </div>
                    <p class="text-surface-400 mt-0.5">{{ formatDate(task.dueDate!) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Legend -->
            <div class="glass-card p-4">
              <h3 class="font-semibold text-sm mb-3">{{ t('calendar.legend') }}</h3>
              <div class="space-y-2">
                <div v-for="(cfg, key) in statusConfig" :key="key" class="flex items-center gap-2 text-xs">
                  <div class="w-3 h-3 rounded-full" :class="cfg.bg" />
                  <span class="text-surface-600 dark:text-surface-300">{{ t(`task.status.${key}`) }}</span>
                </div>
              </div>
              <div class="border-t border-surface-100 dark:border-surface-800 mt-3 pt-3 space-y-2">
                <div v-for="(cfg, key) in priorityConfig" :key="key" class="flex items-center gap-2 text-xs">
                  <div class="w-3 h-3 rounded border-l-2" :class="cfg.border" />
                  <span class="text-surface-600 dark:text-surface-300">{{ t(`task.priority.${key}`) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Day detail modal -->
    <Teleport to="body">
      <div
        v-if="selectedDayTasks !== null"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        @click.self="closeDayDetail"
      >
        <div class="glass-card p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-lg">
              {{ selectedDateLabel }}
            </h3>
            <button @click="closeDayDetail" class="btn-ghost p-1.5">
              <X :size="18" />
            </button>
          </div>

          <!-- Task list -->
          <div v-if="selectedDayTasks.length > 0" class="space-y-2 mb-4">
            <div
              v-for="task in selectedDayTasks"
              :key="task.id"
              class="p-3 rounded-xl border-l-2 cursor-pointer hover:scale-[1.02] transition-transform"
              :class="[
                (priorityConfig[task.priority] || priorityConfig.LOW).border,
                (priorityConfig[task.priority] || priorityConfig.LOW).bg
              ]"
              @click="router.push(`/board/${task.boardId}`); closeDayDetail()"
            >
              <div class="flex items-center justify-between mb-1">
                <p class="font-medium text-sm">{{ task.title }}</p>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" :class="(statusConfig[task.status] || statusConfig.TODO).bg + ' text-white'">
                  {{ t(`task.status.${task.status}`) }}
                </span>
              </div>
              <div class="flex items-center gap-2 text-xs text-surface-400">
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: task.board?.color || '#06b6d4' }" />
                  {{ task.board?.title }}
                </span>
                <span v-if="task.assignee" class="flex items-center gap-1">
                  <Users :size="10" /> {{ task.assignee.name }}
                </span>
                <span class="ml-auto">{{ formatDate(task.dueDate!) }}</span>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else class="text-center py-6 mb-4">
            <CalendarIcon :size="32" class="mx-auto text-surface-300 dark:text-surface-600 mb-2" />
            <p class="text-sm text-surface-400">{{ t('calendar.noTasks') }}</p>
          </div>

          <!-- Add task button -->
          <button
            v-if="!showCreateForm"
            @click="toggleCreateForm"
            class="w-full py-2.5 rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-400 hover:border-primary-400 hover:text-primary-500 transition-all flex items-center justify-center gap-2"
          >
            <Plus :size="16" /> {{ t('calendar.addTask') }}
          </button>

          <!-- Create task form -->
          <div v-if="showCreateForm" class="space-y-3 p-4 rounded-xl bg-surface-50 dark:bg-surface-800/30">
            <div class="flex items-center justify-between">
              <h4 class="font-semibold text-sm flex items-center gap-2">
                <Plus :size="14" class="text-primary-500" /> {{ t('calendar.newTask') }}
              </h4>
              <button @click="showCreateForm = false" class="btn-ghost p-1">
                <X :size="14" />
              </button>
            </div>

            <div v-if="createError" class="text-xs text-red-500 p-2 rounded-lg bg-red-50 dark:bg-red-950/20">
              {{ createError }}
            </div>

            <div>
              <label class="text-xs font-medium text-surface-500 mb-1 block">{{ t('calendar.taskTitle') }}</label>
              <input
                v-model="newTask.title"
                type="text"
                :placeholder="t('calendar.taskTitlePlaceholder')"
                class="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                @keydown.enter="createTask"
              />
            </div>

            <div>
              <label class="text-xs font-medium text-surface-500 mb-1 block">{{ t('nav.boards') }}</label>
              <select
                v-model="newTask.boardId"
                class="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              >
                <option v-for="board in boards" :key="board.id" :value="board.id">{{ board.title }}</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-medium text-surface-500 mb-1 block">{{ t('calendar.time') }}</label>
                <input
                  v-model="newTask.time"
                  type="time"
                  class="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                />
              </div>
              <div>
                <label class="text-xs font-medium text-surface-500 mb-1 block">{{ t('common.priority') }}</label>
                <select
                  v-model="newTask.priority"
                  class="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                >
                  <option value="LOW">{{ t('task.priority.LOW') }}</option>
                  <option value="MEDIUM">{{ t('task.priority.MEDIUM') }}</option>
                  <option value="HIGH">{{ t('task.priority.HIGH') }}</option>
                  <option value="URGENT">{{ t('task.priority.URGENT') }}</option>
                </select>
              </div>
            </div>

            <button
              @click="createTask"
              :disabled="creating || !newTask.title.trim() || !newTask.boardId"
              class="w-full btn-glow py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Loader2 v-if="creating" :size="14" class="animate-spin" />
              <Plus v-else :size="14" />
              {{ creating ? t('calendar.creating') : t('calendar.createTask') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
