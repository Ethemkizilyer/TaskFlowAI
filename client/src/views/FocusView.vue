<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { focusApi, boardApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import {
  Play, Pause, Square, Coffee, Brain, Flame, Clock,
  Volume2, VolumeX, CheckCircle2, Timer, TrendingUp, Calendar
} from 'lucide-vue-next'

const { t } = useI18n()
const authStore = useAuthStore()

type Phase = 'idle' | 'focusing' | 'break'
type Duration = 25 | 50 | 90

const phase = ref<Phase>('idle')
const selectedDuration = ref<Duration>(25)
const timeLeft = ref(0)
const timerId = ref<number | null>(null)
const currentSessionId = ref<string | null>(null)
const soundEnabled = ref(false)
const audioCtx = ref<AudioContext | null>(null)
const audioSource = ref<AudioBufferSourceNode | null>(null)

const stats = ref<any>(null)
const userTasks = ref<any[]>([])
const selectedTask = ref<any>(null)
const showTaskPicker = ref(false)

const totalSeconds = computed(() => selectedDuration.value * 60)
const progress = computed(() => {
  if (phase.value === 'idle') return 0
  return ((totalSeconds.value - timeLeft.value) / totalSeconds.value) * 100
})

const formattedTime = computed(() => {
  const m = Math.floor(timeLeft.value / 60)
  const s = timeLeft.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const circumference = 2 * Math.PI * 120
const strokeDashoffset = computed(() => {
  return circumference - (progress.value / 100) * circumference
})

const durations: { value: Duration; label: string; icon: any }[] = [
  { value: 25, label: 'Pomodoro', icon: Coffee },
  { value: 50, label: 'Deep Work', icon: Brain },
  { value: 90, label: 'Flow State', icon: Flame },
]

const ambientSounds = [
  { name: 'Rain', freq: 200, type: 'brown' as BiquadFilterType },
  { name: 'Ocean', freq: 150, type: 'lowpass' as BiquadFilterType },
  { name: 'Forest', freq: 300, type: 'highpass' as BiquadFilterType },
]

const currentAmbient = ref(0)

const startTimer = async () => {
  phase.value = 'focusing'
  timeLeft.value = totalSeconds.value

  try {
    const res = await focusApi.startSession({
      taskId: selectedTask.value?.id,
      taskTitle: selectedTask.value?.title,
      duration: selectedDuration.value,
    })
    currentSessionId.value = res.data.data.id
  } catch {
    // non-critical
  }

  if (soundEnabled.value) playAmbient()

  timerId.value = window.setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      completeSession()
    }
  }, 1000)
}

const pauseTimer = () => {
  if (timerId.value) {
    clearInterval(timerId.value)
    timerId.value = null
  }
  phase.value = 'idle'
  stopAmbient()
}

const completeSession = async () => {
  if (timerId.value) {
    clearInterval(timerId.value)
    timerId.value = null
  }

  if (currentSessionId.value) {
    try {
      await focusApi.completeSession(currentSessionId.value)
    } catch {
      // non-critical
    }
  }

  phase.value = 'break'
  timeLeft.value = 5 * 60
  stopAmbient()

  timerId.value = window.setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      resetTimer()
    }
  }, 1000)
}

const resetTimer = () => {
  if (timerId.value) {
    clearInterval(timerId.value)
    timerId.value = null
  }
  phase.value = 'idle'
  timeLeft.value = 0
  currentSessionId.value = null
  stopAmbient()
  fetchStats()
}

const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value
  if (soundEnabled.value && phase.value === 'focusing') {
    playAmbient()
  } else {
    stopAmbient()
  }
}

const playAmbient = () => {
  if (!audioCtx.value) {
    audioCtx.value = new AudioContext()
  }
  stopAmbient()

  const ctx = audioCtx.value
  const bufferSize = 2 * ctx.sampleRate
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const output = buffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true

  const filter = ctx.createBiquadFilter()
  filter.type = ambientSounds[currentAmbient.value].type
  filter.frequency.value = ambientSounds[currentAmbient.value].freq

  const gain = ctx.createGain()
  gain.gain.value = 0.1

  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  source.start(0)
  audioSource.value = source
}

const stopAmbient = () => {
  if (audioSource.value) {
    try {
      audioSource.value.stop()
    } catch {
      // already stopped
    }
    audioSource.value = null
  }
}

