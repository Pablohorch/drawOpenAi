// Bump cache version whenever static assets change
const CACHE='static-v2';
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
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  );
});
self.addEventListener('fetch',e=>{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
