import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { gamificationApi } from '@/api'

interface Achievement {
  id: string
  type: string
  name: string
  description: string
  icon: string
  xpReward: number
  threshold?: number
  unlockedAt?: string
}

interface GamificationStats {
  xp: number
  level: number
  streak: number
  progressPct: number
  xpInLevel: number
  xpForNextLevel: number
  unlockedAchievements: Achievement[]
  lockedAchievements: Achievement[]
}

interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  avatar: string | null
  role: string
  xp: number
  level: number
  streak: number
}

export const useGamificationStore = defineStore('gamification', () => {
  const stats = ref<GamificationStats | null>(null)
  const leaderboard = ref<LeaderboardEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const hasStats = computed(() => stats.value !== null)

  async function fetchStats() {
    loading.value = true
    error.value = null
    try {
      const res = await gamificationApi.getStats()
      stats.value = res.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to load stats'
    } finally {
      loading.value = false
    }
  }

  async function fetchLeaderboard() {
    try {
      const res = await gamificationApi.getLeaderboard()
      leaderboard.value = res.data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to load leaderboard'
    }
  }

  async function fetchAll() {
    await Promise.all([fetchStats(), fetchLeaderboard()])
  }

  return {
    stats,
    leaderboard,
    loading,
    error,
    hasStats,
    fetchStats,
    fetchLeaderboard,
    fetchAll,
  }
})
