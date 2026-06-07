'use client'

import { useEffect } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlB64ToUint8Array(base64String: string) {
  const padding  = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

async function subscribeToPush(reg: ServiceWorkerRegistration) {
  try {
    const existing = await reg.pushManager.getSubscription()
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, keys: sub.toJSON().keys }),
    })
  } catch {
    // Permission denied or push not supported — silent fail
  }
}

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !VAPID_PUBLIC_KEY) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        // If already granted, subscribe immediately
        if (Notification.permission === 'granted') {
          subscribeToPush(reg)
        }
      })
      .catch(() => {})
  }, [])

  return null
}

/** Called from UI when user clicks "Enable notifications" */
export async function requestAndSubscribePush(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  const reg = await navigator.serviceWorker.ready
  await subscribeToPush(reg)
  return 'granted'
}
