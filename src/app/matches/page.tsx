import { getCachedUser, createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MatchesPage from '@/layout/MatchesPage'

export default async function MatchesRoute() {
  const user = await getCachedUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('category, is_verified, is_admin')
    .eq('id', user.id)
    .single()

  const canSeeProfiles =
    (profile?.category === 'professional' && profile?.is_verified === true) ||
    profile?.is_admin === true

  return <MatchesPage canSeeProfiles={canSeeProfiles ?? false} />
}
