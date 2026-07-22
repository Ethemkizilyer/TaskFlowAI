<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { adminApi, authApi } from '@/api'
import { useI18n } from 'vue-i18n'
import {
  Users, Search, Mail, MessageSquare, Phone, Calendar,
  Shield, Brain, Zap, TrendingUp, Loader2, Building2, Crown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-vue-next'
import { ROLE_LABELS, ROLE_COLORS } from '@/types'

const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const members = ref<any[]>([])
const searchQuery = ref('')
const roleFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(12)
const pageSizeOptions = [12, 24, 48, 96]

const roles = ['ADMIN', 'DIRECTOR', 'MANAGER', 'TEAM_LEADER', 'PERSONNEL']

const filteredMembers = computed(() => {
  return members.value.filter(m => {
    const matchesSearch = !searchQuery.value ||
      m.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesRole = !roleFilter.value || m.role === roleFilter.value
    return matchesSearch && matchesRole
  })
})

const totalFiltered = computed(() => filteredMembers.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalFiltered.value / pageSize.value)))

const paginatedMembers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredMembers.value.slice(start, start + pageSize.value)
})

const paginatedGroupedByRole = computed(() => {
  const groups: Record<string, any[]> = {}
  roles.forEach(r => { groups[r] = [] })
  paginatedMembers.value.forEach(m => {
    if (groups[m.role]) {
      groups[m.role].push(m)
    } else {
      groups[m.role] = [m]
    }
  })
  return groups
})

const startItem = computed(() => totalFiltered.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1)
const endItem = computed(() => Math.min(currentPage.value * pageSize.value, totalFiltered.value))

const onPageSizeChange = () => {
  currentPage.value = 1
}

const goToPage = (page: number) => {
  currentPage.value = Math.max(1, Math.min(totalPages.value, page))
}

const stats = computed(() => [
  { label: t('directory.totalMembers'), value: members.value.length, icon: Users, color: 'from-primary-500 to-primary-700' },
  { label: t('directory.active'), value: members.value.filter(m => m.status === 'ACTIVE').length, icon: TrendingUp, color: 'from-emerald-500 to-green-700' },
  { label: t('directory.departments'), value: new Set(members.value.map(m => m.department?.id).filter(Boolean)).size, icon: Building2, color: 'from-violet-500 to-purple-700' },
  { label: t('directory.teams'), value: new Set(members.value.map(m => m.team?.id).filter(Boolean)).size, icon: Shield, color: 'from-cyan-500 to-blue-700' },
])

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const formatDate = (date: string) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString(locale.value === 'tr' ? 'tr-TR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await adminApi.getUsers(1, 100)
    members.value = res.data.data || []
  } catch {
    try {
      const res = await authApi.getMe()
      members.value = [res.data.data]
    } catch {
      // ignore
    }
  } finally {
    loading.value = false
  }
})

watch([searchQuery, roleFilter], () => {
  currentPage.value = 1
})
</script>

