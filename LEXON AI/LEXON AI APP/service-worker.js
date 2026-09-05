const CACHE_NAME = "lexon-ai-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];

/* ---------------------------------------------------------
   Install
   --------------------------------------------------------- */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.warn(
          "LEXON AI: Cache installation failed.",
          error
        );
      })
  );
});

/* ---------------------------------------------------------
   Activate
   --------------------------------------------------------- */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== CACHE_NAME &&
              cacheName.startsWith("lexon-ai-")
            ) {
              return caches.delete(cacheName);
            }

            return Promise.resolve();
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

/* ---------------------------------------------------------
   Fetch
   --------------------------------------------------------- */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  /*
   * Only handle same-origin requests.
   * External resources such as Google Fonts are left
   * to the browser/network.
   */
  const requestURL = new URL(request.url);

  if (requestURL.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {

        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {

            /*
             * Cache only successful basic responses.
             */
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type === "basic"
            ) {
              const responseToCache =
                networkResponse.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(
                    request,
                    responseToCache
                  );
                })
                .catch(() => {
                  // Ignore cache errors.
                });
            }

            return networkResponse;
          })
          .catch(() => {

            /*
             * If the requested page is unavailable
             * offline, fall back to the home page.
             */
            if (request.mode === "navigate") {
              return caches.match("./index.html");
            }

            return new Response(
              "LEXON AI is currently offline.",
              {
                status: 503,
                statusText: "Offline",
                headers: {
                  "Content-Type": "text/plain"
                }
              }
            );
          });
      })
  );
});