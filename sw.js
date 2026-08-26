const CACHE = 'comedy4all-v21';

const SHELL = [
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
    ).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Let Supabase and external API calls go straight to network — never cache them
  if (!url.origin.includes('comedy4all.com') && url.origin !== self.location.origin) return;

  const path = url.pathname;
  const isHtml = e.request.mode === 'navigate' || path === '/' || path === '/index.html' || path.endsWith('.html');

  // HTML: always network-first (never serve a stale shell for Simple Browser / non-navigate loads)
  if (isHtml) {
    e.respondWith(
      fetch(e.request)
        .then(function(res) { return res; })
        .catch(function() { return caches.match('/index.html').then(function(c) { return c || caches.match('/'); }); })
    );
    return;
  }

  // App JS/CSS: network-first so code/CSS updates are not stuck behind stale cache
  if (path.startsWith('/js/') || path.startsWith('/css/') || path === '/sw.js') {
    e.respondWith(
      fetch(e.request)
        .then(function(res) {
          if (res && res.ok) {
            var clone = res.clone();
            caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
          }
          return res;
        })
        .catch(function() { return caches.match(e.request); })
    );
    return;
  }

  // Other same-origin static assets: cache-first for fast loads
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
