'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PROTECTED = ['/discover', '/matches', '/messages', '/profile', '/settings', '/onboarding', '/premium', '/admin', '/explore', '/top-picks', '/double-date']

export default function SessionGuard() {
  const router   = useRouter()
  const pathname = usePathname()
  // Prevents redirect-storms: once we've decided to redirect, ignore further events.
  const redirectingRef = useRef(false)
  // Debounce SESSION_REFRESH_FAILED — transient on free-tier project wakeup.
  const refreshFailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    redirectingRef.current = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (redirectingRef.current) return

      const isProtected = PROTECTED.some(p => pathname.startsWith(p))
      if (!isProtected) return

      if (event === 'SIGNED_OUT' && !session) {
        // Only redirect if the session is truly gone — not just a transient clear.
        redirectingRef.current = true
        router.push(`/login?next=${encodeURIComponent(pathname)}`)
        return
      }

      if ((event as string) === 'SESSION_REFRESH_FAILED') {
        // Debounce: wait 4 seconds before acting — free-tier project may be waking up.
        if (refreshFailTimerRef.current) clearTimeout(refreshFailTimerRef.current)
        refreshFailTimerRef.current = setTimeout(async () => {
          // Re-check: if session recovered in the meantime, do nothing.
          const { data } = await supabase.auth.getSession()
          if (data.session) return
          if (!redirectingRef.current) {
            redirectingRef.current = true
            router.push(`/login?next=${encodeURIComponent(pathname)}&expired=1`)
          }
        }, 4000)
      }
    })

    return () => {
      subscription.unsubscribe()
      if (refreshFailTimerRef.current) clearTimeout(refreshFailTimerRef.current)
    }
  }, [pathname, router])

  return null
}
