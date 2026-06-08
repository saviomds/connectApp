import { getCachedUser } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

export async function GET() {
  const user = await getCachedUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = user.id

  try {
    // Total count
    const { count: total } = await adminSupabase
      .from('profile_views')
      .select('id', { count: 'exact', head: true })
      .eq('viewed_id', uid)

    // Last 30 days count
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { count: last30 } = await adminSupabase
      .from('profile_views')
      .select('id', { count: 'exact', head: true })
      .eq('viewed_id', uid)
      .gte('created_at', since30)

    // Recent viewers with profile info (last 12, one per viewer)
    const { data: viewRows } = await adminSupabase
      .from('profile_views')
      .select('viewer_id, created_at')
      .eq('viewed_id', uid)
      .order('created_at', { ascending: false })
      .limit(50)

    // Deduplicate — show each viewer once (most recent visit)
    const seen = new Set<string>()
    const uniqueViewerIds: { viewer_id: string; created_at: string }[] = []
    for (const row of (viewRows ?? [])) {
      if (!seen.has(row.viewer_id)) {
        seen.add(row.viewer_id)
        uniqueViewerIds.push(row)
        if (uniqueViewerIds.length >= 12) break
      }
    }

    // Fetch viewer profiles
    const ids = uniqueViewerIds.map(r => r.viewer_id)
    let viewers: { id: string; full_name: string; avatar_url: string | null; profession: string | null; viewed_at: string }[] = []

    if (ids.length > 0) {
      const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('id, full_name, avatar_url, profession')
        .in('id', ids)

      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))
      viewers = uniqueViewerIds
        .map(r => {
          const p = profileMap.get(r.viewer_id)
          if (!p) return null
          return { id: p.id, full_name: p.full_name, avatar_url: p.avatar_url, profession: p.profession, viewed_at: r.created_at }
        })
        .filter(Boolean) as typeof viewers
    }

    return Response.json({ total: total ?? 0, last30: last30 ?? 0, viewers })
  } catch {
    // profile_views table might not exist yet
    return Response.json({ total: 0, last30: 0, viewers: [] })
  }
}
