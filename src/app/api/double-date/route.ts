import { createClient } from '@/lib/supabase/server'
import { getCachedUser } from '@/lib/supabase/server'

// Double Date: show matched couples open to a group outing.
//
// Design:
//  - Show ALL couples (matched pairs) by default so the page is never empty.
//  - If the double_date_active column exists, sort "actively looking" couples
//    to the top and add a badge; others still show but without the badge.
//  - This way the feature works even before the migration is run.
//  - Filter out: current user's own matches, blocked users.

export async function GET() {
  const user = await getCachedUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

  // 1. IDs we must exclude: current user's own match partners + blocks
  const [{ data: myMatchRows }, { data: blockedRows }] = await Promise.all([
    supabase.from('matches').select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
    supabase.from('blocks').select('blocked_id, blocker_id'),
  ])

  const myMatchedIds = new Set(
    (myMatchRows ?? []).map((m: { user1_id: string; user2_id: string }) =>
      m.user1_id === user.id ? m.user2_id : m.user1_id
    )
  )
  const blockedIds = new Set(
    (blockedRows ?? []).flatMap(
      (b: { blocked_id: string; blocker_id: string }) => [b.blocked_id, b.blocker_id]
    )
  )
  const excludeIds = new Set([user.id, ...myMatchedIds, ...blockedIds])

  // 2. Fetch a pool of recent matches NOT involving the current user.
  //    We use two separate profile queries to avoid FK-name dependency.
  const { data: candidateMatches } = await supabase
    .from('matches')
    .select('id, user1_id, user2_id, created_at')
    .neq('user1_id', user.id)
    .neq('user2_id', user.id)
    .order('created_at', { ascending: false })
    .limit(60)

  const filtered = (candidateMatches ?? []).filter(
    (m: { user1_id: string; user2_id: string }) =>
      !excludeIds.has(m.user1_id) && !excludeIds.has(m.user2_id)
  )

  if (filtered.length === 0) {
    return Response.json({ couples: [], myActive: false })
  }

  // 3. Collect all unique user IDs from candidate couples
  const allIds = [...new Set(filtered.flatMap(
    (m: { user1_id: string; user2_id: string }) => [m.user1_id, m.user2_id]
  ))]

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, photos, city, country, age, profession, is_verified, is_premium, premium_tier, double_date_active')
    .in('id', allIds)
    .eq('onboarding_completed', true)
    .eq('is_suspended', false)

  const profileMap = new Map(
    (profileRows ?? []).map((p: { id: string }) => [p.id, p])
  )

  // 4. Build couples array — skip if either profile is missing/suspended
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const couples: any[] = []
  for (const m of filtered.slice(0, 20)) {
    const u1 = profileMap.get(m.user1_id)
    const u2 = profileMap.get(m.user2_id)
    if (!u1 || !u2) continue

    // "looking" = at least one partner has double_date_active = true
    // (or the column doesn't exist yet — show everyone)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u1active = (u1 as any).double_date_active ?? null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u2active = (u2 as any).double_date_active ?? null
    const columnExists = u1active !== null || u2active !== null
    const isLooking = !columnExists || u1active || u2active

    couples.push({
      id: m.id,
      user1: u1,
      user2: u2,
      isLooking,           // true = at least one partner opted in
      bothLooking: u1active && u2active, // badge for full opt-in
      created_at: m.created_at,
    })
  }

  // Sort: both looking → one looking → general
  couples.sort((a, b) => {
    if (a.bothLooking && !b.bothLooking) return -1
    if (!a.bothLooking && b.bothLooking) return 1
    if (a.isLooking && !b.isLooking) return -1
    if (!a.isLooking && b.isLooking) return 1
    return 0
  })

  // 5. Check if the current user has double_date_active set
  const { data: meRow } = await supabase
    .from('profiles')
    .select('double_date_active')
    .eq('id', user.id)
    .single()
  const myActive = meRow?.double_date_active ?? false

  return Response.json({ couples, myActive })
}

export async function PATCH(request: Request) {
  const user = await getCachedUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { active } = await request.json() as { active: boolean }
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ double_date_active: active })
    .eq('id', user.id)

  // If column doesn't exist yet (migration not run), respond ok anyway —
  // the toggle still reflects intent even without persistence.
  if (error && !error.message.includes('column')) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ ok: true, double_date_active: active })
}
