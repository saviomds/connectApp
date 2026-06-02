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

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          // request.cookies only accepts (name, value); options go on the response cookies below
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getUser() refreshes the access token when expired using the refresh token.
  // The refreshed tokens land in supabaseResponse — always return it (or copy its cookies).
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  const isProtected  = PROTECTED.some(p => path.startsWith(p))
  const isAuthRoute  = AUTH_ROUTES.some(r => path.startsWith(r))
  const isAdminRoute = ADMIN_ROUTES.some(r => path.startsWith(r))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    // No auth cookies to carry (session is gone); plain redirect is fine.
    return NextResponse.redirect(url)
  }

  if (isAuthRoute && user && !path.startsWith('/reset-password') && !path.startsWith('/verify')) {
    const url = request.nextUrl.clone()
    url.pathname = '/discover'
    // Carry refreshed tokens so the new cookies are not dropped on this redirect.
    return redirectWithCookies(url, supabaseResponse)
  }

  if (isAdminRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Skip:
     *   - /api/*        — route handlers call getUser() themselves
     *   - _next/static  — static build output
     *   - _next/image   — image optimisation
     *   - favicon.ico, public assets
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
