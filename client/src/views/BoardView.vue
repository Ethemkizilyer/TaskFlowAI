<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBoardStore } from '@/stores/board'
import { useAuthStore } from '@/stores/auth'
import { aiApi } from '@/api'
import { joinBoard, leaveBoard } from '@/api/socket'
import {
  ArrowLeft, Plus, Sparkles, X, Loader2, Brain, TrendingDown,
  AlertTriangle, Lightbulb, MessageSquare, Trash2, Clock, Tag, User, Send, Bot,
  Users, Search, Crown, Shield, Eye, UserMinus, UserPlus
} from 'lucide-vue-next'
import type { Task, TaskPriority, Column } from '@/types'

const route = useRoute()
const router = useRouter()
const boardStore = useBoardStore()
const authStore = useAuthStore()

const boardId = route.params.id as string

const showTaskModal = ref(false)
const editingTask = ref<Task | null>(null)
const newTaskTitle = ref('')
const newTaskColumnId = ref<string | null>(null)
const newTaskPriority = ref<TaskPriority>('MEDIUM')
const newTaskDescription = ref('')
const newTaskTags = ref<string[]>([])
const newTaskAssigneeId = ref<string | null>(null)
const saving = ref(false)

const showAIAnalysis = ref(false)
const aiAnalysis = ref<any>(null)
const aiLoading = ref(false)

const showAIGenerate = ref(false)
const aiGenerateInput = ref('')
const aiGenerating = ref(false)

const commentText = ref('')
const aiSuggestingPriority = ref(false)
const aiSuggestingTags = ref(false)

const dragData = ref<{ taskId: string; fromColumn: string } | null>(null)
const dragOverColumn = ref<string | null>(null)

const showMembers = ref(false)
const searchQuery = ref('')
const filterPriority = ref<string>('')
const filterTag = ref<string>('')
const filterAssignee = ref<string>('')
const showSearch = ref(false)

const allTags = computed(() => {
  const tags = new Set<string>()
  board.value?.tasks?.forEach((t: Task) => t.tags.forEach((tag: string) => tags.add(tag)))
  return Array.from(tags)
})

const boardMembers = computed(() => board.value?.members || [])

const filteredTasks = computed(() => {
  if (!board.value?.tasks) return []
  let tasks = board.value.tasks
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    tasks = tasks.filter((t: Task) => t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q))
  }
  if (filterPriority.value) {
    tasks = tasks.filter((t: Task) => t.priority === filterPriority.value)
  }
  if (filterTag.value) {
    tasks = tasks.filter((t: Task) => t.tags.includes(filterTag.value))
  }
  if (filterAssignee.value) {
    tasks = tasks.filter((t: Task) => t.assigneeId === filterAssignee.value)
  }
  return tasks
})

const filteredTaskIds = computed(() => new Set(filteredTasks.value.map((t: Task) => t.id)))

const isBoardOwner = computed(() => board.value?.ownerId === authStore.user?.id)

const memberRoleColors: Record<string, string> = {
  OWNER: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-300',
  ADMIN: 'text-primary-600 bg-primary-50 dark:bg-primary-950/30 dark:text-primary-300',
  MEMBER: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300',
  VIEWER: 'text-surface-500 bg-surface-100 dark:bg-surface-800',
}

const memberRoleIcons: Record<string, any> = {
  OWNER: Crown,
  ADMIN: Shield,
  MEMBER: User,
  VIEWER: Eye,
}

onMounted(async () => {
  await boardStore.fetchBoard(boardId)
  joinBoard(boardId)
})

onUnmounted(() => {
  leaveBoard(boardId)
})

const board = computed(() => boardStore.currentBoard)
const columns = computed(() => boardStore.columns)
const tasksByColumn = computed(() => boardStore.tasksByColumn)

const priorityColors: Record<TaskPriority, string> = {
  LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
}

const priorityBorder: Record<TaskPriority, string> = {
  LOW: 'border-l-blue-400',
  MEDIUM: 'border-l-yellow-400',
  HIGH: 'border-l-orange-400',
  URGENT: 'border-l-red-400',
}

