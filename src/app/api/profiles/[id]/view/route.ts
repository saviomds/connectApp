import { getCachedUser, createClient } from '@/lib/supabase/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: viewedId } = await params
  const user = await getCachedUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.id === viewedId) return Response.json({ ok: true }) // self-view ignored

  const supabase = await createClient()

  // Upsert a view record for (viewer, viewed, today).
  // The UNIQUE constraint on (viewer_id, viewed_id, view_date) prevents duplicates.
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  await supabase.from('profile_views').upsert(
    { viewer_id: user.id, viewed_id: viewedId, view_date: today },
    { onConflict: 'viewer_id,viewed_id,view_date', ignoreDuplicates: true }
  )

  return Response.json({ ok: true })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: viewedId } = await params
  const user = await getCachedUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  // Only the profile owner may read their own view stats
  if (user.id !== viewedId) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createClient()

  const { count: total } = await supabase
    .from('profile_views')
    .select('*', { count: 'exact', head: true })
    .eq('viewed_id', viewedId)

  // Last 30 days
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count: last30 } = await supabase
    .from('profile_views')
    .select('*', { count: 'exact', head: true })
    .eq('viewed_id', viewedId)
    .gte('created_at', since)

  return Response.json({ total: total ?? 0, last30: last30 ?? 0 })
}
