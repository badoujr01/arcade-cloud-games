(function(){
  const el = document.getElementById('splash');
  const btnStart = document.getElementById('splash-start');
  function showSplash(){ if (!el) return; el.setAttribute('aria-hidden','false'); }
  function hideSplash(){ if (!el) return; el.setAttribute('aria-hidden','true'); }
  if (btnStart) btnStart.addEventListener('click', () => { hideSplash(); if (window.SFX){ window.SFX.ensure().then(()=> window.SFX.startAmbient()); } });
  window.showSplash = showSplash; window.hideSplash = hideSplash;
})();


