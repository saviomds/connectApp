import { Suspense } from 'react'
import { getCachedUser, createClient } from '@/lib/supabase/server'
import PremiumPage from '@/layout/PremiumPage'

export default async function PremiumRoute() {
  let isPremium      = false
  let premiumTier:   'gold' | 'platinum' | null = null
  let isProfessional = false

  const user = await getCachedUser()
  if (user) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('profiles')
      .select('is_premium, premium_tier, is_professional, verification_status')
      .eq('id', user.id)
      .single()
    isPremium      = data?.is_premium      ?? false
    premiumTier    = data?.premium_tier    ?? null
    isProfessional = (data?.is_professional ?? false) && data?.verification_status === 'approved'
  }

  return (
    <Suspense fallback={null}>
      <PremiumPage isPremium={isPremium} premiumTier={premiumTier} isProfessional={isProfessional} />
    </Suspense>
  )
}
