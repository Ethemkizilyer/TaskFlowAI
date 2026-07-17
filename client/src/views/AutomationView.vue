<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { automationApi, boardApi } from '@/api'
import { useI18n } from 'vue-i18n'
import {
  Zap, Plus, Trash2, Power, ArrowRight, Clock, CheckCircle,
  AlertTriangle, Bell, Brain, RefreshCw, X, Loader2, Sparkles
} from 'lucide-vue-next'

const { t } = useI18n()

const automations = ref<any[]>([])
const boards = ref<any[]>([])
const loading = ref(true)
const showBuilder = ref(false)
const saving = ref(false)

const triggerOptions = [
  { value: 'TASK_STALE_3D', icon: Clock, color: 'text-orange-500' },
  { value: 'TASK_STALE_7D', icon: Clock, color: 'text-red-500' },
  { value: 'TASK_DONE', icon: CheckCircle, color: 'text-green-500' },
  { value: 'TASK_OVERDUE', icon: AlertTriangle, color: 'text-red-500' },
  { value: 'TASK_HIGH_PRIORITY', icon: Zap, color: 'text-orange-500' },
  { value: 'BOARD_PROGRESS_50', icon: RefreshCw, color: 'text-blue-500' },
  { value: 'BOARD_PROGRESS_100', icon: CheckCircle, color: 'text-green-500' },
]

const actionOptions = [
  { value: 'NOTIFY_TEAM', icon: Bell, color: 'text-blue-500' },
  { value: 'AI_SUMMARIZE', icon: Brain, color: 'text-purple-500' },
  { value: 'AI_SUGGEST_PRIORITY', icon: Sparkles, color: 'text-violet-500' },
  { value: 'MOVE_TO_REVIEW', icon: ArrowRight, color: 'text-yellow-500' },
  { value: 'CREATE_FOLLOWUP', icon: Plus, color: 'text-primary-500' },
  { value: 'ASSIGN_TO_LEADER', icon: ArrowRight, color: 'text-cyan-500' },
]

const selectedTrigger = ref('')
const selectedAction = ref('')
const automationName = ref('')
const selectedBoardId = ref('')

const triggerIcon = (trigger: string) => {
  const opt = triggerOptions.find(o => o.value === trigger)
  return opt || { icon: Zap, color: 'text-surface-400' }
}

const actionIcon = (action: string) => {
  const opt = actionOptions.find(o => o.value === action)
  return opt || { icon: ArrowRight, color: 'text-surface-400' }
}

const canCreate = computed(() => {
  return selectedTrigger.value && selectedAction.value && automationName.value.trim()
})

const fetchAutomations = async () => {
  loading.value = true
  try {
    const res = await automationApi.getAll()
    automations.value = res.data.data
  } catch {
    // non-critical
  } finally {
    loading.value = false
  }
}

const fetchBoards = async () => {
  try {
    const res = await boardApi.getAll()
    boards.value = res.data.data || []
  } catch {
    // non-critical
  }
}

const createAutomation = async () => {
  if (!canCreate.value) return
  saving.value = true
  try {
    await automationApi.create({
      name: automationName.value,
      trigger: selectedTrigger.value,
      action: selectedAction.value,
      boardId: selectedBoardId.value || undefined,
    })
    showBuilder.value = false
    selectedTrigger.value = ''
    selectedAction.value = ''
    automationName.value = ''
    selectedBoardId.value = ''
    fetchAutomations()
  } catch {
    // non-critical
  } finally {
    saving.value = false
  }
}

const toggleAutomation = async (id: string) => {
  try {
    await automationApi.toggle(id)
    fetchAutomations()
  } catch {
    // non-critical
  }
}

const deleteAutomation = async (id: string) => {
  try {
    await automationApi.delete(id)
    fetchAutomations()
  } catch {
    // non-critical
  }
}

onMounted(() => {
  fetchAutomations()
  fetchBoards()
})
</script>

