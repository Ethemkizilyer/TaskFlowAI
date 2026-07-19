<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import ThreeBackground from '@/components/ThreeBackground.vue'
import { useScrollReveal } from '@/composables/useAnimations'
import {
  Check, X, Sparkles, ArrowRight, Sun, Moon, Zap, Building2,
  Users, Brain, Shield, TrendingUp, MessageSquare, Clock, Star
} from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const themeStore = useThemeStore()

useScrollReveal()

const billingCycle = ref<'monthly' | 'yearly'>('monthly')

const plans = computed(() => [
  {
    name: t('pricing.free'),
    icon: Sparkles,
    color: 'from-surface-400 to-surface-600',
    monthly: 0,
    yearly: 0,
    description: t('pricing.freeDesc'),
    features: [
      { text: t('pricing.free') + ' - 3 ' + t('common.boards'), included: true },
      { text: '5 ' + t('common.teamMembers'), included: true },
      { text: t('common.status'), included: true },
      { text: t('pulse.title'), included: true },
      { text: '7 ' + t('common.days'), included: true },
      { text: t('briefing.title'), included: false },
      { text: t('automation.title'), included: false },
      { text: t('timeTracking.title'), included: false },
    ],
    cta: t('pricing.getStarted'),
    highlight: false,
  },
  {
    name: t('pricing.pro'),
    icon: Zap,
    color: 'from-primary-500 to-primary-700',
    monthly: 12,
    yearly: 120,
    description: t('pricing.proDesc'),
    features: [
      { text: t('common.boards'), included: true },
      { text: '50 ' + t('common.teamMembers'), included: true },
      { text: t('common.status'), included: true },
      { text: t('pulse.title'), included: true },
      { text: t('common.activity'), included: true },
      { text: t('briefing.title'), included: true },
      { text: t('automation.title'), included: true },
      { text: t('timeTracking.title'), included: true },
    ],
    cta: t('pricing.startTrial'),
    highlight: true,
  },
  {
    name: t('pricing.enterprise'),
    icon: Building2,
    color: 'from-violet-500 to-purple-700',
    monthly: 49,
    yearly: 490,
    description: t('pricing.enterpriseDesc'),
    features: [
      { text: t('pricing.pro') + ' +', included: true },
      { text: t('common.teamMembers'), included: true },
      { text: t('common.role'), included: true },
      { text: t('reports.title'), included: true },
      { text: t('settings.integrations'), included: true },
      { text: t('ai.title'), included: true },
      { text: t('common.online'), included: true },
      { text: 'SLA', included: true },
    ],
    cta: t('pricing.contactSales'),
    highlight: false,
  },
])

const faqs = computed(() => t('pricing.faqItems') as unknown as Array<{ q: string; a: string }>)

const activeFaq = ref<number | null>(0)

const getPrice = (plan: typeof plans.value[0]) => {
  if (plan.monthly === 0) return '$0'
  return billingCycle.value === 'monthly' ? `$${plan.monthly}` : `$${plan.yearly}`
}

