import { Server as SocketServer, Socket } from 'socket.io';
import {
  createChessGame, applyMoveToState, getLegalMoves, getGameStatus,
  type ChessGameState, type ChessMove,
} from '../games/chessEngine';

type GameType = 'TIC_TAC_TOE' | 'CONNECT_FOUR' | 'CHESS';

interface GamePlayer {
  userId: string;
  userName: string;
  socketId: string;
  symbol: 'X' | 'O';
}

interface GameState {
  id: string;
  type: GameType;
  players: GamePlayer[];
  board: any;
  turn: 'X' | 'O';
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  winner: string | null;
  winLine?: number[];
  createdAt: number;
}

const games = new Map<string, GameState>();
const matchmakingQueues = new Map<GameType, GamePlayer[]>();
const playerGames = new Map<string, string>();

function createBoard(type: GameType): any {
  if (type === 'TIC_TAC_TOE') {
    return Array(9).fill(null);
  }
  if (type === 'CHESS') {
    return createChessGame();
  }
  return Array(6).fill(null).map(() => Array(7).fill(null));
}

function checkWinnerTicTacToe(board: (string | null)[]): { winner: string | null; winLine: number[] | null } {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], winLine: line };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { winner: 'DRAW', winLine: null };
  }
  return { winner: null, winLine: null };
}

function checkWinnerConnectFour(board: (string | null)[][]): { winner: string | null; winLine: number[] | null } {
  const rows = board.length;
  const cols = board[0].length;
  const directions = [
    [0, 1], [1, 0], [1, 1], [1, -1],
  ];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!board[r][c]) continue;
      for (const [dr, dc] of directions) {
        const line: number[] = [r * cols + c];
        let valid = true;
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
            valid = false;
            break;
          }
          if (board[nr][nc] !== board[r][c]) {
            valid = false;
            break;
          }
          line.push(nr * cols + nc);
        }
        if (valid) {
          return { winner: board[r][c], winLine: line };
        }
      }
    }
  }
  const isFull = board.every((row) => row.every((cell) => cell !== null));
  if (isFull) return { winner: 'DRAW', winLine: null };
  return { winner: null, winLine: null };
}

