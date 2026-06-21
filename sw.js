/* Casa Tecno · Subtítulos — Service Worker (offline) */
const CACHE = 'ct-subs-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

// Hosts de librerías/fuentes que cacheamos para uso offline.
const RUNTIME = ['cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // El modelo de Whisper lo cachea transformers.js por su cuenta (Cache API).
  // No lo interceptamos para no duplicar ~150 MB en almacenamiento.
  if (url.hostname.includes('huggingface') || url.hostname.includes('hf.co') || url.hostname.includes('cdn-lfs')) return;

  const sameOrigin = url.origin === location.origin;
  const isRuntime = RUNTIME.some(h => url.hostname.includes(h));
  if (!sameOrigin && !isRuntime) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(e.request);
    if (hit) return hit;
    try {
      const res = await fetch(e.request);
      if (res && (res.ok || res.type === 'opaque')) cache.put(e.request, res.clone());
      return res;
    } catch (err) {
      return hit || Response.error();
    }
  })());
});
