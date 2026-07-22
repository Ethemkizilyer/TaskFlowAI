export type ChessPiece = {
  type: 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
  color: 'w' | 'b';
};

export type ChessBoard = (ChessPiece | null)[][];

export type ChessMove = {
  from: [number, number];
  to: [number, number];
  promotion?: 'Q' | 'R' | 'B' | 'N';
};

export type ChessGameState = {
  board: ChessBoard;
  turn: 'w' | 'b';
  castlingRights: {
    wK: boolean;
    wQ: boolean;
    bK: boolean;
    bQ: boolean;
  };
  enPassantTarget: [number, number] | null;
  halfMoveClock: number;
  fullMoveNumber: number;
};

export function createChessGame(): ChessGameState {
  const board: ChessBoard = [
    [
      { type: 'R', color: 'b' }, { type: 'N', color: 'b' }, { type: 'B', color: 'b' },
      { type: 'Q', color: 'b' }, { type: 'K', color: 'b' }, { type: 'B', color: 'b' },
      { type: 'N', color: 'b' }, { type: 'R', color: 'b' },
    ],
    Array(8).fill(null).map(() => ({ type: 'P', color: 'b' }) as ChessPiece),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null).map(() => ({ type: 'P', color: 'w' }) as ChessPiece),
    [
      { type: 'R', color: 'w' }, { type: 'N', color: 'w' }, { type: 'B', color: 'w' },
      { type: 'Q', color: 'w' }, { type: 'K', color: 'w' }, { type: 'B', color: 'w' },
      { type: 'N', color: 'w' }, { type: 'R', color: 'w' },
    ],
  ];
  return {
    board,
    turn: 'w',
    castlingRights: { wK: true, wQ: true, bK: true, bQ: true },
    enPassantTarget: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
  };
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function cloneBoard(board: ChessBoard): ChessBoard {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function findKing(board: ChessBoard, color: 'w' | 'b'): [number, number] | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type === 'K' && piece.color === color) return [r, c];
    }
  }
  return null;
}

function isSquareAttacked(board: ChessBoard, r: number, c: number, byColor: 'w' | 'b'): boolean {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (!piece || piece.color !== byColor) continue;
      const moves = getPseudoLegalMoves(board, i, j, piece, null, { wK: true, wQ: true, bK: true, bQ: true });
      if (moves.some(([mr, mc]) => mr === r && mc === c)) return true;
    }
  }
  return false;
}

export function isInCheck(state: ChessGameState, color: 'w' | 'b'): boolean {
  const kingPos = findKing(state.board, color);
  if (!kingPos) return false;
  return isSquareAttacked(state.board, kingPos[0], kingPos[1], color === 'w' ? 'b' : 'w');
}

