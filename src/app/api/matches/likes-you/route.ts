import { createClient, getCachedUser } from '@/lib/supabase/server'

interface SwipeRow {
  id: string
  direction: 'like' | 'super_like'
  created_at: string
  swiper: {
    id: string
    full_name: string
    avatar_url: string | null
    profession: string | null
    company: string | null
    city: string | null
    country: string | null
    is_verified: boolean
    is_online: boolean
  }
}

interface MatchRow {
  id: string
  user1_id: string
  user2_id: string
  conversations: { id: string }[]
}

export async function GET() {
  const user = await getCachedUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

  // Fetch all swipes where someone liked the current user
  const { data: swipes, error: swipesErr } = await supabase
    .from('swipes')
    .select(`
      id, direction, created_at,
      swiper:profiles!swipes_swiper_id_fkey(
        id, full_name, avatar_url, profession, company,
        city, country, is_verified, is_online
      )
    `)
    .eq('target_id', user.id)
    .in('direction', ['like', 'super_like'])
    .order('created_at', { ascending: false })

  if (swipesErr) return Response.json({ error: swipesErr.message }, { status: 500 })

  // Fetch existing matches to flag which likers are already matched
  const { data: matchRows } = await supabase
    .from('matches')
    .select('id, user1_id, user2_id, conversations(id)')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

  const matches = (matchRows ?? []) as unknown as MatchRow[]
  const matchedUserIds = new Map<string, { matchId: string; conversationId: string | null }>()
  for (const m of matches) {
    const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id
    matchedUserIds.set(otherId, {
      matchId: m.id,
      conversationId: m.conversations?.[0]?.id ?? null,
    })
  }

  const rows = (swipes ?? []) as unknown as SwipeRow[]
  const result = rows.map(s => {
    const matchInfo = matchedUserIds.get(s.swiper.id) ?? null
    return {
      swipeId: s.id,
      direction: s.direction,
      likedAt: s.created_at,
      profile: s.swiper,
      is_matched: !!matchInfo,
      matchId: matchInfo?.matchId ?? null,
      conversationId: matchInfo?.conversationId ?? null,
    }
  })

  return Response.json(result)
}