const openCreateTask = (columnId: string | null) => {
  editingTask.value = null
  newTaskTitle.value = ''
  newTaskDescription.value = ''
  newTaskTags.value = []
  newTaskAssigneeId.value = null
  newTaskPriority.value = 'MEDIUM'
  newTaskColumnId.value = columnId
  showTaskModal.value = true
}

const openEditTask = (task: Task) => {
  editingTask.value = task
  newTaskTitle.value = task.title
  newTaskDescription.value = task.description || ''
  newTaskTags.value = [...task.tags]
  newTaskPriority.value = task.priority
  newTaskAssigneeId.value = task.assigneeId || null
  newTaskColumnId.value = task.columnId
  showTaskModal.value = true
}

const saveTask = async () => {
  if (!newTaskTitle.value.trim()) return
  saving.value = true
  try {
    if (editingTask.value) {
      await boardStore.updateTask(boardId, editingTask.value.id, {
        title: newTaskTitle.value,
        description: newTaskDescription.value,
        priority: newTaskPriority.value,
        tags: newTaskTags.value,
        columnId: newTaskColumnId.value,
        assigneeId: newTaskAssigneeId.value,
      })
    } else {
      await boardStore.createTask(boardId, {
        title: newTaskTitle.value,
        description: newTaskDescription.value,
        priority: newTaskPriority.value,
        tags: newTaskTags.value,
        columnId: newTaskColumnId.value,
        assigneeId: newTaskAssigneeId.value,
      })
    }
    showTaskModal.value = false
  } catch (e) {
    console.error(e)
  } finally {
    saving.value = false
  }
}

const deleteTask = async (task: Task) => {
  if (!confirm('Delete this task?')) return
  await boardStore.deleteTask(boardId, task.id)
  showTaskModal.value = false
}

const onDragStart = (taskId: string, columnId: string) => {
  dragData.value = { taskId, fromColumn: columnId }
}

const onDragEnd = async (targetColumnId: string) => {
  if (!dragData.value) return
  const { taskId, fromColumn } = dragData.value
  const tasks = tasksByColumn.value[targetColumnId] || []
  const newIndex = tasks.length

  if (fromColumn !== targetColumnId) {
    try {
      await boardStore.moveTask(boardId, taskId, targetColumnId, newIndex)
    } catch (e) {
      console.error('Move failed:', e)
      await boardStore.fetchBoard(boardId)
    }
  }
  dragData.value = null
  dragOverColumn.value = null
}

const onDragOver = (columnId: string) => {
  dragOverColumn.value = columnId
}

const onDragLeave = () => {
  dragOverColumn.value = null
}

const addComment = async (task: Task) => {
  if (!commentText.value.trim()) return
  await boardStore.addComment(boardId, task.id, commentText.value)
  commentText.value = ''
}

const handleAISuggestPriority = async () => {
  if (!newTaskTitle.value.trim()) return
  aiSuggestingPriority.value = true
  try {
    const res = await aiApi.suggestPriority(newTaskTitle.value, newTaskDescription.value)
    newTaskPriority.value = res.data.data.priority as TaskPriority
  } catch (e) {
    console.error(e)
  } finally {
    aiSuggestingPriority.value = false
  }
}

const handleAISuggestTags = async () => {
  if (!newTaskTitle.value.trim()) return
  aiSuggestingTags.value = true
  try {
    const res = await aiApi.suggestTags(newTaskTitle.value, newTaskDescription.value)
    newTaskTags.value = res.data.data.tags
  } catch (e) {
    console.error(e)
  } finally {
    aiSuggestingTags.value = false
  }
}

const handleAIAnalyze = async () => {
  aiLoading.value = true
  showAIAnalysis.value = true
  try {
    const res = await aiApi.analyzeBoard(boardId)
    aiAnalysis.value = res.data.data
  } catch (e) {
    console.error(e)
    aiAnalysis.value = { summary: 'AI analysis unavailable', recommendations: [], riskTasks: [] }
  } finally {
    aiLoading.value = false
  }
}

