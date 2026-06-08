import { getAdminUser } from '@/lib/admin'
import { adminSupabase } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  let query = adminSupabase
    .from('user_warnings')
    .select('id, user_id, level, reason, created_at, expires_at, is_active, admin_id, profiles:user_id(full_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query
  if (error?.code === '42P01') return Response.json([])
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data ?? [])
}

export async function POST(request: Request) {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  let body: { user_id: string; level: number; reason: string }
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { user_id, level, reason } = body
  if (!user_id || !level || !reason) return Response.json({ error: 'user_id, level, and reason are required' }, { status: 400 })
  if (level < 1 || level > 4) return Response.json({ error: 'level must be 1-4' }, { status: 400 })

  // Level 3+ = temporary suspension; Level 4 = permanent ban review
  let expires_at: string | null = null
  if (level === 2) expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()  // 24h restriction
  if (level === 3) expires_at = new Date(Date.now() + 7  * 24 * 60 * 60 * 1000).toISOString() // 7-day suspension

  const { data: warn, error: warnErr } = await adminSupabase
    .from('user_warnings')
    .insert({ user_id, level, reason, admin_id: admin.id, expires_at, is_active: true })
    .select()
    .single()

  if (warnErr?.code === '42P01') {
    return Response.json({ error: 'user_warnings table not created yet — run the moderation migration' }, { status: 503 })
  }
  if (warnErr) return Response.json({ error: warnErr.message }, { status: 500 })

  // Level 4: also set is_suspended = true on the profile
  if (level === 4) {
    await adminSupabase.from('profiles').update({ is_suspended: true }).eq('id', user_id)
  }

  // Level 3: temporary suspend
  if (level === 3) {
    await adminSupabase.from('profiles').update({ is_suspended: true }).eq('id', user_id)
  }

  return Response.json(warn)
}
