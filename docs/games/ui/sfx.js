(function(){
  const sfx = {
    enabled: true,
    ambientEnabled: true,
    ctx: null,
    gainMaster: null,
    ambientNode: null,
    buffers: {},
  };
  async function load(url){
    const res = await fetch(url); const arr = await res.arrayBuffer();
    return await sfx.ctx.decodeAudioData(arr);
  }
  async function ensure(){
    if (!sfx.ctx){ sfx.ctx = new (window.AudioContext||window.webkitAudioContext)(); sfx.gainMaster = sfx.ctx.createGain(); sfx.gainMaster.gain.value = 0.5; sfx.gainMaster.connect(sfx.ctx.destination); }
    if (!sfx.buffers.click) {
      try {
        sfx.buffers.click = await load('assets/sfx/click.ogg');
        sfx.buffers.whoosh = await load('assets/sfx/whoosh.ogg');
        sfx.buffers.sparkle = await load('assets/sfx/sparkle.ogg');
        sfx.buffers.ambient = await load('assets/sfx/ambient.ogg');
      } catch(_) {}
    }
  }
  function play(name, vol=1){ if (!sfx.enabled) return; if (!sfx.buffers[name]) return; const src = sfx.ctx.createBufferSource(); src.buffer = sfx.buffers[name]; const g = sfx.ctx.createGain(); g.gain.value = vol; src.connect(g).connect(sfx.gainMaster); src.start(); }
  function startAmbient(){ if (!sfx.ambientEnabled) return; if (!sfx.buffers.ambient) return; if (sfx.ambientNode) return; const src = sfx.ctx.createBufferSource(); src.buffer = sfx.buffers.ambient; src.loop = true; const g = sfx.ctx.createGain(); g.gain.value = 0.25; src.connect(g).connect(sfx.gainMaster); src.start(); sfx.ambientNode = { src, g }; }
  function brightenAmbient(){ if (!sfx.ambientNode) return; sfx.ambientNode.g.gain.cancelScheduledValues(sfx.ctx.currentTime); sfx.ambientNode.g.gain.linearRampToValueAtTime(0.4, sfx.ctx.currentTime+0.2); setTimeout(()=>{ if (!sfx.ambientNode) return; sfx.ambientNode.g.gain.linearRampToValueAtTime(0.25, sfx.ctx.currentTime+0.5); }, 600); }
  function toggleEnabled(flag){ sfx.enabled = flag; if (!flag && sfx.ctx){ sfx.gainMaster.gain.value = 0; } else if (sfx.ctx){ sfx.gainMaster.gain.value = 0.5; } }
  function toggleAmbient(flag){ sfx.ambientEnabled = flag; if (!flag && sfx.ambientNode){ try { sfx.ambientNode.src.stop(); } catch(_){} sfx.ambientNode = null; } else { startAmbient(); } }
  window.SFX = { ensure, play, startAmbient, brightenAmbient, toggleEnabled, toggleAmbient };
})();


