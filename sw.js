const CACHE = 'comedy4all-v1';

const SHELL = [
  '/',
  '/css/styles.css',
  '/js/analytics.js',
  '/js/brooks.js',
  '/js/data.js',
  '/js/init.js',
  '/js/jokes.js',
  '/js/rehearsal.js',
  '/js/settings.js',
  '/js/shows.js',
  '/js/studio.js',
  '/js/supabase.js',
  '/js/ui.js',
  '/icons/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Let Supabase and external API calls go straight to network — never cache them
  if (!url.origin.includes('comedy4all.com') && url.origin !== self.location.origin) return;

  // Navigation (HTML): network-first so the latest version always loads;
  // fall back to cached shell if offline
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/'))
    );
    return;
  }

  // Static assets: cache-first for fast loads
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