const handleAIGenerate = async () => {
  if (!aiGenerateInput.value.trim()) return
  aiGenerating.value = true
  try {
    const res = await aiApi.generateTask(aiGenerateInput.value)
    const task = res.data.data
    newTaskTitle.value = task.title
    newTaskDescription.value = task.description
    newTaskPriority.value = task.priority as TaskPriority
    newTaskTags.value = task.tags
    showAIGenerate.value = false
    aiGenerateInput.value = ''
    showTaskModal.value = true
  } catch (e) {
    console.error(e)
  } finally {
    aiGenerating.value = false
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const clearFilters = () => {
  searchQuery.value = ''
  filterPriority.value = ''
  filterTag.value = ''
  filterAssignee.value = ''
}

const hasActiveFilters = computed(() => {
  return searchQuery.value.trim() || filterPriority.value || filterTag.value || filterAssignee.value
})
</script>

<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-950">
    <!-- Header -->
    <header class="glass sticky top-0 z-30 border-b border-surface-200 dark:border-surface-800">
      <div class="px-4 sm:px-6 py-3">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <button @click="router.push('/')" class="btn-ghost p-2 shrink-0">
              <ArrowLeft :size="18" />
            </button>
            <div class="min-w-0">
              <h1 class="text-lg font-semibold truncate">{{ board?.title || 'Loading...' }}</h1>
              <p class="text-xs text-surface-500 dark:text-surface-400 truncate">{{ board?.description }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <div v-if="board?.members?.length" class="flex -space-x-2 cursor-pointer" @click="showMembers = true">
              <img v-for="member in board.members.slice(0, 5)" :key="member.id" :src="member.user.avatar || ''" :alt="member.user.name" class="w-8 h-8 rounded-full border-2 border-white dark:border-surface-900 bg-surface-200" :title="member.user.name" />
              <div v-if="board.members.length > 5" class="w-8 h-8 rounded-full border-2 border-white dark:border-surface-900 bg-surface-200 flex items-center justify-center text-xs font-medium text-surface-600">
                +{{ board.members.length - 5 }}
              </div>
            </div>
            <button @click="showSearch = !showSearch" class="btn-ghost p-2" title="Search & Filter">
              <Search :size="18" />
            </button>
            <button @click="showMembers = true" class="btn-ghost p-2" title="Members">
              <Users :size="18" />
            </button>
            <button @click="handleAIAnalyze" class="btn-primary text-xs" title="AI Board Analysis">
              <Brain :size="16" />
              <span class="hidden sm:inline">AI Insights</span>
            </button>
          </div>
        </div>

        <!-- Search & Filter Bar -->
        <div v-if="showSearch" class="mt-3 flex flex-wrap items-center gap-2 pb-1">
          <div class="relative flex-1 min-w-[200px]">
            <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input v-model="searchQuery" type="text" placeholder="Search tasks..." class="input pl-9 py-1.5 text-sm" />
          </div>
          <select v-model="filterPriority" class="input py-1.5 text-sm w-auto">
            <option value="">All Priority</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
          <select v-if="allTags.length" v-model="filterTag" class="input py-1.5 text-sm w-auto">
            <option value="">All Tags</option>
            <option v-for="tag in allTags" :key="tag" :value="tag">{{ tag }}</option>
          </select>
          <select v-model="filterAssignee" class="input py-1.5 text-sm w-auto">
            <option value="">All Assignees</option>
            <option v-for="member in boardMembers" :key="member.userId" :value="member.userId">{{ member.user.name }}</option>
          </select>
          <button v-if="hasActiveFilters" @click="clearFilters" class="btn-ghost p-1.5 text-xs text-red-500">
            <X :size="14" /> Clear
          </button>
          <span v-if="hasActiveFilters" class="text-xs text-surface-500">
            {{ filteredTasks.length }} result(s)
          </span>
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="boardStore.loading && !board" class="flex items-center justify-center h-[60vh]">
      <Loader2 :size="32" class="animate-spin text-primary-500" />
    </div>

    <!-- Board -->
    <div v-else class="p-4 sm:p-6 overflow-x-auto">
      <div class="flex gap-4 min-w-max pb-4">
        <div
          v-for="column in columns"
          :key="column.id"
          class="w-72 shrink-0"
        >
          <!-- Column Header -->
          <div class="flex items-center justify-between mb-3 px-1">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-sm">{{ column.title }}</span>
              <span class="badge bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400">
                {{ (tasksByColumn[column.id] || []).length }}
              </span>
            </div>
            <button @click="openCreateTask(column.id)" class="btn-ghost p-1">
              <Plus :size="16" />
            </button>
          </div>

          <!-- Tasks -->
          <div
            :data-column-id="column.id"
            class="bg-surface-100/50 dark:bg-surface-900/50 rounded-xl p-2 min-h-[200px] transition-colors"
            :class="{ 'ring-2 ring-primary-400': dragOverColumn === column.id }"
            @dragover.prevent="onDragOver(column.id)"
            @dragleave="onDragLeave"
            @drop.prevent="onDragEnd(column.id)"
          >
            <div class="space-y-2 min-h-[100px]">
              <div
                v-for="task in (tasksByColumn[column.id] || [])"
                :key="task.id"
                draggable="true"
                @dragstart="onDragStart(task.id, column.id)"
                @click="openEditTask(task)"
                class="card p-3 cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 group"
                :class="[priorityBorder[task.priority], { 'opacity-30': hasActiveFilters && !filteredTaskIds.has(task.id) }]"
              >
                <div class="flex items-start justify-between gap-2 mb-2">
                  <span class="text-sm font-medium line-clamp-2">{{ task.title }}</span>
                  <span v-if="task.aiGenerated" class="shrink-0" title="AI generated">
                    <Bot :size="14" class="text-primary-500" />
                  </span>
                </div>

                <p v-if="task.description" class="text-xs text-surface-500 dark:text-surface-400 line-clamp-2 mb-2">{{ task.description }}</p>

                <div class="flex flex-wrap gap-1 mb-2" v-if="task.tags.length">
                  <span v-for="tag in task.tags.slice(0, 3)" :key="tag" class="badge bg-primary-50 text-primary-600 dark:bg-primary-950/30 dark:text-primary-300">
                    {{ tag }}
                  </span>
                </div>

                <div class="flex items-center justify-between">
                  <span class="badge" :class="priorityColors[task.priority]">{{ task.priority }}</span>
                  <div class="flex items-center gap-2">
                    <span v-if="task.comments.length" class="flex items-center gap-1 text-xs text-surface-400">
                      <MessageSquare :size="12" /> {{ task.comments.length }}
                    </span>
                    <img v-if="task.assignee?.avatar" :src="task.assignee.avatar" :alt="task.assignee.name" class="w-6 h-6 rounded-full bg-surface-200" :title="task.assignee.name" />
                  </div>
                </div>
              </div>
            </div>

            <button @click="openCreateTask(column.id)" class="w-full mt-2 py-2 text-xs text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors flex items-center justify-center gap-1">
              <Plus :size="14" /> Add Task
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- AI Generate FAB -->
    <button
      @click="showAIGenerate = true"
      class="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30 hover:bg-primary-700 transition-all hover:scale-110 flex items-center justify-center"
      title="AI Generate Task"
    >
      <Sparkles :size="24" />
    </button>

    <!-- AI Analysis Panel -->
    <div v-if="showAIAnalysis" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" @click.self="showAIAnalysis = false">
      <div class="card p-6 w-full max-w-lg animate-scale-in max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <Brain :size="20" class="text-primary-500" />
            <h2 class="text-lg font-semibold">AI Board Analysis</h2>
          </div>
          <button @click="showAIAnalysis = false" class="btn-ghost p-1"><X :size="18" /></button>
        </div>

        <div v-if="aiLoading" class="flex flex-col items-center py-12">
          <Loader2 :size="32" class="animate-spin text-primary-500 mb-3" />
          <p class="text-sm text-surface-500">Analyzing your board...</p>
        </div>

        <div v-else-if="aiAnalysis" class="space-y-4">
          <div class="p-4 rounded-lg bg-primary-50 dark:bg-primary-950/30">
            <p class="text-sm">{{ aiAnalysis.summary }}</p>
          </div>

          <div v-if="aiAnalysis.recommendations.length">
            <h3 class="text-sm font-semibold flex items-center gap-2 mb-2"><Lightbulb :size="16" class="text-yellow-500" /> Recommendations</h3>
            <ul class="space-y-2">
              <li v-for="(rec, i) in aiAnalysis.recommendations" :key="i" class="text-sm text-surface-600 dark:text-surface-300 flex gap-2">
                <span class="text-primary-500">•</span> {{ rec }}
              </li>
            </ul>
          </div>

          <div v-if="aiAnalysis.riskTasks.length">
            <h3 class="text-sm font-semibold flex items-center gap-2 mb-2"><AlertTriangle :size="16" class="text-red-500" /> At-Risk Tasks</h3>
            <div class="space-y-1">
              <div v-for="(task, i) in aiAnalysis.riskTasks" :key="i" class="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <TrendingDown :size="14" /> {{ task }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- AI Generate Modal -->
    <div v-if="showAIGenerate" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" @click.self="showAIGenerate = false">
      <div class="card p-6 w-full max-w-md animate-scale-in">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <Sparkles :size="20" class="text-primary-500" />
            <h2 class="text-lg font-semibold">AI Task Generator</h2>
          </div>
          <button @click="showAIGenerate = false" class="btn-ghost p-1"><X :size="18" /></button>
        </div>

        <p class="text-sm text-surface-500 dark:text-surface-400 mb-3">Describe what you need and AI will create a structured task.</p>

        <textarea v-model="aiGenerateInput" placeholder="e.g. We need to prepare the product launch landing page with SEO optimization" class="input resize-none mb-3" rows="3" @keyup.ctrl.enter="handleAIGenerate"></textarea>

        <button @click="handleAIGenerate" :disabled="aiGenerating || !aiGenerateInput.trim()" class="btn-primary w-full">
          <Loader2 v-if="aiGenerating" :size="18" class="animate-spin" />
          <Sparkles v-else :size="18" />
          {{ aiGenerating ? 'Generating...' : 'Generate Task' }}
        </button>
      </div>
    </div>

    <!-- Task Modal -->
    <div v-if="showTaskModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" @click.self="showTaskModal = false">
      <div class="card p-6 w-full max-w-lg animate-scale-in max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">{{ editingTask ? 'Edit Task' : 'New Task' }}</h2>
          <div class="flex items-center gap-1">
            <button v-if="editingTask" @click="deleteTask(editingTask)" class="btn-ghost p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
              <Trash2 :size="16" />
            </button>
            <button @click="showTaskModal = false" class="btn-ghost p-1.5"><X :size="18" /></button>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5">Title</label>
            <input v-model="newTaskTitle" type="text" placeholder="Task title" class="input" />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5">Description</label>
            <textarea v-model="newTaskDescription" placeholder="Add details..." class="input resize-none" rows="3"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1.5">Priority</label>
              <div class="flex gap-1">
                <select v-model="newTaskPriority" class="input">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
                <button @click="handleAISuggestPriority" :disabled="aiSuggestingPriority" class="btn-secondary px-2" title="AI suggest priority">
                  <Loader2 v-if="aiSuggestingPriority" :size="14" class="animate-spin" />
                  <Brain v-else :size="14" />
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1.5">Column</label>
              <select v-model="newTaskColumnId" class="input">
                <option :value="null">No column</option>
                <option v-for="col in columns" :key="col.id" :value="col.id">{{ col.title }}</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5">Assignee</label>
            <select v-model="newTaskAssigneeId" class="input">
              <option :value="null">Unassigned</option>
              <option v-for="member in boardMembers" :key="member.userId" :value="member.userId">{{ member.user.name }}</option>
            </select>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-sm font-medium">Tags</label>
              <button @click="handleAISuggestTags" :disabled="aiSuggestingTags" class="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                <Loader2 v-if="aiSuggestingTags" :size="12" class="animate-spin" />
                <Brain v-else :size="12" /> AI Suggest
              </button>
            </div>
            <div class="flex flex-wrap gap-1.5 mb-2">
              <span v-for="tag in newTaskTags" :key="tag" class="badge bg-primary-100 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300 cursor-pointer" @click="newTaskTags = newTaskTags.filter(t => t !== tag)">
                {{ tag }} <X :size="10" />
              </span>
            </div>
            <input
              @keydown.enter.prevent="(e: any) => { if (e.target.value.trim()) { newTaskTags.push(e.target.value.trim()); e.target.value = '' } }"
              type="text" placeholder="Add tag and press Enter" class="input"
            />
          </div>

          <button @click="saveTask" :disabled="saving || !newTaskTitle.trim()" class="btn-primary w-full">
            <Loader2 v-if="saving" :size="18" class="animate-spin" />
            {{ saving ? 'Saving...' : (editingTask ? 'Update Task' : 'Create Task') }}
          </button>
        </div>

        <!-- Comments -->
        <div v-if="editingTask" class="mt-6 pt-6 border-t border-surface-200 dark:border-surface-800">
          <h3 class="text-sm font-semibold mb-3 flex items-center gap-2"><MessageSquare :size="16" /> Comments</h3>
          <div class="space-y-3 mb-3 max-h-40 overflow-y-auto">
            <div v-for="comment in editingTask.comments" :key="comment.id" class="flex gap-2">
              <img :src="comment.user.avatar || ''" :alt="comment.user.name" class="w-7 h-7 rounded-full bg-surface-200 shrink-0" />
              <div class="flex-1">
                <div class="card p-2.5">
                  <div class="flex items-center justify-between mb-0.5">
                    <span class="text-xs font-semibold">{{ comment.user.name }}</span>
                    <span class="text-xs text-surface-400">{{ formatDate(comment.createdAt) }}</span>
                  </div>
                  <p class="text-sm">{{ comment.content }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="flex gap-2">
            <input v-model="commentText" type="text" placeholder="Write a comment..." class="input" @keyup.enter="addComment(editingTask)" />
            <button @click="addComment(editingTask)" :disabled="!commentText.trim()" class="btn-primary px-3">
              <Send :size="16" />
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Members Modal -->
    <div v-if="showMembers" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" @click.self="showMembers = false">
      <div class="card p-6 w-full max-w-md animate-scale-in max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <Users :size="20" class="text-primary-500" />
            <h2 class="text-lg font-semibold">Board Members</h2>
          </div>
          <button @click="showMembers = false" class="btn-ghost p-1"><X :size="18" /></button>
        </div>

        <div class="space-y-2">
          <div
            v-for="member in boardMembers"
            :key="member.id"
            class="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors"
          >
            <img :src="member.user.avatar || ''" :alt="member.user.name" class="w-10 h-10 rounded-full bg-surface-200" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ member.user.name }}</p>
              <p class="text-xs text-surface-500 truncate">{{ member.user.email }}</p>
            </div>
            <span class="badge flex items-center gap-1" :class="memberRoleColors[member.role]">
              <component :is="memberRoleIcons[member.role]" :size="10" />
              {{ member.role }}
            </span>
          </div>
        </div>

        <div v-if="boardMembers.length === 0" class="text-center py-8 text-sm text-surface-400">
          No members yet
        </div>

        <div v-if="isBoardOwner" class="mt-4 pt-4 border-t border-surface-200 dark:border-surface-800">
          <div class="flex items-center gap-2">
            <UserPlus :size="16" class="text-surface-400" />
            <p class="text-xs text-surface-500">As the board owner, you can manage member roles and invitations.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
