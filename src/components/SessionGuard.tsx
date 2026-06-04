'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PROTECTED = ['/discover', '/matches', '/messages', '/profile', '/settings', '/onboarding', '/premium', '/admin']

// Listens for auth state changes emitted by the Supabase browser client.
// Catches two scenarios the middleware cannot:
//   1. SIGNED_OUT   — the client cleared the session (e.g. another tab signed out,
//                     or signOut() was called programmatically).
//   2. SESSION_REFRESH_FAILED — the silent token refresh failed (bad network,
//                     Supabase temporarily down). The client will NOT retry and
//                     the session will go stale, so we redirect before the user
//                     hits a wall of 401s.
//
// We do NOT redirect on TOKEN_REFRESHED / SIGNED_IN events — those are
// handled by the middleware redirectWithCookies flow.
export default function SessionGuard() {
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      const isProtected = PROTECTED.some(p => pathname.startsWith(p))

      if (event === 'SIGNED_OUT' && isProtected) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`)
        return
      }

      // SESSION_REFRESH_FAILED is emitted when the silent token refresh fails.
      // Cast needed because older @supabase/ssr type definitions may not include it.
      if ((event as string) === 'SESSION_REFRESH_FAILED' && isProtected) {
        router.push(`/login?next=${encodeURIComponent(pathname)}&expired=1`)
      }
    })

    return () => subscription.unsubscribe()
  }, [pathname, router])

  return null
}
