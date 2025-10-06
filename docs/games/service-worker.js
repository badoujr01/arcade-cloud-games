const CACHE = 'vx-checkers-v1.0.0';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'game.js',
  'ai.js',
  'ui/theme.js',
  'ui/sfx.js',
  'ui/particles.js',
  'ui/splash.js',
  'ui/mode.js',
  'rules/engine.js',
  'net/messages.js',
  'net/transport.js',
  'manifest.webmanifest',
  'assets/stars.svg',
  'assets/dark.svg',
  'assets/light.svg',
  'assets/dark-king.svg',
  'assets/light-king.svg',
  'assets/ui/gear.svg',
  'assets/ui/brain.svg',
  'assets/ui/crown.svg',
  'assets/ui/trophy.svg',
  'assets/svg/nebula.svg',
  'assets/sfx/click.ogg', 'assets/sfx/whoosh.ogg', 'assets/sfx/sparkle.ogg', 'assets/sfx/ambient.ogg',
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); });
self.addEventListener('fetch', (e) => { e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; }).catch(()=>caches.match('index.html')))); });


