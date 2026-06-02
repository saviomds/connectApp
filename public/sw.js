/* Vibro – PWA Service Worker */
const CACHE = 'vibro-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

/* ── Push notification handler ─────────────────────────────── */
self.addEventListener('push', event => {
  let payload = { title: 'Vibro', body: 'You have a new notification', icon: '/icon.svg', url: '/' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:    payload.body,
      icon:    payload.icon || '/icon.svg',
      badge:   '/icon.svg',
      data:    { url: payload.url || '/' },
      vibrate: [100, 50, 100],
    })
  )
})

/* ── Notification click → open / focus tab ──────────────────── */
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})

/* ── Background message relay ───────────────────────────────── */
/* The main app posts { type: 'SHOW_NOTIFICATION', ... } when it
   receives a Realtime event while the tab is in the background.  */
self.addEventListener('message', event => {
  const { type, title, body, url } = event.data ?? {}
  if (type !== 'SHOW_NOTIFICATION') return
  self.registration.showNotification(title || 'Vibro', {
    body:    body  || '',
    icon:    '/icon.svg',
    badge:   '/icon.svg',
    data:    { url: url || '/' },
    vibrate: [80, 40, 80],
  })
})
