<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Check, X, ChevronDown, Search, Loader2 } from 'lucide-vue-next'

export interface SelectOption {
  value: string
  label: string
  avatar?: string
  sublabel?: string
}

const props = withDefaults(defineProps<{
  modelValue: string[]
  options: SelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  loading?: boolean
  multiple?: boolean
  searchable?: boolean
}>(), {
  placeholder: 'Select...',
  searchPlaceholder: 'Search...',
  loading: false,
  multiple: true,
  searchable: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  'search': [query: string]
}>()

const isOpen = ref(false)
const searchQuery = ref('')
const dropdownRef = ref<HTMLElement | null>(null)

const selectedOptions = computed(() =>
  props.options.filter((o) => props.modelValue.includes(o.value))
)

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options
  const q = searchQuery.value.toLowerCase()
  return props.options.filter(
    (o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q)
  )
})

function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) searchQuery.value = ''
}

function toggleOption(value: string) {
  if (props.multiple) {
    if (props.modelValue.includes(value)) {
      emit('update:modelValue', props.modelValue.filter((v) => v !== value))
    } else {
      emit('update:modelValue', [...props.modelValue, value])
    }
  } else {
    emit('update:modelValue', [value])
    isOpen.value = false
  }
}

function removeOption(value: string) {
  emit('update:modelValue', props.modelValue.filter((v) => v !== value))
}

function handleClickOutside(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

watch(searchQuery, (v) => emit('search', v))

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div ref="dropdownRef" class="relative">
    <!-- Trigger -->
    <div
      @click="toggle"
      class="min-h-[42px] w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 px-3 py-2 cursor-pointer flex items-center gap-2 flex-wrap hover:border-primary-400 transition-colors"
    >
      <div v-if="selectedOptions.length === 0" class="text-surface-400 text-sm">
        {{ placeholder }}
      </div>
      <span
        v-for="opt in selectedOptions"
        :key="opt.value"
        class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary-100 dark:bg-primary-900/30 text-xs font-medium"
      >
        <img v-if="opt.avatar" :src="opt.avatar" class="w-4 h-4 rounded-full" />
        {{ opt.label }}
        <button @click.stop="removeOption(opt.value)" class="text-surface-400 hover:text-red-500">
          <X :size="12" />
        </button>
      </span>
      <ChevronDown :size="16" class="ml-auto text-surface-400 shrink-0" :class="{ 'rotate-180': isOpen }" />
    </div>

    <!-- Dropdown -->
    <div
      v-if="isOpen"
      class="absolute z-50 mt-1 w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-lg max-h-60 overflow-hidden flex flex-col"
    >
      <!-- Search -->
      <div v-if="searchable" class="p-2 border-b border-surface-100 dark:border-surface-800">
        <div class="relative">
          <Search :size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="searchPlaceholder"
            class="w-full text-sm rounded-md border border-surface-200 dark:border-surface-700 bg-transparent pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
            autofocus
          />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-6">
        <Loader2 :size="18" class="animate-spin text-primary-500" />
      </div>

      <!-- Options -->
      <div v-else class="overflow-y-auto flex-1">
        <div
          v-for="opt in filteredOptions"
          :key="opt.value"
          @click="toggleOption(opt.value)"
          class="flex items-center gap-2 px-3 py-2 hover:bg-surface-100 dark:hover:bg-surface-800 cursor-pointer text-sm"
        >
          <div
            class="w-4 h-4 rounded border flex items-center justify-center shrink-0"
            :class="modelValue.includes(opt.value)
              ? 'bg-primary-600 border-primary-600 text-white'
              : 'border-surface-300 dark:border-surface-600'"
          >
            <Check v-if="modelValue.includes(opt.value)" :size="12" />
          </div>
          <img v-if="opt.avatar" :src="opt.avatar" class="w-5 h-5 rounded-full" />
          <div class="flex-1 min-w-0">
            <p class="truncate">{{ opt.label }}</p>
            <p v-if="opt.sublabel" class="text-xs text-surface-400 truncate">{{ opt.sublabel }}</p>
          </div>
        </div>
        <div v-if="filteredOptions.length === 0" class="text-center py-6 text-sm text-surface-400">
          No results found
        </div>
      </div>
    </div>
  </div>
</template>
