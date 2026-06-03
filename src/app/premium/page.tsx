import { getCachedUser, createClient } from '@/lib/supabase/server'
import PremiumPage from '@/layout/PremiumPage'

export default async function PremiumRoute() {
  let isPremium = false
  let premiumTier: 'gold' | 'platinum' | null = null

  const user = await getCachedUser()
  if (user) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('profiles')
      .select('is_premium, premium_tier')
      .eq('id', user.id)
      .single()
    isPremium   = data?.is_premium   ?? false
    premiumTier = data?.premium_tier ?? null
  }

  return <PremiumPage isPremium={isPremium} premiumTier={premiumTier} />
}
