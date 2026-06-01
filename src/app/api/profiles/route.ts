import { createClient } from '@/lib/supabase/server'
import { getCachedUser } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const user = await getCachedUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const onlineOnly = searchParams.get('online_only') === 'true'
  const categories = searchParams.get('categories')?.split(',').filter(Boolean) ?? []
  const minAge = parseInt(searchParams.get('min_age') ?? '18', 10)
  const maxAge = parseInt(searchParams.get('max_age') ?? '80', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)

  // IDs to exclude: already swiped + self + blocked (both directions)
  const [{ data: swipedRows }, { data: blockedRows }] = await Promise.all([
    supabase.from('swipes').select('target_id').eq('swiper_id', user.id),
    supabase.from('blocks').select('blocked_id, blocker_id'),
  ])

  const swipedIds  = (swipedRows  ?? []).map((r: { target_id: string })  => r.target_id)
  const blockedIds = (blockedRows ?? []).flatMap((r: { blocked_id: string; blocker_id: string }) =>
    [r.blocked_id, r.blocker_id]
  )

  const excludeIds = [...new Set([...swipedIds, ...blockedIds, user.id])]

  let query = supabase
    .from('profiles')
    .select('*')
    .eq('onboarding_completed', true)
    .eq('is_suspended', false)          // never show suspended users
    .not('id', 'in', `(${excludeIds.join(',')})`)
    .gte('age', minAge)
    .lte('age', maxAge)
    .limit(limit)

  if (onlineOnly)          query = query.eq('is_online', true)
  if (categories.length > 0) query = query.in('category', categories)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data ?? [])
}
