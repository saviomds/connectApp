import { createClient, getCachedUser } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/send-push'

const BOOST_DURATION_MINS = 30

export async function GET() {
  const user = await getCachedUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium, premium_tier, boosted_until')
    .eq('id', user.id)
    .single()

  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 })

  const now = new Date()
  const boostedUntil = profile.boosted_until ? new Date(profile.boosted_until) : null
  const isActive = !!boostedUntil && boostedUntil > now

  return Response.json({
    active:       isActive,
    boostedUntil: isActive ? profile.boosted_until : null,
    isPremium:    profile.is_premium,
    tier:         profile.premium_tier,
  })
}

export async function POST() {
  const user = await getCachedUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium, boosted_until')
    .eq('id', user.id)
    .single()

  if (!profile?.is_premium) {
    return Response.json(
      { error: 'Profile Boost requires Gold or Platinum membership.' },
      { status: 403 }
    )
  }

  // Don't stack boosts — only activate if not already active
  if (profile.boosted_until && new Date(profile.boosted_until) > new Date()) {
    return Response.json(
      { error: 'Boost already active.', boostedUntil: profile.boosted_until },
      { status: 409 }
    )
  }

  const boostedUntil = new Date(Date.now() + BOOST_DURATION_MINS * 60_000).toISOString()

  const { error } = await supabase
    .from('profiles')
    .update({ boosted_until: boostedUntil })
    .eq('id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  await supabase.from('notifications').insert({
    user_id: user.id,
    type: 'profile_boost',
    data: { boosted_until: boostedUntil, duration_mins: BOOST_DURATION_MINS },
  })
  sendPushToUser(user.id, {
    title: 'Profile Boosted! ⚡',
    body: `Your profile is now boosted for ${BOOST_DURATION_MINS} minutes`,
    url: '/profile',
  }).catch(() => {})

  return Response.json({ active: true, boostedUntil })
}
