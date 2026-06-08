import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Non-generic wrapper so ReturnType<> captures the exact SupabaseClient<any,'public',any>
// inferred from the concrete createClient(url, key, opts) call — not the wider
// SupabaseClient<any, string, any> you'd get from ReturnType<typeof createClient>.
function createAdminClient() {
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

// Cached as a module-level singleton — reused across requests so the same
// client's internal streams are never left dangling for GC, which was
// triggering Node.js TransformStream errors on every admin page load.
let _client: ReturnType<typeof createAdminClient> | null = null

function getAdminClient() {
  if (!_client) _client = createAdminClient()
  return _client!
}

export const adminSupabase = new Proxy({} as ReturnType<typeof getAdminClient>, {
  get(_target, prop) {
    return getAdminClient()[prop as keyof ReturnType<typeof getAdminClient>]
  },
})
