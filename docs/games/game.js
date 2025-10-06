/* VX PLAY – CHECKERS: Board logic, UI wiring, timers, input */

// Constants
const BOARD_SIZE = 8;
const PLAYER_DARK = 'dark'; // moves first by default
const PLAYER_LIGHT = 'light';
const APP_VERSION = '1.0.0';

// State
const state = {
  board: [], // UI board mirror (from Engine state)
  turn: PLAYER_DARK,
  engine: null, // authoritative rules state
  playerSide: PLAYER_DARK,
  aiSide: PLAYER_LIGHT,
  selected: null, // {r,c}
  legalMoves: [], // array of { from:{r,c}, to:{r,c}, capture?:{r,c}, chain?: Move[] }
  mustCapture: false,
  paused: false,
  sounds: true,
  hints: true,
  timers: {
    playerTotalMs: 30000,
    playerRemainingMs: 30000,
    playerInterval: null,
    aiThinkingMs: 3000,
    aiRemainingMs: 0,
    aiInterval: null,
  },
  bestOf3: false,
  setScore: { player: 0, ai: 0 },
  stats: { wins: { easy: 0, medium: 0, hard: 0 }, losses: { easy: 0, medium: 0, hard: 0 }, streak: 0, bestStreak: 0, avgMoveMs: 0, moveCount: 0 },
};

// DOM refs
const elBoard = document.getElementById('board');
const elCountdown = document.getElementById('countdown');
const elCountdownNumber = document.getElementById('countdown-number');
const elPlayerTimerText = document.getElementById('player-timer-text');
const elPlayerTimerBar = document.getElementById('player-timer-bar');
const elAiTimerText = document.getElementById('ai-timer-text');
const elAiTimerBar = document.getElementById('ai-timer-bar');
const elStatusText = document.getElementById('status-text');
const elBtnPause = document.getElementById('btn-pause');
const elBtnRestart = document.getElementById('btn-restart');
const elBtnSettings = document.getElementById('btn-settings');
const elSettings = document.getElementById('settings-dialog');
const elApplySettings = document.getElementById('apply-settings');
const elDiff = document.getElementById('difficulty');
const elAiDiffLabel = document.getElementById('ai-diff-label');
const elPlayerSide = document.getElementById('player-side');
const elToggleSounds = document.getElementById('toggle-sounds');
const elToggleHints = document.getElementById('toggle-hints');
const elMode = document.getElementById('mode');
const elCaptureNote = document.getElementById('capture-note');
// Additional UI elements
const elParticles = document.getElementById('particles');
const elAiThinking = document.getElementById('ai-thinking');
const elAiRing = document.getElementById('ai-ring');
const elEndgame = document.getElementById('endgame-dialog');
const elResultTitle = document.getElementById('result-title');
const elResultDetail = document.getElementById('result-detail');
const elBtnPlayAgain = document.getElementById('btn-play-again');
const elBtnChangeDiff = document.getElementById('btn-change-diff');
const elBtnBackSplash = document.getElementById('btn-back-splash');

// Sounds (simple click/capture)
const snd = {
  click: () => playBeep(550, 0.06),
  move: () => playBeep(340, 0.08),
  capture: () => playBeep(220, 0.12),
  error: () => playBeep(110, 0.1),
};
let audioCtx;
function playBeep(freq, dur) {
  if (!state.sounds) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.value = 0.04;
    o.connect(g).connect(audioCtx.destination);
    o.start();
    setTimeout(() => { o.stop(); }, Math.max(10, dur * 1000));
  } catch (_) {}
}

// Init board
function newEngineState(){ return window.Engine.initialState(); }

function renderBoard() {
  elBoard.innerHTML = '';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const sq = document.createElement('div');
      const isDark = (r + c) % 2 === 1;
      sq.className = `square ${isDark ? 'dark' : 'light'}`;
      sq.dataset.r = String(r);
      sq.dataset.c = String(c);
      if (state.hints && state.selected && canMoveToSelected(r, c)) {
        const mv = state.legalMoves.find(m => m.to.r === r && m.to.c === c);
        if (mv && mv.capture) sq.classList.add('capture-dot'); else sq.classList.add('move-dot');
      }
      const piece = state.board[r][c];
      if (piece) {
        const p = document.createElement('div');
        p.className = `piece ${piece.side}${piece.king ? ' king' : ''}`;
        const img = document.createElement('img');
        const type = piece.side === PLAYER_DARK ? 'dark' : 'light';
        img.alt = `${piece.king ? 'King ' : ''}${type} piece`;
        img.draggable = false;
        img.src = piece.king ? `assets/${type}-king.svg` : `assets/${type}.svg`;
        p.appendChild(img);
        if (state.selected && state.selected.r === r && state.selected.c === c) {
          sq.classList.add('glow');
        }
        sq.appendChild(p);
      }
      // input handlers
      sq.addEventListener('click', onSquareClick);
      // touch
      sq.addEventListener('touchstart', (e) => { e.preventDefault(); onSquareClick(e); }, { passive: false });
      elBoard.appendChild(sq);
    }
  }
}

