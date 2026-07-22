<script setup lang="ts">
import { onMounted } from 'vue'
import { useGamificationStore } from '@/stores/gamification'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import {
  Trophy, Flame, Star, Zap, Lock, Crown, Medal, Award,
  TrendingUp, Loader2, Target
} from 'lucide-vue-next'

const { t: _t } = useI18n()
const gamificationStore = useGamificationStore()
const authStore = useAuthStore()

const t = (key: string) => _t(`gamification.${key}`)

onMounted(() => {
  gamificationStore.fetchAll()
})
</script>

<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-950">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-8">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white">
          <Trophy :size="22" />
        </div>
        <div>
          <h1 class="text-2xl font-bold">{{ t('title') }}</h1>
          <p class="text-sm text-surface-500">{{ t('subtitle') }}</p>
        </div>
      </div>

      <div v-if="gamificationStore.loading" class="flex items-center justify-center py-20">
        <Loader2 :size="32" class="animate-spin text-primary-500" />
      </div>

      <div v-else-if="gamificationStore.stats" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Level & XP Card -->
        <div class="lg:col-span-2 card p-6">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-4">
              <div class="relative">
                <div class="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-2xl font-bold">
                  {{ gamificationStore.stats.level }}
                </div>
                <div class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center text-white border-2 border-white dark:border-surface-900">
                  <Star :size="14" />
                </div>
              </div>
              <div>
                <p class="text-xs text-surface-500 uppercase tracking-wide">{{ t('level') }}</p>
                <p class="text-2xl font-bold">{{ gamificationStore.stats.level }}</p>
                <p class="text-sm text-surface-500">{{ gamificationStore.stats.xp.toLocaleString() }} XP</p>
              </div>
            </div>

            <div class="flex flex-col items-end gap-2">
              <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                <Flame :size="16" class="text-orange-500" />
                <span class="text-sm font-bold text-orange-600 dark:text-orange-400">{{ gamificationStore.stats.streak }} {{ t('days') }}</span>
              </div>
            </div>
          </div>

          <!-- XP Progress Bar -->
          <div class="mb-2 flex items-center justify-between text-sm">
            <span class="text-surface-500">{{ t('progress') }}</span>
            <span class="font-medium">{{ gamificationStore.stats.xpInLevel }} / {{ gamificationStore.stats.xpForNextLevel }} XP</span>
          </div>
          <div class="h-3 rounded-full bg-surface-200 dark:bg-surface-800 overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
              :style="{ width: `${gamificationStore.stats.progressPct}%` }"
            />
          </div>
          <p class="text-xs text-surface-400 mt-2">
            {{ gamificationStore.stats.xpForNextLevel - gamificationStore.stats.xpInLevel }} XP {{ t('toNextLevel') }}
          </p>
        </div>

        <!-- Quick Stats -->
        <div class="card p-6 flex flex-col gap-4">
          <h3 class="font-semibold text-sm text-surface-500 uppercase tracking-wide">{{ t('quickStats') }}</h3>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
              <Award :size="18" class="text-amber-500" />
            </div>
            <div>
              <p class="text-lg font-bold">{{ gamificationStore.stats.unlockedAchievements.length }}</p>
              <p class="text-xs text-surface-500">{{ t('achievementsUnlocked') }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center">
              <Target :size="18" class="text-violet-500" />
            </div>
            <div>
              <p class="text-lg font-bold">{{ gamificationStore.stats.lockedAchievements.length }}</p>
              <p class="text-xs text-surface-500">{{ t('achievementsLocked') }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
              <Flame :size="18" class="text-orange-500" />
            </div>
            <div>
              <p class="text-lg font-bold">{{ gamificationStore.stats.streak }}</p>
              <p class="text-xs text-surface-500">{{ t('dayStreak') }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Leaderboard -->
      <div v-if="gamificationStore.leaderboard.length > 0" class="mt-6 card p-6">
        <div class="flex items-center gap-2 mb-4">
          <Crown :size="20" class="text-amber-500" />
          <h2 class="font-bold text-lg">{{ t('leaderboard') }}</h2>
        </div>
        <div class="space-y-2">
          <div
            v-for="entry in gamificationStore.leaderboard"
            :key="entry.userId"
            class="flex items-center gap-4 p-3 rounded-xl transition-colors"
            :class="[
              entry.userId === authStore.user?.id ? 'bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800' : 'hover:bg-surface-50 dark:hover:bg-surface-800/50'
            ]"
          >
            <div class="w-8 text-center font-bold text-lg" :class="entry.rank === 1 ? 'text-amber-500' : entry.rank === 2 ? 'text-slate-400' : entry.rank === 3 ? 'text-orange-400' : 'text-surface-400'">
              {{ entry.rank }}
            </div>
            <img :src="entry.avatar || ''" :alt="entry.name" class="w-10 h-10 rounded-full bg-surface-200" />
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ entry.name }}{{ entry.userId === authStore.user?.id ? ` (${t('you')})` : '' }}</p>
              <p class="text-xs text-surface-500">{{ t('level') }} {{ entry.level }} · {{ entry.streak }} {{ t('dayStreak') }}</p>
            </div>
            <div class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-100 dark:bg-surface-800">
              <Zap :size="14" class="text-primary-500" />
              <span class="font-bold text-sm">{{ entry.xp.toLocaleString() }}</span>
            </div>
            <Medal v-if="entry.rank <= 3" :size="18" :class="entry.rank === 1 ? 'text-amber-400' : entry.rank === 2 ? 'text-slate-400' : 'text-orange-400'" />
          </div>
        </div>
      </div>

      <!-- Achievements -->
      <div v-if="gamificationStore.stats" class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Unlocked -->
        <div class="card p-6">
          <div class="flex items-center gap-2 mb-4">
            <Trophy :size="20" class="text-amber-500" />
            <h2 class="font-bold text-lg">{{ t('unlocked') }}</h2>
            <span class="ml-auto text-xs text-surface-500">{{ gamificationStore.stats.unlockedAchievements.length }}/{{ gamificationStore.stats.unlockedAchievements.length + gamificationStore.stats.lockedAchievements.length }}</span>
          </div>
          <div v-if="gamificationStore.stats.unlockedAchievements.length === 0" class="text-center py-8 text-surface-400 text-sm">
            {{ t('noUnlocked') }}
          </div>
          <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div
              v-for="ach in gamificationStore.stats.unlockedAchievements"
              :key="ach.id"
              class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 text-center"
            >
              <div class="text-3xl mb-1">{{ ach.icon }}</div>
              <p class="text-xs font-semibold">{{ ach.name }}</p>
              <p class="text-[10px] text-surface-500 mt-0.5">{{ ach.description }}</p>
              <div class="flex items-center justify-center gap-1 mt-1.5">
                <Zap :size="10" class="text-primary-500" />
                <span class="text-[10px] font-bold text-primary-500">+{{ ach.xpReward }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Locked -->
        <div class="card p-6">
          <div class="flex items-center gap-2 mb-4">
            <Lock :size="20" class="text-surface-400" />
            <h2 class="font-bold text-lg">{{ t('locked') }}</h2>
            <span class="ml-auto text-xs text-surface-500">{{ gamificationStore.stats.lockedAchievements.length }}</span>
          </div>
          <div v-if="gamificationStore.stats.lockedAchievements.length === 0" class="text-center py-8 text-surface-400 text-sm">
            {{ t('allUnlocked') }}
          </div>
          <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div
              v-for="ach in gamificationStore.stats.lockedAchievements"
              :key="ach.id"
              class="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/30 border border-surface-200 dark:border-surface-800 text-center opacity-60"
            >
              <div class="text-3xl mb-1 grayscale">{{ ach.icon }}</div>
              <p class="text-xs font-semibold">{{ ach.name }}</p>
              <p class="text-[10px] text-surface-500 mt-0.5">{{ ach.description }}</p>
              <div class="flex items-center justify-center gap-1 mt-1.5">
                <TrendingUp :size="10" class="text-surface-400" />
                <span class="text-[10px] text-surface-400">{{ ach.threshold }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
