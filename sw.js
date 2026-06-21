/* Casa Tecno · Subtítulos — Service Worker */
const CACHE = 'ct-subs-v5';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const RUNTIME = ['cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(()=>{})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // El modelo lo cachea transformers.js por su cuenta.
  if (url.hostname.includes('huggingface') || url.hostname.includes('hf.co') || url.hostname.includes('cdn-lfs')) return;

  const sameOrigin = url.origin === location.origin;
  const isRuntime = RUNTIME.some(h => url.hostname.includes(h));
  if (!sameOrigin && !isRuntime) return;

  if (sameOrigin) {
    // Archivos de la app: RED PRIMERO (siempre lo último cuando hay internet), cache si está offline.
    e.respondWith((async () => {
      try {
        const res = await fetch(e.request);
        const c = await caches.open(CACHE);
        c.put(e.request, res.clone());
        return res;
      } catch (err) {
        const c = await caches.open(CACHE);
        return (await c.match(e.request)) || (await c.match('./index.html')) || Response.error();
      }
    })());
  } else {
    // Librerías de CDN: cache primero (son estables y pesadas).
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(e.request);
      if (hit) return hit;
      try {
        const res = await fetch(e.request);
        if (res && (res.ok || res.type === 'opaque')) c.put(e.request, res.clone());
        return res;
      } catch (err) {
        return hit || Response.error();
      }
    })());
  }
});
