import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: 60 * 60 * 24 * 400, // 400 days — keeps refreshed tokens alive
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — middleware handles refresh
          }
        },
      },
    }
  )
}

/**
 * Cached per-request user lookup.
 * React's cache() deduplicates calls within one render tree —
 * Navbar, layout, and page all share the same result, making
 * exactly ONE network call to Supabase per request instead of 3+.
 */
export const getCachedUser = cache(async () => {
  try {
    const cookieStore = await cookies()
    // Skip the Supabase client entirely when no auth cookie exists.
    // This avoids a race condition inside @supabase/auth-js where the
    // internal _emitInitialSession() background task wins the lock before
    // getUser(), tries to refresh a stale token, and logs console.error
    // before we can intercept it.  The middleware always clears auth cookies
    // when it detects a definitively invalid session, so an absent/empty
    // cookie here means the user is logged out.
    const hasAuthCookie = cookieStore.getAll().some(
      ({ name, value }) => /^sb-.+-auth-token(\.0)?$/.test(name) && value,
    )
    if (!hasAuthCookie) return null

    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) return null
    return user
  } catch {
    return null
  }
})
