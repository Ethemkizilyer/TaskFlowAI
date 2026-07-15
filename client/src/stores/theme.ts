import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export type ThemeMode = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  const stored = localStorage.getItem('theme') as ThemeMode | null
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const mode = ref<ThemeMode>(stored || (prefersDark ? 'dark' : 'light'))

  const isDark = computed(() => mode.value === 'dark')

  const applyTheme = () => {
    if (mode.value === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const toggle = () => {
    mode.value = mode.value === 'light' ? 'dark' : 'light'
  }

  const setTheme = (newMode: ThemeMode) => {
    mode.value = newMode
  }

  watch(mode, (newMode) => {
    localStorage.setItem('theme', newMode)
    applyTheme()
  }, { immediate: true })

  return { mode, isDark, toggle, setTheme }
})