function generateGameId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function inBoundsChess(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function getGameForUser(userId: string): GameState | null {
  const gameId = playerGames.get(userId);
  if (!gameId) return null;
  return games.get(gameId) || null;
}

function cleanupGame(gameId: string) {
  const game = games.get(gameId);
  if (!game) return;
  game.players.forEach((p) => playerGames.delete(p.userId));
  games.delete(gameId);
}

export function initGameNamespaces(io: SocketServer) {
  const gameNs = io.of('/games');

  gameNs.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string;
    if (!token) return next(new Error('Authentication required'));
    try {
      const { verifyAccessToken } = await import('../services/tokenService');
      const prisma = (await import('../config/prisma')).default;
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, name: true, status: true, tokenVersion: true },
      });
      if (!user || user.status !== 'ACTIVE' || user.tokenVersion !== payload.v) {
        throw new Error('Invalid token');
      }
      (socket as any).userId = user.id;
      (socket as any).userName = user.name;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  gameNs.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    const userName = (socket as any).userName;
    console.log(`[GameSocket] User connected: ${userId}`);

    socket.on('game:matchmake', (data: { gameType: GameType }) => {
      const existingGame = getGameForUser(userId);
      if (existingGame) {
        socket.emit('game:error', { message: 'Already in a game' });
        return;
      }

      const queue = matchmakingQueues.get(data.gameType) || [];
      const opponent = queue.find((p) => p.userId !== userId);

      if (opponent) {
        matchmakingQueues.set(data.gameType, queue.filter((p) => p.userId !== opponent.userId));

        const gameId = generateGameId();
        const game: GameState = {
          id: gameId,
          type: data.gameType,
          players: [
            { userId: opponent.userId, userName: opponent.userName, socketId: opponent.socketId, symbol: 'X' },
            { userId, userName, socketId: socket.id, symbol: 'O' },
          ],
          board: createBoard(data.gameType),
          turn: 'X',
          status: 'PLAYING',
          winner: null,
          createdAt: Date.now(),
        };
        games.set(gameId, game);
        playerGames.set(opponent.userId, gameId);
        playerGames.set(userId, gameId);

        socket.join(gameId);
        io.of('/games').to(opponent.socketId).socketsJoin(gameId);

        io.of('/games').to(gameId).emit('game:started', {
          gameId,
          gameType: game.type,
          board: game.board,
          turn: game.turn,
          players: game.players.map((p) => ({ userId: p.userId, userName: p.userName, symbol: p.symbol })),
        });
      } else {
        const player: GamePlayer = { userId, userName, socketId: socket.id, symbol: 'X' };
        queue.push(player);
        matchmakingQueues.set(data.gameType, queue);
        socket.emit('game:queued', { gameType: data.gameType });
      }
    });

    socket.on('game:cancel_matchmake', (data: { gameType: GameType }) => {
      const queue = matchmakingQueues.get(data.gameType) || [];
      matchmakingQueues.set(data.gameType, queue.filter((p) => p.userId !== userId));
      socket.emit('game:matchmake_cancelled');
    });

    socket.on('game:get_legal_moves', (data: { gameId: string; square: [number, number] }) => {
      const game = games.get(data.gameId);
      if (!game || game.type !== 'CHESS') {
        socket.emit('game:legal_moves', { gameId: data.gameId, moves: [] });
        return;
      }
      const player = game.players.find((p) => p.userId === userId);
      if (!player) {
        socket.emit('game:legal_moves', { gameId: data.gameId, moves: [] });
        return;
      }
      const chessState = game.board as ChessGameState;
      const chessColor = player.symbol === 'X' ? 'w' : 'b';
      if (chessState.turn !== chessColor) {
        socket.emit('game:legal_moves', { gameId: data.gameId, moves: [] });
        return;
      }
      const [r, c] = data.square;
      const piece = chessState.board[r][c];
      if (!piece || piece.color !== chessColor) {
        socket.emit('game:legal_moves', { gameId: data.gameId, moves: [] });
        return;
      }
      const moves = getLegalMoves(chessState, r, c);
      socket.emit('game:legal_moves', { gameId: data.gameId, square: data.square, moves });
    });

    socket.on('game:move', (data: { gameId: string; move: any }) => {
      const game = games.get(data.gameId);
      if (!game || game.status !== 'PLAYING') {
        socket.emit('game:error', { message: 'Game not found or not active' });
        return;
      }

      const player = game.players.find((p) => p.userId === userId);
      if (!player) {
        socket.emit('game:error', { message: 'Not a player in this game' });
        return;
      }

      if (player.symbol !== game.turn) {
        socket.emit('game:error', { message: 'Not your turn' });
        return;
      }

      if (game.type === 'TIC_TAC_TOE') {
        const { index } = data.move;
        const board = game.board as (string | null)[];
        if (index < 0 || index >= 9 || board[index] !== null) {
          socket.emit('game:error', { message: 'Invalid move' });
          return;
        }
        board[index] = player.symbol;
        const result = checkWinnerTicTacToe(board);
        if (result.winner) {
          game.status = 'FINISHED';
          game.winner = result.winner;
          game.winLine = result.winLine || undefined;
        } else {
          game.turn = game.turn === 'X' ? 'O' : 'X';
        }
        io.of('/games').to(game.id).emit('game:move_made', {
          gameId: game.id,
          board: game.board,
          turn: game.turn,
          move: data.move,
          player: player.symbol,
        });
        if (game.status === 'FINISHED') {
          io.of('/games').to(game.id).emit('game:ended', {
            gameId: game.id,
            winner: game.winner,
            winLine: game.winLine,
          });
        }
      } else if (game.type === 'CONNECT_FOUR') {
        const { col } = data.move;
        const board = game.board as (string | null)[][];
        if (col < 0 || col >= 7) {
          socket.emit('game:error', { message: 'Invalid move' });
          return;
        }
        let placedRow = -1;
        for (let r = board.length - 1; r >= 0; r--) {
          if (board[r][col] === null) {
            board[r][col] = player.symbol;
            placedRow = r;
            break;
          }
        }
        if (placedRow === -1) {
          socket.emit('game:error', { message: 'Column full' });
          return;
        }
        const result = checkWinnerConnectFour(board);
        if (result.winner) {
          game.status = 'FINISHED';
          game.winner = result.winner;
          game.winLine = result.winLine || undefined;
        } else {
          game.turn = game.turn === 'X' ? 'O' : 'X';
        }
        io.of('/games').to(game.id).emit('game:move_made', {
          gameId: game.id,
          board: game.board,
          turn: game.turn,
          move: { col, row: placedRow },
          player: player.symbol,
        });
        if (game.status === 'FINISHED') {
          io.of('/games').to(game.id).emit('game:ended', {
            gameId: game.id,
            winner: game.winner,
            winLine: game.winLine,
          });
        }
      } else if (game.type === 'CHESS') {
        const chessState = game.board as ChessGameState;
        const chessColor = player.symbol === 'X' ? 'w' : 'b';
        if (chessState.turn !== chessColor) {
          socket.emit('game:error', { message: 'Not your turn' });
          return;
        }
        const move = data.move as ChessMove;
        const [fr, fc] = move.from;
        const [tr, tc] = move.to;
        if (!inBoundsChess(fr, fc) || !inBoundsChess(tr, tc)) {
          socket.emit('game:error', { message: 'Invalid move' });
          return;
        }
        const legalMoves = getLegalMoves(chessState, fr, fc);
        if (!legalMoves.some(([r, c]) => r === tr && c === tc)) {
          socket.emit('game:error', { message: 'Illegal move' });
          return;
        }
        applyMoveToState(chessState, move);
        const status = getGameStatus(chessState);
        let gameStatus: 'CHECK' | 'CHECKMATE' | 'STALEMATE' | 'NORMAL' = status;
        if (status === 'CHECKMATE') {
          game.status = 'FINISHED';
          game.winner = player.symbol;
        } else if (status === 'STALEMATE') {
          game.status = 'FINISHED';
          game.winner = 'DRAW';
        } else {
          game.turn = game.turn === 'X' ? 'O' : 'X';
        }
        io.of('/games').to(game.id).emit('game:move_made', {
          gameId: game.id,
          board: game.board,
          turn: game.turn,
          move: data.move,
          player: player.symbol,
          chessStatus: gameStatus,
        });
        if (game.status === 'FINISHED') {
          io.of('/games').to(game.id).emit('game:ended', {
            gameId: game.id,
            winner: game.winner,
          });
        }
      }
    });

    socket.on('game:resign', (data: { gameId: string }) => {
      const game = games.get(data.gameId);
      if (!game || game.status !== 'PLAYING') return;
      const player = game.players.find((p) => p.userId === userId);
      if (!player) return;
      const opponent = game.players.find((p) => p.userId !== userId);
      game.status = 'FINISHED';
      game.winner = opponent ? opponent.symbol : null;
      io.of('/games').to(game.id).emit('game:ended', {
        gameId: game.id,
        winner: game.winner,
        resignedBy: player.symbol,
      });
    });

    socket.on('game:rematch', (data: { gameId: string }) => {
      const game = games.get(data.gameId);
      if (!game || game.status !== 'FINISHED') return;
      const player = game.players.find((p) => p.userId === userId);
      if (!player) return;
      game.board = createBoard(game.type);
      game.turn = 'X';
      game.status = 'PLAYING';
      game.winner = null;
      game.winLine = undefined;
      io.of('/games').to(game.id).emit('game:rematch_started', {
        gameId: game.id,
        board: game.board,
        turn: game.turn,
      });
    });

    socket.on('game:leave', (data: { gameId: string }) => {
      const game = games.get(data.gameId);
      if (!game) return;
      const player = game.players.find((p) => p.userId === userId);
      if (!player) return;
      if (game.status === 'PLAYING') {
        const opponent = game.players.find((p) => p.userId !== userId);
        game.status = 'FINISHED';
        game.winner = opponent ? opponent.symbol : null;
        io.of('/games').to(game.id).emit('game:ended', {
          gameId: game.id,
          winner: game.winner,
          leftBy: player.symbol,
        });
      }
      socket.leave(data.gameId);
      cleanupGame(data.gameId);
    });

    socket.on('disconnect', () => {
      console.log(`[GameSocket] User disconnected: ${userId}`);
      matchmakingQueues.forEach((queue, type) => {
        matchmakingQueues.set(type, queue.filter((p) => p.userId !== userId));
      });
      const game = getGameForUser(userId);
      if (game && game.status === 'PLAYING') {
        const player = game.players.find((p) => p.userId === userId);
        const opponent = game.players.find((p) => p.userId !== userId);
        game.status = 'FINISHED';
        game.winner = opponent ? opponent.symbol : null;
        io.of('/games').to(game.id).emit('game:ended', {
          gameId: game.id,
          winner: game.winner,
          leftBy: player?.symbol,
        });
      }
      if (game) cleanupGame(game.id);
    });
  });
}