const fetchStats = async () => {
  try {
    const res = await focusApi.getStats()
    stats.value = res.data.data
  } catch {
    // non-critical
  }
}

const fetchTasks = async () => {
  try {
    const res = await boardApi.getAll()
    const boards = res.data.data || []
    const tasks: any[] = []
    boards.forEach((b: any) => {
      if (b.tasks) {
        b.tasks.forEach((task: any) => {
          if (task.status !== 'DONE' && task.assigneeId === authStore.user?.id) {
            tasks.push(task)
          }
        })
      }
    })
    userTasks.value = tasks
  } catch {
    // non-critical
  }
}

const selectTask = (task: any) => {
  selectedTask.value = task
  showTaskPicker.value = false
}

const weekDays = computed(() => {
  if (!stats.value?.dailyBreakdown) return []
  const lang = localStorage.getItem('taskflow-lang') === 'en' ? 'en' : 'tr'
  const days = lang === 'en'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
  return stats.value.dailyBreakdown.map((d: any) => {
    const date = new Date(d.date)
    return {
      label: days[date.getDay()],
      minutes: d.minutes,
      height: Math.min(d.minutes / 60 * 100, 100),
    }
  })
})

onMounted(() => {
  fetchStats()
  fetchTasks()
})

onUnmounted(() => {
  if (timerId.value) clearInterval(timerId.value)
  stopAmbient()
})

watch(selectedDuration, () => {
  if (phase.value === 'idle') {
    timeLeft.value = 0
  }
})
</script>

