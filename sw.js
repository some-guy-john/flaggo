/*
 * Flaggo service worker.
 *
 * Everything Flaggo serves is static, so the strategy is cache-first with a
 * background refresh. Scope is derived from the worker's own location, which is
 * what lets the same file work at a domain root and at /flaggo/ on GitHub Pages
 * without any build-time substitution.
 *
 * Bump CACHE_VERSION on deploy to retire the previous cache.
 */

const CACHE_VERSION = "flaggo-v1";
const BASE = new URL("./", self.location).pathname;

/* The shell needed to boot into Flag mode offline. Heavy per-mode assets
   (geojson, d3, capitals data) are cached opportunistically on first use
   instead, so installing does not pull 4 MB the player may never need. */
const SHELL = [
  "",
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "icons/favicon.svg",
  "src/main.js",
  "src/round.js",
  "src/core/catalog.js",
  "src/core/constants.js",
  "src/core/daily.js",
  "src/core/geo.js",
  "src/core/loaders.js",
  "src/core/progress.js",
  "src/core/state.js",
  "src/core/stats.js",
  "src/core/storage.js",
  "src/core/timer.js",
  "src/data/countries.js",
  "src/data/lookalikes.js",
  "src/games/atlas.js",
  "src/games/capitals.js",
  "src/games/flag.js",
  "src/games/globe.js",
  "src/games/lookalike.js",
  "src/map/atlas.js",
  "src/map/data.js",
  "src/map/geometry.js",
  "src/map/globe.js",
  "src/map/simplify.js",
  "src/ui/board.js",
  "src/ui/confetti.js",
  "src/ui/hints.js",
  "src/ui/settings.js",
  "src/ui/share.js",
  "src/ui/statsPanel.js",
  "src/ui/suggest.js",
  "src/ui/theme.js"
].map((path) => BASE + path);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      /*
       * Two things matter here:
       *  - `cache: "reload"` bypasses the HTTP cache. Without it a stale
       *    browser-cached copy gets frozen into the worker cache and the old
       *    build is served indefinitely.
       *  - Adding individually, because addAll() rejects the entire install if
       *    any single request fails, leaving the app with no worker at all.
       */
      await Promise.all(
        SHELL.map((url) =>
          cache
            .add(new Request(url, { cache: "reload" }))
            .catch((error) => console.warn("[sw] skipped", url, error))
        )
      );
      await self.skipWaiting();
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /* Never touch cross-origin traffic (Google Fonts): letting it fall through
     keeps their own caching headers in charge. */
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(request, { ignoreSearch: true });

      if (cached) {
        /* Refresh in the background so the next load gets any new deploy. */
        event.waitUntil(
          fetch(request)
            .then((response) => (response.ok ? cache.put(request, response.clone()) : null))
            .catch(() => null)
        );
        return cached;
      }

      try {
        const response = await fetch(request);

        if (response.ok) {
          cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        /* Offline and uncached: for a navigation, fall back to the shell so
           the app still opens rather than showing the browser error page. */
        if (request.mode === "navigate") {
          const shell = await cache.match(BASE + "index.html")
            || await cache.match(BASE);
          if (shell) {
            return shell;
          }
        }

        throw error;
      }
    })()
  );
});
