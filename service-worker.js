const CACHE_NAME = "ravibange-pwa-v10";

const APP_SHELL = [
  "./",
  "./index.html",
  "./stylesheet.css",
  "./recipe.js",
  "./manifest.webmanifest",
  "./app/api.js",
  "./app/household.js",
  "./app/identity.js",
  "./app/pwa.js",
  "./app/shopping-sync.js",
  "./images/checker-strip.svg",
  "./images/dessert-photo.png",
  "./images/diner-sign.svg",
  "./images/food-plate.png",
  "./images/ornament.svg",
  "./images/icons/apple-touch-icon.png",
  "./images/icons/icon-192.png",
  "./images/icons/icon-512.png",
  "./recipes/almost-sandstorm.html",
  "./recipes/banh-mi.html",
  "./recipes/birria.html",
  "./recipes/den-kramiga-kycklingen.html",
  "./recipes/den-saftiga-kycklingen.html",
  "./recipes/falafelhistoria.html",
  "./recipes/fiskpinnetacos.html",
  "./recipes/generell-staples-inkopslista.html",
  "./recipes/kulfi-ice-cream.html",
  "./recipes/lax-med-oliver.html",
  "./recipes/masala-chai.html",
  "./recipes/mormors-gula-pickles.html",
  "./recipes/mormors-kottbullar.html",
  "./recipes/moules-frites.html",
  "./recipes/oolong-latte.html",
  "./recipes/sallad.html",
  "./recipes/salsicciapasta.html",
  "./recipes/thai-style-rodcurry.html",
  "./recipes/wokad-biff-med-broccoli.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations stay network-first so updated HTML is picked up quickly after
  // a cache version bump, while cached pages still open when fully offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // Static app files are cache-first after install. Bump CACHE_NAME whenever
  // changing files in APP_SHELL so installed PWAs refresh their cached shell.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
