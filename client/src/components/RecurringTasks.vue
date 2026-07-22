<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { recurringTaskApi } from '@/api'
import {
  Repeat, Plus, X, Loader2, Trash2, Power, Calendar
} from 'lucide-vue-next'

const props = defineProps<{ boardId: string }>()

const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const showForm = ref(false)
const tasks = ref<any[]>([])

const form = ref({
  title: '',
  description: '',
  priority: 'MEDIUM',
  frequency: 'DAILY',
  interval: 1,
  nextRunAt: '',
})

const frequencyLabels: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
}

const priorityColors: Record<string, string> = {
  LOW: 'text-slate-500',
  MEDIUM: 'text-blue-500',
  HIGH: 'text-orange-500',
  URGENT: 'text-red-500',
}

async function fetchTasks() {
  loading.value = true
  error.value = null
  try {
    const res = await recurringTaskApi.getByBoard(props.boardId)
    tasks.value = res.data.data
  } catch (e: any) {
    error.value = e.message || 'Failed to load recurring tasks'
  } finally {
    loading.value = false
  }
}

async function createTask() {
  if (!form.value.title || !form.value.nextRunAt) return
  saving.value = true
  error.value = null
  try {
    await recurringTaskApi.create(props.boardId, form.value)
    form.value = { title: '', description: '', priority: 'MEDIUM', frequency: 'DAILY', interval: 1, nextRunAt: '' }
    showForm.value = false
    await fetchTasks()
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message
  } finally {
    saving.value = false
  }
}

async function toggleTask(id: string) {
  try {
    await recurringTaskApi.toggle(props.boardId, id)
    await fetchTasks()
  } catch (e: any) {
    error.value = e.message
  }
}

async function deleteTask(id: string) {
  try {
    await recurringTaskApi.delete(props.boardId, id)
    await fetchTasks()
  } catch (e: any) {
    error.value = e.message
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

watch(() => props.boardId, fetchTasks, { immediate: true })
</script>

<template>
  <div class="card p-6">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <Repeat :size="20" class="text-primary-500" />
        <h3 class="font-bold text-lg">Recurring Tasks</h3>
        <span v-if="tasks.length > 0" class="text-xs text-surface-500">({{ tasks.length }})</span>
      </div>
      <button @click="showForm = !showForm" class="btn-ghost p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800">
        <Plus :size="16" />
      </button>
    </div>

    <div v-if="error" class="text-xs text-red-500 mb-3">{{ error }}</div>

    <!-- Add form -->
    <div v-if="showForm" class="mb-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 space-y-3">
      <input
        v-model="form.title"
        type="text"
        placeholder="Task title"
        class="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent px-3 py-2"
      />
      <textarea
        v-model="form.description"
        placeholder="Description (optional)"
        rows="2"
        class="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent px-3 py-2"
      />
      <div class="grid grid-cols-2 gap-3">
        <select v-model="form.priority" class="text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent px-3 py-2">
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
        <select v-model="form.frequency" class="text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent px-3 py-2">
          <option value="DAILY">Daily</option>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
        </select>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-surface-500">Interval (every N periods)</label>
          <input v-model.number="form.interval" type="number" min="1" class="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent px-3 py-2 mt-1" />
        </div>
        <div>
          <label class="text-xs text-surface-500">First run</label>
          <input v-model="form.nextRunAt" type="datetime-local" class="w-full text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent px-3 py-2 mt-1" />
        </div>
      </div>
      <div class="flex gap-2">
        <button @click="createTask" :disabled="!form.title || !form.nextRunAt || saving" class="btn-primary px-4 py-2 text-sm">
          <Loader2 v-if="saving" :size="14" class="animate-spin" />
          Create
        </button>
        <button @click="showForm = false" class="btn-ghost px-4 py-2 text-sm">Cancel</button>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <Loader2 :size="20" class="animate-spin text-primary-500" />
    </div>

    <div v-else-if="tasks.length === 0 && !showForm" class="text-center py-8 text-sm text-surface-400">
      No recurring tasks. Click + to create one.
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50"
        :class="{ 'opacity-50': !task.isActive }"
      >
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{{ task.title }}</p>
          <div class="flex items-center gap-3 mt-0.5">
            <span class="text-xs" :class="priorityColors[task.priority]">{{ task.priority }}</span>
            <span class="text-xs text-surface-500">{{ frequencyLabels[task.frequency] }} (every {{ task.interval }})</span>
            <span class="flex items-center gap-1 text-xs text-surface-500">
              <Calendar :size="10" /> {{ formatDate(task.nextRunAt) }}
            </span>
          </div>
        </div>
        <button @click="toggleTask(task.id)" class="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg" :title="task.isActive ? 'Pause' : 'Activate'">
          <Power :size="14" :class="task.isActive ? 'text-green-500' : 'text-surface-400'" />
        </button>
        <button @click="deleteTask(task.id)" class="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg">
          <Trash2 :size="14" class="text-surface-400 hover:text-red-500" />
        </button>
      </div>
    </div>
  </div>
</template>
