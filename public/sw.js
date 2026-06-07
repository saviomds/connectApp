/* Vibro – PWA Service Worker */
const CACHE = 'vibro-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
))

/* ── Network-first fetch with cache fallback ────────────────── */
self.addEventListener('fetch', event => {
  // Only handle GET requests for same-origin navigation and static assets
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // API routes and auth — always network, never cache
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return

  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache successful responses for static assets
        if (response.ok && (
          url.pathname.startsWith('/_next/static/') ||
          url.pathname.startsWith('/icons/') ||
          url.pathname.startsWith('/screenshots/')
        )) {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})

/* ── Push notification handler ─────────────────────────────── */
self.addEventListener('push', event => {
  let payload = { title: 'Vibro', body: 'You have a new notification', icon: '/icons/icon-192.png', url: '/' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:    payload.body,
      icon:    payload.icon || '/icons/icon-192.png',
      badge:   '/icons/icon-192.png',
      data:    { url: payload.url || '/' },
      vibrate: [120, 60, 120],
      tag:     payload.url || 'vibro-notif',  // groups notifications per conversation
      renotify: true,
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