function onSquareClick(e) {
  if (state.paused) return;
  const mode = elMode ? elMode.value : 'ai';
  const humanSide = (mode==='local') ? state.turn : state.playerSide;
  if (state.turn !== humanSide) return;
  const target = e.currentTarget;
  const r = Number(target.dataset.r); const c = Number(target.dataset.c);
  const piece = state.board[r][c];
  if (piece && piece.side === state.turn) {
    state.selected = { r, c };
    const all = window.Engine.generateLegalMoves(state.engine, state.turn);
    state.legalMoves = all.filter(m => m.from.r===r && m.from.c===c);
    snd.click();
    renderBoard();
    return;
  }
  if (state.selected) {
    const mv = state.legalMoves.find(m => m.to.r === r && m.to.c === c);
    if (mv) {
      applyMoveEngine(mv);
      return;
    }
  }
  snd.error();
}

function canMoveToSelected(r, c) {
  return state.legalMoves.some(m => m.to.r === r && m.to.c === c);
}

function inside(r, c) { return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE; }

function dirFor(side) { return side === PLAYER_DARK ? 1 : -1; }

// Legacy helpers no longer needed externally
function computeAllLegal(board, side){ return window.Engine.generateLegalMoves(state.engine, side); }
function cloneBoard(board){ return window.Engine.cloneBoard(board); }

function applyMoveEngine(move, opts = { fromAI: false }) {
  const { from, to, capture } = move;
  const beforeTurn = state.engine.turn;
  state.engine = window.Engine.applyMove(state.engine, move);
  state.board = state.engine.board;
  if (capture) snd.capture(); else snd.move();
  const chaining = (state.engine.turn === beforeTurn);
  if (chaining && !opts.fromAI){
    state.selected = { r: to.r, c: to.c };
    const all = window.Engine.generateLegalMoves(state.engine, beforeTurn).filter(m=>m.capture);
    state.legalMoves = all.filter(m=>m.from.r===to.r && m.from.c===to.c);
    renderBoard();
    return;
  }
  state.selected = null; state.legalMoves = [];
  state.turn = state.engine.turn;
  updateStatus(); renderBoard(); handleTurnStart();
  // particles effect for movement
  try { window.emitMoveParticles && window.emitMoveParticles(elParticles, from, to); } catch(_) {}
}

function updateStatus(text) {
  if (text) { elStatusText.textContent = text; return; }
  const side = state.turn === state.playerSide ? 'Your move' : 'AI thinking…';
  elStatusText.textContent = side;
}

function resetTimersForTurn() {
  clearInterval(state.timers.playerInterval);
  clearInterval(state.timers.aiInterval);
  elAiTimerBar.style.width = '0%';
  elAiTimerText.textContent = '--';
}

function handleTurnStart() {
  resetTimersForTurn();
  const term = window.Engine.isTerminal(state.engine);
  if (term) { if (term.type==='win') onGameEnd(term.winner); else onGameEnd('draw'); return; }
  if (state.turn === state.playerSide) {
    startPlayerTimer();
  } else {
    startAiTurn();
  }
}

function startPlayerTimer() {
  state.timers.playerRemainingMs = state.timers.playerTotalMs;
  const startTime = performance.now();
  elPlayerTimerBar.style.width = '100%';
  elPlayerTimerBar.style.transition = 'none';
  requestAnimationFrame(() => {
    elPlayerTimerBar.style.transition = `width ${state.timers.playerRemainingMs}ms linear`;
    elPlayerTimerBar.style.width = '0%';
  });
  elPlayerTimerText.textContent = (state.timers.playerRemainingMs / 1000).toFixed(1) + 's';
  state.timers.playerInterval = setInterval(() => {
    const elapsed = performance.now() - startTime;
    const remain = Math.max(0, state.timers.playerTotalMs - elapsed);
    state.timers.playerRemainingMs = remain;
    elPlayerTimerText.textContent = (remain / 1000).toFixed(1) + 's';
    if (remain <= 0) {
      clearInterval(state.timers.playerInterval);
      // Auto-forfeit the move to AI
      state.turn = state.aiSide; updateStatus('Time up! AI move.'); startAiTurn();
    }
  }, 100);
}

