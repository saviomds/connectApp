import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const FREE_DAILY_LIMIT = 10

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

  // ── Daily like limit for free users ──────────────────────────
  // Only count likes / super_likes (passes are unlimited)
  if (direction === 'like' || direction === 'super_like') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single()

    if (!profile?.is_premium) {
      const todayStart = new Date()
      todayStart.setUTCHours(0, 0, 0, 0)

      const { count } = await supabase
        .from('swipes')
        .select('id', { count: 'exact', head: true })
        .eq('swiper_id', user.id)
        .in('direction', ['like', 'super_like'])
        .gte('created_at', todayStart.toISOString())

      const used = count ?? 0

      if (used >= FREE_DAILY_LIMIT) {
        return Response.json(
          { error: 'Daily like limit reached', limitReached: true, remainingSwipes: 0 },
          { status: 429 }
        )
      }

      // After this swipe, remaining will be:
      const remainingAfter = FREE_DAILY_LIMIT - used - 1

      // Record the swipe (same logic below but return remaining count)
      await supabase.from('swipes').delete().eq('swiper_id', user.id).eq('target_id', target_id)

      const { data, error } = await supabase
        .from('swipes')
        .insert({ swiper_id: user.id, target_id, direction })
        .select()
        .single()

      revalidatePath('/', 'layout')

      if (error) return Response.json({ error: error.message }, { status: 500 })

      let matched = false
      const uid1 = user.id < target_id ? user.id : target_id
      const uid2 = user.id < target_id ? target_id : user.id
      const { data: matchData } = await supabase
        .from('matches').select('id').eq('user1_id', uid1).eq('user2_id', uid2).maybeSingle()
      matched = !!matchData

      return Response.json({
        swipe: data,
        matched,
        remainingSwipes: remainingAfter,
        limitReached: remainingAfter <= 0,
      })
    }
  }

  // ── Premium / pass path — no limit ───────────────────────────
  await supabase.from('swipes').delete().eq('swiper_id', user.id).eq('target_id', target_id)

  const { data, error } = await supabase
    .from('swipes')
    .insert({ swiper_id: user.id, target_id, direction })
    .select()
    .single()

  revalidatePath('/', 'layout')

  if (error) return Response.json({ error: error.message }, { status: 500 })

  let matched = false
  if (direction === 'like' || direction === 'super_like') {
    const uid1 = user.id < target_id ? user.id : target_id
    const uid2 = user.id < target_id ? target_id : user.id
    const { data: matchData } = await supabase
      .from('matches').select('id').eq('user1_id', uid1).eq('user2_id', uid2).maybeSingle()
    matched = !!matchData
  }

  return Response.json({ swipe: data, matched, remainingSwipes: null, limitReached: false })
}

/** GET /api/swipes — return today's remaining like count */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_premium').eq('id', user.id).single()

  if (profile?.is_premium) {
    return Response.json({ remainingSwipes: null, isPremium: true })
  }

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('swipes')
    .select('id', { count: 'exact', head: true })
    .eq('swiper_id', user.id)
    .in('direction', ['like', 'super_like'])
    .gte('created_at', todayStart.toISOString())

  const used = count ?? 0
  return Response.json({
    remainingSwipes: Math.max(0, FREE_DAILY_LIMIT - used),
    isPremium: false,
  })
}
