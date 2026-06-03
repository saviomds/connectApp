import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // `next` comes from the short-lived cookie set before OAuth redirect.
  // Fall back to query param (email/magic-link flows) then default.
  const cookieNext = request.cookies.get('oauth_next')?.value
  const next = searchParams.get('next') ?? (cookieNext ? decodeURIComponent(cookieNext) : '/discover')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`)
      // Clear the oauth_next cookie
      response.cookies.set('oauth_next', '', { maxAge: 0, path: '/' })
      return response
    }
    console.error('exchangeCodeForSession error:', error.message)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
