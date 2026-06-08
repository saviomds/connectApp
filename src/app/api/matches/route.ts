import { createClient, getCachedUser } from '@/lib/supabase/server'

interface ProfileRow {
  id: string; full_name: string; avatar_url: string | null
  profession: string | null; company: string | null
  city: string | null; country: string | null
  is_verified: boolean; is_online: boolean
  is_premium: boolean; premium_tier: 'gold' | 'platinum' | null
  interests: string[]; looking_for: string | null; age: number | null
}

interface MatchRow {
  id: string; created_at: string; expires_at: string | null
  user1_id: string; user2_id: string
  user1: ProfileRow; user2: ProfileRow
  conversations: { id: string }[]
}

function compatibilityScore(a: ProfileRow, b: ProfileRow): number {
  let score = 0
  // Shared interests (up to 50 pts)
  const sharedInterests = (a.interests ?? []).filter(i => (b.interests ?? []).includes(i)).length
  score += Math.min(sharedInterests * 10, 50)
  // Same city (15 pts)
  if (a.city && b.city && a.city.toLowerCase() === b.city.toLowerCase()) score += 15
  // Same looking_for (20 pts) — needs both to have it set
  if (a.looking_for && b.looking_for && a.looking_for === b.looking_for) score += 20
  // Age proximity — within 5 years (15 pts)
  if (a.age && b.age && Math.abs(a.age - b.age) <= 5) score += 15
  return Math.min(score, 100)
}

export async function GET() {
  const user = await getCachedUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

  // Fetch current user's profile for compatibility scoring
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('interests, looking_for, age, city')
    .eq('id', user.id)
    .single()

  const { data, error } = await supabase
    .from('matches')
    .select(`
      id, created_at, expires_at, user1_id, user2_id,
      user1:profiles!matches_user1_id_fkey(id,full_name,avatar_url,profession,company,city,country,is_verified,is_online,is_premium,premium_tier,interests,looking_for,age),
      user2:profiles!matches_user2_id_fkey(id,full_name,avatar_url,profession,company,city,country,is_verified,is_online,is_premium,premium_tier,interests,looking_for,age),
      conversations(id)
    `)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const now = new Date()
  const me = myProfile as unknown as ProfileRow | null

  const matches = (data as unknown as MatchRow[])
    .filter(m => !m.expires_at || new Date(m.expires_at) > now)
    .map(m => {
      const profile = m.user1_id === user.id ? m.user2 : m.user1
      return {
        id:             m.id,
        conversationId: m.conversations?.[0]?.id ?? null,
        created_at:     m.created_at,
        expires_at:     m.expires_at,
        compatibility:  me ? compatibilityScore(me, profile) : null,
        profile,
      }
    })

  return Response.json(matches)
}
