<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import {
  connectGameSocket, disconnectGameSocket,
  gameMatchmake, gameCancelMatchmake, gameMove, gameResign, gameRematch, gameLeave,
  onGameStarted, onGameQueued, onMatchmakeCancelled, onGameMoveMade, onGameEnded, onGameRematch, onGameError,
  type GameType, type GamePlayerInfo,
} from '@/api/gameSocket'
import TicTacToeBoard from '@/components/games/TicTacToeBoard.vue'
import ConnectFourBoard from '@/components/games/ConnectFourBoard.vue'
import ChessBoard from '@/components/games/ChessBoard.vue'
import {
  Gamepad2, Grid3x3, CircleDot, Trophy, RotateCcw,
  Loader2, Users, X, ArrowLeft, Flag, Zap, Crown,
} from 'lucide-vue-next'

const { t } = useI18n()
const authStore = useAuthStore()

type Screen = 'lobby' | 'queue' | 'game'
const screen = ref<Screen>('lobby')

const selectedGame = ref<GameType | null>(null)
const queuedGame = ref<GameType | null>(null)

const gameId = ref<string | null>(null)
const gameType = ref<GameType>('TIC_TAC_TOE')
const board = ref<any>(null)
const turn = ref<'X' | 'O'>('X')
const players = ref<GamePlayerInfo[]>([])
const winner = ref<string | null>(null)
const winLine = ref<number[] | undefined>(undefined)
const gameEnded = ref(false)
const endedReason = ref<'resigned' | 'left' | 'normal'>('normal')
const errorMsg = ref('')
const chessStatus = ref<'CHECK' | 'CHECKMATE' | 'STALEMATE' | 'NORMAL'>('NORMAL')

const mySymbol = computed<'X' | 'O'>(() => {
  const me = players.value.find((p) => p.userId === authStore.user?.id)
  return me?.symbol || 'X'
})

const opponent = computed(() => players.value.find((p) => p.userId !== authStore.user?.id))

const isMyTurn = computed(() => turn.value === mySymbol.value && !gameEnded.value)

const gameResult = computed(() => {
  if (!gameEnded.value) return null
  if (winner.value === 'DRAW') return 'draw'
  if (winner.value === mySymbol.value) return 'win'
  return 'lose'
})

