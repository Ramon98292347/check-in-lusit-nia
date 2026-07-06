const CACHE_NAME = "checkin-lusitania-v3";
const APP_SHELL = [
  "/",
  "/auth",
  "/precadastro",
  "/manifest.webmanifest",
  "/favicon-galo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isHttp = url.protocol === "http:" || url.protocol === "https:";
  const isSameOrigin = url.origin === self.location.origin;
  const isAssetChunk = isSameOrigin && url.pathname.startsWith("/assets/");
  const isDocument = request.mode === "navigate";

  if (!isHttp || !isSameOrigin || isAssetChunk) {
    return;
  }

  if (isDocument) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/auth"))),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
