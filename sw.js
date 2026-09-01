/* KLH Retro Arcade — service worker */
const CACHE_VERSION = "klh-arcade-v0.4";
const PRECACHE = [
  "./",
  "./index.html",
  "./games/index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./css/game.css",
  "./js/menu.js",
  "./js/highscores.js",
  "./js/sound.js",
  "./js/overlay.js",
  "./js/touch.js",
  "./js/install.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-96.png",
  "./games/breakout/index.html",
  "./games/pong/index.html",
  "./games/snake/index.html",
  "./games/invaders/index.html",
  "./games/tetris/index.html",
  "./games/breakout/game.js",
  "./games/pong/game.js",
  "./games/snake/game.js",
  "./games/invaders/game.js",
  "./games/tetris/game.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch(() => {
            /* skip missing optional assets */
          })
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches.match(request).then((r) => r || caches.match("./games/index.html"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          if (res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
