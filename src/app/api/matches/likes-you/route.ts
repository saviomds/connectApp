import { getCachedUser, createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Service role bypasses the "swipes: own read" RLS policy which only
// allows reading swipes you SENT. To read swipes aimed AT you we need
// to bypass RLS, falling back to the regular client (returns empty) if
// the key is not configured.
function getDb() {
  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (svcKey && svcKey !== 'your_supabase_service_role_key_here') {
    return createServiceClient(url, svcKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return null
}

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

  // Use service role to read swipes where this user is the TARGET —
  // the default RLS policy only exposes swipes the caller sent.
  const db = getDb()
  const supabase = await createClient()   // used for matches (RLS allows participant read)

  if (!db) {
    // Service role key not configured — fall back gracefully
    return Response.json([])
  }

  // All likes/super_likes aimed at this user, with liker's public profile
  const { data: swipes, error: swipesErr } = await db
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

  // Cross-reference existing matches so the UI can show "Matched" badge + Chat button
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
      swipeId:        s.id,
      direction:      s.direction,
      likedAt:        s.created_at,
      profile:        s.swiper,
      is_matched:     !!matchInfo,
      matchId:        matchInfo?.matchId ?? null,
      conversationId: matchInfo?.conversationId ?? null,
    }
  })

  return Response.json(result)
}
