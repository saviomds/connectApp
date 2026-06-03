import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const FREE_DAILY_LIMIT       = 10
const FREE_SUPER_DAILY_LIMIT  = 1
const GOLD_SUPER_DAILY_LIMIT  = 5

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { target_id, direction } = await request.json()
  if (!target_id || !direction)
    return Response.json({ error: 'target_id and direction are required' }, { status: 400 })
  if (!['like', 'pass', 'super_like'].includes(direction))
    return Response.json({ error: 'Invalid direction' }, { status: 400 })
  if (target_id === user.id)
    return Response.json({ error: 'Cannot swipe on yourself' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium, premium_tier')
    .eq('id', user.id)
    .single()

  const isPremium   = !!profile?.is_premium
  const premiumTier = profile?.premium_tier ?? null // 'gold' | 'platinum' | null

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayISO = todayStart.toISOString()

  // ── Super-like daily limit (all tiers) ─────────────────────────
  if (direction === 'super_like' && premiumTier !== 'platinum') {
    const superLimit = premiumTier === 'gold' ? GOLD_SUPER_DAILY_LIMIT : FREE_SUPER_DAILY_LIMIT
    const { count: superUsed } = await supabase
      .from('swipes')
      .select('id', { count: 'exact', head: true })
      .eq('swiper_id', user.id)
      .eq('direction', 'super_like')
      .gte('created_at', todayISO)

    if ((superUsed ?? 0) >= superLimit) {
      return Response.json(
        { error: 'Super like limit reached', superLimitReached: true, remainingSuperLikes: 0 },
        { status: 429 }
      )
    }
  }

  // ── Regular like daily limit for free users ────────────────────
  if ((direction === 'like' || direction === 'super_like') && !isPremium) {
    const { count } = await supabase
      .from('swipes')
      .select('id', { count: 'exact', head: true })
      .eq('swiper_id', user.id)
      .in('direction', ['like', 'super_like'])
      .gte('created_at', todayISO)

    const used = count ?? 0
    if (used >= FREE_DAILY_LIMIT) {
      return Response.json(
        { error: 'Daily like limit reached', limitReached: true, remainingSwipes: 0 },
        { status: 429 }
      )
    }

    await supabase.from('swipes').delete().eq('swiper_id', user.id).eq('target_id', target_id)
    const { data, error } = await supabase
      .from('swipes').insert({ swiper_id: user.id, target_id, direction }).select().single()
    revalidatePath('/', 'layout')
    if (error) return Response.json({ error: error.message }, { status: 500 })

    const remainingAfter = FREE_DAILY_LIMIT - used - 1

    const uid1 = user.id < target_id ? user.id : target_id
    const uid2 = user.id < target_id ? target_id : user.id
    const { data: matchData } = await supabase
      .from('matches').select('id').eq('user1_id', uid1).eq('user2_id', uid2).maybeSingle()

    // Remaining super likes for free user
    const { count: superUsed } = await supabase
      .from('swipes')
      .select('id', { count: 'exact', head: true })
      .eq('swiper_id', user.id)
      .eq('direction', 'super_like')
      .gte('created_at', todayISO)
    const remainingSuperLikes = Math.max(0, FREE_SUPER_DAILY_LIMIT - (superUsed ?? 0))

    return Response.json({
      swipe: data,
      matched: !!matchData,
      remainingSwipes: remainingAfter,
      remainingSuperLikes,
      limitReached: remainingAfter <= 0,
    })
  }

  // ── Premium / pass path — no regular like limit ────────────────
  await supabase.from('swipes').delete().eq('swiper_id', user.id).eq('target_id', target_id)
  const { data, error } = await supabase
    .from('swipes').insert({ swiper_id: user.id, target_id, direction }).select().single()
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

  // Remaining super likes for gold users
  let remainingSuperLikes: number | null = null
  if (premiumTier === 'gold') {
    const { count: superUsed } = await supabase
      .from('swipes')
      .select('id', { count: 'exact', head: true })
      .eq('swiper_id', user.id)
      .eq('direction', 'super_like')
      .gte('created_at', todayISO)
    remainingSuperLikes = Math.max(0, GOLD_SUPER_DAILY_LIMIT - (superUsed ?? 0))
  }

  return Response.json({
    swipe: data,
    matched,
    remainingSwipes: null,
    remainingSuperLikes,
    limitReached: false,
  })
}

/** GET /api/swipes — return today's remaining counts */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_premium, premium_tier').eq('id', user.id).single()

  const isPremium   = !!profile?.is_premium
  const premiumTier = (profile?.premium_tier ?? null) as 'gold' | 'platinum' | null

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayISO = todayStart.toISOString()

  // Super like counts (all tiers)
  const { count: superUsed } = await supabase
    .from('swipes')
    .select('id', { count: 'exact', head: true })
    .eq('swiper_id', user.id)
    .eq('direction', 'super_like')
    .gte('created_at', todayISO)

  let remainingSuperLikes: number | null = null
  if (premiumTier === 'platinum') {
    remainingSuperLikes = null // unlimited
  } else if (premiumTier === 'gold') {
    remainingSuperLikes = Math.max(0, GOLD_SUPER_DAILY_LIMIT - (superUsed ?? 0))
  } else {
    remainingSuperLikes = Math.max(0, FREE_SUPER_DAILY_LIMIT - (superUsed ?? 0))
  }

  if (isPremium) {
    return Response.json({ remainingSwipes: null, remainingSuperLikes, isPremium: true, premiumTier })
  }

  const { count } = await supabase
    .from('swipes')
    .select('id', { count: 'exact', head: true })
    .eq('swiper_id', user.id)
    .in('direction', ['like', 'super_like'])
    .gte('created_at', todayISO)

  const used = count ?? 0
  return Response.json({
    remainingSwipes: Math.max(0, FREE_DAILY_LIMIT - used),
    remainingSuperLikes,
    isPremium: false,
    premiumTier: null,
  })
}
