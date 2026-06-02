import { getCachedUser, createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import DiscoverSwipe from '@/components/DiscoverSwipe'
import type { DbProfile } from '@/types/database'

function getServiceClient() {
  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!svcKey || svcKey === 'your_supabase_service_role_key_here') return null
  return createServiceClient(url, svcKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Remove stale swipes left over from unmatches that happened before
// the swipe-cleanup fix. Uses service role because RLS only lets users
// read their OWN swipes (swiper_id = auth.uid()), so cross-user lookups
// need to bypass it. Wrapped in try/catch — never crashes the page.
async function cleanOrphanedSwipes(userId: string, likeTargetIds: string[]) {
  if (likeTargetIds.length === 0) return

  const svc = getServiceClient()
  if (!svc) return // service role not configured — skip silently

  try {
    // 1. Who is the user currently matched with?
    const { data: activeMatches } = await svc
      .from('matches')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

    const matchedIds = new Set(
      (activeMatches ?? []).map((m: { user1_id: string; user2_id: string }) =>
        m.user1_id === userId ? m.user2_id : m.user1_id
      )
    )

    // 2. Which of those like-targets also liked the current user back?
    //    (Service role needed — RLS blocks reading other users' swipes)
    const { data: mutualRows } = await svc
      .from('swipes')
      .select('swiper_id')
      .in('swiper_id', likeTargetIds)
      .eq('target_id', userId)

    const mutualIds = (mutualRows ?? [])
      .map((r: { swiper_id: string }) => r.swiper_id)
      .filter((id: string) => !matchedIds.has(id)) // no active match = orphaned

    if (mutualIds.length === 0) return

    // 3. Delete the stale swipes in both directions
    await Promise.all(
      mutualIds.flatMap((otherId: string) => [
        svc.from('swipes').delete().eq('swiper_id', userId).eq('target_id', otherId),
        svc.from('swipes').delete().eq('swiper_id', otherId).eq('target_id', userId),
      ])
    )
  } catch (err) {
    // Never crash the discover page due to cleanup failure
    console.error('[discover] orphan swipe cleanup error:', err)
  }
}

export default async function DiscoverPage() {
  const user = await getCachedUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  // Fetch profile, swipes, blocks, and active matches in parallel
  const [{ data: profile }, { data: swipedRows }, { data: blockedRows }, { data: activeMatches }] = await Promise.all([
    supabase
      .from('profiles')
      .select('onboarding_completed, profession, category, age')
      .eq('id', user.id)
      .single(),
    supabase
      .from('swipes')
      .select('target_id, direction')
      .eq('swiper_id', user.id),
    supabase
      .from('blocks')
      .select('blocked_id, blocker_id')
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
    // Add: Exclude existing matches explicitly
    supabase
      .from('matches')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
  ])

  const hasProfileData = profile?.profession && profile?.category && profile?.age
  if (!profile?.onboarding_completed && !hasProfileData) redirect('/onboarding')

  if (!profile?.onboarding_completed && hasProfileData) {
    supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id).then(() => {})
  }

  type SwipeRow = { target_id: string; direction: string }
  const allSwipes = (swipedRows ?? []) as SwipeRow[]

  // IDs the current user liked — check for orphaned mutual swipes
  const likeTargetIds = allSwipes
    .filter(r => r.direction === 'like' || r.direction === 'super_like')
    .map(r => r.target_id)

  // Run cleanup (non-blocking failure — try/catch inside)
  await cleanOrphanedSwipes(user.id, likeTargetIds)

  // Combine all IDs that should be hidden from the feed
  const swipedIds  = (swipedRows ?? []).map((r: { target_id: string }) => r.target_id)
  
  const blockedIds = (blockedRows ?? []).flatMap(
    (r: { blocked_id: string; blocker_id: string }) => [r.blocked_id, r.blocker_id]
  )

  const matchedIds = (activeMatches ?? []).map((m: { user1_id: string, user2_id: string }) => 
    m.user1_id === user.id ? m.user2_id : m.user1_id
  )

  // Use a Set to ensure uniqueness and then convert to array
  const excludeIds = [...new Set([
    user.id, // Exclude self
    ...swipedIds, 
    ...blockedIds, 
    ...matchedIds
  ])]

  let profilesQuery = supabase
    .from('profiles')
    .select('*')
    .eq('onboarding_completed', true)
    .eq('is_suspended', false)
    .neq('id', user.id)
    .limit(20)

  // Ensure the list is filtered on the server before sending to the client
  if (excludeIds.length > 0) {
    // PostgREST requires the parentheses for the 'in' filter
    // Format: .not('id', 'in', '(uuid1,uuid2,...)')
    const idList = excludeIds.filter(id => !!id).join(',')
    profilesQuery = profilesQuery.not('id', 'in', `(${idList})`)
  }

  const { data: profiles } = await profilesQuery

  return (
    <DiscoverSwipe
      initialProfiles={(profiles ?? []) as DbProfile[]}
      currentUserId={user.id}
    />
  )
}
