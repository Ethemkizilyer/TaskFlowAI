<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { taskDependencyApi } from '@/api'
import {
  Link2, X, AlertCircle, CheckCircle2, Loader2, Plus, ArrowRight
} from 'lucide-vue-next'

const props = defineProps<{
  boardId: string
  taskId: string
  tasks: Array<{ id: string; title: string; status: string }>
}>()

const emit = defineEmits<{ 'dependency-changed': [] }>()

const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const showAddForm = ref(false)
const selectedDependsOnId = ref('')
const deps = ref<{ blockedBy: any[]; blocking: any[] }>({ blockedBy: [], blocking: [] })

const availableTasks = computed(() =>
  props.tasks
    .filter((t) => t.id !== props.taskId && !deps.value.blockedBy.some((d) => d.id === t.id))
    .map((t) => ({ id: t.id, title: t.title, status: t.status }))
)

const isBlocked = computed(() => deps.value.blockedBy.some((d) => !d.isDone))

async function fetchDeps() {
  loading.value = true
  error.value = null
  try {
    const res = await taskDependencyApi.getDependencies(props.boardId, props.taskId)
    deps.value = res.data.data
  } catch (e: any) {
    error.value = e.message || 'Failed to load dependencies'
  } finally {
    loading.value = false
  }
}

async function addDependency() {
  if (!selectedDependsOnId.value) return
  saving.value = true
  error.value = null
  try {
    await taskDependencyApi.addDependency(props.boardId, props.taskId, selectedDependsOnId.value)
    selectedDependsOnId.value = ''
    showAddForm.value = false
    await fetchDeps()
    emit('dependency-changed')
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || 'Failed to add dependency'
  } finally {
    saving.value = false
  }
}

async function removeDependency(dependsOnId: string) {
  try {
    await taskDependencyApi.removeDependency(props.boardId, props.taskId, dependsOnId)
    await fetchDeps()
    emit('dependency-changed')
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || 'Failed to remove dependency'
  }
}

watch(() => props.taskId, fetchDeps, { immediate: true })
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Link2 :size="16" class="text-primary-500" />
        <span class="text-sm font-semibold">Dependencies</span>
        <span v-if="isBlocked" class="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
          <AlertCircle :size="12" /> Blocked
        </span>
      </div>
      <button
        @click="showAddForm = !showAddForm"
        class="btn-ghost p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
        :title="'Add dependency'"
      >
        <Plus :size="14" />
      </button>
    </div>

    <div v-if="error" class="text-xs text-red-500 flex items-center gap-1">
      <AlertCircle :size="12" /> {{ error }}
    </div>

    <div v-if="loading" class="flex items-center gap-2 text-xs text-surface-400">
      <Loader2 :size="12" class="animate-spin" /> Loading...
    </div>

    <!-- Add form -->
    <div v-if="showAddForm" class="flex items-center gap-2">
      <select
        v-model="selectedDependsOnId"
        class="flex-1 text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent px-2 py-1.5"
      >
        <option value="">Select task...</option>
        <option v-for="t in availableTasks" :key="t.id" :value="t.id">{{ t.title }}</option>
      </select>
      <button
        @click="addDependency"
        :disabled="!selectedDependsOnId || saving"
        class="btn-primary px-2 py-1.5 text-xs"
      >
        <Loader2 v-if="saving" :size="12" class="animate-spin" />
        <Plus v-else :size="12" />
      </button>
    </div>

    <!-- Blocked By -->
    <div v-if="deps.blockedBy.length > 0">
      <p class="text-[10px] uppercase text-surface-400 mb-1">Blocked by</p>
      <div class="space-y-1">
        <div
          v-for="dep in deps.blockedBy"
          :key="dep.id"
          class="flex items-center gap-2 text-xs p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50"
        >
          <component
            :is="dep.isDone ? CheckCircle2 : AlertCircle"
            :size="12"
            :class="dep.isDone ? 'text-green-500' : 'text-orange-500'"
          />
          <span class="flex-1 truncate" :class="{ 'line-through opacity-50': dep.isDone }">{{ dep.title }}</span>
          <button @click="removeDependency(dep.id)" class="p-0.5 hover:bg-surface-200 dark:hover:bg-surface-700 rounded">
            <X :size="12" class="text-surface-400" />
          </button>
        </div>
      </div>
    </div>

    <!-- Blocking -->
    <div v-if="deps.blocking.length > 0">
      <p class="text-[10px] uppercase text-surface-400 mb-1">Blocking</p>
      <div class="space-y-1">
        <div
          v-for="dep in deps.blocking"
          :key="dep.id"
          class="flex items-center gap-2 text-xs p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50"
        >
          <ArrowRight :size="12" class="text-surface-400" />
          <component
            :is="dep.isDone ? CheckCircle2 : AlertCircle"
            :size="12"
            :class="dep.isDone ? 'text-green-500' : 'text-orange-500'"
          />
          <span class="flex-1 truncate" :class="{ 'line-through opacity-50': dep.isDone }">{{ dep.title }}</span>
        </div>
      </div>
    </div>

    <p v-if="deps.blockedBy.length === 0 && deps.blocking.length === 0 && !loading" class="text-xs text-surface-400 text-center py-2">
      No dependencies
    </p>
  </div>
</template>
