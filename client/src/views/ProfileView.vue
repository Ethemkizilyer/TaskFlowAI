<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { userApi, authApi } from '@/api'
import { useI18n } from 'vue-i18n'
import {
  Settings, Loader2, Save, Lock, User, Mail, CheckCircle, AlertCircle,
  Camera, Eye, EyeOff, Shield, Calendar
} from 'lucide-vue-next'

const { t } = useI18n()
const authStore = useAuthStore()

const name = ref('')
const email = ref('')
const bio = ref('')
const avatar = ref('')
const saving = ref(false)
const savedMessage = ref('')
const savedError = ref(false)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const changingPassword = ref(false)
const passwordMessage = ref('')
const passwordError = ref('')

const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const uploadingAvatar = ref(false)
const avatarError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const avatarUrl = computed(() => {
  const a = avatar.value || authStore.user?.avatar || ''
  if (!a) return ''
  if (a.startsWith('http') || a.startsWith('data:')) return a
  return a
})

const passwordStrength = computed(() => {
  const p = newPassword.value
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

const passwordsMatch = computed(() => {
  if (!confirmPassword.value) return true
  return newPassword.value === confirmPassword.value
})

const canChangePassword = computed(() => {
  return currentPassword.value &&
    newPassword.value.length >= 6 &&
    passwordsMatch.value
})

const fetchProfile = async () => {
  try {
    const res = await authApi.getMe()
    const user = res.data.data
    name.value = user.name || ''
    email.value = user.email || ''
    bio.value = user.bio || ''
    avatar.value = user.avatar || ''
  } catch (e) {
    console.error(e)
  }
}

const saveProfile = async () => {
  saving.value = true
  savedMessage.value = ''
  savedError.value = false
  try {
    const res = await userApi.updateProfile({
      name: name.value,
      email: email.value,
      bio: bio.value,
    })
    authStore.user = { ...authStore.user, ...res.data.data }
    savedMessage.value = t('profile.savedSuccess')
    setTimeout(() => (savedMessage.value = ''), 3000)
  } catch (e: any) {
    savedMessage.value = e.response?.data?.error || t('profile.savedError')
    savedError.value = true
  } finally {
    saving.value = false
  }
}

const changePassword = async () => {
  passwordError.value = ''
  passwordMessage.value = ''

  if (!passwordsMatch.value) {
    passwordError.value = t('profile.passwordsNoMatch')
    return
  }
  if (newPassword.value.length < 6) {
    passwordError.value = t('profile.passwordTooShort')
    return
  }

  changingPassword.value = true
  try {
    await userApi.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    passwordMessage.value = t('profile.passwordChanged')
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    setTimeout(() => (passwordMessage.value = ''), 3000)
  } catch (e: any) {
    passwordError.value = e.response?.data?.error || t('profile.passwordChangeError')
  } finally {
    changingPassword.value = false
  }
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleAvatarChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (file.size > 5 * 1024 * 1024) {
    avatarError.value = t('profile.avatarTooLarge')
    return
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) {
    avatarError.value = t('profile.avatarInvalidType')
    return
  }

  avatarError.value = ''
  uploadingAvatar.value = true
  try {
    const res = await userApi.uploadAvatar(file)
    const updated = res.data.data
    avatar.value = updated.avatar
    authStore.user = { ...authStore.user, ...updated }
  } catch (e: any) {
    avatarError.value = e.response?.data?.error || t('profile.avatarUploadError')
  } finally {
    uploadingAvatar.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

onMounted(() => {
  fetchProfile()
})
</script>

<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-950">
    <div class="max-w-3xl mx-auto p-4 sm:p-6">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center">
          <Settings :size="20" class="text-primary-600" />
        </div>
        <div>
          <h1 class="text-xl font-bold">{{ t('profile.title') }}</h1>
          <p class="text-sm text-surface-500">{{ t('profile.subtitle') }}</p>
        </div>
      </div>

      <!-- Avatar + Profile section -->
      <div class="card p-6 mb-6">
        <h2 class="font-semibold text-lg mb-4">{{ t('profile.information') }}</h2>

        <!-- Avatar upload -->
        <div class="flex items-center gap-4 mb-6">
          <div class="relative group">
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              :alt="name"
              class="w-20 h-20 rounded-full bg-surface-200 border-4 border-white dark:border-surface-800 shadow-md object-cover"
            />
            <div
              v-else
              class="w-20 h-20 rounded-full bg-surface-200 dark:bg-surface-700 border-4 border-white dark:border-surface-800 shadow-md flex items-center justify-center"
            >
              <User :size="32" class="text-surface-400" />
            </div>
            <button
              @click="triggerFileInput"
              :disabled="uploadingAvatar"
              class="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
            >
              <Loader2 v-if="uploadingAvatar" :size="20" class="animate-spin" />
              <Camera v-else :size="20" />
            </button>
            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              class="hidden"
              @change="handleAvatarChange"
            />
          </div>
          <div class="flex-1">
            <p class="text-sm font-medium">{{ name || t('profile.yourName') }}</p>
            <p class="text-xs text-surface-500">{{ email }}</p>
            <button @click="triggerFileInput" :disabled="uploadingAvatar" class="text-xs text-primary-500 hover:text-primary-600 mt-1">
              {{ uploadingAvatar ? t('common.loading') : t('profile.changeAvatar') }}
            </button>
            <p class="text-[10px] text-surface-400 mt-0.5">{{ t('profile.avatarHint') }}</p>
            <div v-if="avatarError" class="flex items-center gap-1 text-xs text-red-500 mt-1">
              <AlertCircle :size="12" /> {{ avatarError }}
            </div>
          </div>
        </div>

        <!-- Form -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">{{ t('profile.fullName') }}</label>
            <div class="relative">
              <User :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input v-model="name" type="text" class="input pl-10" :placeholder="t('profile.yourName')" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">{{ t('common.email') }}</label>
            <div class="relative">
              <Mail :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input v-model="email" type="email" class="input pl-10" placeholder="you@example.com" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">{{ t('profile.bio') }}</label>
            <textarea
              v-model="bio"
              rows="3"
              maxlength="500"
              class="input resize-none"
              :placeholder="t('profile.bioPlaceholder')"
            ></textarea>
            <p class="text-xs text-surface-400 mt-1 text-right">{{ bio.length }}/500</p>
          </div>

          <div v-if="savedMessage" class="flex items-center gap-2 text-sm" :class="savedError ? 'text-red-600' : 'text-green-600'">
            <CheckCircle v-if="!savedError" :size="16" />
            <AlertCircle v-else :size="16" />
            {{ savedMessage }}
          </div>

          <button @click="saveProfile" :disabled="saving" class="btn-primary w-full sm:w-auto">
            <Loader2 v-if="saving" :size="16" class="animate-spin" />
            <Save v-else :size="16" />
            {{ t('profile.saveChanges') }}
          </button>
        </div>
      </div>

      <!-- Change password section -->
      <div class="card p-6">
        <h2 class="font-semibold text-lg mb-4">{{ t('profile.changePassword') }}</h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">{{ t('profile.currentPassword') }}</label>
            <div class="relative">
              <Lock :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                v-model="currentPassword"
                :type="showCurrentPassword ? 'text' : 'password'"
                class="input pl-10 pr-10"
                placeholder="••••••••"
              />
              <button type="button" @click="showCurrentPassword = !showCurrentPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                <EyeOff v-if="showCurrentPassword" :size="16" />
                <Eye v-else :size="16" />
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">{{ t('profile.newPassword') }}</label>
            <div class="relative">
              <Lock :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                v-model="newPassword"
                :type="showNewPassword ? 'text' : 'password'"
                class="input pl-10 pr-10"
                placeholder="••••••••"
              />
              <button type="button" @click="showNewPassword = !showNewPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                <EyeOff v-if="showNewPassword" :size="16" />
                <Eye v-else :size="16" />
              </button>
            </div>
            <!-- Password strength -->
            <div v-if="newPassword" class="mt-2">
              <div class="flex gap-1">
                <div
                  v-for="i in 5"
                  :key="i"
                  class="h-1 flex-1 rounded-full transition-colors"
                  :class="i <= passwordStrength.score ? passwordStrength.color : 'bg-surface-200 dark:bg-surface-700'"
                ></div>
              </div>
              <p class="text-[10px] text-surface-400 mt-1">{{ passwordStrength.label }}</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">{{ t('profile.confirmPassword') }}</label>
            <div class="relative">
              <Lock :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                class="input pl-10 pr-10"
                :class="!passwordsMatch ? 'border-red-500' : ''"
                placeholder="••••••••"
              />
              <button type="button" @click="showConfirmPassword = !showConfirmPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                <EyeOff v-if="showConfirmPassword" :size="16" />
                <Eye v-else :size="16" />
              </button>
            </div>
            <p v-if="!passwordsMatch" class="text-xs text-red-500 mt-1">{{ t('profile.passwordsNoMatch') }}</p>
          </div>

          <div v-if="passwordError" class="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle :size="16" /> {{ passwordError }}
          </div>
          <div v-if="passwordMessage" class="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle :size="16" /> {{ passwordMessage }}
          </div>

          <button @click="changePassword" :disabled="changingPassword || !canChangePassword" class="btn-primary w-full sm:w-auto">
            <Loader2 v-if="changingPassword" :size="16" class="animate-spin" />
            <Lock v-else :size="16" />
            {{ t('profile.changePassword') }}
          </button>
        </div>
      </div>

      <!-- Account info -->
      <div class="card p-6 mt-6">
        <h2 class="font-semibold text-lg mb-4">{{ t('profile.accountInfo') }}</h2>
        <div class="space-y-3 text-sm">
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-2 text-surface-500">
              <Shield :size="14" /> {{ t('profile.role') }}
            </span>
            <span class="font-medium">{{ t(`roles.${authStore.user?.role}`) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-2 text-surface-500">
              <Calendar :size="14" /> {{ t('profile.memberSince') }}
            </span>
            <span class="font-medium">{{ new Date(authStore.user?.createdAt || '').toLocaleDateString() }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
