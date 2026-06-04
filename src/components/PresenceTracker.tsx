'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// 90 s heartbeat — the upsert_presence RPC has a 2-min offline threshold.
const PING_INTERVAL_MS = 90_000

const supabase = createClient()

async function setOnline(online: boolean) {
  // Fire-and-forget: if this returns 401 the session has expired and the
  // SessionGuard (or next navigation) will redirect to /login cleanly.
  // We intentionally do NOT call signOut() here — a heartbeat failure must
  // never be the thing that logs a user out.
  try {
    await fetch('/api/presence', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ online }),
      keepalive: true,
    })
  } catch {
    // Network error — presence is best-effort, ignore silently.
  }
}

export default function PresenceTracker() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPingRef = useRef<number>(0)

  function ping() {
    lastPingRef.current = Date.now()
    setOnline(true)
  }

  useEffect(() => {
    // Confirm we still have a valid session before starting the tracker.
    // If there is no session at mount time the user is already being redirected
    // by the middleware / SessionGuard — don't add noise.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return

      ping()

      intervalRef.current = setInterval(() => {
        if (document.hidden) return
        // Skip if we pinged recently (e.g. visibility-change fired just before)
        if (Date.now() - lastPingRef.current < 60_000) return
        ping()
      }, PING_INTERVAL_MS)
    })

    const handleVisibility = () => { if (!document.hidden) ping() }
    document.addEventListener('visibilitychange', handleVisibility)

    const handleUnload = () => setOnline(false)
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', handleUnload)
      setOnline(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
