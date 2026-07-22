<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { Sparkles, Mail, Lock, ArrowRight, Loader2, Sun, Moon, Brain, Users, TrendingUp } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const email = ref('')
const password = ref('')
const error = ref('')
const showPassword = ref(false)

const loading = computed(() => authStore.loading)

const handleSubmit = async () => {
  error.value = ''
  try {
    await authStore.login(email.value, password.value)
    router.push('/')
  } catch (e: any) {
    error.value = e.response?.data?.error || t('login.error')
  }
}
</script>

<template>
  <div class="min-h-screen flex">
    <!-- Left: Branding -->
    <div class="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-600 via-purple-600 to-pink-600">
      <div class="absolute inset-0 dot-bg opacity-20"></div>
      <div class="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-blob"></div>
      <div class="absolute bottom-20 right-10 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl animate-blob" style="animation-delay: 3s"></div>

      <div class="relative z-10 flex flex-col justify-between p-12 text-white">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Sparkles :size="24" />
          </div>
          <span class="text-xl font-bold">TaskFlow AI</span>
        </div>

        <div class="max-w-md">
          <h1 class="text-4xl font-bold leading-tight mb-4">
            {{ t('login.welcomeTitle') }}
          </h1>
          <p class="text-white/70 text-lg mb-8">
            {{ t('login.welcomeSubtitle') }}
          </p>
          <div class="space-y-3">
            <div v-for="feat in [
              { icon: Brain, text: t('login.feat1') },
              { icon: Users, text: t('login.feat2') },
              { icon: TrendingUp, text: t('login.feat3') },
            ]" :key="feat.text" class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <component :is="feat.icon" :size="16" />
              </div>
              <span class="text-sm text-white/80">{{ feat.text }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-8">
          <div>
            <p class="text-2xl font-bold">50K+</p>
            <p class="text-xs text-white/60">{{ t('landing.stats.activeUsers') }}</p>
          </div>
          <div class="w-px h-10 bg-white/20"></div>
          <div>
            <p class="text-2xl font-bold">2M+</p>
            <p class="text-xs text-white/60">{{ t('landing.stats.tasksCompleted') }}</p>
          </div>
          <div class="w-px h-10 bg-white/20"></div>
          <div>
            <p class="text-2xl font-bold">4.9★</p>
            <p class="text-xs text-white/60">{{ t('landing.stats.rating') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Right: Form -->
    <div class="flex-1 flex flex-col bg-white dark:bg-surface-950">
      <div class="flex items-center justify-between p-6">
        <router-link to="/" class="lg:hidden flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white">
            <Sparkles :size="16" />
          </div>
          <span class="font-bold">TaskFlow<span class="gradient-text"> AI</span></span>
        </router-link>
        <div class="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <button @click="themeStore.toggle()" class="btn-ghost p-2">
            <Sun v-if="themeStore.isDark" :size="18" />
            <Moon v-else :size="18" />
          </button>
        </div>
      </div>

      <div class="flex-1 flex items-center justify-center px-6 pb-12">
        <div class="w-full max-w-sm animate-scale-in">
          <h2 class="text-2xl font-bold mb-1">{{ t('login.title') }}</h2>
          <p class="text-sm text-surface-500 dark:text-surface-400 mb-8">{{ t('login.subtitle') }}</p>

          <form @submit.prevent="handleSubmit" class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">{{ t('login.email') }}</label>
              <div class="relative">
                <Mail class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" :size="18" />
                <input v-model="email" type="email" required :placeholder="t('common.email')" class="input pl-10" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">{{ t('login.password') }}</label>
              <div class="relative">
                <Lock class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" :size="18" />
                <input v-model="password" :type="showPassword ? 'text' : 'password'" required placeholder="••••••••" class="input pl-10 pr-10" />
                <button type="button" @click="showPassword = !showPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 text-xs font-medium">
                  {{ showPassword ? t('login.hide') : t('login.show') }}
                </button>
              </div>
            </div>

            <div v-if="error" class="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
              {{ error }}
            </div>

            <button type="submit" :disabled="loading" class="btn-primary w-full">
              <Loader2 v-if="loading" :size="18" class="animate-spin" />
              <span v-else>{{ t('login.signIn') }}</span>
              <ArrowRight v-if="!loading" :size="18" />
            </button>
          </form>

          <div class="mt-6 text-center text-sm text-surface-500 dark:text-surface-400">
            {{ t('login.noAccount') }}
            <router-link to="/register" class="text-primary-600 hover:text-primary-700 font-medium">{{ t('login.signUpFree') }}</router-link>
          </div>

          <div class="mt-6 pt-6 border-t border-surface-200 dark:border-surface-800">
            <div class="text-xs text-center text-surface-400">
              {{ t('login.demoCredentials') }}
            </div>
          </div>

          <div class="mt-4 text-center">
            <router-link to="/" class="text-xs text-surface-400 hover:text-primary-500">{{ t('login.backHome') }}</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
