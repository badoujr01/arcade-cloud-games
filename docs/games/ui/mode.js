(function(){
  const MODES = { AI:'ai', LOCAL:'local', ONLINE:'online' };
  function getMode(){ try{ const raw = localStorage.getItem('vx-checkers'); if (!raw) return MODES.AI; const d = JSON.parse(raw); return (d.settings && d.settings.mode) || MODES.AI; }catch(_){ return MODES.AI; } }
  function setMode(mode){ try{ const raw = localStorage.getItem('vx-checkers'); const d = raw? JSON.parse(raw): {settings:{}}; d.settings = d.settings||{}; d.settings.mode = mode; localStorage.setItem('vx-checkers', JSON.stringify(d)); }catch(_){} }
  function initModeSelector(){
    const select = document.getElementById('mode'); if (!select) return; select.value = getMode();
    select.addEventListener('change', ()=>{ const m = select.value; setMode(m); if (m==='online'){ select.title = 'Coming soon'; } else { select.title=''; } });
  }
  window.GameMode = MODES; window.getMode = getMode; window.initModeSelector = initModeSelector;
})();


