<script setup lang="ts">
import { onMounted, watch, computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useMessageStore } from '@/stores/message'
import { connectSocket, disconnectSocket, onNotificationReceived } from '@/api/socket'
import { userApi } from '@/api'
import Navbar from '@/components/Navbar.vue'
import CommandPalette from '@/components/CommandPalette.vue'

const authStore = useAuthStore()
const route = useRoute()
const themeStore = useThemeStore()
const messageStore = useMessageStore()

const showNavbar = computed(() => {
  return authStore.isAuthenticated && route.meta.requiresAuth
})

const notificationBadge = ref(0)

const refreshNotificationCount = async () => {
  try {
    const res = await userApi.getNotifications(true)
    notificationBadge.value = res.data.meta?.unreadCount || 0
  } catch {
    // ignore
  }
}

let unsubNotification: (() => void) | null = null

onMounted(async () => {
  themeStore.mode
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
  if (authStore.token) {
    await authStore.fetchMe()
    connectSocket()
    messageStore.init()
    messageStore.fetchUnreadCount()
    refreshNotificationCount()
    unsubNotification = onNotificationReceived((notification) => {
      notificationBadge.value++
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, { body: notification.message })
      }
    })
  }
})

watch(() => authStore.token, (newToken, oldToken) => {
  if (newToken && !oldToken) {
    connectSocket()
    messageStore.init()
    messageStore.fetchUnreadCount()
    refreshNotificationCount()
    unsubNotification = onNotificationReceived((notification) => {
      notificationBadge.value++
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, { body: notification.message })
      }
    })
  } else if (!newToken && oldToken) {
    disconnectSocket()
    messageStore.destroy()
    if (unsubNotification) { unsubNotification(); unsubNotification = null }
    notificationBadge.value = 0
  }
})
</script>

<template>
  <div>
    <Navbar v-if="showNavbar" :notification-badge="notificationBadge" @notifications-read="notificationBadge = 0" />
    <CommandPalette v-if="showNavbar" />
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
