import { getAdminUser } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const tab = searchParams.get('tab') ?? 'activity'

  if (tab === 'reports') {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        id, reason, details, status, created_at,
        reporter:profiles!reports_reporter_id_fkey(id, full_name, avatar_url),
        reported:profiles!reports_reported_id_fkey(id, full_name, avatar_url, profession)
      `)
      .order('created_at', { ascending: false })
      .limit(60)

    if (error) {
      console.warn('[admin/reports] reports query failed:', error.message)
      return Response.json({ data: [], note: 'Run reports_and_prefs.sql to enable this tab.' })
    }
    return Response.json({ data: data ?? [] })
  }

  if (tab === 'blocked') {
    const { data, error } = await supabase
      .from('blocks')
      .select(`
        id, created_at,
        blocker:profiles!blocks_blocker_id_fkey(id, full_name, avatar_url, profession),
        blocked:profiles!blocks_blocked_id_fkey(id, full_name, avatar_url, profession)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.warn('[admin/reports] blocks query failed:', error.message)
      return Response.json({ data: [], note: 'Run admin_grants.sql to enable blocked-user visibility.' })
    }
    return Response.json({ data: data ?? [] })
  }

  if (tab === 'suspended') {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, profession, company, city, updated_at, created_at')
      .eq('is_suspended', true)
      .order('updated_at', { ascending: false })
      .limit(50)

    return Response.json({ data: data ?? [] })
  }

  // Default: activity (recent notifications)
  const { data } = await supabase
    .from('notifications')
    .select(`
      id, type, data, created_at, is_read,
      user:profiles!notifications_user_id_fkey(id, full_name, avatar_url)
    `)
    .order('created_at', { ascending: false })
    .limit(60)

  return Response.json({ data: data ?? [] })
}

export async function PATCH(request: Request) {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createClient()
  const { id, status } = await request.json() as { id: string; status: 'reviewed' | 'dismissed' }

  if (!id || !['reviewed', 'dismissed'].includes(status)) {
    return Response.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
