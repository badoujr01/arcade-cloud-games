/* Strict rules engine for VX PLAY – CHECKERS (American rules)
   Exposes: Engine = { initialState, generateLegalMoves, applyMove, isTerminal, assertBoardValid, hashState }
   State shape:
   {
     board: 8x8 array of null | { side:'dark'|'light', king:boolean },
     turn: 'dark'|'light',
     halfMoveClock: number, // resets on capture or kinging
     repetition: { [hash]: count }
   }
*/
(function(){
  const SIZE = 8; const DARK='dark', LIGHT='light';

  function initialBoard(){
    const b = Array.from({length:SIZE},()=>Array(SIZE).fill(null));
    for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++){
      if ((r+c)%2===0) continue; // light squares unused
      if (r<=2) b[r][c] = { side:DARK, king:false };
      if (r>=5) b[r][c] = { side:LIGHT, king:false };
    }
    return b;
  }
  function initialState(){
    return { board: initialBoard(), turn: DARK, halfMoveClock: 0, repetition: {} };
  }
  function inside(r,c){ return r>=0 && r<SIZE && c>=0 && c<SIZE; }
  function forwardDir(side){ return side===DARK ? 1 : -1; }

  function cloneBoard(b){ return b.map(row=>row.map(p=>p?{side:p.side, king:p.king}:null)); }
  function hashState(st){
    let s = st.turn==='dark'?'d':'l';
    for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++){
      const p = st.board[r][c];
      if (!p) { s+='.'; continue; }
      s += p.side[0] + (p.king?'K':'M');
    }
    return s;
  }

  function generatePieceMoves(board, r, c){
    const p = board[r][c]; if (!p) return [];
    const dirs = p.king ? [1,-1] : [forwardDir(p.side)];
    const out = []; const caps = [];
    for (const dr of dirs){
      for (const dc of [-1,1]){
        const nr=r+dr, nc=c+dc; if (!inside(nr,nc)) continue; if (board[nr][nc]==null){ out.push({from:{r,c}, to:{r:nr,c:nc}}); }
        const br=nr+dr, bc=nc+dc; if (inside(br,bc) && board[nr][nc] && board[nr][nc].side!==p.side && board[br][bc]==null){
          caps.push({from:{r,c}, to:{r:br,c:bc}, capture:{r:nr,c:nc}});
        }
      }
    }
    return caps.length? caps : out;
  }

  function anyCaptureForSide(board, side){
    for (let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++){
      const p=board[r][c]; if (p&&p.side===side){
        const ms = generatePieceMoves(board,r,c); if (ms.some(m=>m.capture)) return true;
      }
    }
    return false;
  }

  function generateLegalMoves(state, side){
    const board = state.board; const moves=[]; const caps=[];
    for (let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++){
      const p=board[r][c]; if (!p || p.side!==side) continue;
      const ms = generatePieceMoves(board,r,c);
      for (const m of ms){ (m.capture?caps:moves).push(m); }
    }
    return caps.length? caps : moves;
  }

  function applyMove(state, move){
    const b = cloneBoard(state.board);
    const from = move.from, to = move.to; const piece = b[from.r][from.c];
    if (!piece) return state; b[from.r][from.c]=null; b[to.r][to.c]=piece;
    let captured=false; let becameKing=false;
    if (move.capture){ b[move.capture.r][move.capture.c]=null; captured=true; }
    // Determine chaining: if capture and more captures available from new square (without promoting yet), same side continues
    const tempState = { board:b, turn: state.turn, halfMoveClock: state.halfMoveClock, repetition: {...state.repetition} };
    let chainAvailable = false;
    if (captured){
      const ms = generatePieceMoves(b, to.r, to.c).filter(m=>m.capture);
      chainAvailable = ms.length>0;
    }
    // Promotion at end of sequence only (no further captures)
    if (!chainAvailable && !piece.king){
      if (piece.side===DARK && to.r===SIZE-1){ piece.king=true; becameKing=true; }
      if (piece.side===LIGHT && to.r===0){ piece.king=true; becameKing=true; }
    }
    const nextTurn = (captured && chainAvailable) ? state.turn : (state.turn===DARK?LIGHT:DARK);
    const next = { board:b, turn: nextTurn, halfMoveClock: (captured||becameKing)?0:(state.halfMoveClock+1), repetition: {...state.repetition} };
    const h = hashState(next); next.repetition[h] = (next.repetition[h]||0)+1;
    return next;
  }

  function hasAnyMove(state, side){ return generateLegalMoves(state, side).length>0; }

  function isTerminal(state){
    // No-progress draw
    if (state.halfMoveClock>=40) return { type:'draw', reason:'no-progress' };
    // Threefold repetition
    for (const k in state.repetition){ if (state.repetition[k]>=3) return { type:'draw', reason:'threefold' }; }
    const side = state.turn; const ms = generateLegalMoves(state, side);
    if (ms.length===0) return { type:'win', winner: side===DARK?LIGHT:DARK, reason:'stalemate' };
    return null;
  }

  function assertBoardValid(state){
    const seen = new Set(); let dark=0, light=0;
    for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++){
      if ((r+c)%2===0 && state.board[r][c]!=null) throw new Error('Piece on light square');
      const p = state.board[r][c];
      if (p){ const key = r+','+c; if (seen.has(key)) throw new Error('Overlap'); seen.add(key); if (p.side===DARK) dark++; else light++; }
    }
    if (dark<0||light<0) throw new Error('Counts invalid');
    if (state.turn!==DARK && state.turn!==LIGHT) throw new Error('Turn invalid');
    return true;
  }

  window.Engine = { initialState, generateLegalMoves, applyMove, isTerminal, assertBoardValid, hashState, cloneBoard };
})();


