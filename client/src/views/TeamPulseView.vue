<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { moodApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import {
  Heart, Smile, Meh, Frown, AlertTriangle, TrendingUp,
  Loader2, Check, Activity, Users, Zap
} from 'lucide-vue-next'

const { t } = useI18n()
const authStore = useAuthStore()

const loading = ref(true)
const todayCheckin = ref<any>(null)
const teamPulse = ref<any>(null)
const saving = ref(false)
const showNote = ref(false)
const selectedMood = ref('')
const note = ref('')
const stress = ref(3)
const workload = ref(3)

const moodConfig: Record<string, { emoji: string; color: string; bg: string; icon: any }> = {
  great: { emoji: '😄', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800', icon: Smile },
  good: { emoji: '🙂', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800', icon: Smile },
  okay: { emoji: '😐', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800', icon: Meh },
  stressed: { emoji: '😟', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800', icon: Frown },
  burnout: { emoji: '😫', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800', icon: AlertTriangle },
}

const moods = ['great', 'good', 'okay', 'stressed', 'burnout']

const hasCheckedIn = computed(() => !!todayCheckin.value)

const overallMood = computed(() => {
  if (!teamPulse.value?.moodCounts) return null
  const counts = teamPulse.value.moodCounts
  let max = 0
  let result = 'okay'
  for (const [mood, count] of Object.entries(counts)) {
    if ((count as number) > max) {
      max = count as number
      result = mood
    }
  }
  return result
})

const submitCheckin = async () => {
  if (!selectedMood.value) return
  saving.value = true
  try {
    await moodApi.checkin({
      mood: selectedMood.value,
      note: note.value || undefined,
      stress: stress.value,
      workload: workload.value,
    })
    await fetchToday()
    await fetchTeamPulse()
    showNote.value = false
    selectedMood.value = ''
    note.value = ''
  } catch {
    // non-critical
  } finally {
    saving.value = false
  }
}

const selectMood = (mood: string) => {
  selectedMood.value = mood
  showNote.value = true
}

const fetchToday = async () => {
  try {
    const res = await moodApi.getToday()
    todayCheckin.value = res.data.data
  } catch {
    // non-critical
  }
}

const fetchTeamPulse = async () => {
  try {
    const res = await moodApi.getTeamPulse()
    teamPulse.value = res.data.data
  } catch {
    // non-critical
  } finally {
    loading.value = false
  }
}

const weekDays = computed(() => {
  if (!teamPulse.value?.dailyTrend) return []
  const lang = localStorage.getItem('taskflow-lang') === 'en' ? 'en' : 'tr'
  const days = lang === 'en'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
  return teamPulse.value.dailyTrend.map((d: any) => {
    const date = new Date(d.date)
    return {
      label: days[date.getDay()],
      score: d.avgMoodScore,
      height: (d.avgMoodScore / 5) * 100,
      count: d.count,
    }
  })
})

onMounted(() => {
  fetchToday()
  fetchTeamPulse()
})
</script>

<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-950">
    <div class="max-w-5xl mx-auto p-4 sm:p-6">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
          <Heart :size="20" class="text-white" />
        </div>
        <div>
          <h1 class="text-xl font-bold">{{ t('pulse.title') }}</h1>
          <p class="text-sm text-surface-500">{{ t('pulse.subtitle') }}</p>
        </div>
      </div>

      <!-- Daily Check-in -->
      <div class="card p-6 mb-6">
        <div v-if="hasCheckedIn" class="text-center py-4">
          <div class="text-4xl mb-2">{{ moodConfig[todayCheckin.mood]?.emoji }}</div>
          <p class="text-sm font-medium" :class="moodConfig[todayCheckin.mood]?.color">
            {{ t(`pulse.moods.${todayCheckin.mood}`) }}
          </p>
          <p class="text-xs text-surface-400 mt-1">{{ t('pulse.checkedInToday') }}</p>
          <p v-if="todayCheckin.note" class="text-sm text-surface-500 mt-3 italic">"{{ todayCheckin.note }}"</p>
        </div>

        <div v-else>
          <h2 class="font-semibold mb-1">{{ t('pulse.howAreYou') }}</h2>
          <p class="text-xs text-surface-400 mb-4">{{ t('pulse.checkInHint') }}</p>

          <div class="flex justify-between gap-2">
            <button
              v-for="mood in moods"
              :key="mood"
              @click="selectMood(mood)"
              class="flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all flex-1"
              :class="selectedMood === mood
                ? moodConfig[mood].bg + ' scale-105'
                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'"
            >
              <span class="text-2xl">{{ moodConfig[mood].emoji }}</span>
              <span class="text-[10px] font-medium" :class="moodConfig[mood].color">{{ t(`pulse.moods.${mood}`) }}</span>
            </button>
          </div>

          <!-- Additional info -->
          <div v-if="showNote" class="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700 space-y-4 animate-fade-in">
            <!-- Stress & Workload -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium mb-2 block">{{ t('pulse.stressLevel') }}</label>
                <div class="flex gap-1">
                  <button
                    v-for="n in 5"
                    :key="n"
                    @click="stress = n"
                    class="flex-1 h-8 rounded-lg transition-all"
                    :class="n <= stress
                      ? n <= 2 ? 'bg-green-500' : n <= 3 ? 'bg-yellow-500' : 'bg-red-500'
                      : 'bg-surface-200 dark:bg-surface-700'"
                  ></button>
                </div>
              </div>
              <div>
                <label class="text-sm font-medium mb-2 block">{{ t('pulse.workloadLevel') }}</label>
                <div class="flex gap-1">
                  <button
                    v-for="n in 5"
                    :key="n"
                    @click="workload = n"
                    class="flex-1 h-8 rounded-lg transition-all"
                    :class="n <= workload
                      ? n <= 2 ? 'bg-blue-400' : n <= 3 ? 'bg-blue-500' : 'bg-blue-600'
                      : 'bg-surface-200 dark:bg-surface-700'"
                  ></button>
                </div>
              </div>
            </div>

            <!-- Note -->
            <div>
              <input v-model="note" type="text" class="input" :placeholder="t('pulse.notePlaceholder')" maxlength="500" />
            </div>

            <button @click="submitCheckin" :disabled="!selectedMood || saving" class="btn-primary w-full">
              <Loader2 v-if="saving" :size="16" class="animate-spin" />
              <Check v-else :size="16" />
              {{ t('pulse.submit') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <Loader2 :size="24" class="animate-spin text-primary-500" />
      </div>

      <!-- Team Pulse -->
      <div v-else-if="teamPulse" class="space-y-4">
        <!-- Overview cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="card p-4">
            <Users :size="16" class="text-blue-500 mb-2" />
            <p class="text-2xl font-bold">{{ teamPulse.totalMembers }}</p>
            <p class="text-xs text-surface-400">{{ t('pulse.totalMembers') }}</p>
          </div>
          <div class="card p-4">
            <Check :size="16" class="text-green-500 mb-2" />
            <p class="text-2xl font-bold">{{ teamPulse.checkedInToday }}</p>
            <p class="text-xs text-surface-400">{{ t('pulse.checkedInToday') }}</p>
          </div>
          <div class="card p-4">
            <Activity :size="16" class="text-purple-500 mb-2" />
            <p class="text-2xl font-bold">{{ teamPulse.todayRate?.toFixed(0) }}%</p>
            <p class="text-xs text-surface-400">{{ t('pulse.participationRate') }}</p>
          </div>
          <div class="card p-4">
            <TrendingUp :size="16" class="text-orange-500 mb-2" />
            <p class="text-2xl font-bold">{{ teamPulse.avgStress?.toFixed(1) || '—' }}</p>
            <p class="text-xs text-surface-400">{{ t('pulse.avgStress') }}</p>
          </div>
        </div>

        <!-- Mood Distribution -->
        <div class="card p-5">
          <h3 class="font-semibold text-sm mb-4">{{ t('pulse.moodDistribution') }}</h3>
          <div class="space-y-2">
            <div v-for="mood in moods" :key="mood" class="flex items-center gap-3">
              <span class="text-lg w-8">{{ moodConfig[mood].emoji }}</span>
              <span class="text-xs w-20" :class="moodConfig[mood].color">{{ t(`pulse.moods.${mood}`) }}</span>
              <div class="flex-1 h-6 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  :class="mood === 'great' ? 'bg-green-500' : mood === 'good' ? 'bg-blue-500' : mood === 'okay' ? 'bg-yellow-500' : mood === 'stressed' ? 'bg-orange-500' : 'bg-red-500'"
                  :style="{ width: ((teamPulse.moodCounts[mood] || 0) / Math.max(teamPulse.totalMembers, 1) * 100) + '%' }"
                ></div>
              </div>
              <span class="text-xs text-surface-400 w-8 text-right">{{ teamPulse.moodCounts[mood] || 0 }}</span>
            </div>
          </div>
        </div>

        <!-- Burnout Risk Alert -->
        <div v-if="teamPulse.atRiskUsers?.length" class="card p-5 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
          <div class="flex items-center gap-2 mb-3">
            <AlertTriangle :size="16" class="text-red-500" />
            <h3 class="font-semibold text-sm text-red-600 dark:text-red-400">{{ t('pulse.burnoutRisk') }}</h3>
          </div>
          <div class="space-y-2">
            <div v-for="user in teamPulse.atRiskUsers" :key="user.userId" class="flex items-center gap-3">
              <img v-if="user.avatar" :src="user.avatar" class="w-8 h-8 rounded-full" />
              <div v-else class="w-8 h-8 rounded-full bg-surface-300 dark:bg-surface-600 flex items-center justify-center text-xs font-bold">
                {{ user.name?.charAt(0) }}
              </div>
              <span class="text-sm font-medium flex-1">{{ user.name }}</span>
              <span class="text-lg">{{ moodConfig[user.mood]?.emoji }}</span>
              <span v-if="user.stress" class="text-xs text-red-500">{{ t('pulse.stress') }}: {{ user.stress }}/5</span>
            </div>
          </div>
        </div>

        <!-- Weekly Trend -->
        <div class="card p-5">
          <h3 class="font-semibold text-sm mb-4">{{ t('pulse.weeklyTrend') }}</h3>
          <div class="flex items-end justify-between gap-1 h-32">
            <div v-for="(day, i) in weekDays" :key="i" class="flex flex-col items-center gap-1 flex-1">
              <span v-if="day.count > 0" class="text-[10px] text-surface-400">{{ day.score.toFixed(1) }}</span>
              <div
                class="w-full rounded-t transition-all min-h-[2px]"
                :class="day.score >= 4 ? 'bg-green-500' : day.score >= 3 ? 'bg-yellow-500' : day.score > 0 ? 'bg-red-500' : 'bg-surface-200 dark:bg-surface-700'"
                :style="{ height: day.height + '%' }"
              ></div>
              <span class="text-[10px] text-surface-400">{{ day.label }}</span>
            </div>
          </div>
        </div>

        <!-- Recent Check-ins -->
        <div v-if="teamPulse.recentCheckins?.length" class="card p-5">
          <h3 class="font-semibold text-sm mb-4">{{ t('pulse.recentCheckins') }}</h3>
          <div class="space-y-3">
            <div v-for="checkin in teamPulse.recentCheckins.slice(0, 5)" :key="checkin.id" class="flex items-start gap-3">
              <img v-if="checkin.user?.avatar" :src="checkin.user.avatar" class="w-8 h-8 rounded-full" />
              <div v-else class="w-8 h-8 rounded-full bg-surface-300 dark:bg-surface-600 flex items-center justify-center text-xs font-bold">
                {{ checkin.user?.name?.charAt(0) }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium">{{ checkin.user?.name }}</span>
                  <span class="text-lg">{{ moodConfig[checkin.mood]?.emoji }}</span>
                </div>
                <p v-if="checkin.note" class="text-xs text-surface-500 mt-0.5 italic">"{{ checkin.note }}"</p>
                <p class="text-[10px] text-surface-400 mt-0.5">{{ new Date(checkin.createdAt).toLocaleDateString() }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
