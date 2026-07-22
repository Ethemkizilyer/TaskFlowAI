<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  board: (string | null)[]
  winLine?: number[]
  mySymbol: 'X' | 'O'
  turn: 'X' | 'O'
  disabled: boolean
}>()

const emit = defineEmits<{
  move: [index: number]
}>()

const { t } = useI18n()

const cells = computed(() => props.board)

const isWinCell = (index: number) => {
  return props.winLine?.includes(index) ?? false
}

const handleClick = (index: number) => {
  if (props.disabled || props.turn !== props.mySymbol) return
  if (cells.value[index] !== null) return
  emit('move', index)
}
</script>

<template>
  <div class="inline-block">
    <div class="grid grid-cols-3 gap-2 p-4 bg-surface-100 dark:bg-surface-800/50 rounded-2xl">
      <button
        v-for="(cell, i) in cells"
        :key="i"
        @click="handleClick(i)"
        class="w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center text-4xl font-bold transition-all"
        :class="[
          isWinCell(i)
            ? 'bg-green-500/20 ring-2 ring-green-500'
            : cell === null && !disabled && turn === mySymbol
              ? 'bg-surface-50 dark:bg-surface-700/50 hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:scale-105 cursor-pointer'
              : 'bg-surface-50 dark:bg-surface-700/50 cursor-default'
        ]"
        :disabled="cell !== null || disabled || turn !== mySymbol"
      >
        <span
          v-if="cell === 'X'"
          class="text-primary-500"
          :class="{ 'scale-110': isWinCell(i) }"
        >✕</span>
        <span
          v-else-if="cell === 'O'"
          class="text-amber-500"
          :class="{ 'scale-110': isWinCell(i) }"
        >◯</span>
      </button>
    </div>
  </div>
</template>
