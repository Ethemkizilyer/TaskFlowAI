<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useMessageStore } from '@/stores/message'
import { connectSocket, disconnectSocket } from '@/api/socket'
import Navbar from '@/components/Navbar.vue'

const authStore = useAuthStore()
const route = useRoute()
const themeStore = useThemeStore()
const messageStore = useMessageStore()

const showNavbar = computed(() => {
  return authStore.isAuthenticated && route.meta.requiresAuth
})

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
  }
})

watch(() => authStore.token, (newToken, oldToken) => {
  if (newToken && !oldToken) {
    connectSocket()
    messageStore.init()
    messageStore.fetchUnreadCount()
  } else if (!newToken && oldToken) {
    disconnectSocket()
    messageStore.destroy()
  }
})
</script>

<template>
  <div>
    <Navbar v-if="showNavbar" />
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
