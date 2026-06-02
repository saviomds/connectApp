import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. Check eligibility: Must be Admin OR (Verified AND Professional)
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_verified, is_professional, is_admin')
    .eq('id', user.id)
    .single()

  const isEligible = profile?.is_admin || (profile?.is_verified && profile?.is_professional)

  if (!isEligible) {
    return Response.json({ 
      error: 'Upgrade required', 
      message: 'Only verified professionals can see who liked them.' 
    }, { status: 403 })
  }

  // 2. Fetch users who liked/super-liked the current user
  // but whom the current user hasn't swiped on yet (direction is irrelevant for the current user's side)
  const { data: likes, error } = await supabase
    .from('swipes')
    .select(`
      swiper:profiles!swipes_swiper_id_fkey (
        id,
        full_name,
        avatar_url,
        profession
      )
    `)
    .eq('target_id', user.id)
    .in('direction', ['like', 'super_like'])
    // Filter: Exclude users I have already swiped on (already liked or passed)
    .not('swiper_id', 'in', (
      supabase
        .from('swipes')
        .select('target_id')
        .eq('swiper_id', user.id)
    ))

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Flatten the result to return a list of profiles
  const profiles = likes?.map(l => l.swiper).filter(Boolean) || []

  return Response.json(profiles)
}