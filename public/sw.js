/**
 * The reading reminder's service worker (#163): shows the notification the
 * server sends at 20:00, and opens the app when it's tapped. It does nothing
 * else: no caching, so the app always loads fresh.
 */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

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
