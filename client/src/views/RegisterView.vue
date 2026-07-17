<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { Sparkles, User, Mail, Lock, ArrowRight, Loader2, Sun, Moon, Brain, Users, TrendingUp, Check } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const showPassword = ref(false)

const loading = computed(() => authStore.loading)

const passwordStrength = computed(() => {
  const p = password.value
  if (!p) return { score: 0, label: '', color: '' }
  let score = 0
  if (p.length >= 6) score++
  if (p.length >= 10) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  const labels = ['', t('register.passwordStrength.weak'), t('register.passwordStrength.fair'), t('register.passwordStrength.good'), t('register.passwordStrength.strong'), t('register.passwordStrength.excellent')]
  const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500']
  return { score, label: labels[score], color: colors[score] }
})

const handleSubmit = async () => {
  error.value = ''
  try {
    await authStore.register(name.value, email.value, password.value)
    router.push('/')
  } catch (e: any) {
    error.value = e.response?.data?.error || t('register.error')
  }
}
</script>

<template>
  <div class="min-h-screen flex">
    <!-- Left: Branding -->
    <div class="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-violet-600 via-primary-600 to-blue-600">
      <div class="absolute inset-0 dot-bg opacity-20"></div>
      <div class="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-blob"></div>
      <div class="absolute bottom-20 left-10 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl animate-blob" style="animation-delay: 3s"></div>

      <div class="relative z-10 flex flex-col justify-between p-12 text-white">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Sparkles :size="24" />
          </div>
          <span class="text-xl font-bold">TaskFlow AI</span>
        </div>

        <div class="max-w-md">
          <h1 class="text-4xl font-bold leading-tight mb-4">
            {{ t('register.welcomeTitle') }}
          </h1>
          <p class="text-white/70 text-lg mb-8">
            {{ t('register.welcomeSubtitle') }}
          </p>
          <div class="space-y-3">
            <div v-for="feat in [
              { icon: Check, text: t('register.feat1') },
              { icon: Brain, text: t('register.feat2') },
              { icon: Users, text: t('register.feat3') },
              { icon: TrendingUp, text: t('register.feat4') },
            ]" :key="feat.text" class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <component :is="feat.icon" :size="16" />
              </div>
              <span class="text-sm text-white/80">{{ feat.text }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-6">
          <div class="flex -space-x-2">
            <div v-for="i in 4" :key="i" class="w-8 h-8 rounded-full border-2 border-primary-600 flex items-center justify-center text-xs font-bold" :class="['bg-pink-400', 'bg-blue-400', 'bg-green-400', 'bg-orange-400'][i-1]">
              {{ ['SC', 'MW', 'AD', 'JP'][i-1] }}
            </div>
          </div>
          <div>
            <div class="flex items-center gap-1 mb-0.5">
              <span class="text-yellow-300 text-sm">★★★★★</span>
            </div>
            <p class="text-xs text-white/60">{{ t('register.lovedBy') }}</p>
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
          <h2 class="text-2xl font-bold mb-1">{{ t('register.title') }}</h2>
          <p class="text-sm text-surface-500 dark:text-surface-400 mb-8">{{ t('register.subtitle') }}</p>

          <form @submit.prevent="handleSubmit" class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">{{ t('register.name') }}</label>
              <div class="relative">
                <User class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" :size="18" />
                <input v-model="name" type="text" required :placeholder="t('register.namePlaceholder')" class="input pl-10" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">{{ t('register.email') }}</label>
              <div class="relative">
                <Mail class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" :size="18" />
                <input v-model="email" type="email" required :placeholder="t('common.email')" class="input pl-10" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">{{ t('register.password') }}</label>
              <div class="relative">
                <Lock class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" :size="18" />
                <input v-model="password" :type="showPassword ? 'text' : 'password'" required minlength="6" placeholder="••••••••" class="input pl-10 pr-10" />
                <button type="button" @click="showPassword = !showPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 text-xs font-medium">
                  {{ showPassword ? t('register.hide') : t('register.show') }}
                </button>
              </div>
              <!-- Password strength bar -->
              <div v-if="password" class="mt-2">
                <div class="flex gap-1">
                  <div v-for="i in 5" :key="i" class="h-1 flex-1 rounded-full transition-colors" :class="i <= passwordStrength.score ? passwordStrength.color : 'bg-surface-200 dark:bg-surface-700'"></div>
                </div>
                <p class="text-[10px] text-surface-400 mt-1">{{ passwordStrength.label }}</p>
              </div>
            </div>

            <div v-if="error" class="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
              {{ error }}
            </div>

            <button type="submit" :disabled="loading" class="btn-primary w-full">
              <Loader2 v-if="loading" :size="18" class="animate-spin" />
              <span v-else>{{ t('register.createAccount') }}</span>
              <ArrowRight v-if="!loading" :size="18" />
            </button>
          </form>

          <div class="mt-6 text-center text-sm text-surface-500 dark:text-surface-400">
            {{ t('register.haveAccount') }}
            <router-link to="/login" class="text-primary-600 hover:text-primary-700 font-medium">{{ t('register.signIn') }}</router-link>
          </div>

          <div class="mt-4 text-center">
            <router-link to="/" class="text-xs text-surface-400 hover:text-primary-500">{{ t('register.backHome') }}</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
