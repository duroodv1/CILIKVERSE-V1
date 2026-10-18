/* CILIKVERSE V.1 — Service Worker
 * Strategi:
 *  - App shell & aset: cache-first + kemas kini latar belakang (stale-while-revalidate)
 *  - Navigasi: network-first, fallback kepada index.html yang dicache
 *  - Kemas kini: cache versi baharu hanya aktif selepas mesej SKIP_WAITING
 *  - Data pengguna (IndexedDB/localStorage) TIDAK pernah disentuh oleh service worker
 */

const CACHE_VERSION = 'cilikverse-v1.1.4';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/main.css',
  './css/responsive.css',
  './js/app.js',
  './js/engine.js',
  './js/speech.js',
  './js/demo.js',
  './js/audio.js',
  './js/shared.js',
  './js/maze.js',
  './js/games-kit.js',
  './js/storage.js',
  './js/progress.js',
  './js/navigation.js',
  './js/offline.js',
  './js/accessibility.js',
  './js/ai-assistant.js',
  './modules/robocilik/robocilik.js',
  './modules/bijak-wang/bijak-wang.js',
  './modules/detektif-digital/detektif-digital.js',
  './data/games.json',
  './data/hints.json',
  './data/faq.json',
  './assets/icons/favicon.ico',
  './assets/icons/favicon-32.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
  './assets/images/cili-avatar-64.png',
  './assets/images/cili-avatar-128.png',
  './assets/images/cili-avatar.png',
  './assets/images/cili-mascot-360.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // Tambah satu demi satu supaya satu fail yang gagal tidak menggagalkan semuanya.
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            const res = await fetch(new Request(url, { cache: 'reload' }));
            if (res && res.ok) await cache.put(url, res.clone());
          } catch (e) {
            /* Abaikan fail individu; aplikasi masih boleh berfungsi dengan cache sedia ada. */
          }
        })
      );
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('cilikverse-') && k !== CACHE_VERSION)
          .map((k) => caches.delete(k))
      );
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.disable();
        } catch (e) {
          /* abaikan */
        }
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }
  if (url.origin !== self.location.origin) return; // jangan campur tangan permintaan luar

  // Navigasi (buka aplikasi)
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res && res.ok) {
            const cache = await caches.open(CACHE_VERSION);
            cache.put('./index.html', res.clone()).catch(() => {});
          }
          return res;
        } catch (e) {
          const cache = await caches.open(CACHE_VERSION);
          const cached = (await cache.match('./index.html')) || (await cache.match('./'));
          if (cached) return cached;
          return new Response(
            '<!doctype html><html lang="ms"><meta charset="utf-8"><title>CILIKVERSE</title><body style="font-family:sans-serif;padding:30px"><h1>CILIKVERSE belum tersedia offline</h1><p>Buka aplikasi sekali dengan internet untuk memuatkan cache, kemudian cuba lagi.</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
          );
        }
      })()
    );
    return;
  }

  // Aset: cache-first, kemudian rangkaian dan simpan
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(req, { ignoreSearch: false });
      if (cached) {
        // Kemas kini latar belakang (tidak menyekat)
        fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
          })
          .catch(() => {});
        return cached;
      }
      try {
        const res = await fetch(req);
        if (res && res.ok && res.type === 'basic') {
          cache.put(req, res.clone()).catch(() => {});
        }
        return res;
      } catch (e) {
        return new Response('Tidak tersedia offline', { status: 503 });
      }
    })()
  );
});
