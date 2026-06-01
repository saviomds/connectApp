import 'server-only'
import { getCachedUser, createClient } from '@/lib/supabase/server'

/**
 * Returns the authenticated user if they are an admin.
 * Uses getCachedUser() so the getUser() network call is shared with the
 * page/layout that triggered this render — no extra round-trip.
 */
export async function getAdminUser() {
  const user = await getCachedUser()
  if (!user) return null

  // 1. Super-admin via env var — no DB call needed
  const adminId = process.env.ADMIN_USER_ID ?? ''
  if (adminId && adminId !== 'your-supabase-user-uuid-here' && user.id === adminId) {
    return user
  }

  // 2. Promoted admin via DB flag
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    if (data?.is_admin === true) return user
  } catch {
    // profiles table not ready
  }

  return null
}
