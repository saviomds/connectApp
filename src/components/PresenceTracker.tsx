'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// 90 s heartbeat — halves DB write load vs the old 45 s.
// The offline threshold is 2 min (set in upsert_presence), so 90 s stays comfortably within it.
const PING_INTERVAL_MS = 90_000

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
      keepalive: true,
    })
  } catch {
    // silent — presence is best-effort
  }
}

export default function PresenceTracker() {
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPingRef  = useRef<number>(0) // timestamp of the most recent ping

  function ping() {
    lastPingRef.current = Date.now()
    setOnline(true)
  }

  useEffect(() => {
    ping()

    // Heartbeat — skip if we already pinged within the last 60 s
    // (e.g. the visibility handler fired just before this tick)
    intervalRef.current = setInterval(() => {
      if (document.hidden) return
      if (Date.now() - lastPingRef.current < 60_000) return
      ping()
    }, PING_INTERVAL_MS)

    const handleVisibility = () => {
      if (!document.hidden) ping()
    }
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
