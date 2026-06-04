import { createClient } from '@/lib/supabase/server'
import { getCachedUser } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const user = await getCachedUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const page     = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))
  const limit    = 24
  const freeOnly = searchParams.get('free_tonight') === 'true'
  const gender   = searchParams.get('gender') ?? ''

  const [{ data: swipedRows }, { data: blockedRows }] = await Promise.all([
    supabase.from('swipes').select('target_id').eq('swiper_id', user.id).limit(500),
    supabase.from('blocks').select('blocked_id, blocker_id'),
  ])

  const excludeIds = new Set([
    user.id,
    ...(swipedRows ?? []).map((r: { target_id: string }) => r.target_id),
    ...(blockedRows ?? []).flatMap((r: { blocked_id: string; blocker_id: string }) => [r.blocked_id, r.blocker_id]),
  ])

  let query = supabase
    .from('profiles')
    .select('id, full_name, avatar_url, photos, profession, company, city, country, age, is_verified, is_online, is_premium, premium_tier, free_tonight, interests, category')
    .eq('onboarding_completed', true)
    .eq('is_suspended', false)
    .order('is_online', { ascending: false })
    .order('updated_at', { ascending: false })
    .range(page * limit, page * limit + limit - 1)

  if (freeOnly) query = query.eq('free_tonight', true)
  if (gender && gender !== 'everyone') query = query.eq('gender', gender)

  const { data: profiles, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const filtered = (profiles ?? []).filter((p: { id: string }) => !excludeIds.has(p.id))
  return Response.json({ profiles: filtered, page, hasMore: filtered.length === limit })
}
