import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'
import type { User, Permission, Role } from '@/types'
import { ROLE_HIERARCHY } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'))
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isAtLeastDirector = computed(() => (user.value ? ROLE_HIERARCHY[user.value.role] >= ROLE_HIERARCHY.DIRECTOR : false))
  const isAtLeastManager = computed(() => (user.value ? ROLE_HIERARCHY[user.value.role] >= ROLE_HIERARCHY.MANAGER : false))
  const isAtLeastTeamLeader = computed(() => (user.value ? ROLE_HIERARCHY[user.value.role] >= ROLE_HIERARCHY.TEAM_LEADER : false))

  const hasPermission = (permission: Permission) => {
    return user.value?.permissions?.includes(permission) ?? false
  }

  const hasAnyPermission = (permissions: Permission[]) => {
    return permissions.some((p) => hasPermission(p))
  }

  const isRoleAtLeast = (minRole: Role) => {
    if (!user.value) return false
    return ROLE_HIERARCHY[user.value.role] >= ROLE_HIERARCHY[minRole]
  }

  const setAuth = (newToken: string, newUser: User, newRefreshToken?: string) => {
    token.value = newToken
    user.value = newUser
    localStorage.setItem('token', newToken)
    if (newRefreshToken) {
      refreshToken.value = newRefreshToken
      localStorage.setItem('refreshToken', newRefreshToken)
    }
  }

  const register = async (name: string, email: string, password: string) => {
    loading.value = true
    try {
      const res = await authApi.register({ name, email, password })
      setAuth(res.data.data.token, res.data.data.user, res.data.data.refreshToken)
      return res.data
    } finally {
      loading.value = false
    }
  }

  const login = async (email: string, password: string) => {
    loading.value = true
    try {
      const res = await authApi.login({ email, password })
      setAuth(res.data.data.token, res.data.data.user, res.data.data.refreshToken)
      return res.data
    } finally {
      loading.value = false
    }
  }

  const fetchMe = async () => {
    if (!token.value) return
    try {
      const res = await authApi.getMe()
      user.value = res.data.data
    } catch {
      await logout()
    }
  }

  const refresh = async () => {
    if (!refreshToken.value) throw new Error('No refresh token')
    try {
      const res = await authApi.refresh(refreshToken.value)
      token.value = res.data.data.accessToken
      refreshToken.value = res.data.data.refreshToken
      localStorage.setItem('token', res.data.data.accessToken)
      localStorage.setItem('refreshToken', res.data.data.refreshToken)
    } catch {
      logout()
      throw new Error('Refresh failed')
    }
  }

  const logout = async () => {
    if (refreshToken.value) {
      try { await authApi.logout(refreshToken.value) } catch { /* ignore */ }
    }
    token.value = null
    refreshToken.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
  }

  return {
    token, refreshToken, user, loading, isAuthenticated,
    isAdmin, isAtLeastDirector, isAtLeastManager, isAtLeastTeamLeader,
    hasPermission, hasAnyPermission, isRoleAtLeast,
    register, login, logout, fetchMe, refresh, setAuth,
  }
})
