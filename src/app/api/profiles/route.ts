import { createClient } from '@/lib/supabase/server'
import { getCachedUser } from '@/lib/supabase/server'
import { computeUserLevel, getAllowedLevels } from '@/lib/discovery-levels'

export async function GET(request: Request) {
  const user = await getCachedUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const onlineOnly     = searchParams.get('online_only') === 'true'
  const categories     = searchParams.get('categories')?.split(',').filter(Boolean) ?? []
  const minAge         = parseInt(searchParams.get('min_age') ?? '18', 10)
  const maxAge         = parseInt(searchParams.get('max_age') ?? '80', 10)
  const limit          = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)
  const genderParam    = searchParams.get('gender')
  // When true: only exclude liked/super-liked profiles, not passed ones.
  // Used by the "Refresh" button so users can re-see profiles they passed.
  const includePasses  = searchParams.get('include_passes') === 'true'

  // Fetch requester's profile — try full column set, fall back if migrations haven't run
  const { data: fullRequester, error: reqError } = await supabase
    .from('profiles')
    .select('is_premium, is_verified, is_professional, category, unlocked_levels')
    .eq('id', user.id)
    .single()

  let requester = fullRequester
  if (reqError) {
    // discovery_levels / verification_system migrations not yet applied — degrade gracefully
    const { data: basicRequester } = await supabase
      .from('profiles')
      .select('is_premium, is_verified, category')
      .eq('id', user.id)
      .single()
    requester = basicRequester
      ? { ...basicRequester, is_professional: false, unlocked_levels: [] }
      : null
  }

  if (!requester) return Response.json({ error: 'Profile not found' }, { status: 404 })

  const isPremium      = requester.is_premium ?? false
  const myLevel        = computeUserLevel(requester)
  const allowedLevels  = getAllowedLevels(myLevel, isPremium, requester.unlocked_levels ?? [])

  const gender = isPremium && genderParam && genderParam !== 'any' ? genderParam : null

  // IDs to exclude: swiped (all or only likes) + self + blocked (both directions)
  let swipesQuery = supabase
    .from('swipes')
    .select('target_id')
    .eq('swiper_id', user.id)
    .limit(500)

  if (includePasses) {
    // Re-discovery mode: only exclude profiles the user actively liked/super-liked
    swipesQuery = swipesQuery.in('direction', ['like', 'super_like']) as typeof swipesQuery
  }

  const [{ data: swipedRows }, { data: blockedRows }] = await Promise.all([
    swipesQuery,
    supabase.from('blocks').select('blocked_id, blocker_id'),
  ])

  const swipedIds  = (swipedRows  ?? []).map((r: { target_id: string }) => r.target_id)
  const blockedIds = (blockedRows ?? []).flatMap(
    (r: { blocked_id: string; blocker_id: string }) => [r.blocked_id, r.blocker_id]
  )

  const excludeIds = [...new Set([...swipedIds, ...blockedIds, user.id])]

  const now = new Date().toISOString()

  const baseQuery = () => {
    let q = supabase
      .from('profiles')
      .select('*')
      .eq('onboarding_completed', true)
      .eq('is_suspended', false)
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .gte('age', minAge)
      .lte('age', maxAge)
      .limit(limit)
    if (onlineOnly)            q = q.eq('is_online', true)
    if (categories.length > 0) q = q.in('category', categories)
    if (gender)                q = q.eq('gender', gender)
    return q
  }

  // Try with level gate; if user_level column missing, fall back to no level filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let profiles: any[] = []
  const leveledResult = await baseQuery().in('user_level', allowedLevels)

  if (leveledResult.error) {
    // Column missing or other DB error — run without level filter
    const { data: fallback, error: fbErr } = await baseQuery()
    if (fbErr) return Response.json({ error: fbErr.message }, { status: 500 })
    profiles = fallback ?? []
  } else {
    profiles = leveledResult.data ?? []
  }

  const scoreOf = (p: Record<string, unknown>) => {
    const boosted = p.boosted_until && new Date(p.boosted_until as string) > new Date(now)
    return (boosted ? 8 : 0) + (p.is_premium === true ? 4 : 0) + (p.is_verified === true ? 2 : 0)
  }

  profiles.sort((a, b) => scoreOf(b) - scoreOf(a))

  // Fisher-Yates shuffle within each score tier
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
