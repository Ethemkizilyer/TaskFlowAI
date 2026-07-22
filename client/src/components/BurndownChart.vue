<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { burndownApi } from '@/api'
import { TrendingDown, Loader2 } from 'lucide-vue-next'

const props = defineProps<{ boardId: string }>()

const loading = ref(false)
const error = ref<string | null>(null)
const data = ref<any>(null)

const chartWidth = 600
const chartHeight = 240
const padding = { top: 20, right: 20, bottom: 30, left: 40 }

const innerWidth = computed(() => chartWidth - padding.left - padding.right)
const innerHeight = computed(() => chartHeight - padding.top - padding.bottom)

const maxX = computed(() => data.value?.days?.length ? data.value.days.length - 1 : 0)
const maxY = computed(() => {
  if (!data.value?.days) return 0
  return Math.max(...data.value.days.map((d: any) => Math.max(d.remaining, d.ideal)), 1)
})

const xScale = (i: number) => padding.left + (i / Math.max(1, maxX.value)) * innerWidth.value
const yScale = (v: number) => padding.top + innerHeight.value - (v / maxY.value) * innerHeight.value

const remainingPath = computed(() => {
  if (!data.value?.days) return ''
  return data.value.days
    .map((d: any, i: number) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.remaining)}`)
    .join(' ')
})

const idealPath = computed(() => {
  if (!data.value?.days) return ''
  return data.value.days
    .map((d: any, i: number) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.ideal)}`)
    .join(' ')
})

const yTicks = computed(() => {
  const ticks: number[] = []
  const step = Math.ceil(maxY.value / 5)
  for (let i = 0; i <= maxY.value; i += step) ticks.push(i)
  return ticks
})

const xLabels = computed(() => {
  if (!data.value?.days) return []
  const total = data.value.days.length
  const step = Math.max(1, Math.ceil(total / 6))
  const labels: { x: number; label: string }[] = []
  for (let i = 0; i < total; i += step) {
    const d = data.value.days[i]
    labels.push({ x: xScale(i), label: d.date.slice(5) })
  }
  return labels
})

async function fetchBurndown() {
  loading.value = true
  error.value = null
  try {
    const res = await burndownApi.getBurndown(props.boardId)
    data.value = res.data.data
  } catch (e: any) {
    error.value = e.message || 'Failed to load burndown data'
  } finally {
    loading.value = false
  }
}

watch(() => props.boardId, fetchBurndown, { immediate: true })
</script>

<template>
  <div class="card p-6">
    <div class="flex items-center gap-2 mb-4">
      <TrendingDown :size="20" class="text-primary-500" />
      <h3 class="font-bold text-lg">Burndown Chart</h3>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <Loader2 :size="24" class="animate-spin text-primary-500" />
    </div>

    <div v-else-if="error" class="text-sm text-red-500 text-center py-8">{{ error }}</div>

    <div v-else-if="data" class="space-y-4">
      <!-- Summary stats -->
      <div class="grid grid-cols-3 gap-3">
        <div class="text-center p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50">
          <p class="text-xs text-surface-500">Total</p>
          <p class="text-lg font-bold">{{ data.totalTasks }}</p>
        </div>
        <div class="text-center p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
          <p class="text-xs text-surface-500">Completed</p>
          <p class="text-lg font-bold text-green-600 dark:text-green-400">{{ data.completedTasks }}</p>
        </div>
        <div class="text-center p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20">
          <p class="text-xs text-surface-500">Remaining</p>
          <p class="text-lg font-bold text-orange-600 dark:text-orange-400">{{ data.remainingTasks }}</p>
        </div>
      </div>

      <!-- SVG Chart -->
      <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="w-full h-auto">
        <!-- Y-axis grid lines -->
        <line
          v-for="tick in yTicks"
          :key="`grid-${tick}`"
          :x1="padding.left"
          :x2="chartWidth - padding.right"
          :y1="yScale(tick)"
          :y2="yScale(tick)"
          stroke="currentColor"
          stroke-width="0.5"
          class="text-surface-200 dark:text-surface-700"
        />
        <!-- Y-axis labels -->
        <text
          v-for="tick in yTicks"
          :key="`y-${tick}`"
          :x="padding.left - 8"
          :y="yScale(Number(tick)) + 4"
          text-anchor="end"
          class="fill-surface-400 text-[10px]"
        >{{ tick }}</text>
        <!-- X-axis labels -->
        <text
          v-for="label in xLabels"
          :key="`x-${label.x}`"
          :x="label.x"
          :y="chartHeight - 8"
          text-anchor="middle"
          class="fill-surface-400 text-[10px]"
        >{{ label.label }}</text>

        <!-- Ideal line (dashed) -->
        <path
          :d="idealPath"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-dasharray="4 4"
          class="text-surface-400"
        />
        <!-- Remaining line (solid) -->
        <path
          :d="remainingPath"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="text-primary-500"
        />

        <!-- Data points -->
        <circle
          v-for="(d, i) in data.days"
          :key="`pt-${i}`"
          :cx="xScale(i)"
          :cy="yScale(d.remaining)"
          r="2.5"
          class="fill-primary-500"
        />
      </svg>

      <!-- Legend -->
      <div class="flex items-center justify-center gap-6 text-xs">
        <div class="flex items-center gap-2">
          <div class="w-4 h-0.5 bg-primary-500"></div>
          <span class="text-surface-500">Actual Remaining</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-0.5 border-t border-dashed border-surface-400"></div>
          <span class="text-surface-500">Ideal Burndown</span>
        </div>
      </div>
    </div>
  </div>
</template>
