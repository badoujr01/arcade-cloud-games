(function(){
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function emitMoveParticles(canvas, from, to){
    if (!canvas || prefersReduced) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const board = document.getElementById('board'); const brect = board.getBoundingClientRect();
    canvas.width = rect.width; canvas.height = rect.height;
    const start = { x: brect.left + (from.c+0.5)*brect.width/8 - rect.left, y: brect.top + (from.r+0.5)*brect.height/8 - rect.top };
    const end = { x: brect.left + (to.c+0.5)*brect.width/8 - rect.left, y: brect.top + (to.r+0.5)*brect.height/8 - rect.top };
    const particles = Array.from({length: 18}, (_,i)=>({ x:start.x, y:start.y, vx:(Math.random()-0.5)*1.2 + (end.x-start.x)/40, vy:(Math.random()-0.5)*1.2 + (end.y-start.y)/40, life: 600 + Math.random()*300, r: 1 + Math.random()*1.2 }));
    const t0 = performance.now();
    function frame(t){
      const dt = Math.min(32, t-(emitMoveParticles._last||t)); emitMoveParticles._last = t;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(96, 165, 250, .85)';
      let alive = 0;
      for (const p of particles){
        p.x += p.vx; p.y += p.vy; p.vx *= 0.985; p.vy *= 0.985; p.life -= dt;
        if (p.life > 0){ alive++; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill(); }
      }
      if (alive>0 && t - t0 < 900) requestAnimationFrame(frame); else ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    requestAnimationFrame(frame);
  }
  window.emitMoveParticles = emitMoveParticles;
})();


