import { getCachedUser, createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MatchesPage from '@/layout/MatchesPage'

export default async function MatchesRoute() {
  const user = await getCachedUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_verified, is_premium, premium_tier, is_admin')
    .eq('id', user.id)
    .single()

  // Requires Gold or Platinum AND Verified (or admin override)
  const canSeeProfiles =
    ((profile?.is_premium === true) && (profile?.is_verified === true)) ||
    profile?.is_admin === true

  return <MatchesPage canSeeProfiles={canSeeProfiles ?? false} />
}
