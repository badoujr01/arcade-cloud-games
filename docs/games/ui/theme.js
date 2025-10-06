(function(){
  const root = document.documentElement;
  function setTheme(theme){
    root.setAttribute('data-theme', theme);
    try { const raw = localStorage.getItem('vx-checkers'); const data = raw? JSON.parse(raw): {}; data.settings = data.settings||{}; data.settings.theme = theme; localStorage.setItem('vx-checkers', JSON.stringify(data)); } catch(_) {}
  }
  function initTheme(){
    try { const raw = localStorage.getItem('vx-checkers'); if (raw){ const data = JSON.parse(raw); if (data.settings && data.settings.theme){ setTheme(data.settings.theme); } else { setTheme('cosmic'); } } else { setTheme('cosmic'); } } catch(_) { setTheme('cosmic'); }
    const select = document.getElementById('theme'); if (!select) return;
    select.addEventListener('change', ()=> setTheme(select.value));
  }
  window.initTheme = initTheme; window.setTheme = setTheme;
})();


