<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Sparkles, Mail, Lock, ArrowRight, Loader2 } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')

const loading = computed(() => authStore.loading)

const handleSubmit = async () => {
  error.value = ''
  try {
    await authStore.login(email.value, password.value)
    router.push('/')
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Login failed'
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 via-primary-50 to-surface-100 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950 p-4">
    <div class="w-full max-w-md animate-scale-in">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 text-white mb-4 shadow-lg shadow-primary-600/30">
          <Sparkles :size="32" />
        </div>
        <h1 class="text-3xl font-bold text-surface-900 dark:text-white">TaskFlow AI</h1>
        <p class="text-surface-500 dark:text-surface-400 mt-2">Sign in to your workspace</p>
      </div>

      <div class="card p-8">
        <form @submit.prevent="handleSubmit" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Email</label>
            <div class="relative">
              <Mail class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" :size="18" />
              <input v-model="email" type="email" required placeholder="you@example.com" class="input pl-10" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Password</label>
            <div class="relative">
              <Lock class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" :size="18" />
              <input v-model="password" type="password" required placeholder="••••••••" class="input pl-10" />
            </div>
          </div>

          <div v-if="error" class="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
            {{ error }}
          </div>

          <button type="submit" :disabled="loading" class="btn-primary w-full">
            <Loader2 v-if="loading" :size="18" class="animate-spin" />
            <span v-else>Sign In</span>
            <ArrowRight v-if="!loading" :size="18" />
          </button>
        </form>

        <div class="mt-6 text-center text-sm text-surface-500 dark:text-surface-400">
          Don't have an account?
          <router-link to="/register" class="text-primary-600 hover:text-primary-700 font-medium">Sign up</router-link>
        </div>

        <div class="mt-6 pt-6 border-t border-surface-200 dark:border-surface-800">
          <div class="text-xs text-center text-surface-400">
            Demo: <span class="font-mono">demo@taskflow.ai</span> / <span class="font-mono">user123</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