function startAiTurn() {
  const ms = state.timers.aiThinkingMs;
  state.timers.aiRemainingMs = ms;
  elAiTimerBar.style.width = '100%';
  elAiTimerBar.style.transition = 'none';
  requestAnimationFrame(() => {
    elAiTimerBar.style.transition = `width ${ms}ms linear`;
    elAiTimerBar.style.width = '0%';
  });
  const start = performance.now();
  state.timers.aiInterval = setInterval(() => {
    const elapsed = performance.now() - start;
    const remain = Math.max(0, ms - elapsed);
    state.timers.aiRemainingMs = remain;
    elAiTimerText.textContent = (remain / 1000).toFixed(1) + 's';
    if (elAiRing) {
      const pct = 1 - (remain / ms);
      elAiRing.style.strokeDasharray = '100, 100';
      elAiRing.style.strokeDashoffset = String(pct * 100);
    }
  }, 100);
  updateStatus('AI thinking…');
  if (elAiThinking) elAiThinking.hidden = false;
  // Ask AI for a move. It will resolve after ~ms.
  computeAiMove(state.engine, state.aiSide, ms, state.stats).then((move) => {
    clearInterval(state.timers.aiInterval);
    elAiTimerText.textContent = '0.0s';
    if (elAiThinking) elAiThinking.hidden = true;
    if (!move) {
      onGameEnd(state.playerSide); return;
    }
    // Validate move is legal before applying
    const legal = window.Engine.generateLegalMoves(state.engine, state.aiSide);
    const ok = legal.some(m => m.from.r===move.from.r && m.from.c===move.from.c && m.to.r===move.to.r && m.to.c===move.to.c && (!!m.capture === !!move.capture));
    if (!ok) { onGameEnd(state.playerSide); return; }
    applyMoveEngine(move, { fromAI: true });
  });
}

function checkWinner(board) {
  const playerMoves = computeAllLegal(board, state.playerSide);
  const aiMoves = computeAllLegal(board, state.aiSide);
  const hasPlayerPieces = board.some(row => row.some(p => p && p.side === state.playerSide));
  const hasAiPieces = board.some(row => row.some(p => p && p.side === state.aiSide));
  if (!hasPlayerPieces || playerMoves.length === 0) return state.aiSide;
  if (!hasAiPieces || aiMoves.length === 0) return state.playerSide;
  return null;
}

function onGameEnd(winnerSide) {
  state.paused = true;
  const diff = elDiff.value;
  if (winnerSide === state.playerSide) {
    state.stats.wins[diff]++; state.stats.streak++; state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.streak);
  } else if (winnerSide === state.aiSide) {
    state.stats.losses[diff]++; state.stats.streak = 0;
  }
  savePersistent();
  if (state.bestOf3) {
    if (winnerSide === state.playerSide) state.setScore.player++; else state.setScore.ai++;
    if (state.setScore.player >= 2 || state.setScore.ai >= 2) {
      showEndgameModal(winnerSide === state.playerSide ? 'Set Won!' : 'Set Lost', `${state.setScore.player}–${state.setScore.ai}`);
      state.setScore = { player: 0, ai: 0 };
    } else {
      showEndgameModal(winnerSide === state.playerSide ? 'You Win' : 'AI Wins', `Score ${state.setScore.player}–${state.setScore.ai}`);
    }
  } else {
    showEndgameModal(winnerSide === state.playerSide ? 'You Win' : 'AI Wins', '');
  }
}

function showEndgameModal(title, detail) {
  if (!elEndgame) return;
  elResultTitle.textContent = title; elResultDetail.textContent = detail || '';
  if (!elEndgame.open) elEndgame.showModal();
}

function restartGame() {
  state.engine = newEngineState();
  state.board = state.engine.board;
  state.turn = state.engine.turn;
  state.selected = null;
  state.legalMoves = [];
  state.paused = false;
  state.mustCapture = false;
  renderBoard();
  updateStatus('Ready');
  startAutoCountdown();
}

