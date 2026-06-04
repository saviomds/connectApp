import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED   = ['/discover', '/matches', '/messages', '/profile', '/settings', '/onboarding', '/premium']
const AUTH_ROUTES = ['/login', '/signup', '/verify', '/forgot-password', '/reset-password']
const ADMIN_ROUTES = ['/admin']

// Copy any refreshed Supabase auth cookies into a redirect so tokens are never dropped.
function redirectWithCookies(url: URL, supabaseResponse: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach(({ name, value, ...rest }) => {
    redirect.cookies.set(name, value, rest as Parameters<typeof redirect.cookies.set>[2])
  })
  return redirect
}

// Error codes that mean the stored session is definitively invalid (not transient).
// refresh_token_not_found  → token revoked / project reset / never existed
// bad_jwt                  → JWT secret changed or token tampered with
const INVALID_SESSION_CODES = new Set([
  'refresh_token_not_found',
  'bad_jwt',
])

// refresh_token_already_used happens when two tabs both try to refresh the
// access token at the same instant (race with rotation enabled).  One tab
// wins and gets a new token pair; the other gets this error but the refreshed
// cookies from the winning tab are already in the browser.  We should NOT
// sign out — the session is still valid in the browser; the next request will
// carry the updated cookies and succeed.
const RACE_CONDITION_CODES = new Set([
  'refresh_token_already_used',
])

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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
        // session doesn't loop.  scope:'local' only clears browser cookies,
        // no extra network call needed.
        await supabase.auth.signOut({ scope: 'local' })
        // user stays null → protected routes redirect to /login below
      } else if (RACE_CONDITION_CODES.has(error.code ?? '')) {
        // Race condition — the valid session is already in the browser from
        // the other tab.  Don't sign out.  Let the request through; the next
        // navigation will carry the fresh cookies.
        return supabaseResponse
      }
      // Any other auth error (e.g. 500 from Supabase) — let through.
      // Page-level auth guards handle it without kicking the user out.
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
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
