<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import {
  Sparkles, ArrowRight, Sun, Moon, Check, Zap, Brain, Users,
  LayoutDashboard, MessageSquare, Shield, TrendingUp, Clock,
  Star, ChevronDown, Github, Twitter, Linkedin
} from 'lucide-vue-next'

const { t, tm } = useI18n()
const router = useRouter()
const themeStore = useThemeStore()

const scrolled = ref(false)
const activeFaq = ref<number | null>(0)

const onScroll = () => {
  scrolled.value = window.scrollY > 20
}

onMounted(() => {
  window.addEventListener('scroll', onScroll)
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})

const features = computed(() => [
  { icon: Brain, title: t('landing.features.ai.title'), desc: t('landing.features.ai.desc'), color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50 dark:bg-violet-950/20' },
  { icon: LayoutDashboard, title: t('landing.features.kanban.title'), desc: t('landing.features.kanban.desc'), color: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50 dark:bg-blue-950/20' },
  { icon: Users, title: t('landing.features.collab.title'), desc: t('landing.features.collab.desc'), color: 'from-green-500 to-emerald-600', bg: 'bg-green-50 dark:bg-emerald-950/20' },
  { icon: MessageSquare, title: t('landing.features.messaging.title'), desc: t('landing.features.messaging.desc'), color: 'from-orange-500 to-red-600', bg: 'bg-orange-50 dark:bg-red-950/20' },
  { icon: Shield, title: t('landing.features.security.title'), desc: t('landing.features.security.desc'), color: 'from-slate-600 to-slate-800', bg: 'bg-slate-50 dark:bg-slate-900/20' },
  { icon: TrendingUp, title: t('landing.features.analytics.title'), desc: t('landing.features.analytics.desc'), color: 'from-pink-500 to-rose-600', bg: 'bg-pink-50 dark:bg-rose-950/20' },
])

const stats = computed(() => [
  { value: 50, suffix: 'K+', label: t('landing.stats.activeUsers') },
  { value: 2, suffix: 'M+', label: t('landing.stats.tasksCompleted') },
  { value: 99, suffix: '%', label: t('landing.stats.uptime') },
  { value: 4.9, suffix: '/5', label: t('landing.stats.rating'), decimal: true },
])

const animatedStats = ref(stats.value.map(() => 0))

onMounted(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      stats.value.forEach((s, i) => {
        const duration = 1500
        const steps = 60
        const increment = s.value / steps
        let current = 0
        const interval = setInterval(() => {
          current += increment
          if (current >= s.value) {
            current = s.value
            clearInterval(interval)
          }
          animatedStats.value[i] = current
        }, duration / steps)
      })
      observer.disconnect()
    }
  })
  const el = document.getElementById('stats-section')
  if (el) observer.observe(el)
})

const faqs = computed(() => [
  { q: t('landing.faq.items[0].q'), a: t('landing.faq.items[0].a') },
  { q: t('landing.faq.items[1].q'), a: t('landing.faq.items[1].a') },
  { q: t('landing.faq.items[2].q'), a: t('landing.faq.items[2].a') },
  { q: t('landing.faq.items[3].q'), a: t('landing.faq.items[3].a') },
  { q: t('landing.faq.items[4].q'), a: t('landing.faq.items[4].a') },
])

const testimonials = [
  { name: 'Sarah Chen', role: 'Product Lead at AAAA', avatar: '', text: 'TaskFlow AI replaced 3 tools for us. The AI task breakdown alone saves my team 5+ hours per week.', stars: 5 },
  { name: 'Marcus Weber', role: 'CTO at AAA Berlin', avatar: '', text: 'The role hierarchy and permission system is the best I\'ve seen. Finally a tool that gets enterprise needs.', stars: 5 },
  { name: 'Ayşe Demir', role: 'Engineering Manager at AAAA', avatar: '', text: 'Real-time collaboration is seamless. Our distributed team feels like they\'re in the same room.', stars: 5 },
  { name: 'James Park', role: 'Founder at Y Combinator AAAA', avatar: '', text: 'The analytics dashboard is gorgeous. I check it every morning instead of email now.', stars: 5 },
]

