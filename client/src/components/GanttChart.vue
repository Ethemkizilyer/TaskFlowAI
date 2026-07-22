<script setup lang="ts">
import { computed, ref } from 'vue'
import { Calendar, AlertCircle } from 'lucide-vue-next'

interface GanttTask {
  id: string
  title: string
  status: string
  priority: string
  dueDate?: string | null
  createdAt: string
  assignee?: { name: string; avatar: string | null } | null
}

const props = defineProps<{ tasks: GanttTask[] }>()

const dayWidth = 32
const rowHeight = 36
const headerHeight = 40
const labelWidth = 200

const tasksWithDates = computed(() =>
  props.tasks
    .filter((t) => t.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
)

const hasData = computed(() => tasksWithDates.value.length > 0)

const dateRange = computed(() => {
  if (tasksWithDates.value.length === 0) return { start: new Date(), end: new Date(), days: 0 }
  let start = new Date(tasksWithDates.value[0].createdAt)
  let end = new Date(tasksWithDates.value[0].dueDate!)
  for (const t of tasksWithDates.value) {
    const c = new Date(t.createdAt)
    const d = new Date(t.dueDate!)
    if (c < start) start = c
    if (d > end) end = d
  }
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  end.setDate(end.getDate() + 1)
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return { start, end, days }
})

const totalWidth = computed(() => labelWidth + dateRange.value.days * dayWidth)
const totalHeight = computed(() => headerHeight + tasksWithDates.value.length * rowHeight)

const days = computed(() => {
  const result: { date: Date; label: string; isWeekend: boolean }[] = []
  const { start, days: count } = dateRange.value
  for (let i = 0; i < count; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const day = d.getDay()
    result.push({
      date: d,
      label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      isWeekend: day === 0 || day === 6,
    })
  }
  return result
})

function getTaskBarStyle(task: GanttTask) {
  const start = dateRange.value.start
  const taskStart = new Date(task.createdAt)
  taskStart.setHours(0, 0, 0, 0)
  const taskEnd = new Date(task.dueDate!)
  taskEnd.setHours(0, 0, 0, 0)

  const offsetDays = Math.max(0, Math.floor((taskStart.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  const durationDays = Math.max(1, Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)) + 1)

  return {
    left: `${labelWidth + offsetDays * dayWidth}px`,
    width: `${durationDays * dayWidth - 4}px`,
  }
}

const statusColors: Record<string, string> = {
  TODO: 'bg-slate-400',
  IN_PROGRESS: 'bg-blue-500',
  IN_REVIEW: 'bg-amber-500',
  DONE: 'bg-green-500',
}

const priorityBorders: Record<string, string> = {
  LOW: 'border-l-2 border-slate-300',
  MEDIUM: 'border-l-2 border-blue-400',
  HIGH: 'border-l-2 border-orange-400',
  URGENT: 'border-l-2 border-red-500',
}

const scrollContainer = ref<HTMLElement | null>(null)
</script>

<template>
  <div class="card p-6">
    <div class="flex items-center gap-2 mb-4">
      <Calendar :size="20" class="text-primary-500" />
      <h3 class="font-bold text-lg">Gantt Timeline</h3>
    </div>

    <div v-if="!hasData" class="flex flex-col items-center justify-center py-12 text-surface-400">
      <AlertCircle :size="32" class="mb-2" />
      <p class="text-sm">No tasks with due dates. Assign due dates to tasks to see them on the timeline.</p>
    </div>

    <div v-else ref="scrollContainer" class="overflow-x-auto">
      <div :style="{ width: `${totalWidth}px`, minWidth: '100%' }">
        <!-- Header -->
        <div class="flex sticky top-0 z-10 bg-surface-50 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700">
          <div
            class="shrink-0 border-r border-surface-200 dark:border-surface-700 flex items-center px-3 text-xs font-semibold text-surface-500"
            :style="{ width: `${labelWidth}px`, height: `${headerHeight}px` }"
          >
            Task
          </div>
          <div class="flex">
            <div
              v-for="day in days"
              :key="day.label"
              class="text-center text-[10px] text-surface-400 border-r border-surface-100 dark:border-surface-800"
              :class="{ 'bg-surface-100/50 dark:bg-surface-800/30': day.isWeekend }"
              :style="{ width: `${dayWidth}px`, height: `${headerHeight}px`, lineHeight: `${headerHeight}px` }"
            >
              {{ day.label }}
            </div>
          </div>
        </div>

        <!-- Rows -->
        <div
          v-for="(task, idx) in tasksWithDates"
          :key="task.id"
          class="flex border-b border-surface-100 dark:border-surface-800/50 hover:bg-surface-50 dark:hover:bg-surface-800/30"
          :style="{ height: `${rowHeight}px` }"
        >
          <!-- Task label -->
          <div
            class="shrink-0 border-r border-surface-200 dark:border-surface-700 flex items-center px-3 truncate text-xs"
            :style="{ width: `${labelWidth}px` }"
          >
            <span class="truncate" :class="{ 'line-through opacity-50': task.status === 'DONE' }">{{ task.title }}</span>
          </div>

          <!-- Timeline area -->
          <div class="relative flex-1" :style="{ width: `${days.length * dayWidth}px` }">
            <!-- Weekend columns -->
            <div class="absolute inset-0 flex pointer-events-none">
              <div
                v-for="day in days"
                :key="`bg-${day.label}`"
                :class="{ 'bg-surface-100/30 dark:bg-surface-800/20': day.isWeekend }"
                :style="{ width: `${dayWidth}px` }"
              />
            </div>

            <!-- Task bar -->
            <div
              class="absolute rounded text-white text-[10px] flex items-center px-2 truncate transition-opacity hover:opacity-90"
              :class="[statusColors[task.status] || 'bg-slate-400', priorityBorders[task.priority] || '']"
              :style="{
                ...getTaskBarStyle(task),
                top: '4px',
                height: `${rowHeight - 8}px`,
              }"
            >
              {{ task.title }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
