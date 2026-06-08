import { getAdminUser } from '@/lib/admin'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// User submits an appeal
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { reason: string }
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body.reason?.trim()) return Response.json({ error: 'reason is required' }, { status: 400 })

  // Confirm the user is actually suspended
  const { data: profile } = await supabase.from('profiles').select('is_suspended').eq('id', user.id).single()
  if (!profile?.is_suspended) return Response.json({ error: 'Account is not suspended' }, { status: 400 })

  // Prevent duplicate pending appeals
  const { data: existing } = await adminSupabase
    .from('suspension_appeals')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) return Response.json({ error: 'You already have a pending appeal' }, { status: 409 })

  const { data, error: insErr } = await adminSupabase
    .from('suspension_appeals')
    .insert({ user_id: user.id, reason: body.reason.trim(), status: 'pending' })
    .select()
    .single()

  if (insErr?.code === '42P01') return Response.json({ error: 'Appeals table not ready — run the moderation migration' }, { status: 503 })
  if (insErr) return Response.json({ error: insErr.message }, { status: 500 })

  return Response.json(data)
}

// Admin: list appeals
export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await adminSupabase
    .from('suspension_appeals')
    .select('id, user_id, reason, status, admin_response, created_at, reviewed_at, profiles:user_id(full_name, avatar_url, is_suspended)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error?.code === '42P01') return Response.json([])
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data ?? [])
}