const comparison = [
  { feature: 'AI Task Intelligence', taskflow: true, trello: false, asana: false, jira: false },
  { feature: 'Built-in Messaging', taskflow: true, trello: false, asana: false, jira: false },
  { feature: '6-Tier Role Hierarchy', taskflow: true, trello: false, asana: false, jira: true },
  { feature: 'Real-Time Presence', taskflow: true, trello: false, asana: true, jira: false },
  { feature: 'Advanced Analytics', taskflow: true, trello: false, asana: true, jira: true },
  { feature: 'Global Search (Cmd+K)', taskflow: true, trello: false, asana: false, jira: false },
  { feature: 'Dark Mode', taskflow: true, trello: true, asana: true, jira: true },
  { feature: 'No Per-User Pricing', taskflow: true, trello: false, asana: false, jira: false },
]

const formatStat = (val: number, decimal?: boolean) => {
  return decimal ? val.toFixed(1) : Math.floor(val).toString()
}
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-surface-950 overflow-x-hidden">
    <!-- Navbar -->
    <nav
      class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      :class="scrolled ? 'glass shadow-sm border-b border-surface-200 dark:border-surface-800' : 'bg-transparent'"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary-500/30">
            TF
          </div>
          <span class="font-bold text-lg">TaskFlow<span class="gradient-text"> AI</span></span>
        </div>

        <div class="hidden md:flex items-center gap-8 text-sm font-medium text-surface-600 dark:text-surface-300">
          <a href="#features" class="hover:text-primary-600 transition-colors">{{ t('landing.nav.features') }}</a>
          <a href="#ai" class="hover:text-primary-600 transition-colors">{{ t('landing.nav.ai') }}</a>
          <a href="#compare" class="hover:text-primary-600 transition-colors">{{ t('landing.nav.compare') }}</a>
          <a href="#testimonials" class="hover:text-primary-600 transition-colors">{{ t('landing.nav.reviews') }}</a>
          <a href="#faq" class="hover:text-primary-600 transition-colors">{{ t('landing.nav.faq') }}</a>
        </div>

        <div class="flex items-center gap-2">
          <LanguageSwitcher />
          <button @click="themeStore.toggle()" class="btn-ghost p-2">
            <Sun v-if="themeStore.isDark" :size="18" />
            <Moon v-else :size="18" />
          </button>
          <button @click="router.push('/login')" class="btn-ghost text-sm hidden sm:flex">{{ t('landing.nav.signIn') }}</button>
          <button @click="router.push('/register')" class="btn-primary text-sm">
            {{ t('landing.nav.getStarted') }} <ArrowRight :size="16" />
          </button>
        </div>
      </div>
    </nav>

    <!-- Hero -->
    <section class="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      <!-- Background blobs -->
      <div class="absolute inset-0 grid-bg opacity-60"></div>
      <div class="absolute top-20 -left-20 w-72 h-72 bg-primary-300/30 dark:bg-primary-700/20 rounded-full blur-3xl animate-blob"></div>
      <div class="absolute top-40 right-0 w-96 h-96 bg-pink-300/20 dark:bg-pink-700/10 rounded-full blur-3xl animate-blob" style="animation-delay: 2s"></div>
      <div class="absolute bottom-0 left-1/3 w-80 h-80 bg-violet-300/20 dark:bg-violet-700/10 rounded-full blur-3xl animate-blob" style="animation-delay: 4s"></div>

      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 text-center">
        <!-- Badge -->
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 mb-6 animate-fade-in">
          <Sparkles :size="14" class="text-primary-500" />
          <span class="text-xs font-medium text-primary-700 dark:text-primary-300">{{ t('landing.hero.badge') }}</span>
          <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
        </div>

        <!-- Title -->
        <h1 class="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-slide-up">
          {{ t('landing.hero.title') }}
          <br />
          <span class="gradient-text-animated">{{ t('landing.hero.titleHighlight') }}</span>
        </h1>

        <p class="text-lg sm:text-xl text-surface-500 dark:text-surface-400 max-w-2xl mx-auto mb-10 animate-slide-up" style="animation-delay: 0.1s">
          {{ t('landing.hero.subtitle') }}
        </p>

        <!-- CTAs -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12 animate-slide-up" style="animation-delay: 0.2s">
          <button @click="router.push('/register')" class="btn-primary text-base px-6 py-3 glow-primary">
            {{ t('landing.hero.ctaStart') }} <ArrowRight :size="20" />
          </button>
          <button @click="router.push('/login')" class="btn-secondary text-base px-6 py-3">
            <Sparkles :size="18" /> {{ t('landing.hero.ctaDemo') }}
          </button>
        </div>

        <!-- Floating preview cards -->
        <div class="relative max-w-5xl mx-auto animate-scale-in" style="animation-delay: 0.3s">
          <div class="card p-2 shadow-2xl glow-primary">
            <div class="rounded-lg overflow-hidden bg-surface-50 dark:bg-surface-900">
              <!-- Mock dashboard -->
              <div class="grid grid-cols-4 gap-3 p-4">
                <div class="card p-3 col-span-1">
                  <div class="flex items-center justify-between mb-2">
                    <div class="w-6 h-6 rounded bg-primary-500/20 flex items-center justify-center"><LayoutDashboard :size="12" class="text-primary-500" /></div>
                    <span class="text-lg font-bold">12</span>
                  </div>
                  <div class="h-1.5 bg-surface-200 dark:bg-surface-700 rounded w-2/3"></div>
                </div>
                <div class="card p-3 col-span-1">
                  <div class="flex items-center justify-between mb-2">
                    <div class="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center"><TrendingUp :size="12" class="text-green-500" /></div>
                    <span class="text-lg font-bold">847</span>
                  </div>
                  <div class="h-1.5 bg-surface-200 dark:bg-surface-700 rounded w-1/2"></div>
                </div>
                <div class="card p-3 col-span-1">
                  <div class="flex items-center justify-between mb-2">
                    <div class="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center"><Users :size="12" class="text-blue-500" /></div>
                    <span class="text-lg font-bold">34</span>
                  </div>
                  <div class="h-1.5 bg-surface-200 dark:bg-surface-700 rounded w-3/4"></div>
                </div>
                <div class="card p-3 col-span-1">
                  <div class="flex items-center justify-between mb-2">
                    <div class="w-6 h-6 rounded bg-orange-500/20 flex items-center justify-center"><Zap :size="12" class="text-orange-500" /></div>
                    <span class="text-lg font-bold">98%</span>
                  </div>
                  <div class="h-1.5 bg-surface-200 dark:bg-surface-700 rounded w-1/3"></div>
                </div>
              </div>
              <!-- Kanban mock -->
              <div class="grid grid-cols-4 gap-3 px-4 pb-4">
                <div v-for="col in ['To Do', 'In Progress', 'Review', 'Done']" :key="col" class="space-y-2">
                  <div class="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1">{{ col }}</div>
                  <div class="card p-2.5">
                    <div class="h-2 bg-primary-200 dark:bg-primary-800 rounded w-3/4 mb-1.5"></div>
                    <div class="h-1.5 bg-surface-200 dark:bg-surface-700 rounded w-full mb-1"></div>
                    <div class="h-1.5 bg-surface-200 dark:bg-surface-700 rounded w-2/3"></div>
                  </div>
                  <div class="card p-2.5">
                    <div class="h-2 bg-green-200 dark:bg-green-800 rounded w-1/2 mb-1.5"></div>
                    <div class="h-1.5 bg-surface-200 dark:bg-surface-700 rounded w-full mb-1"></div>
                    <div class="h-1.5 bg-surface-200 dark:bg-surface-700 rounded w-3/5"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Floating badges around preview -->
          <div class="absolute -top-4 -left-4 card p-3 shadow-xl animate-float hidden sm:block">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Brain :size="16" class="text-white" />
              </div>
              <div class="text-left">
                <p class="text-xs font-bold">AI Suggests</p>
                <p class="text-[10px] text-surface-400">Priority: High</p>
              </div>
            </div>
          </div>

          <div class="absolute -bottom-4 -right-4 card p-3 shadow-xl animate-float-delayed hidden sm:block">
            <div class="flex items-center gap-2">
              <div class="relative">
                <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <span class="text-white text-xs font-bold">JD</span>
                </div>
                <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white dark:border-surface-900"></div>
              </div>
              <div class="text-left">
                <p class="text-xs font-bold">John Doe</p>
                <p class="text-[10px] text-green-500">● Online now</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section id="stats-section" class="py-16 border-y border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div v-for="(s, i) in stats" :key="i" class="text-center">
            <p class="text-4xl sm:text-5xl font-bold gradient-text">
              {{ formatStat(animatedStats[i], s.decimal) }}{{ s.suffix }}
            </p>
            <p class="text-sm text-surface-500 dark:text-surface-400 mt-1">{{ s.label }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="py-24">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="text-center mb-16">
          <span class="text-sm font-bold text-primary-500 uppercase tracking-wider">{{ t('landing.nav.features') }}</span>
          <h2 class="text-4xl sm:text-5xl font-bold mt-2 mb-4" v-html="t('landing.features.title')"></h2>
          <p class="text-lg text-surface-500 dark:text-surface-400 max-w-2xl mx-auto">
            {{ t('landing.features.subtitle') }}
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="(f, i) in features"
            :key="i"
            class="group card p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" :class="f.bg">
              <component :is="f.icon" :size="24" class="text-surface-700 dark:text-surface-200" />
            </div>
            <h3 class="text-lg font-semibold mb-2">{{ f.title }}</h3>
            <p class="text-sm text-surface-500 dark:text-surface-400">{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- AI Showcase -->
    <section id="ai" class="py-24 bg-surface-50/50 dark:bg-surface-900/30 border-y border-surface-200 dark:border-surface-800 relative overflow-hidden">
      <div class="absolute inset-0 dot-bg opacity-40"></div>
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-950/40 mb-4">
              <Brain :size="14" class="text-violet-600" />
              <span class="text-xs font-bold text-violet-700 dark:text-violet-300">{{ t('landing.ai.badge') }}</span>
            </div>
            <h2 class="text-4xl font-bold mb-4">{{ t('landing.ai.title') }}</h2>
            <p class="text-lg text-surface-500 dark:text-surface-400 mb-6">
              {{ t('landing.ai.subtitle') }}
            </p>
            <ul class="space-y-3">
              <li v-for="(cap, idx) in tm('landing.ai.features') as any" :key="idx" class="flex items-start gap-3">
                <div class="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check :size="12" class="text-violet-600" />
                </div>
                <span class="text-sm text-surface-700 dark:text-surface-300">{{ cap }}</span>
              </li>
            </ul>
          </div>

          <!-- AI Chat Mockup -->
          <div class="card p-6 shadow-xl">
            <div class="flex items-center gap-2 mb-4 pb-4 border-b border-surface-200 dark:border-surface-800">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Brain :size="16" class="text-white" />
              </div>
              <div>
                <p class="text-sm font-semibold">{{ t('landing.ai.chatTitle') }}</p>
                <p class="text-[10px] text-green-500">● Online</p>
              </div>
            </div>
            <div class="space-y-3">
              <div class="bg-surface-100 dark:bg-surface-800 rounded-lg p-3 max-w-[80%]">
                <p class="text-xs">{{ t('landing.ai.chatUser') }}</p>
              </div>
              <div class="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-3 max-w-[90%] ml-auto">
                <p class="text-xs font-medium mb-2">{{ t('landing.ai.chatAi') }}</p>
                <div class="space-y-1.5">
                  <div class="flex items-center gap-2 text-[11px]"><span class="w-4 h-4 rounded bg-blue-500/20 flex items-center justify-center text-blue-600 font-bold">1</span> Design system & component library</div>
                  <div class="flex items-center gap-2 text-[11px]"><span class="w-4 h-4 rounded bg-blue-500/20 flex items-center justify-center text-blue-600 font-bold">2</span> API integration & auth flow</div>
                  <div class="flex items-center gap-2 text-[11px]"><span class="w-4 h-4 rounded bg-blue-500/20 flex items-center justify-center text-blue-600 font-bold">3</span> Push notification setup</div>
                  <div class="flex items-center gap-2 text-[11px]"><span class="w-4 h-4 rounded bg-blue-500/20 flex items-center justify-center text-blue-600 font-bold">4</span> Offline mode & sync</div>
                  <div class="flex items-center gap-2 text-[11px]"><span class="w-4 h-4 rounded bg-blue-500/20 flex items-center justify-center text-blue-600 font-bold">5</span> QA testing & bug fixes</div>
                  <div class="flex items-center gap-2 text-[11px]"><span class="w-4 h-4 rounded bg-blue-500/20 flex items-center justify-center text-blue-600 font-bold">6</span> App Store & Play Store submission</div>
                </div>
                <p class="text-[10px] text-violet-500 mt-2">⚡ {{ t('landing.ai.chatEstimate') }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Comparison Table -->
    <section id="compare" class="py-24">
      <div class="max-w-5xl mx-auto px-4 sm:px-6">
        <div class="text-center mb-12">
          <span class="text-sm font-bold text-primary-500 uppercase tracking-wider">{{ t('landing.nav.compare') }}</span>
          <h2 class="text-4xl font-bold mt-2 mb-4">{{ t('landing.compare.title') }}</h2>
        </div>

        <div class="card overflow-hidden">
          <table class="w-full">
            <thead>
              <tr class="border-b border-surface-200 dark:border-surface-800">
                <th class="text-left p-4 text-sm font-semibold">{{ t('landing.compare.feature') }}</th>
                <th class="p-4 text-sm">
                  <div class="flex flex-col items-center">
                    <span class="gradient-text font-bold">TaskFlow AI</span>
                  </div>
                </th>
                <th class="p-4 text-sm text-surface-400">Trello</th>
                <th class="p-4 text-sm text-surface-400">Asana</th>
                <th class="p-4 text-sm text-surface-400">Jira</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in comparison" :key="i" class="border-b border-surface-100 dark:border-surface-800/50">
                <td class="p-4 text-sm text-surface-600 dark:text-surface-300">{{ row.feature }}</td>
                <td class="p-4 text-center">
                  <Check v-if="row.taskflow" :size="18" class="text-green-500 mx-auto" />
                  <span v-else class="text-surface-300">—</span>
                </td>
                <td class="p-4 text-center">
                  <Check v-if="row.trello" :size="18" class="text-green-500 mx-auto" />
                  <span v-else class="text-surface-300">—</span>
                </td>
                <td class="p-4 text-center">
                  <Check v-if="row.asana" :size="18" class="text-green-500 mx-auto" />
                  <span v-else class="text-surface-300">—</span>
                </td>
                <td class="p-4 text-center">
                  <Check v-if="row.jira" :size="18" class="text-green-500 mx-auto" />
                  <span v-else class="text-surface-300">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section id="testimonials" class="py-24 bg-surface-50/50 dark:bg-surface-900/30 border-y border-surface-200 dark:border-surface-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="text-center mb-12">
          <span class="text-sm font-bold text-primary-500 uppercase tracking-wider">{{ t('landing.nav.reviews') }}</span>
          <h2 class="text-4xl font-bold mt-2 mb-4">{{ t('landing.testimonials.title') }}</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div v-for="(t, i) in testimonials" :key="i" class="card p-6">
            <div class="flex items-center gap-1 mb-3">
              <Star v-for="s in t.stars" :key="s" :size="16" class="text-yellow-400 fill-yellow-400" />
            </div>
            <p class="text-sm text-surface-700 dark:text-surface-300 mb-4 italic">"{{ t.text }}"</p>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold">
                {{ t.name.split(' ').map(n => n[0]).join('') }}
              </div>
              <div>
                <p class="text-sm font-semibold">{{ t.name }}</p>
                <p class="text-xs text-surface-400">{{ t.role }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="py-24">
      <div class="max-w-3xl mx-auto px-4 sm:px-6">
        <div class="text-center mb-12">
          <span class="text-sm font-bold text-primary-500 uppercase tracking-wider">{{ t('landing.nav.faq') }}</span>
          <h2 class="text-4xl font-bold mt-2 mb-4">{{ t('landing.faq.title') }}</h2>
        </div>

        <div class="space-y-3">
          <div v-for="(f, i) in faqs" :key="i" class="card overflow-hidden">
            <button
              @click="activeFaq = activeFaq === i ? null : i"
              class="w-full flex items-center justify-between p-4 text-left"
            >
              <span class="text-sm font-semibold">{{ f.q }}</span>
              <ChevronDown :size="18" class="text-surface-400 transition-transform shrink-0 ml-2" :class="{ 'rotate-180': activeFaq === i }" />
            </button>
            <div v-if="activeFaq === i" class="px-4 pb-4 text-sm text-surface-500 dark:text-surface-400 animate-slide-down">
              {{ f.a }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-24 relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-primary-600 via-purple-600 to-pink-600"></div>
      <div class="absolute inset-0 dot-bg opacity-20"></div>
      <div class="relative max-w-4xl mx-auto px-4 sm:px-6 text-center text-white">
        <h2 class="text-4xl sm:text-5xl font-bold mb-4">{{ t('landing.cta.title') }}</h2>
        <p class="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
          {{ t('landing.cta.subtitle') }}
        </p>
        <button @click="router.push('/register')" class="inline-flex items-center gap-2 bg-white text-primary-600 font-semibold px-8 py-3.5 rounded-xl hover:shadow-2xl transition-all hover:scale-105">
          {{ t('landing.cta.button') }} <ArrowRight :size="20" />
        </button>
        <p class="text-sm text-white/60 mt-4">{{ t('landing.cta.note') }}</p>
      </div>
    </section>

    <!-- Footer -->
    <footer class="py-12 border-t border-surface-200 dark:border-surface-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div class="col-span-2">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-xs">TF</div>
              <span class="font-bold">TaskFlow<span class="gradient-text"> AI</span></span>
            </div>
            <p class="text-sm text-surface-500 dark:text-surface-400 max-w-xs">
              {{ t('landing.footer.tagline') }}
            </p>
          </div>
          <div>
            <p class="text-sm font-semibold mb-3">{{ t('landing.footer.product') }}</p>
            <ul class="space-y-2 text-sm text-surface-500 dark:text-surface-400">
              <li><a href="#features" class="hover:text-primary-500">{{ t('landing.nav.features') }}</a></li>
              <li><a href="#ai" class="hover:text-primary-500">{{ t('landing.nav.ai') }}</a></li>
              <li><a href="#compare" class="hover:text-primary-500">{{ t('landing.nav.compare') }}</a></li>
              <li><a href="#faq" class="hover:text-primary-500">{{ t('landing.nav.faq') }}</a></li>
            </ul>
          </div>
          <div>
            <p class="text-sm font-semibold mb-3">{{ t('landing.footer.company') }}</p>
            <ul class="space-y-2 text-sm text-surface-500 dark:text-surface-400">
              <li><a href="#" class="hover:text-primary-500">{{ t('landing.footer.about') }}</a></li>
              <li><a href="#" class="hover:text-primary-500">{{ t('landing.footer.blog') }}</a></li>
              <li><a href="#" class="hover:text-primary-500">{{ t('landing.footer.privacy') }}</a></li>
              <li><a href="#" class="hover:text-primary-500">{{ t('landing.footer.terms') }}</a></li>
            </ul>
          </div>
        </div>
        <div class="flex items-center justify-between pt-8 border-t border-surface-200 dark:border-surface-800">
          <p class="text-xs text-surface-400">© 2026 TaskFlow AI. {{ t('landing.footer.rights') }}</p>
          <div class="flex items-center gap-3">
            <a href="#" class="btn-ghost p-2"><Twitter :size="16" /></a>
            <a href="#" class="btn-ghost p-2"><Github :size="16" /></a>
            <a href="#" class="btn-ghost p-2"><Linkedin :size="16" /></a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
