import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

interface ShortcutDef {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  action: () => void
}

export function useKeyboardShortcuts() {
  const router = useRouter()
  const showHelp = ref(false)

  const shortcuts: ShortcutDef[] = [
    {
      key: 'g',
      description: 'Go to Dashboard',
      action: () => router.push('/dashboard'),
    },
    {
      key: 'b',
      description: 'Go to Boards',
      action: () => router.push('/boards'),
    },
    {
      key: 't',
      description: 'Go to Tasks',
      action: () => router.push('/tasks'),
    },
    {
      key: 'm',
      description: 'Go to Messages',
      action: () => router.push('/messages'),
    },
    {
      key: 'f',
      description: 'Go to Focus Timer',
      action: () => router.push('/focus'),
    },
    {
      key: 'l',
      description: 'Go to Leaderboard',
      action: () => router.push('/gamification'),
    },
    {
      key: 's',
      description: 'Go to Settings',
      action: () => router.push('/settings'),
    },
    {
      key: 'n',
      ctrl: true,
      description: 'Create new task',
      action: () => {
        const event = new CustomEvent('shortcut:new-task')
        window.dispatchEvent(event)
      },
    },
    {
      key: '/',
      description: 'Focus search',
      action: () => {
        const event = new CustomEvent('shortcut:search')
        window.dispatchEvent(event)
      },
    },
    {
      key: 'Escape',
      description: 'Close modals / dialogs',
      action: () => {
        const event = new CustomEvent('shortcut:escape')
        window.dispatchEvent(event)
      },
    },
    {
      key: '?',
      shift: true,
      description: 'Show keyboard shortcuts help',
      action: () => { showHelp.value = !showHelp.value },
    },
  ]

  function handler(e: KeyboardEvent) {
    const target = e.target as HTMLElement
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      if (e.key === 'Escape') {
        target.blur()
      }
      return
    }

    for (const sc of shortcuts) {
      if (sc.key !== e.key) continue
      if (!!sc.ctrl !== (e.ctrlKey || e.metaKey)) continue
      if (!!sc.shift !== e.shiftKey) continue
      if (!!sc.alt !== e.altKey) continue

      e.preventDefault()
      sc.action()
      return
    }
  }

  onMounted(() => window.addEventListener('keydown', handler))
  onUnmounted(() => window.removeEventListener('keydown', handler))

  return { showHelp, shortcuts }
}
