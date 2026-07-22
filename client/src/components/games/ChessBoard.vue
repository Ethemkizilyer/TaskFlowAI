<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { gameGetLegalMoves, onLegalMoves } from '@/api/gameSocket'

interface ChessPiece {
  type: 'K' | 'Q' | 'R' | 'B' | 'N' | 'P'
  color: 'w' | 'b'
}

interface ChessGameState {
  board: (ChessPiece | null)[][]
  turn: 'w' | 'b'
  castlingRights: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean }
  enPassantTarget: [number, number] | null
  halfMoveClock: number
  fullMoveNumber: number
}

const props = defineProps<{
  board: ChessGameState
  mySymbol: 'X' | 'O'
  turn: 'X' | 'O'
  disabled: boolean
  gameId: string
  chessStatus?: 'CHECK' | 'CHECKMATE' | 'STALEMATE' | 'NORMAL'
}>()

const emit = defineEmits<{
  move: [from: [number, number], to: [number, number], promotion?: 'Q' | 'R' | 'B' | 'N']
}>()

const selectedSquare = ref<[number, number] | null>(null)
const legalMoves = ref<[number, number][]>([])
const lastMove = ref<{ from: [number, number]; to: [number, number] } | null>(null)
const showPromotion = ref<{ from: [number, number]; to: [number, number] } | null>(null)

const myColor = computed<'w' | 'b'>(() => (props.mySymbol === 'X' ? 'w' : 'b'))

const isMyTurn = computed(() => props.turn === props.mySymbol && !props.disabled)

const displayRows = computed(() => {
  return myColor.value === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]
})

const displayCols = computed(() => {
  return myColor.value === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]
})

const pieceUnicode: Record<string, string> = {
  'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
  'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟',
}

const getPiece = (r: number, c: number): ChessPiece | null => {
  return props.board.board[r][c]
}

const isLightSquare = (r: number, c: number) => (r + c) % 2 === 0

const isLegalMove = (r: number, c: number) => {
  return legalMoves.value.some(([lr, lc]) => lr === r && lc === c)
}

const isLastMove = (r: number, c: number) => {
  if (!lastMove.value) return false
  return (lastMove.value.from[0] === r && lastMove.value.from[1] === c) ||
         (lastMove.value.to[0] === r && lastMove.value.to[1] === c)
}

const isSelected = (r: number, c: number) => {
  return selectedSquare.value?.[0] === r && selectedSquare.value?.[1] === c
}

const isInCheck = computed(() => props.chessStatus === 'CHECK' || props.chessStatus === 'CHECKMATE')

const kingPos = computed<[number, number] | null>(() => {
  const color = props.board.turn
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = props.board.board[r][c]
      if (p && p.type === 'K' && p.color === color) return [r, c]
    }
  }
  return null
})

const isCheckSquare = (r: number, c: number) => {
  return isInCheck.value && kingPos.value?.[0] === r && kingPos.value?.[1] === c
}

const handleSquareClick = (r: number, c: number) => {
  if (!isMyTurn.value) return

  if (showPromotion.value) return

  if (selectedSquare.value) {
    const [sr, sc] = selectedSquare.value
    if (sr === r && sc === c) {
      selectedSquare.value = null
      legalMoves.value = []
      return
    }
    if (isLegalMove(r, c)) {
      const piece = getPiece(sr, sc)
      if (piece && piece.type === 'P' && (r === 0 || r === 7)) {
        showPromotion.value = { from: [sr, sc], to: [r, c] }
        return
      }
      emit('move', [sr, sc], [r, c])
      lastMove.value = { from: [sr, sc], to: [r, c] }
      selectedSquare.value = null
      legalMoves.value = []
      return
    }
  }

  const piece = getPiece(r, c)
  if (piece && piece.color === myColor.value) {
    selectedSquare.value = [r, c]
    legalMoves.value = []
    gameGetLegalMoves(props.gameId, [r, c])
  } else {
    selectedSquare.value = null
    legalMoves.value = []
  }
}