<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-950">
    <div class="max-w-5xl mx-auto p-4 sm:p-6">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Brain :size="20" class="text-white" />
        </div>
        <div>
          <h1 class="text-xl font-bold">{{ t('focus.title') }}</h1>
          <p class="text-sm text-surface-500">{{ t('focus.subtitle') }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Timer Section -->
        <div class="lg:col-span-2 card p-8 flex flex-col items-center">
          <!-- Duration picker -->
          <div v-if="phase === 'idle'" class="flex gap-2 mb-8">
            <button
              v-for="d in durations"
              :key="d.value"
              @click="selectedDuration = d.value"
              class="flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-all"
              :class="selectedDuration === d.value
                ? 'bg-primary-500 text-white shadow-lg scale-105'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'"
            >
              <component :is="d.icon" :size="20" />
              <span class="text-xs font-medium">{{ d.value }}m</span>
              <span class="text-[10px] opacity-70">{{ d.label }}</span>
            </button>
          </div>

          <!-- Circular Timer -->
          <div class="relative w-72 h-72 flex items-center justify-center mb-6">
            <svg class="absolute inset-0 -rotate-90" viewBox="0 0 260 260">
              <circle
                cx="130" cy="130" r="120"
                fill="none"
                stroke="currentColor"
                stroke-width="8"
                class="text-surface-200 dark:text-surface-700"
              />
              <circle
                cx="130" cy="130" r="120"
                fill="none"
                stroke="url(#timerGradient)"
                stroke-width="8"
                stroke-linecap="round"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="strokeDashoffset"
                class="transition-all duration-1000 ease-linear"
              />
              <defs>
                <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#8b5cf6" />
                  <stop offset="100%" stop-color="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
            <div class="text-center z-10">
              <p class="text-5xl font-bold tabular-nums">{{ formattedTime }}</p>
              <p class="text-sm text-surface-400 mt-2">
                {{ phase === 'focusing' ? t('focus.focusing') : phase === 'break' ? t('focus.breakTime') : t('focus.ready') }}
              </p>
              <p v-if="selectedTask && phase !== 'idle'" class="text-xs text-primary-500 mt-1 truncate max-w-[200px]">
                {{ selectedTask.title }}
              </p>
            </div>
          </div>

          <!-- Controls -->
          <div class="flex items-center gap-3">
            <button
              v-if="phase === 'idle'"
              @click="startTimer"
              class="btn-primary px-8 py-3 text-base"
            >
              <Play :size="20" /> {{ t('focus.start') }}
            </button>
            <button
              v-if="phase === 'focusing'"
              @click="pauseTimer"
              class="btn-primary px-8 py-3 text-base bg-orange-500 hover:bg-orange-600"
            >
              <Pause :size="20" /> {{ t('focus.pause') }}
            </button>
            <button
              v-if="phase !== 'idle'"
              @click="resetTimer"
              class="btn-ghost px-6 py-3"
            >
              <Square :size="18" /> {{ t('focus.stop') }}
            </button>
            <button @click="toggleSound" class="btn-ghost p-3" :title="t('focus.sound')">
              <Volume2 v-if="soundEnabled" :size="18" class="text-primary-500" />
              <VolumeX v-else :size="18" />
            </button>
          </div>

          <!-- Task picker -->
          <div v-if="phase === 'idle'" class="w-full mt-6 pt-6 border-t border-surface-200 dark:border-surface-700">
            <button
              v-if="!selectedTask"
              @click="showTaskPicker = !showTaskPicker"
              class="text-sm text-surface-500 hover:text-primary-500 transition-colors"
            >
              + {{ t('focus.selectTask') }}
            </button>
            <div v-else class="flex items-center justify-between">
              <span class="text-sm text-surface-600 dark:text-surface-300">
                {{ t('focus.workingOn') }}: <span class="font-medium">{{ selectedTask.title }}</span>
              </span>
              <button @click="selectedTask = null" class="text-xs text-surface-400 hover:text-red-500">
                {{ t('focus.clear') }}
              </button>
            </div>

            <div v-if="showTaskPicker" class="mt-3 space-y-1 max-h-48 overflow-y-auto">
              <button
                v-for="task in userTasks"
                :key="task.id"
                @click="selectTask(task)"
                class="w-full text-left p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-sm transition-colors"
              >
                {{ task.title }}
              </button>
              <p v-if="!userTasks.length" class="text-xs text-surface-400 text-center py-4">
                {{ t('focus.noTasks') }}
              </p>
            </div>
          </div>
        </div>

        <!-- Stats Sidebar -->
        <div class="space-y-4">
          <!-- Today -->
          <div class="card p-5">
            <div class="flex items-center gap-2 mb-3">
              <Clock :size="16" class="text-primary-500" />
              <h3 class="font-semibold text-sm">{{ t('focus.today') }}</h3>
            </div>
            <p class="text-3xl font-bold">{{ stats?.todayMinutes || 0 }}<span class="text-sm font-normal text-surface-400 ml-1">{{ t('focus.minutes') }}</span></p>
            <p class="text-xs text-surface-400 mt-1">{{ stats?.todayCount || 0 }} {{ t('focus.sessions') }}</p>
          </div>

          <!-- Streak -->
          <div class="card p-5 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800">
            <div class="flex items-center gap-2 mb-3">
              <Flame :size="16" class="text-orange-500" />
              <h3 class="font-semibold text-sm">{{ t('focus.streak') }}</h3>
            </div>
            <p class="text-3xl font-bold text-orange-600 dark:text-orange-400">{{ stats?.streak || 0 }}<span class="text-sm font-normal ml-1">{{ t('focus.days') }}</span></p>
          </div>

          <!-- This week -->
          <div class="card p-5">
            <div class="flex items-center gap-2 mb-3">
              <TrendingUp :size="16" class="text-green-500" />
              <h3 class="font-semibold text-sm">{{ t('focus.thisWeek') }}</h3>
            </div>
            <p class="text-3xl font-bold">{{ stats?.weekMinutes || 0 }}<span class="text-sm font-normal text-surface-400 ml-1">{{ t('focus.minutes') }}</span></p>
            <p class="text-xs text-surface-400 mt-1">{{ t('focus.totalSessions') }}: {{ stats?.totalSessions || 0 }}</p>
          </div>

          <!-- Weekly chart -->
          <div class="card p-5">
            <div class="flex items-center gap-2 mb-4">
              <Calendar :size="16" class="text-blue-500" />
              <h3 class="font-semibold text-sm">{{ t('focus.weeklyChart') }}</h3>
            </div>
            <div class="flex items-end justify-between gap-1 h-24">
              <div v-for="(day, i) in weekDays" :key="i" class="flex flex-col items-center gap-1 flex-1">
                <div
                  class="w-full rounded-t bg-gradient-to-t from-primary-500 to-violet-400 transition-all min-h-[2px]"
                  :style="{ height: day.height + '%' }"
                ></div>
                <span class="text-[10px] text-surface-400">{{ day.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
