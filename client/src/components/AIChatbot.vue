<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { aiChatApi } from '@/api'
import { Bot, Send, X, Loader2, Sparkles } from 'lucide-vue-next'

const props = defineProps<{ boardId?: string }>()
const emit = defineEmits<{ action: [action: { type: string; data: any }] }>()

const isOpen = ref(false)
const loading = ref(false)
const input = ref('')
const messages = ref<{ role: 'user' | 'assistant'; content: string; action?: any }[]>([
  {
    role: 'assistant',
    content: 'Hi! I\'m your TaskFlow AI assistant. I can help you create tasks, check your progress, or give productivity advice. What can I do for you?',
  },
])
const scrollContainer = ref<HTMLElement | null>(null)

const suggestions = [
  'What are my overdue tasks?',
  'Create a high priority task to review the sprint',
  'Give me a productivity tip',
  'Summarize my current tasks',
]

async function scrollToBottom() {
  await nextTick()
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}

async function send(message?: string) {
  const text = (message || input.value).trim()
  if (!text || loading.value) return

  input.value = ''
  messages.value.push({ role: 'user', content: text })
  await scrollToBottom()

  loading.value = true
  try {
    const history = messages.value
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }))

    const res = await aiChatApi.send(text, history)
    const data = res.data.data

    messages.value.push({
      role: 'assistant',
      content: data.reply,
      action: data.action || undefined,
    })

    if (data.action) {
      emit('action', data.action)
    }
  } catch (e: any) {
    messages.value.push({
      role: 'assistant',
      content: 'Sorry, I couldn\'t process that. Please try again.',
    })
  } finally {
    loading.value = false
    await scrollToBottom()
  }
}

function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) scrollToBottom()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

watch(isOpen, (v) => { if (v) scrollToBottom() })
</script>

<template>
  <div>
    <!-- Floating button -->
    <button
      v-if="!isOpen"
      @click="toggle"
      class="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105"
      title="AI Assistant"
    >
      <Bot :size="24" />
    </button>

    <!-- Chat panel -->
    <Transition name="slide-up">
      <div
        v-if="isOpen"
        class="fixed bottom-6 right-6 z-40 w-96 max-w-[calc(100vw-2rem)] card shadow-2xl flex flex-col"
        style="height: 500px; max-height: calc(100vh-3rem)"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-surface-100 dark:border-surface-800">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white">
              <Sparkles :size="16" />
            </div>
            <div>
              <p class="font-bold text-sm">TaskFlow AI</p>
              <p class="text-xs text-green-500">Online</p>
            </div>
          </div>
          <button @click="toggle" class="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg">
            <X :size="16" />
          </button>
        </div>

        <!-- Messages -->
        <div ref="scrollContainer" class="flex-1 overflow-y-auto p-4 space-y-3">
          <div
            v-for="(msg, i) in messages"
            :key="i"
            class="flex"
            :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[80%] rounded-2xl px-3 py-2 text-sm"
              :class="msg.role === 'user'
                ? 'bg-primary-600 text-white rounded-br-sm'
                : 'bg-surface-100 dark:bg-surface-800 rounded-bl-sm'"
            >
              <p>{{ msg.content }}</p>
              <div v-if="msg.action" class="mt-2 text-xs opacity-75 border-t border-current/20 pt-1">
                Action: {{ msg.action.type }}
              </div>
            </div>
          </div>

          <div v-if="loading" class="flex justify-start">
            <div class="bg-surface-100 dark:bg-surface-800 rounded-2xl rounded-bl-sm px-3 py-2">
              <Loader2 :size="16" class="animate-spin text-primary-500" />
            </div>
          </div>
        </div>

        <!-- Suggestions -->
        <div v-if="messages.length <= 1" class="px-4 pb-2 flex flex-wrap gap-1.5">
          <button
            v-for="s in suggestions"
            :key="s"
            @click="send(s)"
            class="text-xs px-2.5 py-1 rounded-full border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            {{ s }}
          </button>
        </div>

        <!-- Input -->
        <div class="p-3 border-t border-surface-100 dark:border-surface-800">
          <div class="flex items-center gap-2">
            <input
              v-model="input"
              @keydown="handleKeydown"
              type="text"
              placeholder="Ask me anything..."
              class="flex-1 text-sm rounded-full border border-surface-200 dark:border-surface-700 bg-transparent px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="loading"
            />
            <button
              @click="send()"
              :disabled="!input.trim() || loading"
              class="w-9 h-9 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center disabled:opacity-40"
            >
              <Send :size="16" />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