<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-950">
    <div class="max-w-5xl mx-auto p-4 sm:p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Zap :size="20" class="text-white" />
          </div>
          <div>
            <h1 class="text-xl font-bold">{{ t('automation.title') }}</h1>
            <p class="text-sm text-surface-500">{{ t('automation.subtitle') }}</p>
          </div>
        </div>
        <button @click="showBuilder = !showBuilder" class="btn-primary">
          <Plus :size="16" /> {{ t('automation.create') }}
        </button>
      </div>

      <!-- Builder -->
      <div v-if="showBuilder" class="card p-6 mb-6 border-primary-200 dark:border-primary-800">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold">{{ t('automation.builderTitle') }}</h2>
          <button @click="showBuilder = false" class="btn-ghost p-1.5">
            <X :size="16" />
          </button>
        </div>

        <!-- Name -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">{{ t('automation.name') }}</label>
          <input v-model="automationName" type="text" class="input" :placeholder="t('automation.namePlaceholder')" />
        </div>

        <!-- Board (optional) -->
        <div class="mb-6">
          <label class="block text-sm font-medium mb-1">{{ t('automation.board') }} ({{ t('common.optional') }})</label>
          <select v-model="selectedBoardId" class="input">
            <option value="">{{ t('automation.allBoards') }}</option>
            <option v-for="b in boards" :key="b.id" :value="b.id">{{ b.title }}</option>
          </select>
        </div>

        <!-- Trigger -->
        <div class="mb-6">
          <p class="text-sm font-medium mb-3">{{ t('automation.when') }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              v-for="opt in triggerOptions"
              :key="opt.value"
              @click="selectedTrigger = opt.value"
              class="flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left"
              :class="selectedTrigger === opt.value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20'
                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'"
            >
              <component :is="opt.icon" :size="18" :class="opt.color" />
              <span class="text-sm font-medium">{{ t(`automation.triggers.${opt.value}`) }}</span>
            </button>
          </div>
        </div>

        <!-- Arrow -->
        <div class="flex justify-center mb-6">
          <div class="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
            <ArrowRight :size="18" class="text-surface-400" />
          </div>
        </div>

        <!-- Action -->
        <div class="mb-6">
          <p class="text-sm font-medium mb-3">{{ t('automation.then') }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              v-for="opt in actionOptions"
              :key="opt.value"
              @click="selectedAction = opt.value"
              class="flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left"
              :class="selectedAction === opt.value
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20'
                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'"
            >
              <component :is="opt.icon" :size="18" :class="opt.color" />
              <span class="text-sm font-medium">{{ t(`automation.actions.${opt.value}`) }}</span>
            </button>
          </div>
        </div>

        <!-- Create -->
        <button @click="createAutomation" :disabled="!canCreate || saving" class="btn-primary w-full">
          <Loader2 v-if="saving" :size="16" class="animate-spin" />
          <Zap v-else :size="16" />
          {{ t('automation.activate') }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <Loader2 :size="24" class="animate-spin text-primary-500" />
      </div>

      <!-- Empty state -->
      <div v-else-if="!automations.length" class="card p-12 text-center">
        <Zap :size="40" class="text-surface-300 mx-auto mb-4" />
        <p class="text-surface-500 mb-2">{{ t('automation.empty') }}</p>
        <p class="text-xs text-surface-400">{{ t('automation.emptyHint') }}</p>
      </div>

      <!-- Automation list -->
      <div v-else class="space-y-3">
        <div
          v-for="auto in automations"
          :key="auto.id"
          class="card p-4 flex items-center gap-4"
          :class="{ 'opacity-50': !auto.enabled }"
        >
          <!-- Trigger -->
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <div class="w-9 h-9 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0">
              <component :is="triggerIcon(auto.trigger).icon" :size="16" :class="triggerIcon(auto.trigger).color" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium truncate">{{ auto.name }}</p>
              <p class="text-xs text-surface-400 truncate">
                {{ t(`automation.triggers.${auto.trigger}`) }}
                <ArrowRight :size="10" class="inline mx-1" />
                {{ t(`automation.actions.${auto.action}`) }}
              </p>
            </div>
          </div>

          <!-- Stats -->
          <div class="hidden sm:flex items-center gap-4 text-xs text-surface-400">
            <span v-if="auto.fireCount > 0">{{ auto.fireCount }}x {{ t('automation.fired') }}</span>
            <span v-if="auto.lastFiredAt">{{ new Date(auto.lastFiredAt).toLocaleDateString() }}</span>
          </div>

          <!-- Toggle -->
          <button @click="toggleAutomation(auto.id)" class="relative w-10 h-6 rounded-full transition-colors" :class="auto.enabled ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-600'">
            <div class="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform" :class="auto.enabled ? 'translate-x-4' : 'translate-x-0.5'"></div>
          </button>

          <!-- Delete -->
          <button @click="deleteAutomation(auto.id)" class="btn-ghost p-2 text-surface-400 hover:text-red-500">
            <Trash2 :size="16" />
          </button>
        </div>
      </div>

      <!-- Templates -->
      <div v-if="!showBuilder && !loading" class="mt-8">
        <h3 class="font-semibold text-sm mb-3 text-surface-500">{{ t('automation.templates') }}</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            v-for="tmpl in [
              { name: t('automation.template1.name'), trigger: 'TASK_STALE_3D', action: 'AI_SUMMARIZE' },
              { name: t('automation.template2.name'), trigger: 'TASK_DONE', action: 'NOTIFY_TEAM' },
              { name: t('automation.template3.name'), trigger: 'TASK_OVERDUE', action: 'ASSIGN_TO_LEADER' },
              { name: t('automation.template4.name'), trigger: 'BOARD_PROGRESS_100', action: 'AI_SUMMARIZE' },
            ]"
            :key="tmpl.name"
            @click="() => { showBuilder = true; selectedTrigger = tmpl.trigger; selectedAction = tmpl.action; automationName = tmpl.name }"
            class="card p-4 text-left hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
          >
            <div class="flex items-center gap-2 mb-1">
              <component :is="triggerIcon(tmpl.trigger).icon" :size="14" :class="triggerIcon(tmpl.trigger).color" />
              <ArrowRight :size="12" class="text-surface-400" />
              <component :is="actionIcon(tmpl.action).icon" :size="14" :class="actionIcon(tmpl.action).color" />
            </div>
            <p class="text-sm font-medium">{{ tmpl.name }}</p>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
