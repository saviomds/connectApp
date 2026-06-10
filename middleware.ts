import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED   = ['/discover', '/matches', '/messages', '/profile', '/settings', '/onboarding', '/premium', '/explore', '/top-picks', '/double-date']
const AUTH_ROUTES = ['/login', '/signup', '/verify', '/forgot-password', '/reset-password']
const ADMIN_ROUTES = ['/admin']

// ── In-memory sliding-window rate limiter ──────────────────────────
// Per-isolate (not shared across serverless instances) — good enough for
// MVP anti-spam. Keys are evicted lazily when the window expires.
const rlMap = new Map<string, number[]>()

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const hits = (rlMap.get(key) ?? []).filter(t => now - t < windowMs)
  if (hits.length >= limit) return false   // over limit
  hits.push(now)
  rlMap.set(key, hits)
  return true                              // allowed
}

const MSG_PATTERN = /^\/api\/conversations\/[^/]+\/messages$/

// Copy any refreshed Supabase auth cookies into a redirect so tokens are never dropped.
function redirectWithCookies(url: URL, supabaseResponse: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach(({ name, value, ...rest }) => {
    redirect.cookies.set(name, value, rest as Parameters<typeof redirect.cookies.set>[2])
  })
  return redirect
}

// Error codes that mean the stored session is definitively invalid.
// Everything NOT in this set is treated as transient/unknown → let through.
const INVALID_SESSION_CODES = new Set([
  'refresh_token_not_found',   // token revoked / project reset / never existed
  'bad_jwt',                   // JWT secret changed or token tampered with
  'session_not_found',         // session deleted from DB
  'user_not_found',            // account deleted
  'user_banned',               // account banned
])

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // ── Rate limiting — runs before auth, applies to API routes only ──
  if (pathname.startsWith('/api/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    const denied =
      (method === 'POST' && pathname === '/api/swipes'           && !rateLimit(`${ip}:swipes`,   10, 60_000)) ||
      (method === 'POST' && MSG_PATTERN.test(pathname)           && !rateLimit(`${ip}:messages`, 30, 60_000)) ||
      (method === 'POST' && pathname === '/api/reports'          && !rateLimit(`${ip}:reports`,   5, 60_000))

    if (denied) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Retry-After': '60', 'Content-Type': 'application/json' },
      })
    }
    // Let all other API calls through without Supabase overhead
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: 60 * 60 * 24 * 400,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      },
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Delete from the request rather than set-to-empty so that the
            // server component's cookieStore.getAll() never returns stale
            // chunk values that combineChunks() could reassemble.
            if (!value || options?.maxAge === 0) {
              request.cookies.delete(name)
            } else {
              request.cookies.set(name, value)
            }
          })
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getUser() refreshes the access token when expired.
  // We wrap it so that a transient network error (Supabase momentarily
  // unreachable, DNS hiccup, free-tier project waking up) does NOT sign
  // the user out — we just let the request through and rely on page-level
  // and API-level auth checks instead.
  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      if (INVALID_SESSION_CODES.has(error.code ?? '')) {
        // Definitively invalid token — clear local cookies so the stale
        // session doesn't loop.
        await supabase.auth.signOut({ scope: 'local' })
        // user stays null → protected routes redirect to /login below
      } else {
        // Any other error (transient network blip, race condition, unknown
        // Supabase error) — DO NOT sign the user out.  Let the request
        // through; the page and API routes validate auth independently.
        return supabaseResponse
      }
    } else {
      user = data.user
    }
  } catch {
    // Network error / Supabase unreachable — treat as unknown auth state.
    // Returning supabaseResponse lets the request through; server components
    // and API routes will validate auth themselves.
    return supabaseResponse
  }

  const path = request.nextUrl.pathname

  const isProtected  = PROTECTED.some(p => path.startsWith(p))
  const isAuthRoute  = AUTH_ROUTES.some(r => path.startsWith(r))
  const isAdminRoute = ADMIN_ROUTES.some(r => path.startsWith(r))

  if ((isProtected || isAdminRoute) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  if (isAuthRoute && user && !path.startsWith('/reset-password') && !path.startsWith('/verify')) {
    const url = request.nextUrl.clone()
    url.pathname = '/discover'
    return redirectWithCookies(url, supabaseResponse)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Covers all routes except Next.js internals and static assets.
    // API routes are included so the rate limiter can intercept them;
    // auth logic short-circuits before running on API paths.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
