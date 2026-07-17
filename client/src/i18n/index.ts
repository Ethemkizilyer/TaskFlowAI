import { createI18n } from 'vue-i18n'
import tr from './locales/tr'
import en from './locales/en'

const STORAGE_KEY = 'taskflow-lang'

const getInitialLocale = (): string => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && (saved === 'tr' || saved === 'en')) return saved
  return 'tr'
}

const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'tr',
  messages: {
    tr,
    en,
  },
})

export const setLanguage = (lang: 'tr' | 'en') => {
  i18n.global.locale.value = lang
  localStorage.setItem(STORAGE_KEY, lang)
  document.documentElement.lang = lang
}

export const getCurrentLanguage = (): 'tr' | 'en' => {
  return i18n.global.locale.value as 'tr' | 'en'
}

export default i18n
