'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const PING_INTERVAL_MS = 45_000 // ping every 45 s — keeps within 2-min offline threshold

// Single client instance reused across all pings
const supabase = createClient()

async function setOnline(online: boolean) {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error?.code === 'refresh_token_not_found') {
    await supabase.auth.signOut({ scope: 'local' })
    return
  }
  if (!session) return

  try {
    await fetch('/api/presence', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ online }),
      keepalive: true, // allows the request to outlive the page for the offline beacon
    })
  } catch {
    // silent — presence is best-effort
  }
}

export default function PresenceTracker() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Mark online immediately
    setOnline(true)

    // Heartbeat while tab is active
    intervalRef.current = setInterval(() => {
      if (!document.hidden) setOnline(true)
    }, PING_INTERVAL_MS)

    // Re-ping when the tab becomes visible again
    const handleVisibility = () => {
      if (!document.hidden) setOnline(true)
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // Mark offline when the page unloads (keepalive ensures it fires)
    const handleUnload = () => setOnline(false)
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', handleUnload)
      setOnline(false)
    }
  }, [])

  return null
}