const handlePromotion = (type: 'Q' | 'R' | 'B' | 'N') => {
  if (showPromotion.value) {
    emit('move', showPromotion.value.from, showPromotion.value.to, type)
    lastMove.value = { from: showPromotion.value.from, to: showPromotion.value.to }
    showPromotion.value = null
    selectedSquare.value = null
    legalMoves.value = []
  }
}

const cancelPromotion = () => {
  showPromotion.value = null
  selectedSquare.value = null
  legalMoves.value = []
}

watch(() => props.board, () => {
  selectedSquare.value = null
  legalMoves.value = []
}, { deep: true })

let unsubLegalMoves: (() => void) | null = null
onMounted(() => {
  unsubLegalMoves = onLegalMoves((payload) => {
    if (payload.gameId !== props.gameId) return
    if (selectedSquare.value && selectedSquare.value[0] === payload.square[0] && selectedSquare.value[1] === payload.square[1]) {
      legalMoves.value = payload.moves
    }
  })
})
onUnmounted(() => {
  unsubLegalMoves?.()
})

const files = computed(() => myColor.value === 'w' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'])
const ranks = computed(() => myColor.value === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8])
</script>

<template>
  <div class="inline-block relative">
    <div class="flex">
      <!-- Rank labels -->
      <div class="flex flex-col mr-1">
        <div
          v-for="r in displayRows"
          :key="r"
          class="h-10 sm:h-12 md:h-14 flex items-center justify-center text-xs font-semibold text-surface-400 w-4"
        >
          {{ ranks[displayRows.indexOf(r)] }}
        </div>
      </div>

      <div>
        <!-- Board -->
        <div class="grid grid-cols-8 gap-0 rounded-lg overflow-hidden shadow-xl border-2 border-surface-300 dark:border-surface-700">
          <template v-for="r in displayRows" :key="r">
            <div
              v-for="c in displayCols"
              :key="`${r}-${c}`"
              @click="handleSquareClick(r, c)"
              class="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center cursor-pointer transition-all relative"
              :class="[
                isLightSquare(r, c)
                  ? 'bg-surface-100 dark:bg-surface-600'
                  : 'bg-surface-300 dark:bg-surface-800',
                isSelected(r, c) ? 'ring-2 ring-inset ring-yellow-400' : '',
                isLastMove(r, c) ? 'bg-yellow-400/30' : '',
                isCheckSquare(r, c) ? 'bg-red-500/40' : '',
              ]"
            >
              <span
                v-if="getPiece(r, c)"
                class="text-2xl sm:text-3xl md:text-4xl select-none"
                :class="[
                  getPiece(r, c)!.color === 'w' ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-surface-900 dark:text-surface-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
                ]"
              >{{ pieceUnicode[getPiece(r, c)!.color + getPiece(r, c)!.type] }}</span>

              <!-- Legal move indicator -->
              <div
                v-if="isLegalMove(r, c) && !getPiece(r, c)"
                class="absolute w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-500/40"
              />
              <div
                v-if="isLegalMove(r, c) && getPiece(r, c)"
                class="absolute inset-0 ring-2 ring-inset ring-green-500 rounded-sm"
              />
            </div>
          </template>
        </div>

        <!-- File labels -->
        <div class="flex mt-1">
          <div
            v-for="c in displayCols"
            :key="c"
            class="w-10 sm:w-12 md:w-14 flex items-center justify-center text-xs font-semibold text-surface-400"
          >
            {{ files[displayCols.indexOf(c)] }}
          </div>
        </div>
      </div>
    </div>

    <!-- Promotion dialog -->
    <Teleport to="body">
      <div
        v-if="showPromotion"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="cancelPromotion"
      >
        <div class="glass-card p-6 rounded-2xl">
          <p class="text-sm font-semibold mb-4 text-center">Promote to:</p>
          <div class="flex gap-3">
            <button
              v-for="type in (['Q', 'R', 'B', 'N'] as const)"
              :key="type"
              @click="handlePromotion(type)"
              class="w-16 h-16 rounded-xl flex items-center justify-center text-4xl bg-surface-100 dark:bg-surface-700 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-all hover:scale-110"
            >
              {{ pieceUnicode[myColor + type] }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
