import { getCachedUser, createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DiscoverSwipe from '@/components/DiscoverSwipe'
import type { DbProfile } from '@/types/database'

export default async function DiscoverPage() {
  const user = await getCachedUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  // Profile check, swipes, and blocks all run in parallel
  const [{ data: profile }, { data: swipedRows }, { data: blockedRows }] = await Promise.all([
    supabase
      .from('profiles')
      .select('onboarding_completed, profession, category, age')
      .eq('id', user.id)
      .single(),
    supabase.from('swipes').select('target_id').eq('swiper_id', user.id),
    supabase.from('blocks').select('blocked_id, blocker_id'),
  ])

  const hasProfileData = profile?.profession && profile?.category && profile?.age
  const needsOnboarding = !profile?.onboarding_completed && !hasProfileData
  if (needsOnboarding) redirect('/onboarding')

  if (!profile?.onboarding_completed && hasProfileData) {
    supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id).then(() => {})
  }

  const swipedIds  = (swipedRows  ?? []).map((r: { target_id: string }) => r.target_id)
  const blockedIds = (blockedRows ?? []).flatMap((r: { blocked_id: string; blocker_id: string }) =>
    [r.blocked_id, r.blocker_id]
  )
  const excludeIds = [...new Set([...swipedIds, ...blockedIds])]

  let profilesQuery = supabase
    .from('profiles')
    .select('*')
    .eq('onboarding_completed', true)
    .eq('is_suspended', false)
    .neq('id', user.id)
    .limit(20)

  if (excludeIds.length > 0) {
    profilesQuery = profilesQuery.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data: profiles } = await profilesQuery

  return (
    <DiscoverSwipe
      initialProfiles={(profiles ?? []) as DbProfile[]}
      currentUserId={user.id}
    />
  )
}
