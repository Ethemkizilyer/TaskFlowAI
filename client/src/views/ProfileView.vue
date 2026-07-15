<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { userApi, authApi } from '@/api'
import {
  Settings, Loader2, Save, Lock, User, Mail, FileText, CheckCircle, AlertCircle
} from 'lucide-vue-next'

const authStore = useAuthStore()

const name = ref('')
const email = ref('')
const bio = ref('')
const avatar = ref('')
const saving = ref(false)
const savedMessage = ref('')

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const changingPassword = ref(false)
const passwordMessage = ref('')
const passwordError = ref('')

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
  try {
    const res = await userApi.updateProfile({
      name: name.value,
      email: email.value,
      bio: bio.value,
    })
    authStore.user = { ...authStore.user, ...res.data.data }
    savedMessage.value = 'Profile updated successfully!'
    setTimeout(() => (savedMessage.value = ''), 3000)
  } catch (e: any) {
    savedMessage.value = e.response?.data?.error || 'Failed to update profile'
  } finally {
    saving.value = false
  }
}

const changePassword = async () => {
  passwordError.value = ''
  passwordMessage.value = ''

  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Passwords do not match'
    return
  }
  if (newPassword.value.length < 6) {
    passwordError.value = 'Password must be at least 6 characters'
    return
  }

  changingPassword.value = true
  try {
    await userApi.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    passwordMessage.value = 'Password changed successfully!'
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    setTimeout(() => (passwordMessage.value = ''), 3000)
  } catch (e: any) {
    passwordError.value = e.response?.data?.error || 'Failed to change password'
  } finally {
    changingPassword.value = false
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
          <h1 class="text-xl font-bold">Profile & Settings</h1>
          <p class="text-sm text-surface-500">Manage your account and preferences</p>
        </div>
      </div>

      <!-- Profile section -->
      <div class="card p-6 mb-6">
        <h2 class="font-semibold text-lg mb-4">Profile Information</h2>

        <!-- Avatar preview -->
        <div class="flex items-center gap-4 mb-6">
          <img :src="avatar || authStore.user?.avatar" :alt="name" class="w-20 h-20 rounded-full bg-surface-200 border-4 border-white dark:border-surface-800 shadow-md" />
          <div>
            <p class="text-sm font-medium">{{ name || 'Your name' }}</p>
            <p class="text-xs text-surface-500">{{ email }}</p>
            <span v-if="authStore.user?.role === 'ADMIN'" class="inline-block mt-1 text-[10px] font-bold text-primary-600 bg-primary-50 dark:bg-primary-950/30 dark:text-primary-300 px-2 py-0.5 rounded-full">
              ADMIN
            </span>
          </div>
        </div>

        <!-- Form -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Full Name</label>
            <div class="relative">
              <User :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input v-model="name" type="text" class="input pl-10" placeholder="Your name" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Email</label>
            <div class="relative">
              <Mail :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input v-model="email" type="email" class="input pl-10" placeholder="you@example.com" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Bio</label>
            <textarea
              v-model="bio"
              rows="3"
              maxlength="500"
              class="input resize-none"
              placeholder="Tell us about yourself..."
            ></textarea>
            <p class="text-xs text-surface-400 mt-1 text-right">{{ bio.length }}/500</p>
          </div>

          <div v-if="savedMessage" class="flex items-center gap-2 text-sm" :class="savedMessage.includes('success') ? 'text-green-600' : 'text-red-600'">
            <CheckCircle v-if="savedMessage.includes('success')" :size="16" />
            <AlertCircle v-else :size="16" />
            {{ savedMessage }}
          </div>

          <button @click="saveProfile" :disabled="saving" class="btn-primary w-full sm:w-auto">
            <Loader2 v-if="saving" :size="16" class="animate-spin" />
            <Save v-else :size="16" />
            Save Changes
          </button>
        </div>
      </div>

      <!-- Change password section -->
      <div class="card p-6">
        <h2 class="font-semibold text-lg mb-4">Change Password</h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Current Password</label>
            <div class="relative">
              <Lock :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input v-model="currentPassword" type="password" class="input pl-10" placeholder="••••••••" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">New Password</label>
            <div class="relative">
              <Lock :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input v-model="newPassword" type="password" class="input pl-10" placeholder="••••••••" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Confirm New Password</label>
            <div class="relative">
              <Lock :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input v-model="confirmPassword" type="password" class="input pl-10" placeholder="••••••••" />
            </div>
          </div>

          <div v-if="passwordError" class="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle :size="16" /> {{ passwordError }}
          </div>
          <div v-if="passwordMessage" class="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle :size="16" /> {{ passwordMessage }}
          </div>

          <button @click="changePassword" :disabled="changingPassword || !currentPassword || !newPassword" class="btn-primary w-full sm:w-auto">
            <Loader2 v-if="changingPassword" :size="16" class="animate-spin" />
            <Lock v-else :size="16" />
            Change Password
          </button>
        </div>
      </div>

      <!-- Account info -->
      <div class="card p-6 mt-6">
        <h2 class="font-semibold text-lg mb-4">Account Information</h2>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-surface-500">Role</span>
            <span class="font-medium">{{ authStore.user?.role }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-surface-500">Member since</span>
            <span class="font-medium">{{ new Date(authStore.user?.createdAt || '').toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' }) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
