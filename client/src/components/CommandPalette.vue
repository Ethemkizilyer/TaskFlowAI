<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { searchApi } from '@/api'
import {
  Search, LayoutDashboard, CheckSquare, Users, MessageSquare,
  Loader2, CornerDownLeft, ArrowUp, ArrowDown, X
} from 'lucide-vue-next'

const router = useRouter()

const isOpen = ref(false)
const query = ref('')
const loading = ref(false)
const results = ref<any>({ boards: [], tasks: [], users: [], comments: [] })
const activeIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const flatResults = computed(() => {
  const items: Array<{ type: string; data: any; label: string; sublabel?: string; icon: any; route: string }> = []
  results.value.boards.forEach((b: any) => {
    items.push({ type: 'Board', data: b, label: b.title, sublabel: b.description || `${b._count.tasks} tasks`, icon: LayoutDashboard, route: `/board/${b.id}` })
  })
  results.value.tasks.forEach((t: any) => {
    items.push({ type: 'Task', data: t, label: t.title, sublabel: t.board?.title, icon: CheckSquare, route: `/board/${t.boardId}` })
  })
  results.value.users.forEach((u: any) => {
    items.push({ type: 'User', data: u, label: u.name, sublabel: u.email, icon: Users, route: `/profile` })
  })
  results.value.comments.forEach((c: any) => {
    items.push({ type: 'Comment', data: c, label: c.content.slice(0, 60) + (c.content.length > 60 ? '...' : ''), sublabel: `${c.user?.name} on ${c.task?.title}`, icon: MessageSquare, route: `/board/${c.task?.boardId}` })
  })
  return items
})

const open = () => {
  isOpen.value = true
  activeIndex.value = 0
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const close = () => {
  isOpen.value = false
  query.value = ''
  results.value = { boards: [], tasks: [], users: [], comments: [] }
}

const navigate = (item?: any) => {
  const target = item || flatResults.value[activeIndex.value]
  if (!target) return
  router.push(target.route)
  close()
}

const onKeyDown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    if (isOpen.value) close()
    else open()
    return
  }
  if (!isOpen.value) return
  if (e.key === 'Escape') {
    close()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, flatResults.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    navigate()
  }
}

let debounceTimer: ReturnType<typeof setTimeout>
watch(query, (val) => {
  if (val.length < 2) {
    results.value = { boards: [], tasks: [], users: [], comments: [] }
    return
  }
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    loading.value = true
    try {
      const res = await searchApi.global(val)
      results.value = res.data.data
      activeIndex.value = 0
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }, 250)
})

const typeColors: Record<string, string> = {
  Board: 'text-primary-500',
  Task: 'text-blue-500',
  User: 'text-green-500',
  Comment: 'text-orange-500',
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/40 z-[60] flex items-start justify-center pt-[15vh] px-4"
    @click.self="close"
  >
    <div class="card p-0 w-full max-w-2xl overflow-hidden shadow-2xl">
      <!-- Search input -->
      <div class="flex items-center gap-3 px-4 py-3 border-b border-surface-200 dark:border-surface-800">
        <Search :size="20" class="text-surface-400 shrink-0" />
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          placeholder="Search boards, tasks, people, comments..."
          class="flex-1 bg-transparent border-0 outline-none text-base placeholder:text-surface-400"
        />
        <Loader2 v-if="loading" :size="18" class="animate-spin text-surface-400 shrink-0" />
        <button @click="close" class="btn-ghost p-1 shrink-0">
          <X :size="18" />
        </button>
      </div>

      <!-- Results -->
      <div class="max-h-[50vh] overflow-y-auto">
        <div v-if="query.length < 2" class="p-8 text-center text-surface-400 text-sm">
          Type at least 2 characters to search
        </div>
        <div v-else-if="flatResults.length === 0 && !loading" class="p-8 text-center text-surface-400 text-sm">
          No results found for "{{ query }}"
        </div>
        <div v-else class="py-2">
          <button
            v-for="(item, idx) in flatResults"
            :key="item.data.id"
            @click="navigate(item)"
            @mouseenter="activeIndex = idx"
            class="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left"
            :class="activeIndex === idx ? 'bg-primary-50 dark:bg-primary-950/20' : 'hover:bg-surface-50 dark:hover:bg-surface-800/30'"
          >
            <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" :class="activeIndex === idx ? 'bg-primary-100 dark:bg-primary-900/40' : 'bg-surface-100 dark:bg-surface-800'">
              <component :is="item.icon" :size="16" :class="typeColors[item.type]" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ item.label }}</p>
              <p v-if="item.sublabel" class="text-xs text-surface-500 truncate">{{ item.sublabel }}</p>
            </div>
            <span class="text-[10px] font-bold uppercase text-surface-400 shrink-0">{{ item.type }}</span>
            <CornerDownLeft v-if="activeIndex === idx" :size="14" class="text-surface-400 shrink-0" />
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between px-4 py-2 border-t border-surface-200 dark:border-surface-800 text-xs text-surface-400">
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-[10px] font-mono">↑↓</kbd>
            navigate
          </span>
          <span class="flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-[10px] font-mono">↵</kbd>
            select
          </span>
          <span class="flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-[10px] font-mono">esc</kbd>
            close
          </span>
        </div>
        <span class="text-surface-300">{{ flatResults.length }} results</span>
      </div>
    </div>
  </div>
</template>
