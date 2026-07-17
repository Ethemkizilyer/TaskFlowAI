<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Globe, Check } from 'lucide-vue-next'
import { setLanguage, getCurrentLanguage } from '@/i18n'

const { t } = useI18n()
const open = ref(false)
const current = ref<'tr' | 'en'>(getCurrentLanguage())
const dropdownRef = ref<HTMLElement | null>(null)

const languages = [
  { code: 'tr' as const, label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en' as const, label: 'English', flag: '🇬🇧' },
]

const select = (code: 'tr' | 'en') => {
  current.value = code
  setLanguage(code)
  open.value = false
}

const handleClickOutside = (e: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="dropdownRef" class="relative">
    <button
      @click="open = !open"
      class="btn-ghost p-2 flex items-center gap-1.5"
      :title="t('nav.language')"
    >
      <Globe :size="18" />
      <span class="text-xs font-medium">{{ current.toUpperCase() }}</span>
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95 -translate-y-1"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="open"
        class="absolute right-0 mt-2 w-40 card p-1 shadow-xl z-50"
      >
        <button
          v-for="lang in languages"
          :key="lang.code"
          @click="select(lang.code)"
          class="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-sm"
        >
          <span class="flex items-center gap-2">
            <span class="text-base">{{ lang.flag }}</span>
            <span class="font-medium">{{ lang.label }}</span>
          </span>
          <Check v-if="current === lang.code" :size="16" class="text-primary-500" />
        </button>
      </div>
    </Transition>
  </div>
</template>
