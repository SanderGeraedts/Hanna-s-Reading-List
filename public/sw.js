/**
 * The service worker: the reading reminder (#163), and from D-0089 also the
 * reason the app opens at once and works without a signal.
 *
 * **Why this is safe to cache.** Everything under `/assets/` is built with its
 * contents in its name (`routes-C04cuU7t.js`), so a file never changes meaning:
 * once fetched it is good for ever, and a new version of the app simply asks
 * for different names. The page itself is **not** treated that way — see below.
 *
 * **The sting, avoided.** The obvious way to do this (cache the page too, and
 * serve it first) is what makes an app show yesterday's version until you
 * reload. So the **page is fetched from the network first** whenever there is a
 * signal, and the copy in the cache is only used when the network cannot
 * answer. Online, she always gets what was deployed; offline, the app still
 * opens with the books that live in her own browser.
 *
 * **What is never cached**: the server functions (`/_serverFn/`) and the API
 * routes (`/api/`) — her shelf, the sync, the reminder. A stale shelf would be
 * worse than no shelf, and D-0006's merge rules are the server's job.
 */

const VERSION = 'v1'
const PAGES = `pages-${VERSION}`
const ASSETS = `assets-${VERSION}`
const KEEP = [PAGES, ASSETS]

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) =>
  event.waitUntil(
    (async () => {
      // a new version of the worker throws away what the old one kept
      const names = await caches.keys()
      await Promise.all(names.filter((n) => !KEEP.includes(n)).map((n) => caches.delete(n)))
      await self.clients.claim()
    })(),
  ),
)

/** Files whose name says what is in them: safe to keep for ever. */
const isBuiltFile = (url) =>
  url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/creatures/')

/** Her shelf, her account, the reminder: never from a cache. */
const isLiveData = (url) => url.pathname.startsWith('/_serverFn/') || url.pathname.startsWith('/api/')

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (isLiveData(url) || url.pathname === '/sw.js') return

  // the page: the network first, so a deploy is picked up at once; the cache only
  // when there is no answer, so it still opens on a train
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          const cache = await caches.open(PAGES)
          cache.put('/', fresh.clone())
          return fresh
        } catch (_) {
          const cached = await caches.match('/', { cacheName: PAGES })
          if (cached) return cached
          throw _
        }
      })(),
    )
    return
  }

  // a built file: from the cache when it is there, and kept the first time it is fetched
  if (isBuiltFile(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request, { cacheName: ASSETS })
        if (cached) return cached
        const fresh = await fetch(request)
        if (fresh.ok) {
          const cache = await caches.open(ASSETS)
          cache.put(request, fresh.clone())
        }
        return fresh
      })(),
    )
  }
})

self.addEventListener('push', (event) => {
  let message = { title: '📖 A little reading?', body: 'Nothing logged for today yet.', url: '/' }
  try {
    if (event.data) message = { ...message, ...event.data.json() }
  } catch (_) {
    // not JSON: keep the default text
  }
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'reading-reminder',
      data: { url: message.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) if ('focus' in w) return w.focus()
      return self.clients.openWindow(url)
    }),
  )
})
