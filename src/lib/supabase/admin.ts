import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Uses the service role key — bypasses RLS, never expose to the client.
// Cached as a module-level singleton so the same client is reused across
// requests. Creating a fresh client per property access was leaving dangling
// internal streams on GC, triggering Node.js TransformStream errors.
// Still throws at first use (not import time) so local dev starts without
// SUPABASE_SERVICE_ROLE_KEY when admin features aren't needed.
let _client: ReturnType<typeof createClient> | null = null

function getAdminClient() {
  if (_client) return _client
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set.\n' +
      'Add it to .env.local to enable admin features (account deletion, webhook handlers).'
    )
  }
  _client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  return _client
}

export const adminSupabase = new Proxy({} as ReturnType<typeof getAdminClient>, {
  get(_target, prop) {
    return getAdminClient()[prop as keyof ReturnType<typeof getAdminClient>]
  },
})
