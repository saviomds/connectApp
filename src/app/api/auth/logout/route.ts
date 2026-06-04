import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST: called by client-side logout buttons.
// Returns JSON so the caller can handle navigation itself without the browser
// following a 302 and double-redirecting.
export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return Response.json({ ok: true })
}

// GET: legacy support (e.g. direct link or old code paths).
export async function GET(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const origin = new URL(request.url).origin
  return NextResponse.redirect(`${origin}/login`)
}
