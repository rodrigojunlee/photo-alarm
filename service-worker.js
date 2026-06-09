const CACHE_NAME = "photo-alarm-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./js/main.js",
  "./js/core/state.js",
  "./js/core/dates.js",
  "./js/core/logger.js",
  "./js/core/scheduler.js",
  "./js/audio/sounds.js",
  "./js/audio/alarm-player.js",
  "./js/audio/keep-alive.js",
  "./js/alarms/alarm-store.js",
  "./js/challenges/registry.js",
  "./js/challenges/photo-challenge.js",
  "./js/ui/screens.js",
  "./js/ui/alarm-list.js",
  "./js/ui/settings.js",
  "./js/ui/debug-log.js",
  "./assets/sounds/alarm-classic.wav",
  "./assets/sounds/alarm-radar.wav",
  "./assets/sounds/alarm-bells.wav",
  "./assets/sounds/silence-loop.wav",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