function getPseudoLegalMoves(
  board: ChessBoard,
  r: number,
  c: number,
  piece: ChessPiece,
  enPassantTarget: [number, number] | null,
  castlingRights: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean },
): [number, number][] {
  const moves: [number, number][] = [];
  const color = piece.color;
  const dir = color === 'w' ? -1 : 1;

  switch (piece.type) {
    case 'P': {
      const startRow = color === 'w' ? 6 : 1;
      if (inBounds(r + dir, c) && !board[r + dir][c]) {
        moves.push([r + dir, c]);
        if (r === startRow && !board[r + 2 * dir][c]) {
          moves.push([r + 2 * dir, c]);
        }
      }
      for (const dc of [-1, 1]) {
        const nr = r + dir;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const target = board[nr][nc];
        if (target && target.color !== color) {
          moves.push([nr, nc]);
        }
        if (enPassantTarget && enPassantTarget[0] === nr && enPassantTarget[1] === nc) {
          moves.push([nr, nc]);
        }
      }
      break;
    }
    case 'N': {
      const deltas = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
      for (const [dr, dc] of deltas) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const target = board[nr][nc];
        if (!target || target.color !== color) moves.push([nr, nc]);
      }
      break;
    }
    case 'B': {
      const deltas = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of deltas) {
        let nr = r + dr;
        let nc = c + dc;
        while (inBounds(nr, nc)) {
          const target = board[nr][nc];
          if (!target) {
            moves.push([nr, nc]);
          } else {
            if (target.color !== color) moves.push([nr, nc]);
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
      break;
    }
    case 'R': {
      const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of deltas) {
        let nr = r + dr;
        let nc = c + dc;
        while (inBounds(nr, nc)) {
          const target = board[nr][nc];
          if (!target) {
            moves.push([nr, nc]);
          } else {
            if (target.color !== color) moves.push([nr, nc]);
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
      break;
    }
    case 'Q': {
      const deltas = [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of deltas) {
        let nr = r + dr;
        let nc = c + dc;
        while (inBounds(nr, nc)) {
          const target = board[nr][nc];
          if (!target) {
            moves.push([nr, nc]);
          } else {
            if (target.color !== color) moves.push([nr, nc]);
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
      break;
    }
    case 'K': {
      const deltas = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
      for (const [dr, dc] of deltas) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const target = board[nr][nc];
        if (!target || target.color !== color) moves.push([nr, nc]);
      }
      if (color === 'w' && r === 7) {
        if (castlingRights.wK && !board[7][5] && !board[7][6] && board[7][7]?.type === 'R' && board[7][7]?.color === 'w') {
          if (!isSquareAttacked(board, 7, 4, 'b') && !isSquareAttacked(board, 7, 5, 'b') && !isSquareAttacked(board, 7, 6, 'b')) {
            moves.push([7, 6]);
          }
        }
        if (castlingRights.wQ && !board[7][3] && !board[7][2] && !board[7][1] && board[7][0]?.type === 'R' && board[7][0]?.color === 'w') {
          if (!isSquareAttacked(board, 7, 4, 'b') && !isSquareAttacked(board, 7, 3, 'b') && !isSquareAttacked(board, 7, 2, 'b')) {
            moves.push([7, 2]);
          }
        }
      }
      if (color === 'b' && r === 0) {
        if (castlingRights.bK && !board[0][5] && !board[0][6] && board[0][7]?.type === 'R' && board[0][7]?.color === 'b') {
          if (!isSquareAttacked(board, 0, 4, 'w') && !isSquareAttacked(board, 0, 5, 'w') && !isSquareAttacked(board, 0, 6, 'w')) {
            moves.push([0, 6]);
          }
        }
        if (castlingRights.bQ && !board[0][3] && !board[0][2] && !board[0][1] && board[0][0]?.type === 'R' && board[0][0]?.color === 'b') {
          if (!isSquareAttacked(board, 0, 4, 'w') && !isSquareAttacked(board, 0, 3, 'w') && !isSquareAttacked(board, 0, 2, 'w')) {
            moves.push([0, 2]);
          }
        }
      }
      break;
    }
  }
  return moves;
}

export function getLegalMoves(state: ChessGameState, r: number, c: number): [number, number][] {
  const piece = state.board[r][c];
  if (!piece || piece.color !== state.turn) return [];
  const pseudoMoves = getPseudoLegalMoves(state.board, r, c, piece, state.enPassantTarget, state.castlingRights);
  return pseudoMoves.filter(([nr, nc]) => {
    const testState: ChessGameState = {
      board: cloneBoard(state.board),
      turn: state.turn,
      castlingRights: { ...state.castlingRights },
      enPassantTarget: state.enPassantTarget,
      halfMoveClock: state.halfMoveClock,
      fullMoveNumber: state.fullMoveNumber,
    };
    applyMoveToState(testState, { from: [r, c], to: [nr, nc] });
    return !isInCheck(testState, piece.color);
  });
}

export function applyMoveToState(state: ChessGameState, move: ChessMove): void {
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = state.board[fr][fc];
  if (!piece) return;

  const isCapture = state.board[tr][tc] !== null;
  const isPawnMove = piece.type === 'P';

  if (piece.type === 'K' && Math.abs(tc - fc) === 2) {
    if (tc > fc) {
      state.board[fr][5] = state.board[fr][7];
      state.board[fr][7] = null;
    } else {
      state.board[fr][3] = state.board[fr][0];
      state.board[fr][0] = null;
    }
  }

  if (piece.type === 'P' && state.enPassantTarget && tr === state.enPassantTarget[0] && tc === state.enPassantTarget[1]) {
    state.board[fr][tc] = null;
  }

  state.board[tr][tc] = piece;
  state.board[fr][fc] = null;

  if (piece.type === 'P' && Math.abs(tr - fr) === 2) {
    state.enPassantTarget = [(fr + tr) / 2, fc];
  } else {
    state.enPassantTarget = null;
  }

  if (piece.type === 'P' && (tr === 0 || tr === 7)) {
    state.board[tr][tc] = { type: move.promotion || 'Q', color: piece.color };
  }

  if (piece.type === 'K') {
    if (piece.color === 'w') { state.castlingRights.wK = false; state.castlingRights.wQ = false; }
    else { state.castlingRights.bK = false; state.castlingRights.bQ = false; }
  }
  if (piece.type === 'R') {
    if (piece.color === 'w' && fr === 7 && fc === 0) state.castlingRights.wQ = false;
    if (piece.color === 'w' && fr === 7 && fc === 7) state.castlingRights.wK = false;
    if (piece.color === 'b' && fr === 0 && fc === 0) state.castlingRights.bQ = false;
    if (piece.color === 'b' && fr === 0 && fc === 7) state.castlingRights.bK = false;
  }
  if (isCapture) {
    if (tr === 7 && tc === 0) state.castlingRights.wQ = false;
    if (tr === 7 && tc === 7) state.castlingRights.wK = false;
    if (tr === 0 && tc === 0) state.castlingRights.bQ = false;
    if (tr === 0 && tc === 7) state.castlingRights.bK = false;
  }

  state.halfMoveClock = isCapture || isPawnMove ? 0 : state.halfMoveClock + 1;
  if (state.turn === 'b') state.fullMoveNumber++;
  state.turn = state.turn === 'w' ? 'b' : 'w';
}

export function getGameStatus(state: ChessGameState): 'CHECK' | 'CHECKMATE' | 'STALEMATE' | 'NORMAL' {
  const color = state.turn;
  let hasLegalMove = false;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (!piece || piece.color !== color) continue;
      const moves = getLegalMoves(state, r, c);
      if (moves.length > 0) {
        hasLegalMove = true;
        break;
      }
    }
    if (hasLegalMove) break;
  }
  const inCheck = isInCheck(state, color);
  if (!hasLegalMove) return inCheck ? 'CHECKMATE' : 'STALEMATE';
  return inCheck ? 'CHECK' : 'NORMAL';
}
