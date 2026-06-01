import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { target_id, direction } = await request.json()

  if (!target_id || !direction) {
    return Response.json({ error: 'target_id and direction are required' }, { status: 400 })
  }

  if (!['like', 'pass', 'super_like'].includes(direction)) {
    return Response.json({ error: 'Invalid direction' }, { status: 400 })
  }

  if (target_id === user.id) {
    return Response.json({ error: 'Cannot swipe on yourself' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('swipes')
    .upsert({ swiper_id: user.id, target_id, direction }, { onConflict: 'swiper_id,target_id' })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Check if a match was created
  let matched = false
  if (direction === 'like' || direction === 'super_like') {
    const uid1 = user.id < target_id ? user.id : target_id
    const uid2 = user.id < target_id ? target_id : user.id
    const { data: matchData } = await supabase
      .from('matches')
      .select('id')
      .eq('user1_id', uid1)
      .eq('user2_id', uid2)
      .maybeSingle()
    matched = !!matchData
  }

  return Response.json({ swipe: data, matched })
}