// Controls & settings
elBtnPause.addEventListener('click', () => {
  state.paused = !state.paused;
  elBtnPause.textContent = state.paused ? 'Resume' : 'Pause';
  if (!state.paused) handleTurnStart();
});
elBtnRestart.addEventListener('click', () => { restartGame(); });
elBtnSettings.addEventListener('click', () => { if (!elSettings.open) elSettings.showModal(); });
elApplySettings.addEventListener('click', (e) => {
  e.preventDefault();
  const diff = elDiff.value; // easy|medium|hard
  const side = elPlayerSide.value; // dark|light
  state.playerSide = side;
  state.aiSide = side === PLAYER_DARK ? PLAYER_LIGHT : PLAYER_DARK;
  state.turn = PLAYER_DARK; // dark always starts
  state.timers.aiThinkingMs = diff === 'easy' ? 3000 : diff === 'medium' ? 6000 : 12000;
  elAiDiffLabel.textContent = `(${diff[0].toUpperCase()}${diff.slice(1)})`;
  elSettings.close();
  restartGame();
});
elToggleSounds.addEventListener('change', (e) => { state.sounds = e.target.checked; });
elToggleHints.addEventListener('change', (e) => { state.hints = e.target.checked; renderBoard(); });
// Endgame control buttons
if (elBtnPlayAgain) elBtnPlayAgain.addEventListener('click', (e) => { e.preventDefault(); elEndgame.close(); restartGame(); });
if (elBtnChangeDiff) elBtnChangeDiff.addEventListener('click', (e) => { e.preventDefault(); elEndgame.close(); if (!elSettings.open) elSettings.showModal(); });
if (elBtnBackSplash) elBtnBackSplash.addEventListener('click', (e) => { e.preventDefault(); elEndgame.close(); window.showSplash && window.showSplash(); });

// Countdown then start
function startAutoCountdown() {
  // Begin within 2 seconds of page load
  elCountdown.hidden = false;
  const seq = ['3','2','1','Go!'];
  let idx = 0;
  elCountdownNumber.textContent = seq[idx];
  const id = setInterval(() => {
    idx++;
    if (idx >= seq.length) {
      clearInterval(id);
      elCountdown.hidden = true;
      handleTurnStart();
    } else {
      elCountdownNumber.textContent = seq[idx];
    }
  }, 500);
}

// Boot
window.addEventListener('load', () => {
  // Difficulty label default
  elAiDiffLabel.textContent = '(Easy)';
  state.timers.aiThinkingMs = 3000;
  loadPersistent();
  if (!state.engine) { state.engine = newEngineState(); }
  state.board = state.board.length ? state.board : state.engine.board;
  renderBoard();
  updateStatus('Loading…');
  if (window.initTheme) window.initTheme(); if (window.initModeSelector) window.initModeSelector();
  if (window.showSplash) window.showSplash(); else setTimeout(startAutoCountdown, 1000);
});

// Expose for AI module
window.computeAllLegal = computeAllLegal;
window.cloneBoard = cloneBoard;
window.applyMoveFromAI = (move) => applyMove(move, { fromAI: true });

// Persistence helpers
function savePersistent() {
  try {
    const data = { stats: state.stats, settings: { diff: elDiff.value, side: state.playerSide, theme: document.documentElement.getAttribute('data-theme'), sounds: state.sounds, hints: state.hints, bestOf3: state.bestOf3 }, match: { board: state.board, turn: state.turn } };
    localStorage.setItem('vx-checkers', JSON.stringify(data));
  } catch(_) {}
}
function loadPersistent() {
  try {
    const raw = localStorage.getItem('vx-checkers'); if (!raw) return;
    const data = JSON.parse(raw);
    if (data.settings) {
      elDiff.value = data.settings.diff || 'easy';
      state.playerSide = data.settings.side || PLAYER_DARK;
      state.aiSide = state.playerSide === PLAYER_DARK ? PLAYER_LIGHT : PLAYER_DARK;
      state.bestOf3 = !!data.settings.bestOf3;
    }
    if (data.stats) state.stats = data.stats;
    if (data.match && Array.isArray(data.match.board)) { state.board = data.match.board; state.turn = data.match.turn || state.turn; }
  } catch(_) {}
}

