<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { aiApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import {
  Sun, Sparkles, AlertTriangle, Lightbulb, Target, TrendingUp,
  Loader2, RefreshCw, Coffee, Zap, ArrowRight, Calendar
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const briefing = ref<any>(null)
const error = ref('')
const currentTime = new Date()
const hour = currentTime.getHours()

const greetingEmoji = hour < 12 ? '☀️' : hour < 18 ? '🌤️' : '🌙'

const fetchBriefing = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await aiApi.getDailyBriefing()
    briefing.value = res.data.data
  } catch (e: any) {
    error.value = e.response?.data?.error || t('briefing.error')
  } finally {
    loading.value = false
  }
}

const urgencyConfig: Record<string, { color: string; bg: string; icon: any }> = {
  high: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', icon: Zap },
  medium: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30', icon: Target },
  low: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', icon: ArrowRight },
}

onMounted(() => {
  fetchBriefing()
})
</script>

<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-950">
    <div class="max-w-4xl mx-auto p-4 sm:p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Sun :size="20" class="text-white" />
          </div>
          <div>
            <h1 class="text-xl font-bold">{{ t('briefing.title') }}</h1>
            <p class="text-sm text-surface-500">{{ new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) }}</p>
          </div>
        </div>
        <button @click="fetchBriefing" :disabled="loading" class="btn-ghost p-2">
          <RefreshCw :size="18" :class="{ 'animate-spin': loading }" />
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <div class="relative">
          <div class="w-16 h-16 rounded-full border-4 border-primary-200 dark:border-surface-700"></div>
          <div class="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary-500 border-t-transparent animate-spin"></div>
          <Sparkles :size="20" class="absolute inset-0 m-auto text-primary-500" />
        </div>
        <p class="text-sm text-surface-500 mt-4">{{ t('briefing.generating') }}</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="card p-6 text-center">
        <AlertTriangle :size="32" class="text-red-500 mx-auto mb-3" />
        <p class="text-sm text-surface-500">{{ error }}</p>
        <button @click="fetchBriefing" class="btn-primary mt-4">
          <RefreshCw :size="16" /> {{ t('briefing.retry') }}
        </button>
      </div>

      <!-- Briefing Content -->
      <div v-else-if="briefing" class="space-y-6 animate-fade-in">
        <!-- Greeting + Summary -->
        <div class="card p-6 bg-gradient-to-br from-primary-50 to-white dark:from-surface-900 dark:to-surface-800 border-primary-200 dark:border-surface-700">
          <div class="flex items-start gap-4">
            <div class="text-3xl">{{ greetingEmoji }}</div>
            <div class="flex-1">
              <h2 class="text-lg font-bold mb-1">{{ briefing.greeting }}</h2>
              <p class="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">{{ briefing.summary }}</p>
            </div>
          </div>
        </div>

        <!-- Priorities -->
        <div v-if="briefing.priorities?.length" class="card p-6">
          <div class="flex items-center gap-2 mb-4">
            <Target :size="18" class="text-primary-500" />
            <h3 class="font-semibold">{{ t('briefing.priorities') }}</h3>
          </div>
          <div class="space-y-3">
            <div
              v-for="(p, i) in briefing.priorities"
              :key="i"
              class="flex items-start gap-3 p-3 rounded-xl"
              :class="urgencyConfig[p.urgency]?.bg || 'bg-surface-50 dark:bg-surface-800/50'"
            >
              <div class="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" :class="urgencyConfig[p.urgency]?.bg">
                <component :is="urgencyConfig[p.urgency]?.icon || ArrowRight" :size="16" :class="urgencyConfig[p.urgency]?.color" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium">{{ p.title }}</p>
                <p class="text-xs text-surface-500 mt-0.5">{{ p.reason }}</p>
              </div>
              <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" :class="urgencyConfig[p.urgency]?.color">
                {{ t(`briefing.urgency.${p.urgency}`) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Risks & Recommendations Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Risks -->
          <div v-if="briefing.risks?.length" class="card p-5">
            <div class="flex items-center gap-2 mb-3">
              <AlertTriangle :size="16" class="text-red-500" />
              <h3 class="font-semibold text-sm">{{ t('briefing.risks') }}</h3>
            </div>
            <ul class="space-y-2">
              <li v-for="(r, i) in briefing.risks" :key="i" class="flex items-start gap-2 text-sm text-surface-600 dark:text-surface-300">
                <span class="text-red-500 mt-0.5">•</span>
                {{ r }}
              </li>
            </ul>
          </div>

          <!-- Recommendations -->
          <div v-if="briefing.recommendations?.length" class="card p-5">
            <div class="flex items-center gap-2 mb-3">
              <Lightbulb :size="16" class="text-amber-500" />
              <h3 class="font-semibold text-sm">{{ t('briefing.recommendations') }}</h3>
            </div>
            <ul class="space-y-2">
              <li v-for="(r, i) in briefing.recommendations" :key="i" class="flex items-start gap-2 text-sm text-surface-600 dark:text-surface-300">
                <span class="text-amber-500 mt-0.5">•</span>
                {{ r }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Focus Tip -->
        <div v-if="briefing.focusTip" class="card p-5 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-200 dark:border-violet-800">
          <div class="flex items-start gap-3">
            <Coffee :size="20" class="text-violet-500 shrink-0 mt-0.5" />
            <div>
              <p class="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-1">{{ t('briefing.focusTip') }}</p>
              <p class="text-sm text-surface-700 dark:text-surface-200">{{ briefing.focusTip }}</p>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="flex flex-wrap gap-3">
          <button @click="router.push('/')" class="btn-primary">
            <TrendingUp :size="16" /> {{ t('briefing.goDashboard') }}
          </button>
          <button @click="router.push('/focus')" class="btn-ghost">
            <Coffee :size="16" /> {{ t('briefing.startFocus') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