const games = [
  {
    type: 'TIC_TAC_TOE' as GameType,
    icon: Grid3x3,
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    type: 'CONNECT_FOUR' as GameType,
    icon: CircleDot,
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  {
    type: 'CHESS' as GameType,
    icon: Crown,
    color: 'from-violet-500 to-purple-700',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
  },
]

const selectGame = (type: GameType) => {
  selectedGame.value = type
  screen.value = 'queue'
  queuedGame.value = type
  errorMsg.value = ''
  gameMatchmake(type)
}

const cancelQueue = () => {
  if (queuedGame.value) {
    gameCancelMatchmake(queuedGame.value)
    queuedGame.value = null
  }
  screen.value = 'lobby'
  selectedGame.value = null
}

const handleMove = (moveData: any) => {
  if (!gameId.value) return
  if (gameType.value === 'TIC_TAC_TOE') {
    gameMove(gameId.value, { index: moveData })
  } else if (gameType.value === 'CONNECT_FOUR') {
    gameMove(gameId.value, { col: moveData })
  }
}

const handleChessMove = (from: [number, number], to: [number, number], promotion?: 'Q' | 'R' | 'B' | 'N') => {
  if (!gameId.value) return
  gameMove(gameId.value, { from, to, promotion })
}

const handleResign = () => {
  if (gameId.value) {
    gameResign(gameId.value)
  }
}

const handleRematch = () => {
  if (gameId.value) {
    gameRematch(gameId.value)
    gameEnded.value = false
    winner.value = null
    winLine.value = undefined
  }
}

const handleLeave = () => {
  if (gameId.value) {
    gameLeave(gameId.value)
  }
  resetGameState()
  screen.value = 'lobby'
}

const resetGameState = () => {
  gameId.value = null
  board.value = null
  turn.value = 'X'
  players.value = []
  winner.value = null
  winLine.value = undefined
  gameEnded.value = false
  endedReason.value = 'normal'
  errorMsg.value = ''
  chessStatus.value = 'NORMAL'
}

let unsubs: (() => void)[] = []

onMounted(() => {
  connectGameSocket()

  unsubs.push(onGameStarted((payload) => {
    gameId.value = payload.gameId
    gameType.value = payload.gameType
    board.value = payload.board
    turn.value = payload.turn
    players.value = payload.players
    gameEnded.value = false
    winner.value = null
    winLine.value = undefined
    queuedGame.value = null
    screen.value = 'game'
  }))

  unsubs.push(onGameQueued(() => {
    // Already showing queue screen
  }))

  unsubs.push(onMatchmakeCancelled(() => {
    queuedGame.value = null
  }))

  unsubs.push(onGameMoveMade((payload) => {
    board.value = payload.board
    turn.value = payload.turn
    if (payload.chessStatus) chessStatus.value = payload.chessStatus
  }))

  unsubs.push(onGameEnded((payload) => {
    gameEnded.value = true
    winner.value = payload.winner
    winLine.value = payload.winLine
    if (payload.resignedBy) endedReason.value = 'resigned'
    else if (payload.leftBy) endedReason.value = 'left'
    else endedReason.value = 'normal'
  }))

  unsubs.push(onGameRematch((payload) => {
    board.value = payload.board
    turn.value = payload.turn
    gameEnded.value = false
    winner.value = null
    winLine.value = undefined
    chessStatus.value = 'NORMAL'
  }))

  unsubs.push(onGameError((payload) => {
    errorMsg.value = payload.message
    setTimeout(() => { errorMsg.value = '' }, 3000)
  }))
})

onUnmounted(() => {
  unsubs.forEach((u) => u())
  unsubs = []
  if (gameId.value) gameLeave(gameId.value)
  disconnectGameSocket()
})
</script>

<template>
  <div class="min-h-screen p-4 sm:p-6 lg:p-8 relative z-10">
    <div class="max-w-5xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold flex items-center gap-2">
            <Gamepad2 :size="24" class="text-primary-500" />
            {{ t('games.title') }}
          </h1>
          <p class="text-sm text-surface-500 dark:text-surface-400 mt-1">
            {{ t('games.subtitle') }}
          </p>
        </div>
        <button
          v-if="screen === 'game'"
          @click="handleLeave"
          class="btn-ghost text-sm px-4 py-2 flex items-center gap-2"
        >
          <ArrowLeft :size="16" /> {{ t('games.backToLobby') }}
        </button>
      </div>

      <!-- Error toast -->
      <Transition name="fade">
        <div
          v-if="errorMsg"
          class="fixed top-20 left-1/2 -translate-x-1/2 z-50 glass-card px-4 py-2 rounded-xl border border-red-500/30 text-sm text-red-500"
        >
          {{ errorMsg }}
        </div>
      </Transition>

      <!-- LOBBY -->
      <template v-if="screen === 'lobby'">
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="game in games"
            :key="game.type"
            @click="selectGame(game.type)"
            class="glass-card p-6 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl group border-2"
            :class="game.borderColor"
          >
            <div class="flex items-center gap-4">
              <div
                class="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br"
                :class="game.color"
              >
                <component :is="game.icon" :size="28" class="text-white" />
              </div>
              <div class="flex-1">
                <h3 class="font-bold text-lg">{{ t(`games.${game.type}.name`) }}</h3>
                <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  {{ t(`games.${game.type}.description`) }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-4 text-xs text-surface-400">
              <Users :size="14" />
              <span>{{ t('games.players2') }}</span>
              <span class="mx-1">•</span>
              <Zap :size="14" />
              <span>{{ t('games.realtime') }}</span>
            </div>
          </div>
        </div>

        <!-- Info cards -->
        <div class="grid sm:grid-cols-3 gap-4 mt-6">
          <div class="glass-card p-4 rounded-xl">
            <div class="flex items-center gap-2 mb-2">
              <Trophy :size="16" class="text-amber-500" />
              <span class="font-semibold text-sm">{{ t('games.howToPlay') }}</span>
            </div>
            <p class="text-xs text-surface-500 dark:text-surface-400">{{ t('games.howToPlayDesc') }}</p>
          </div>
          <div class="glass-card p-4 rounded-xl">
            <div class="flex items-center gap-2 mb-2">
              <Users :size="16" class="text-primary-500" />
              <span class="font-semibold text-sm">{{ t('games.matchmaking') }}</span>
            </div>
            <p class="text-xs text-surface-500 dark:text-surface-400">{{ t('games.matchmakingDesc') }}</p>
          </div>
          <div class="glass-card p-4 rounded-xl">
            <div class="flex items-center gap-2 mb-2">
              <Zap :size="16" class="text-violet-500" />
              <span class="font-semibold text-sm">{{ t('games.realtime') }}</span>
            </div>
            <p class="text-xs text-surface-500 dark:text-surface-400">{{ t('games.realtimeDesc') }}</p>
          </div>
        </div>
      </template>

      <!-- QUEUE -->
      <template v-if="screen === 'queue' && queuedGame">
        <div class="flex flex-col items-center justify-center py-20">
          <div class="glass-card p-8 rounded-2xl text-center max-w-sm w-full">
            <div class="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br"
              :class="games.find(g => g.type === queuedGame)?.color"
            >
              <component :is="games.find(g => g.type === queuedGame)?.icon" :size="36" class="text-white" />
            </div>
            <h3 class="font-bold text-lg mb-2">{{ t(`games.${queuedGame}.name`) }}</h3>
            <div class="flex items-center justify-center gap-2 text-surface-400 mb-6">
              <Loader2 :size="20" class="animate-spin" />
              <span class="text-sm">{{ t('games.searchingOpponent') }}</span>
            </div>
            <button @click="cancelQueue" class="btn-ghost text-sm px-6 py-2 flex items-center gap-2 mx-auto">
              <X :size="16" /> {{ t('games.cancelSearch') }}
            </button>
          </div>
        </div>
      </template>

      <!-- GAME -->
      <template v-if="screen === 'game' && board">
        <div class="flex flex-col items-center gap-6">
          <!-- Players bar -->
          <div class="flex items-center gap-4 sm:gap-8 w-full max-w-2xl justify-center">
            <!-- Me -->
            <div
              class="glass-card px-4 py-3 rounded-xl flex items-center gap-3 transition-all"
              :class="{
                'ring-2 ring-primary-500': isMyTurn,
                'opacity-50': gameEnded && winner !== mySymbol && winner !== 'DRAW',
              }"
            >
              <img :src="authStore.user?.avatar || ''" class="w-10 h-10 rounded-full bg-surface-200" />
              <div>
                <p class="text-sm font-semibold">{{ authStore.user?.name }}</p>
                <p class="text-xs" :class="mySymbol === 'X' ? 'text-primary-500' : 'text-amber-500'">
                  {{ mySymbol === 'X' ? '✕' : '◯' }} {{ t('games.you') }}
                </p>
              </div>
            </div>

            <span class="text-xl font-bold text-surface-400">VS</span>

            <!-- Opponent -->
            <div
              v-if="opponent"
              class="glass-card px-4 py-3 rounded-xl flex items-center gap-3 transition-all"
              :class="{
                'ring-2 ring-primary-500': !isMyTurn && !gameEnded,
                'opacity-50': gameEnded && winner === mySymbol,
              }"
            >
              <div class="w-10 h-10 rounded-full bg-surface-300 dark:bg-surface-700 flex items-center justify-center">
                <Users :size="18" class="text-surface-500" />
              </div>
              <div>
                <p class="text-sm font-semibold">{{ opponent.userName }}</p>
                <p class="text-xs" :class="opponent.symbol === 'X' ? 'text-primary-500' : 'text-amber-500'">
                  {{ opponent.symbol === 'X' ? '✕' : '◯' }} {{ t('games.opponent') }}
                </p>
              </div>
            </div>
            <div v-else class="glass-card px-4 py-3 rounded-xl flex items-center gap-3 opacity-50">
              <Loader2 :size="18" class="animate-spin" />
              <span class="text-sm">{{ t('games.waitingPlayer') }}</span>
            </div>
          </div>

          <!-- Turn indicator -->
          <div v-if="!gameEnded" class="text-center">
            <p class="text-sm font-medium" :class="isMyTurn ? 'text-primary-500' : 'text-surface-400'">
              {{ isMyTurn ? t('games.yourTurn') : t('games.opponentTurn') }}
            </p>
            <p v-if="gameType === 'CHESS' && chessStatus === 'CHECK'" class="text-xs text-red-500 font-semibold mt-1">
              {{ t('games.check') }}!
            </p>
          </div>

          <!-- Game board -->
          <div class="relative">
            <TicTacToeBoard
              v-if="gameType === 'TIC_TAC_TOE'"
              :board="board"
              :win-line="winLine"
              :my-symbol="mySymbol"
              :turn="turn"
              :disabled="gameEnded"
              @move="handleMove"
            />
            <ConnectFourBoard
              v-if="gameType === 'CONNECT_FOUR'"
              :board="board"
              :win-line="winLine"
              :my-symbol="mySymbol"
              :turn="turn"
              :disabled="gameEnded"
              @move="handleMove"
            />
            <ChessBoard
              v-if="gameType === 'CHESS'"
              :board="board"
              :my-symbol="mySymbol"
              :turn="turn"
              :disabled="gameEnded"
              :game-id="gameId || ''"
              :chess-status="chessStatus"
              @move="handleChessMove"
            />

            <!-- Game ended overlay -->
            <Transition name="fade">
              <div
                v-if="gameEnded"
                class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl"
              >
                <div class="text-center">
                  <div class="mb-4">
                    <Trophy
                      v-if="gameResult === 'win'"
                      :size="48"
                      class="mx-auto text-amber-500 mb-2"
                    />
                    <X
                      v-else-if="gameResult === 'lose'"
                      :size="48"
                      class="mx-auto text-red-500 mb-2"
                    />
                    <div
                      v-else
                      class="text-4xl mb-2"
                    >🤝</div>
                  </div>
                  <h3 class="text-2xl font-bold mb-1">
                    {{ gameResult === 'win' ? t('games.youWon') : gameResult === 'lose' ? t('games.youLost') : t('games.draw') }}
                  </h3>
                  <p v-if="endedReason === 'resigned'" class="text-xs text-surface-400 mb-4">
                    {{ t('games.opponentResigned') }}
                  </p>
                  <p v-else-if="endedReason === 'left'" class="text-xs text-surface-400 mb-4">
                    {{ t('games.opponentLeft') }}
                  </p>
                  <p v-else class="text-xs text-surface-400 mb-4">&nbsp;</p>
                  <div class="flex items-center gap-3 justify-center">
                    <button
                      @click="handleRematch"
                      class="btn-glow px-5 py-2 text-sm flex items-center gap-2"
                    >
                      <RotateCcw :size="16" /> {{ t('games.rematch') }}
                    </button>
                    <button
                      @click="handleLeave"
                      class="btn-ghost px-5 py-2 text-sm flex items-center gap-2"
                    >
                      <ArrowLeft :size="16" /> {{ t('games.backToLobby') }}
                    </button>
                  </div>
                </div>
              </div>
            </Transition>
          </div>

          <!-- Action buttons -->
          <div v-if="!gameEnded" class="flex items-center gap-3">
            <button
              @click="handleResign"
              class="btn-ghost text-sm px-4 py-2 flex items-center gap-2 text-red-500"
            >
              <Flag :size="16" /> {{ t('games.resign') }}
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
