<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useI18n } from 'vue-i18n'
import { settingsApi } from '@/api'
import {
  Settings, Building2, Bell, Palette, Shield, Plug, Save,
  Sun, Moon, Check, Globe, Mail, MessageSquare, Zap, Brain,
  Slack, Github, Calendar, Loader2
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const activeTab = ref<'organization' | 'notifications' | 'appearance' | 'security' | 'integrations'>('organization')

const tabs = computed(() => [
  { id: 'organization', label: t('settings.organization'), icon: Building2 },
  { id: 'notifications', label: t('settings.notifications'), icon: Bell },
  { id: 'appearance', label: t('settings.appearance'), icon: Palette },
  { id: 'security', label: t('settings.security'), icon: Shield },
  { id: 'integrations', label: t('settings.integrations'), icon: Plug },
])

const orgSettings = ref({
  name: '',
  domain: '',
  timezone: '',
  language: '',
  defaultBoardColor: '#06b6d4',
  autoArchiveDays: 30,
  allowGuestAccess: false,
  requireApproval: true,
})

const notifSettings = ref({
  emailNotifications: true,
  pushNotifications: true,
  taskAssigned: true,
  taskDueSoon: true,
  taskOverdue: true,
  boardUpdates: true,
  teamPulseReminders: true,
  aiBriefingDaily: true,
  weeklyDigest: false,
  mentionsOnly: false,
})

const appearanceSettings = ref({
  theme: themeStore.isDark ? 'dark' : 'light',
  density: 'comfortable',
  accentColor: 'cyan',
  reduceMotion: false,
  highContrast: false,
})

const securitySettings = ref({
  twoFactor: false,
  sessionTimeout: '30',
  passwordExpiry: '90',
  ipWhitelist: '',
  apiAccess: true,
  auditLog: true,
})

const integrations = ref([
  { id: 'slack', name: 'Slack', icon: MessageSquare, connected: false, color: 'bg-purple-500', desc: 'Get notifications in Slack channels', field: 'intSlack' as const },
  { id: 'github', name: 'GitHub', icon: Github, connected: false, color: 'bg-surface-700', desc: 'Link commits and PRs to tasks', field: 'intGithub' as const },
  { id: 'google', name: 'Google Calendar', icon: Calendar, connected: false, color: 'bg-blue-500', desc: 'Sync deadlines with Google Calendar', field: 'intGoogleCalendar' as const },
  { id: 'webhook', name: 'Webhooks', icon: Zap, connected: false, color: 'bg-orange-500', desc: 'Send events to custom endpoints', field: 'intWebhooks' as const },
])

const saving = ref(false)
const savedMessage = ref('')

const saveSettings = async () => {
  saving.value = true
  savedMessage.value = ''
  try {
    await settingsApi.update({
      orgName: orgSettings.value.name,
      orgDomain: orgSettings.value.domain,
      timezone: orgSettings.value.timezone,
      language: orgSettings.value.language,
      defaultBoardColor: orgSettings.value.defaultBoardColor,
      autoArchiveDays: orgSettings.value.autoArchiveDays,
      allowGuestAccess: orgSettings.value.allowGuestAccess,
      requireApproval: orgSettings.value.requireApproval,
      emailNotifications: notifSettings.value.emailNotifications,
      pushNotifications: notifSettings.value.pushNotifications,
      taskAssigned: notifSettings.value.taskAssigned,
      taskDueSoon: notifSettings.value.taskDueSoon,
      taskOverdue: notifSettings.value.taskOverdue,
      boardUpdates: notifSettings.value.boardUpdates,
      teamPulseReminders: notifSettings.value.teamPulseReminders,
      aiBriefingDaily: notifSettings.value.aiBriefingDaily,
      weeklyDigest: notifSettings.value.weeklyDigest,
      mentionsOnly: notifSettings.value.mentionsOnly,
      density: appearanceSettings.value.density,
      accentColor: appearanceSettings.value.accentColor,
      reduceMotion: appearanceSettings.value.reduceMotion,
      highContrast: appearanceSettings.value.highContrast,
      twoFactor: securitySettings.value.twoFactor,
      sessionTimeout: securitySettings.value.sessionTimeout,
      passwordExpiry: securitySettings.value.passwordExpiry,
      ipWhitelist: securitySettings.value.ipWhitelist,
      apiAccess: securitySettings.value.apiAccess,
      auditLog: securitySettings.value.auditLog,
    })
    savedMessage.value = t('settings.saved')
    setTimeout(() => { savedMessage.value = '' }, 3000)
  } catch {
    savedMessage.value = t('settings.saveError')
    setTimeout(() => { savedMessage.value = '' }, 3000)
  } finally {
    saving.value = false
  }
}

const toggleTheme = () => {
  themeStore.toggle()
  appearanceSettings.value.theme = themeStore.isDark ? 'dark' : 'light'
}

const toggleIntegration = async (id: string) => {
  const integ = integrations.value.find(i => i.id === id)
  if (!integ) return
  integ.connected = !integ.connected
  try {
    await settingsApi.update({ [integ.field]: integ.connected })
  } catch {
    // revert on failure
    integ.connected = !integ.connected
  }
}

onMounted(async () => {
  try {
    const res = await settingsApi.get()
    const s = res.data.data
    if (s) {
      orgSettings.value = {
        name: s.orgName || '',
        domain: s.orgDomain || '',
        timezone: s.timezone || '',
        language: s.language || '',
        defaultBoardColor: s.defaultBoardColor || '#06b6d4',
        autoArchiveDays: s.autoArchiveDays ?? 30,
        allowGuestAccess: s.allowGuestAccess ?? false,
        requireApproval: s.requireApproval ?? true,
      }
      notifSettings.value = {
        emailNotifications: s.emailNotifications ?? true,
        pushNotifications: s.pushNotifications ?? true,
        taskAssigned: s.taskAssigned ?? true,
        taskDueSoon: s.taskDueSoon ?? true,
        taskOverdue: s.taskOverdue ?? true,
        boardUpdates: s.boardUpdates ?? true,
        teamPulseReminders: s.teamPulseReminders ?? true,
        aiBriefingDaily: s.aiBriefingDaily ?? true,
        weeklyDigest: s.weeklyDigest ?? false,
        mentionsOnly: s.mentionsOnly ?? false,
      }
      appearanceSettings.value = {
        theme: themeStore.isDark ? 'dark' : 'light',
        density: s.density || 'comfortable',
        accentColor: s.accentColor || 'cyan',
        reduceMotion: s.reduceMotion ?? false,
        highContrast: s.highContrast ?? false,
      }
      securitySettings.value = {
        twoFactor: s.twoFactor ?? false,
        sessionTimeout: s.sessionTimeout || '30',
        passwordExpiry: s.passwordExpiry || '90',
        ipWhitelist: s.ipWhitelist || '',
        apiAccess: s.apiAccess ?? true,
        auditLog: s.auditLog ?? true,
      }
      integrations.value = integrations.value.map(i => ({
        ...i,
        connected: (s as any)[i.field] ?? false,
      }))
    }
  } catch {
    // use defaults
  }
})
</script>

<template>
  <div class="min-h-screen p-4 sm:p-6 lg:p-8 relative z-10">
    <div class="max-w-5xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <Settings :size="24" class="text-primary-500" />
          {{ t('settings.title') }}
        </h1>
        <p class="text-sm text-surface-500 dark:text-surface-400 mt-1">
          {{ t('settings.subtitle') }}
        </p>
      </div>

      <!-- Saved message -->
      <div v-if="savedMessage" class="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
        <Check :size="16" /> {{ savedMessage }}
      </div>

      <div class="grid lg:grid-cols-4 gap-6">
        <!-- Tabs sidebar -->
        <div class="lg:col-span-1">
          <div class="glass-card p-2 space-y-1 sticky top-20">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id as any"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              :class="activeTab === tab.id
                ? 'bg-primary-500 text-white shadow-lg'
                : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'"
            >
              <component :is="tab.icon" :size="16" />
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- Tab content -->
        <div class="lg:col-span-3">
          <!-- Organization -->
          <div v-if="activeTab === 'organization'" class="glass-card p-6 space-y-5">
            <h2 class="font-semibold text-lg mb-4">{{ t('settings.organization') }}</h2>

            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5 block">{{ t('settings.orgName') }}</label>
                <input v-model="orgSettings.name" type="text" class="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
              </div>
              <div>
                <label class="text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5 block">{{ t('settings.domain') }}</label>
                <input v-model="orgSettings.domain" type="text" class="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
              </div>
              <div>
                <label class="text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5 block">{{ t('settings.timezone') }}</label>
                <select v-model="orgSettings.timezone" class="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                  <option>Europe/Istanbul</option>
                  <option>Europe/London</option>
                  <option>America/New_York</option>
                  <option>Asia/Tokyo</option>
                </select>
              </div>
              <div>
                <label class="text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5 block">{{ t('settings.defaultLanguage') }}</label>
                <select v-model="orgSettings.language" class="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                  <option value="en">English</option>
                  <option value="tr">Türkçe</option>
                </select>
              </div>
            </div>

            <div class="space-y-3 pt-3 border-t border-surface-100 dark:border-surface-800">
              <label class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium">{{ t('settings.autoArchive') }}</p>
                  <p class="text-xs text-surface-400">{{ t('settings.autoArchiveDesc') }}</p>
                </div>
                <input v-model.number="orgSettings.autoArchiveDays" type="number" class="w-20 px-2 py-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm text-center" />
              </label>
              <label class="flex items-center justify-between cursor-pointer">
                <div>
                  <p class="text-sm font-medium">{{ t('settings.guestAccess') }}</p>
                  <p class="text-xs text-surface-400">{{ t('settings.guestAccessDesc') }}</p>
                </div>
                <button @click="orgSettings.allowGuestAccess = !orgSettings.allowGuestAccess" class="relative w-11 h-6 rounded-full transition-colors" :class="orgSettings.allowGuestAccess ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-700'">
                  <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform" :class="orgSettings.allowGuestAccess ? 'translate-x-5' : ''" />
                </button>
              </label>
              <label class="flex items-center justify-between cursor-pointer">
                <div>
                  <p class="text-sm font-medium">{{ t('settings.requireApproval') }}</p>
                  <p class="text-xs text-surface-400">{{ t('settings.requireApprovalDesc') }}</p>
                </div>
                <button @click="orgSettings.requireApproval = !orgSettings.requireApproval" class="relative w-11 h-6 rounded-full transition-colors" :class="orgSettings.requireApproval ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-700'">
                  <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform" :class="orgSettings.requireApproval ? 'translate-x-5' : ''" />
                </button>
              </label>
            </div>
          </div>

          <!-- Notifications -->
          <div v-if="activeTab === 'notifications'" class="glass-card p-6 space-y-4">
            <h2 class="font-semibold text-lg mb-4">{{ t('settings.notifications') }}</h2>

            <div class="space-y-3">
              <div v-for="(value, key) in notifSettings" :key="key" class="flex items-center justify-between py-2">
                <div>
                  <p class="text-sm font-medium capitalize">{{ key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()) }}</p>
                </div>
                <button
                  @click="(notifSettings as any)[key] = !(notifSettings as any)[key]"
                  class="relative w-11 h-6 rounded-full transition-colors"
                  :class="(notifSettings as any)[key] ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-700'"
                >
                  <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform" :class="(notifSettings as any)[key] ? 'translate-x-5' : ''" />
                </button>
              </div>
            </div>
          </div>

          <!-- Appearance -->
          <div v-if="activeTab === 'appearance'" class="glass-card p-6 space-y-5">
            <h2 class="font-semibold text-lg mb-4">{{ t('settings.appearance') }}</h2>

            <div>
              <label class="text-sm font-medium mb-2 block">{{ t('settings.theme') }}</label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  @click="themeStore.isDark && toggleTheme()"
                  class="p-4 rounded-xl border-2 transition-all flex items-center gap-3"
                  :class="!themeStore.isDark ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20' : 'border-surface-200 dark:border-surface-700'"
                >
                  <Sun :size="20" class="text-amber-500" />
                  <span class="text-sm font-medium">{{ t('settings.light') }}</span>
                </button>
                <button
                  @click="!themeStore.isDark && toggleTheme()"
                  class="p-4 rounded-xl border-2 transition-all flex items-center gap-3"
                  :class="themeStore.isDark ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20' : 'border-surface-200 dark:border-surface-700'"
                >
                  <Moon :size="20" class="text-violet-500" />
                  <span class="text-sm font-medium">{{ t('settings.dark') }}</span>
                </button>
              </div>
            </div>

            <div>
              <label class="text-sm font-medium mb-2 block">{{ t('settings.accentColor') }}</label>
              <div class="flex gap-2">
                <button v-for="color in ['cyan', 'violet', 'emerald', 'rose', 'amber']" :key="color"
                  @click="appearanceSettings.accentColor = color"
                  class="w-10 h-10 rounded-full transition-all hover:scale-110"
                  :class="[
                    color === 'cyan' ? 'bg-cyan-500' : color === 'violet' ? 'bg-violet-500' : color === 'emerald' ? 'bg-emerald-500' : color === 'rose' ? 'bg-rose-500' : 'bg-amber-500',
                    appearanceSettings.accentColor === color ? 'ring-4 ring-offset-2 ring-offset-white dark:ring-offset-surface-900 ring-current' : ''
                  ]"
                />
              </div>
            </div>

            <div class="space-y-3 pt-3 border-t border-surface-100 dark:border-surface-800">
              <label class="flex items-center justify-between cursor-pointer">
                <div>
                  <p class="text-sm font-medium">{{ t('settings.reduceMotion') }}</p>
                  <p class="text-xs text-surface-400">{{ t('settings.reduceMotionDesc') }}</p>
                </div>
                <button @click="appearanceSettings.reduceMotion = !appearanceSettings.reduceMotion" class="relative w-11 h-6 rounded-full transition-colors" :class="appearanceSettings.reduceMotion ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-700'">
                  <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform" :class="appearanceSettings.reduceMotion ? 'translate-x-5' : ''" />
                </button>
              </label>
            </div>
          </div>

          <!-- Security -->
          <div v-if="activeTab === 'security'" class="glass-card p-6 space-y-5">
            <h2 class="font-semibold text-lg mb-4">{{ t('settings.security') }}</h2>

            <div class="space-y-4">
              <label class="flex items-center justify-between cursor-pointer p-3 rounded-lg glass-strong">
                <div class="flex items-center gap-3">
                  <Shield :size="20" class="text-primary-500" />
                  <div>
                    <p class="text-sm font-medium">{{ t('settings.twoFactor') }}</p>
                    <p class="text-xs text-surface-400">{{ t('settings.twoFactorDesc') }}</p>
                  </div>
                </div>
                <button @click="securitySettings.twoFactor = !securitySettings.twoFactor" class="relative w-11 h-6 rounded-full transition-colors" :class="securitySettings.twoFactor ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-700'">
                  <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform" :class="securitySettings.twoFactor ? 'translate-x-5' : ''" />
                </button>
              </label>

              <div class="grid sm:grid-cols-2 gap-4">
                <div>
                  <label class="text-sm font-medium mb-1.5 block">{{ t('settings.sessionTimeout') }}</label>
                  <select v-model="securitySettings.sessionTimeout" class="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm">
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="60">60</option>
                    <option value="120">120</option>
                  </select>
                </div>
                <div>
                  <label class="text-sm font-medium mb-1.5 block">{{ t('settings.passwordExpiry') }}</label>
                  <select v-model="securitySettings.passwordExpiry" class="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm">
                    <option value="30">30</option>
                    <option value="60">60</option>
                    <option value="90">90</option>
                    <option value="0">{{ t('common.none') }}</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="text-sm font-medium mb-1.5 block">{{ t('settings.ipWhitelist') }}</label>
                <input v-model="securitySettings.ipWhitelist" type="text" placeholder="192.168.1.1, 10.0.0.0/24" class="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-sm" />
              </div>
            </div>
          </div>

          <!-- Integrations -->
          <div v-if="activeTab === 'integrations'" class="glass-card p-6">
            <h2 class="font-semibold text-lg mb-4">{{ t('settings.integrations') }}</h2>
            <div class="space-y-3">
              <div
                v-for="integ in integrations"
                :key="integ.id"
                class="flex items-center justify-between p-4 rounded-xl glass-strong hover:shadow-md transition-all"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white" :class="integ.color">
                    <component :is="integ.icon" :size="20" />
                  </div>
                  <div>
                    <p class="text-sm font-medium">{{ integ.name }}</p>
                    <p class="text-xs text-surface-400">{{ integ.desc }}</p>
                  </div>
                </div>
                <button
                  @click="toggleIntegration(integ.id)"
                  class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  :class="integ.connected
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                    : 'btn-glow'"
                >
                  {{ integ.connected ? t('settings.connected') + ' ✓' : t('settings.connect') }}
                </button>
              </div>
            </div>
          </div>

          <!-- Save button -->
          <div class="flex justify-end mt-6">
            <button @click="saveSettings" :disabled="saving" class="btn-glow px-6 py-2.5 flex items-center gap-2 text-sm">
              <Loader2 v-if="saving" :size="16" class="animate-spin" />
              <Save v-else :size="16" />
              {{ saving ? t('settings.saving') : t('settings.save') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
