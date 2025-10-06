/* VX PLAY – CHECKERS: AI logic with engine integration and timeboxing */

// A simple AI: prioritize captures, then advance; deeper look on harder modes.

function evaluateBoard(board, aiSide) {
  // Material + advancement + king value
  let score = 0;
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = (p.king ? 3 : 1) + (p.side === 'dark' ? r : (7 - r)) * 0.05;
      score += p.side === aiSide ? val : -val;
    }
  }
  return score;
}

function generateMoves(engineState, side) { return window.Engine.generateLegalMoves(engineState, side); }

function applyMoveOn(engineState, move) { return window.Engine.applyMove(engineState, move); }

function minimax(engineState, depth, maximizing, aiSide, alpha, beta, tt) {
  const side = maximizing ? aiSide : (aiSide === 'dark' ? 'light' : 'dark');
  const hash = window.Engine.hashState(engineState) + ':' + depth + ':' + maximizing;
  if (tt && tt.has(hash)) return tt.get(hash);
  const moves = generateMoves(engineState, side);
  if (depth === 0 || moves.length === 0) {
    const val = evaluateBoard(engineState.board, aiSide); const res = { score: val };
    if (tt) tt.set(hash, res); return res;
  }
  let bestMove = null;
  if (maximizing) {
    let maxEval = -Infinity;
    for (const m of moves) {
      const nb = applyMoveOn(engineState, m);
      const { score } = minimax(nb, depth - 1, false, aiSide, alpha, beta, tt);
      if (score > maxEval) { maxEval = score; bestMove = m; }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    const res = { score: maxEval, move: bestMove }; if (tt) tt.set(hash, res); return res;
  } else {
    let minEval = Infinity;
    for (const m of moves) {
      const nb = applyMoveOn(engineState, m);
      const { score } = minimax(nb, depth - 1, true, aiSide, alpha, beta, tt);
      if (score < minEval) { minEval = score; bestMove = m; }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    const res = { score: minEval, move: bestMove }; if (tt) tt.set(hash, res); return res;
  }
}

function selectDepthFromMs(ms) {
  if (ms <= 3000) return 2; // easy
  if (ms <= 6000) return 3; // medium
  return 4; // hard
}

function randomTieBreaker(moves) {
  // shuffle small array
  for (let i = moves.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [moves[i], moves[j]] = [moves[j], moves[i]];
  }
  return moves;
}

async function computeAiMove(engineState, aiSide, thinkMs, stats) {
  const moves = generateMoves(engineState, aiSide).sort((a,b)=> (b.capture?1:0)-(a.capture?1:0));
  if (moves.length === 0) return null;
  const depth = selectDepthFromMs(thinkMs);

  // break ties by random to avoid repetitiveness
  randomTieBreaker(moves);
  let best = null; let bestScore = -Infinity; const tt = new Map();
  for (const m of moves) {
    const nb = applyMoveOn(engineState, m);
    const { score } = minimax(nb, depth - 1, false, aiSide, -Infinity, Infinity, tt);
    if (score > bestScore) { bestScore = score; best = m; }
  }

  // Ensure visible countdown completes
  const start = performance.now();
  const remaining = Math.max(0, thinkMs - (performance.now() - start));
  await new Promise(res => setTimeout(res, remaining));
  return best || moves[0];
}

// Expose
window.computeAiMove = computeAiMove;


