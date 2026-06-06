import { createClient } from '@/lib/supabase/server'
import { getCachedUser } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const user = await getCachedUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const onlineOnly  = searchParams.get('online_only') === 'true'
  const categories  = searchParams.get('categories')?.split(',').filter(Boolean) ?? []
  const minAge      = parseInt(searchParams.get('min_age') ?? '18', 10)
  const maxAge      = parseInt(searchParams.get('max_age') ?? '80', 10)
  const limit       = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)
  const genderParam = searchParams.get('gender')

  // Fetch requesting user's tier to enforce paid-only filters
  const { data: requester } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', user.id)
    .single()
  const isPremium = requester?.is_premium ?? false

  // Gender filter is Gold/Platinum only — silently ignore if free user somehow sends it
  const gender = isPremium && genderParam && genderParam !== 'any' ? genderParam : null

  // IDs to exclude: already swiped + self + blocked (both directions)
  const [{ data: swipedRows }, { data: blockedRows }] = await Promise.all([
    supabase.from('swipes').select('target_id')
      .eq('swiper_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('blocks').select('blocked_id, blocker_id'),
  ])

  const swipedIds  = (swipedRows  ?? []).map((r: { target_id: string }) => r.target_id)
  const blockedIds = (blockedRows ?? []).flatMap(
    (r: { blocked_id: string; blocker_id: string }) => [r.blocked_id, r.blocker_id]
  )

  const excludeIds = [...new Set([...swipedIds, ...blockedIds, user.id])]

  const now = new Date().toISOString()

  let query = supabase
    .from('profiles')
    .select('*')
    .eq('onboarding_completed', true)
    .eq('is_suspended', false)
    .not('id', 'in', `(${excludeIds.join(',')})`)
    .gte('age', minAge)
    .lte('age', maxAge)
    .limit(limit)

  if (onlineOnly)          query = query.eq('is_online', true)
  if (categories.length > 0) query = query.in('category', categories)
  if (gender)              query = query.eq('gender', gender)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const profiles = data ?? []

  const scoreOf = (p: typeof profiles[number]) => {
    const boosted = p.boosted_until && new Date(p.boosted_until) > new Date(now)
    return (boosted ? 8 : 0) + (p.is_premium === true ? 4 : 0) + (p.is_verified === true ? 2 : 0)
  }

  // Sort priority: boosted > premium > verified > everyone else
  profiles.sort((a, b) => scoreOf(b) - scoreOf(a))

  // Shuffle within each same-priority tier so refreshes show different profiles first
  let start = 0
  while (start < profiles.length) {
    const tierScore = scoreOf(profiles[start])
    let end = start + 1
    while (end < profiles.length && scoreOf(profiles[end]) === tierScore) end++
    for (let i = end - 1; i > start; i--) {
      const j = start + Math.floor(Math.random() * (i - start + 1))
      ;[profiles[i], profiles[j]] = [profiles[j], profiles[i]]
    }
    start = end
  }

  return Response.json(profiles)
}
