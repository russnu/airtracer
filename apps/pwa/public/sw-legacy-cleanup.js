// Imported by the generated service worker (see vite.config.ts).
//
// The previous hand-written service worker stored authenticated API responses
// in the "airtracer-v1" cache. If that cache exists, this device is still on the
// legacy worker, so activate immediately instead of waiting for the update
// prompt, then delete the cache.
const LEGACY_CACHE_NAME = 'airtracer-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.has(LEGACY_CACHE_NAME).then((hasLegacyCache) => {
      if (hasLegacyCache) {
        return self.skipWaiting();
      }
      return undefined;
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.delete(LEGACY_CACHE_NAME));
});
