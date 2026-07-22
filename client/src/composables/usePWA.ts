import { ref, onMounted } from 'vue'
import axios from 'axios'

const SW_PATH = '/sw.js'
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

export function usePWA() {
  const isOnline = ref(navigator.onLine)
  const swRegistered = ref(false)
  const pushSupported = ref(false)
  const pushSubscribed = ref(false)
  const installPrompt = ref<any>(null)
  const canInstall = ref(false)

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return
    try {
      const reg = await navigator.serviceWorker.register(SW_PATH)
      swRegistered.value = !!reg
      pushSupported.value = 'PushManager' in window
      if (pushSupported.value) {
        const sub = await reg.pushManager.getSubscription()
        pushSubscribed.value = !!sub
      }
    } catch {
      // SW registration failed — app still works without offline support
    }
  }

  async function subscribeToPush() {
    if (!pushSupported.value || !VAPID_PUBLIC_KEY) return null
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return null

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    await axios.post('/api/notifications/push/subscribe', { subscription: sub })
    pushSubscribed.value = true
    return sub
  }

  async function unsubscribeFromPush() {
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await sub.unsubscribe()
      await axios.post('/api/notifications/push/unsubscribe', { endpoint: sub.endpoint })
      pushSubscribed.value = false
    }
  }

  function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray.buffer
  }

  function handleInstallPrompt(e: Event) {
    e.preventDefault()
    installPrompt.value = e
    canInstall.value = true
  }

  async function promptInstall() {
    if (!installPrompt.value) return false
    installPrompt.value.prompt()
    const { outcome } = await installPrompt.value.userChoice
    installPrompt.value = null
    canInstall.value = false
    return outcome === 'accepted'
  }

  onMounted(() => {
    registerServiceWorker()

    window.addEventListener('online', () => { isOnline.value = true })
    window.addEventListener('offline', () => { isOnline.value = false })
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
  })

  return {
    isOnline,
    swRegistered,
    pushSupported,
    pushSubscribed,
    canInstall,
    subscribeToPush,
    unsubscribeFromPush,
    promptInstall,
  }
}
