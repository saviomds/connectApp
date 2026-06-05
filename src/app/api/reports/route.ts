import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { reported_id?: string; reason?: string; details?: string }
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { reported_id, reason, details } = body

  if (!reported_id || !reason) {
    return Response.json({ error: 'reported_id and reason are required' }, { status: 400 })
  }

  if (reported_id === user.id) {
    return Response.json({ error: 'Cannot report yourself' }, { status: 400 })
  }

  const VALID_REASONS = ['spam', 'inappropriate', 'harassment', 'fake_profile', 'other']
  if (!VALID_REASONS.includes(reason)) {
    return Response.json({ error: 'Invalid reason' }, { status: 400 })
  }

  const { error } = await supabase
    .from('reports')
    .insert({
      reporter_id:  user.id,
      reported_id,
      reason,
      details: details?.trim() ?? null,
    })

  if (error) {
    // Duplicate report — silently ignore
    if (error.code === '23505') return Response.json({ ok: true })
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
