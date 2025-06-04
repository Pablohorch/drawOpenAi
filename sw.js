const CACHE='static-v1';
const ASSETS=[
  './',
  'index.html',
  'style.css',
  'script.js',
  'icons/pencil.svg',
  'icons/rect.svg',
  'icons/line.svg'
];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('fetch',e=>{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
