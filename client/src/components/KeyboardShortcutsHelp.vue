<script setup lang="ts">
import { X, Keyboard } from 'lucide-vue-next'

defineProps<{ show: boolean; shortcuts: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; description: string }[] }>()
const emit = defineEmits<{ close: [] }>()

function formatKey(sc: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean }) {
  const parts: string[] = []
  if (sc.ctrl) parts.push('Ctrl')
  if (sc.shift) parts.push('Shift')
  if (sc.alt) parts.push('Alt')
  parts.push(sc.key === ' ' ? 'Space' : sc.key)
  return parts
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="emit('close')">
      <div class="card max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <Keyboard :size="20" class="text-primary-500" />
            <h3 class="font-bold text-lg">Keyboard Shortcuts</h3>
          </div>
          <button @click="emit('close')" class="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg">
            <X :size="16" />
          </button>
        </div>

        <div class="space-y-2">
          <div
            v-for="sc in shortcuts"
            :key="sc.description"
            class="flex items-center justify-between py-2 border-b border-surface-100 dark:border-surface-800/50 last:border-0"
          >
            <span class="text-sm text-surface-600 dark:text-surface-300">{{ sc.description }}</span>
            <div class="flex items-center gap-1">
              <kbd
                v-for="part in formatKey(sc)"
                :key="part"
                class="px-2 py-0.5 text-xs font-mono rounded border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800"
              >{{ part }}</kbd>
            </div>
          </div>
        </div>

        <p class="text-xs text-surface-400 mt-4 text-center">Press <kbd class="px-1.5 py-0.5 text-xs font-mono rounded border border-surface-200 dark:border-surface-700">Shift</kbd> + <kbd class="px-1.5 py-0.5 text-xs font-mono rounded border border-surface-200 dark:border-surface-700">?</kbd> to toggle this help</p>
      </div>
    </div>
  </Teleport>
</template>
