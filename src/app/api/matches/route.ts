import { createClient, getCachedUser } from '@/lib/supabase/server'

interface ProfileRow {
  id: string; full_name: string; avatar_url: string | null
  profession: string | null; company: string | null
  city: string | null; country: string | null
  is_verified: boolean; is_online: boolean
  is_premium: boolean; premium_tier: 'gold' | 'platinum' | null
}

interface MatchRow {
  id: string; created_at: string; expires_at: string | null
  user1_id: string; user2_id: string
  user1: ProfileRow; user2: ProfileRow
  conversations: { id: string }[]
}

export async function GET() {
  const user = await getCachedUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('matches')
    .select(`
      id, created_at, expires_at, user1_id, user2_id,
      user1:profiles!matches_user1_id_fkey(id,full_name,avatar_url,profession,company,city,country,is_verified,is_online,is_premium,premium_tier),
      user2:profiles!matches_user2_id_fkey(id,full_name,avatar_url,profession,company,city,country,is_verified,is_online,is_premium,premium_tier),
      conversations(id)
    `)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const now = new Date()

  const matches = (data as unknown as MatchRow[])
    .filter(m => !m.expires_at || new Date(m.expires_at) > now)
    .map(m => ({
      id:             m.id,
      conversationId: m.conversations?.[0]?.id ?? null,
      created_at:     m.created_at,
      expires_at:     m.expires_at,
      profile:        m.user1_id === user.id ? m.user2 : m.user1,
    }))

  return Response.json(matches)
}
