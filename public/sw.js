const CACHE_NAME = "trovaar-v1";

/**
 * App-shell routes cached on install so the core UI loads offline.
 * Static assets (_next/static) are cached at runtime via cache-first.
 */
const APP_SHELL = [
  "/",
  "/offline.html",
  "/icons/icon.svg",
  "/manifest.json",
];

/* ------------------------------------------------------------------ */
/*  Install — pre-cache the app shell                                 */
/* ------------------------------------------------------------------ */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  // Activate immediately so the new SW takes over without waiting.
  self.skipWaiting();
});

/* ------------------------------------------------------------------ */
/*  Activate — clean up old caches                                    */
/* ------------------------------------------------------------------ */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  // Start controlling all open clients immediately.
  self.clients.claim();
});

/* ------------------------------------------------------------------ */
/*  Fetch — routing strategy                                          */
/* ------------------------------------------------------------------ */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests — let mutations go straight to the network.
  if (request.method !== "GET") return;

  // ----- API calls: network-first, no cache fallback -----
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => new Response("{}", {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }))
    );
    return;
  }

  // ----- Static assets (JS, CSS, images, fonts): cache-first -----
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(js|css|png|jpg|jpeg|svg|gif|webp|woff2?|ttf|eot)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            // Only cache successful responses from our own origin.
            if (response.ok && url.origin === self.location.origin) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // ----- HTML navigations: network-first, offline fallback -----
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache a fresh copy of the page for next time.
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/offline.html"))
        )
    );
    return;
  }
});

/* ------------------------------------------------------------------ */
/*  Push notifications                                                */
/* ------------------------------------------------------------------ */
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Trovaar";
  const options = {
    body: data.message || "You have a new notification",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-72.png",
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
