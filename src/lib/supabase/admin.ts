import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Uses the service role key — bypasses RLS, never expose to the client.
// Throws at call time (not import time) so the app starts without SUPABASE_SERVICE_ROLE_KEY
// during local dev if you don't need admin features yet.
function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set.\n' +
      'Add it to .env.local to enable admin features (account deletion, webhook handlers).'
    )
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export const adminSupabase = new Proxy({} as ReturnType<typeof getAdminClient>, {
  get(_target, prop) {
    return getAdminClient()[prop as keyof ReturnType<typeof getAdminClient>]
  },
})
