/* eslint-disable no-undef */
// v2: navigations cache a single SPA shell copy under '/' (instead of one copy
// per visited URL) and activate prunes caches left behind by older versions.
const CACHE_NAME = 'proto-live-pwa-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only successful responses refresh the shared shell entry; caching an
          // error page under '/' would poison the offline fallback for every route.
          if (response.ok) {
            const copy = response.clone()
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put('/', copy))
              .catch(() => {})
          }
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    )
  }
})
