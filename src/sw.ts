/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

// Vite-PWA injiziert hier die Liste der zu cachenden Dateien (App-Shell) beim Build.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// ---- Echte Push-Benachrichtigungen ----
// Payload-Format, wie es die Supabase Edge Function "send-push" sendet:
// { title: string, body: string, icon?: string, badge?: string, url?: string }
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload: { title?: string; body?: string; icon?: string; badge?: string; url?: string } = {}
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Löffelbande', body: event.data.text() }
  }

  const title = payload.title || 'Löffelbande'
  const options: NotificationOptions = {
    body: payload.body || '',
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/pwa-192x192.png',
    data: { url: payload.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const absoluteTarget = new URL(targetUrl, self.location.origin).href

      for (const client of allClients) {
        if (client.url === absoluteTarget && 'focus' in client) {
          await (client as WindowClient).focus()
          return
        }
      }
      const existing = allClients.find((c) => 'focus' in c) as WindowClient | undefined
      if (existing) {
        await existing.focus()
        await existing.navigate(absoluteTarget)
        return
      }
      await self.clients.openWindow(absoluteTarget)
    })(),
  )
})