<template>
  <div class="min-h-screen p-4 sm:p-6 lg:p-8 relative z-10">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold flex items-center gap-2">
            <Users :size="24" class="text-primary-500" />
            {{ t('directory.title') }}
          </h1>
          <p class="text-sm text-surface-500 dark:text-surface-400 mt-1">
            {{ t('directory.subtitle') }}
          </p>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div v-for="(stat, i) in stats" :key="i" class="glass-card p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0" :class="stat.color">
            <component :is="stat.icon" :size="20" class="text-white" />
          </div>
          <div>
            <p class="text-xl font-bold">{{ stat.value }}</p>
            <p class="text-xs text-surface-500">{{ stat.label }}</p>
          </div>
        </div>
      </div>

      <!-- Search & filter -->
      <div class="flex flex-col sm:flex-row gap-3 mb-6">
        <div class="relative flex-1">
          <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('directory.searchPlaceholder')"
            class="w-full pl-10 pr-4 py-2.5 rounded-xl glass-card border border-surface-200 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          />
        </div>
        <select
          v-model="roleFilter"
          class="px-4 py-2.5 rounded-xl glass-card border border-surface-200 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
        >
          <option value="">{{ t('directory.allRoles') }}</option>
          <option v-for="role in roles" :key="role" :value="role">{{ t(`roles.${role}`) }}</option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <Loader2 :size="32" class="animate-spin text-primary-500" />
      </div>

      <!-- Members grouped by role -->
      <div v-else class="space-y-8">
        <div v-for="role in roles" :key="role">
          <template v-if="paginatedGroupedByRole[role]?.length > 0">
            <div class="flex items-center gap-2 mb-4">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" :class="(ROLE_COLORS as any)[role]">
                <Shield :size="12" /> {{ t(`roles.${role}`) }}
              </span>
              <span class="text-sm text-surface-400">({{ paginatedGroupedByRole[role].length }})</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div
                v-for="member in paginatedGroupedByRole[role]"
                :key="member.id"
                class="glass-card p-5 hover:shadow-xl transition-all hover:-translate-y-1 group"
              >
                <!-- Avatar -->
                <div class="flex items-start gap-3 mb-3">
                  <div class="relative">
                    <img
                      v-if="member.avatar"
                      :src="member.avatar"
                      :alt="member.name"
                      class="w-14 h-14 rounded-xl object-cover"
                    />
                    <div
                      v-else
                      class="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg"
                    >
                      {{ getInitials(member.name) }}
                    </div>
                    <div
                      class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-surface-900"
                      :class="member.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-surface-400'"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-sm truncate">{{ member.name }}</p>
                    <p class="text-xs text-surface-400 truncate">{{ member.email }}</p>
                  </div>
                </div>

                <!-- Info -->
                <div class="space-y-1.5 text-xs text-surface-500 dark:text-surface-400">
                  <div v-if="member.department" class="flex items-center gap-2">
                    <Building2 :size="12" /> {{ member.department.name }}
                  </div>
                  <div v-if="member.team" class="flex items-center gap-2">
                    <Users :size="12" /> {{ member.team.name }}
                  </div>
                  <div class="flex items-center gap-2">
                    <Calendar :size="12" /> {{ t('directory.joined') }} {{ formatDate(member.createdAt) }}
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 mt-4 pt-3 border-t border-surface-100 dark:border-surface-800">
                  <button
                    @click="router.push('/messages')"
                    class="flex-1 py-1.5 rounded-lg text-xs font-medium glass-strong hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-colors flex items-center justify-center gap-1"
                  >
                    <MessageSquare :size="12" /> {{ t('directory.message') }}
                  </button>
                  <a
                    v-if="member.email"
                    :href="`mailto:${member.email}`"
                    class="p-1.5 rounded-lg glass-strong hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-colors"
                  >
                    <Mail :size="14" />
                  </a>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Empty state -->
        <div v-if="totalFiltered === 0" class="text-center py-20">
          <Users :size="48" class="mx-auto text-surface-300 dark:text-surface-600 mb-4" />
          <p class="text-surface-400">{{ t('directory.noMembers') }}</p>
        </div>

        <!-- Pagination -->
        <div v-if="totalFiltered > 0" class="flex items-center justify-between mt-6 gap-4 flex-wrap pt-4 border-t border-surface-100 dark:border-surface-800">
          <div class="flex items-center gap-3">
            <span class="text-xs text-surface-400">{{ t('directory.rowsPerPage') }}</span>
            <select v-model="pageSize" @change="onPageSizeChange" class="text-xs bg-surface-100 dark:bg-surface-800 rounded-md px-2 py-1 border-0">
              <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
            </select>
            <span class="text-xs text-surface-400">{{ t('directory.showing', { from: startItem, to: endItem, total: totalFiltered }) }}</span>
          </div>
          <div v-if="totalPages > 1" class="flex items-center gap-1">
            <button @click="goToPage(1)" :disabled="currentPage === 1" class="p-1.5 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronsLeft :size="16" />
            </button>
            <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1" class="p-1.5 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft :size="16" />
            </button>
            <span class="px-3 py-1 text-xs font-medium">{{ currentPage }} / {{ totalPages }}</span>
            <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages" class="p-1.5 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight :size="16" />
            </button>
            <button @click="goToPage(totalPages)" :disabled="currentPage === totalPages" class="p-1.5 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronsRight :size="16" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
