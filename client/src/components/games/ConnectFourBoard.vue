<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  board: (string | null)[][]
  winLine?: number[]
  mySymbol: 'X' | 'O'
  turn: 'X' | 'O'
  disabled: boolean
}>()

const emit = defineEmits<{
  move: [col: number]
}>()

const cols = 7
const rows = 6

const isWinCell = (r: number, c: number) => {
  return props.winLine?.includes(r * cols + c) ?? false
}

const handleClick = (col: number) => {
  if (props.disabled || props.turn !== props.mySymbol) return
  const isFull = props.board.every((row) => row[col] !== null)
  if (isFull) return
  emit('move', col)
}

const columnIndices = computed(() => Array.from({ length: cols }, (_, i) => i))
const rowIndices = computed(() => Array.from({ length: rows }, (_, i) => i))
</script>

<template>
  <div class="inline-block">
    <div class="bg-primary-600 rounded-2xl p-3 shadow-xl">
      <div class="flex gap-1.5">
        <div
          v-for="col in columnIndices"
          :key="col"
          class="flex flex-col gap-1.5"
        >
          <button
            @click="handleClick(col)"
            class="w-10 h-6 sm:w-12 sm:h-7 rounded-t-lg flex items-center justify-center transition-all"
            :class="[
              disabled || turn !== mySymbol
                ? 'bg-primary-500/30 cursor-default'
                : 'bg-primary-400 hover:bg-primary-300 cursor-pointer hover:scale-110'
            ]"
            :disabled="disabled || turn !== mySymbol"
          >
            <svg width="14" height="14" class="text-white/70" viewBox="0 0 24 24" fill="currentColor" v-if="!disabled && turn === mySymbol">
              <path d="M12 4l-6 8h12z" />
            </svg>
          </button>
          <div
            v-for="row in rowIndices"
            :key="row"
            class="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all"
            :class="[
              isWinCell(row, col)
                ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-primary-600'
                : ''
            ]"
          >
            <div
              v-if="board[row][col] === 'X'"
              class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary-300 to-primary-500 shadow-inner"
              :class="{ 'ring-2 ring-green-400': isWinCell(row, col) }"
            />
            <div
              v-else-if="board[row][col] === 'O'"
              class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-inner"
              :class="{ 'ring-2 ring-green-400': isWinCell(row, col) }"
            />
            <div
              v-else
              class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-700/50"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
