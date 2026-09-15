// NourishIQ service worker — small, boring, safe.
//  • HMR traffic (webpack-hmr, dev chunk rebuilds) → never touched
//  • navigations        → network-first, cached app shell as offline fallback
//                         (so dev always gets fresh HTML; cache only fills in offline)
//  • static assets      → cache-first (immutable _next/static + icons)
//  • everything else    → stale-while-revalidate
const VERSION = "nourishiq-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(["/", "/icons/icon-192.png", "/icons/icon-512.png"])).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== VERSION).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // cross-origin: let the browser handle it
  if (url.pathname.startsWith("/_next/webpack-hmr") || url.pathname.startsWith("/_next/static/webpack")) return;

  // immutable build assets + icons: cache-first
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // navigations: network-first with offline fallback to the cached shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/"))),
    );
    return;
  }

  // everything else: stale-while-revalidate
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    }),
  );
});
