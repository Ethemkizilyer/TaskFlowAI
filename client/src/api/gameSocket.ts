import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth'

export type GameType = 'TIC_TAC_TOE' | 'CONNECT_FOUR' | 'CHESS'

export interface GamePlayerInfo {
  userId: string
  userName: string
  symbol: 'X' | 'O'
}

export interface GameStartedPayload {
  gameId: string
  gameType: GameType
  board: any
  turn: 'X' | 'O'
  players: GamePlayerInfo[]
}

export interface GameMovePayload {
  gameId: string
  board: any
  turn: 'X' | 'O'
  move: any
  player: 'X' | 'O'
  chessStatus?: 'CHECK' | 'CHECKMATE' | 'STALEMATE' | 'NORMAL'
}

export interface GameEndedPayload {
  gameId: string
  winner: string | null
  winLine?: number[]
  resignedBy?: 'X' | 'O'
  leftBy?: 'X' | 'O'
}

type GameHandler<T> = (payload: T) => void

let gameSocket: Socket | null = null

const gameHandlers = {
  started: [] as GameHandler<GameStartedPayload>[],
  queued: [] as GameHandler<{ gameType: GameType }>[],
  cancelled: [] as GameHandler<void>[],
  moveMade: [] as GameHandler<GameMovePayload>[],
  ended: [] as GameHandler<GameEndedPayload>[],
  rematch: [] as GameHandler<{ gameId: string; board: any; turn: 'X' | 'O' }>[],
  error: [] as GameHandler<{ message: string }>[],
  legalMoves: [] as GameHandler<{ gameId: string; square: [number, number]; moves: [number, number][] }>[],
}

export function connectGameSocket(): Socket {
  const authStore = useAuthStore()

  if (gameSocket?.connected) return gameSocket

  gameSocket = io('/games', {
    auth: { token: authStore.token },
    transports: ['websocket', 'polling'],
  })

  gameSocket.on('connect', () => {
    console.log('[GameSocket] Connected')
  })

  gameSocket.on('disconnect', () => {
    console.log('[GameSocket] Disconnected')
  })

  gameSocket.on('connect_error', (err) => {
    console.error('[GameSocket] Connection error:', err.message)
  })

  gameSocket.on('game:started', (payload: GameStartedPayload) => {
    gameHandlers.started.forEach((h) => h(payload))
  })

  gameSocket.on('game:queued', (payload: { gameType: GameType }) => {
    gameHandlers.queued.forEach((h) => h(payload))
  })

  gameSocket.on('game:matchmake_cancelled', () => {
    gameHandlers.cancelled.forEach((h) => h())
  })

  gameSocket.on('game:move_made', (payload: GameMovePayload) => {
    gameHandlers.moveMade.forEach((h) => h(payload))
  })

  gameSocket.on('game:ended', (payload: GameEndedPayload) => {
    gameHandlers.ended.forEach((h) => h(payload))
  })

  gameSocket.on('game:rematch_started', (payload: { gameId: string; board: any; turn: 'X' | 'O' }) => {
    gameHandlers.rematch.forEach((h) => h(payload))
  })

  gameSocket.on('game:error', (payload: { message: string }) => {
    gameHandlers.error.forEach((h) => h(payload))
  })

  gameSocket.on('game:legal_moves', (payload: { gameId: string; square: [number, number]; moves: [number, number][] }) => {
    gameHandlers.legalMoves.forEach((h) => h(payload))
  })

  return gameSocket
}

export function disconnectGameSocket() {
  if (gameSocket) {
    gameSocket.disconnect()
    gameSocket = null
  }
}

export function getGameSocket(): Socket | null {
  return gameSocket
}

export function gameMatchmake(gameType: GameType) {
  gameSocket?.emit('game:matchmake', { gameType })
}

export function gameCancelMatchmake(gameType: GameType) {
  gameSocket?.emit('game:cancel_matchmake', { gameType })
}

export function gameMove(gameId: string, move: any) {
  gameSocket?.emit('game:move', { gameId, move })
}

export function gameResign(gameId: string) {
  gameSocket?.emit('game:resign', { gameId })
}

export function gameRematch(gameId: string) {
  gameSocket?.emit('game:rematch', { gameId })
}

export function gameLeave(gameId: string) {
  gameSocket?.emit('game:leave', { gameId })
}

export function gameGetLegalMoves(gameId: string, square: [number, number]) {
  gameSocket?.emit('game:get_legal_moves', { gameId, square })
}

export function onGameStarted(handler: GameHandler<GameStartedPayload>) {
  gameHandlers.started.push(handler)
  return () => {
    const idx = gameHandlers.started.indexOf(handler)
    if (idx >= 0) gameHandlers.started.splice(idx, 1)
  }
}

export function onGameQueued(handler: GameHandler<{ gameType: GameType }>) {
  gameHandlers.queued.push(handler)
  return () => {
    const idx = gameHandlers.queued.indexOf(handler)
    if (idx >= 0) gameHandlers.queued.splice(idx, 1)
  }
}

export function onMatchmakeCancelled(handler: GameHandler<void>) {
  gameHandlers.cancelled.push(handler)
  return () => {
    const idx = gameHandlers.cancelled.indexOf(handler)
    if (idx >= 0) gameHandlers.cancelled.splice(idx, 1)
  }
}

export function onGameMoveMade(handler: GameHandler<GameMovePayload>) {
  gameHandlers.moveMade.push(handler)
  return () => {
    const idx = gameHandlers.moveMade.indexOf(handler)
    if (idx >= 0) gameHandlers.moveMade.splice(idx, 1)
  }
}

export function onGameEnded(handler: GameHandler<GameEndedPayload>) {
  gameHandlers.ended.push(handler)
  return () => {
    const idx = gameHandlers.ended.indexOf(handler)
    if (idx >= 0) gameHandlers.ended.splice(idx, 1)
  }
}

export function onGameRematch(handler: GameHandler<{ gameId: string; board: any; turn: 'X' | 'O' }>) {
  gameHandlers.rematch.push(handler)
  return () => {
    const idx = gameHandlers.rematch.indexOf(handler)
    if (idx >= 0) gameHandlers.rematch.splice(idx, 1)
  }
}

export function onGameError(handler: GameHandler<{ message: string }>) {
  gameHandlers.error.push(handler)
  return () => {
    const idx = gameHandlers.error.indexOf(handler)
    if (idx >= 0) gameHandlers.error.splice(idx, 1)
  }
}

export function onLegalMoves(handler: GameHandler<{ gameId: string; square: [number, number]; moves: [number, number][] }>) {
  gameHandlers.legalMoves.push(handler)
  return () => {
    const idx = gameHandlers.legalMoves.indexOf(handler)
    if (idx >= 0) gameHandlers.legalMoves.splice(idx, 1)
  }
}