const getPriceSuffix = () => {
  return billingCycle.value === 'monthly' ? t('pricing.perMonth') : t('pricing.perYear')
}
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-surface-950 overflow-x-hidden relative">
    <ThreeBackground :density="80" :speed="0.3" color-mode="aurora" />

    <!-- Navbar -->
    <nav class="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/20 dark:border-surface-700/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <router-link to="/landing" class="flex items-center gap-2">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary-500/30">
            TF
          </div>
          <span class="font-bold text-lg">TaskFlow<span class="text-primary-500"> AI</span></span>
        </router-link>
        <div class="flex items-center gap-3">
          <LanguageSwitcher />
          <button @click="themeStore.toggle()" class="btn-ghost p-2">
            <Sun v-if="themeStore.isDark" :size="18" />
            <Moon v-else :size="18" />
          </button>
          <router-link to="/login" class="btn-ghost text-sm">{{ t('landing.nav.signIn') }}</router-link>
          <router-link to="/register" class="btn-glow text-sm">{{ t('landing.nav.getStarted') }}</router-link>
        </div>
      </div>
    </nav>

    <!-- Hero -->
    <section class="pt-32 pb-12 relative z-10">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 text-center" data-reveal>
        <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-sm font-medium mb-6">
          <Sparkles :size="14" class="text-primary-500" />
          {{ t('pricing.transparentPricing') }}
        </span>
        <h1 class="text-5xl sm:text-6xl font-bold mb-4">
          {{ t('pricing.subtitle') }}
        </h1>
        <p class="text-lg text-surface-500 dark:text-surface-400 max-w-2xl mx-auto mb-8">
          {{ t('pricing.teamsUsing') }}
        </p>

        <!-- Billing toggle -->
        <div class="inline-flex items-center gap-1 glass-card p-1 rounded-full">
          <button
            @click="billingCycle = 'monthly'"
            class="px-5 py-2 rounded-full text-sm font-medium transition-all"
            :class="billingCycle === 'monthly' ? 'bg-primary-500 text-white shadow-lg' : 'text-surface-500'"
          >
            {{ t('pricing.monthly') }}
          </button>
          <button
            @click="billingCycle = 'yearly'"
            class="px-5 py-2 rounded-full text-sm font-medium transition-all"
            :class="billingCycle === 'yearly' ? 'bg-primary-500 text-white shadow-lg' : 'text-surface-500'"
          >
            {{ t('pricing.yearly') }}
            <span class="ml-1 text-xs text-emerald-500 font-bold">{{ t('pricing.save') }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Plans -->
    <section class="pb-24 relative z-10">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          <div
            v-for="(plan, i) in plans"
            :key="i"
            :data-reveal="'scale'"
            :data-reveal-delay="i + 1"
            class="relative rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2"
            :class="plan.highlight
              ? 'glass-card gradient-border shine-hover shadow-2xl scale-105 ring-2 ring-primary-500/30'
              : 'glass-card shine-hover hover:shadow-xl'"
          >
            <!-- Popular badge -->
            <div v-if="plan.highlight" class="absolute -top-4 left-1/2 -translate-x-1/2">
              <span class="px-4 py-1.5 rounded-full bg-gradient-to-r from-primary-500 to-primary-700 text-white text-xs font-bold shadow-lg">
                {{ t('pricing.mostPopular') }}
              </span>
            </div>

            <!-- Plan icon -->
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br mb-6 flex items-center justify-center" :class="plan.color">
              <component :is="plan.icon" :size="28" class="text-white" />
            </div>

            <!-- Plan name -->
            <h3 class="text-2xl font-bold mb-1">{{ plan.name }}</h3>
            <p class="text-sm text-surface-500 dark:text-surface-400 mb-6">{{ plan.description }}</p>

            <!-- Price -->
            <div class="mb-6">
              <span class="text-5xl font-bold">{{ getPrice(plan) }}</span>
              <span class="text-surface-400 text-lg">{{ getPriceSuffix() }}</span>
            </div>

            <!-- CTA -->
            <button
              @click="router.push(plan.monthly === 0 ? '/register' : '/register')"
              class="w-full py-3 rounded-xl font-semibold transition-all mb-8"
              :class="plan.highlight
                ? 'btn-glow'
                : 'glass-strong border border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-700'"
            >
              {{ plan.cta }}
            </button>

            <!-- Features -->
            <ul class="space-y-3">
              <li v-for="(f, fi) in plan.features" :key="fi" class="flex items-start gap-3 text-sm">
                <Check v-if="f.included" :size="18" class="text-emerald-500 shrink-0 mt-0.5" />
                <X v-else :size="18" class="text-surface-300 dark:text-surface-600 shrink-0 mt-0.5" />
                <span :class="f.included ? 'text-surface-700 dark:text-surface-200' : 'text-surface-400 dark:text-surface-600'">
                  {{ f.text }}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Comparison strip -->
    <section class="py-16 glass-strong border-y border-white/20 dark:border-surface-800/50 relative z-10" data-reveal>
      <div class="max-w-5xl mx-auto px-4 sm:px-6">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div class="w-12 h-12 rounded-xl glass-card flex items-center justify-center mx-auto mb-3">
              <Users :size="24" class="text-primary-500" />
            </div>
            <p class="text-3xl font-bold gradient-text">10,000+</p>
            <p class="text-sm text-surface-500">{{ t('pricing.teamsUsing') }}</p>
          </div>
          <div>
            <div class="w-12 h-12 rounded-xl glass-card flex items-center justify-center mx-auto mb-3">
              <Brain :size="24" class="text-violet-500" />
            </div>
            <p class="text-3xl font-bold gradient-text">2M+</p>
            <p class="text-sm text-surface-500">{{ t('pricing.aiInsights') }}</p>
          </div>
          <div>
            <div class="w-12 h-12 rounded-xl glass-card flex items-center justify-center mx-auto mb-3">
              <Shield :size="24" class="text-emerald-500" />
            </div>
            <p class="text-3xl font-bold gradient-text">99.9%</p>
            <p class="text-sm text-surface-500">{{ t('pricing.uptime') }}</p>
          </div>
          <div>
            <div class="w-12 h-12 rounded-xl glass-card flex items-center justify-center mx-auto mb-3">
              <TrendingUp :size="24" class="text-cyan-500" />
            </div>
            <p class="text-3xl font-bold gradient-text">40%</p>
            <p class="text-sm text-surface-500">{{ t('pricing.productivityGain') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="py-24 relative z-10" data-reveal>
      <div class="max-w-3xl mx-auto px-4 sm:px-6">
        <h2 class="text-3xl font-bold text-center mb-12">{{ t('pricing.faq') }}</h2>
        <div class="space-y-3">
          <div v-for="(f, i) in faqs" :key="i" class="glass-card overflow-hidden">
            <button
              @click="activeFaq = activeFaq === i ? null : i"
              class="w-full flex items-center justify-between p-4 text-left"
            >
              <span class="font-medium text-sm">{{ f.q }}</span>
              <span class="text-surface-400 transition-transform" :class="activeFaq === i ? 'rotate-180' : ''">▾</span>
            </button>
            <div v-if="activeFaq === i" class="px-4 pb-4 text-sm text-surface-500 dark:text-surface-400 animate-slide-down">
              {{ f.a }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-24 relative overflow-hidden z-10" data-reveal="scale">
      <div class="absolute inset-0 bg-gradient-to-br from-primary-600 via-purple-600 to-primary-500"></div>
      <div class="relative max-w-4xl mx-auto px-4 sm:px-6 text-center text-white">
        <h2 class="text-4xl font-bold mb-4">{{ t('pricing.subtitle') }}</h2>
        <p class="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
          {{ t('pricing.teamsUsing') }}
        </p>
        <button @click="router.push('/register')" class="inline-flex items-center gap-2 bg-white text-primary-600 font-semibold px-8 py-3.5 rounded-xl hover:shadow-2xl transition-all hover:scale-105">
          {{ t('pricing.getStarted') }} <ArrowRight :size="20" />
        </button>
        <p class="text-sm text-white/60 mt-4">{{ t('pricing.noCreditCard') }}</p>
      </div>
    </section>

    <!-- Footer -->
    <footer class="py-12 border-t border-surface-200 dark:border-surface-800 relative z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm">TF</div>
          <span class="font-bold">TaskFlow<span class="text-primary-500"> AI</span></span>
        </div>
        <p class="text-sm text-surface-400">© 2025 TaskFlow AI. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>
