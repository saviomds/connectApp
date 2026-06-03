import { createClient } from '@/lib/supabase/server'

interface ProfileRow {
  id: string; full_name: string; avatar_url: string | null
  is_online: boolean; is_verified: boolean; is_premium: boolean
  premium_tier: 'gold' | 'platinum' | null
  profession: string | null; company: string | null
}
interface MatchRow { user1_id: string; user2_id: string; user1: ProfileRow; user2: ProfileRow }
interface MsgRow { id: string; content: string; sender_id: string; is_seen: boolean; created_at: string }
interface ConvRow { id: string; match_id: string; updated_at: string; created_at: string; match: MatchRow; messages: MsgRow[] }

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      match_id,
      updated_at,
      created_at,
      match:matches!conversations_match_id_fkey(
        user1_id,
        user2_id,
        user1:profiles!matches_user1_id_fkey(id,full_name,avatar_url,is_online,is_verified,is_premium,premium_tier,profession,company),
        user2:profiles!matches_user2_id_fkey(id,full_name,avatar_url,is_online,is_verified,is_premium,premium_tier,profession,company)
      ),
      messages(id,content,sender_id,is_seen,created_at)
    `)
    .order('updated_at', { ascending: false })
    .order('created_at', { referencedTable: 'messages', ascending: false })
    .limit(30, { referencedTable: 'messages' })
    .limit(100)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const rows = data as unknown as ConvRow[]

  const conversations = rows
    .filter((c) => c.match?.user1_id === user.id || c.match?.user2_id === user.id)
    .map((c) => {
      const match = c.match
      const otherProfile = match.user1_id === user.id ? match.user2 : match.user1
      const msgs = (c.messages ?? []).sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      const lastMsg  = msgs[0]
      const unread   = msgs.filter((m) => !m.is_seen && m.sender_id !== user.id).length

      return {
        id:                     c.id,
        match_id:               c.match_id,
        updated_at:             c.updated_at,
        created_at:             c.created_at,
        other_profile:          otherProfile,
        last_message:           lastMsg?.content ?? null,
        last_message_at:        lastMsg?.created_at ?? null,
        last_message_sender_id: lastMsg?.sender_id ?? null,
        unread_count:           unread,
      }
    })

  return Response.json(conversations)
}

/** POST /api/conversations — get-or-create a conversation for a match */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId } = await request.json()
  if (!matchId) return Response.json({ error: 'matchId required' }, { status: 400 })

  // Verify the match belongs to the current user
  const { data: match } = await supabase
    .from('matches')
    .select('id')
    .eq('id', matchId)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .single()
  if (!match) return Response.json({ error: 'Match not found' }, { status: 404 })

  // Check for existing conversation
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('match_id', matchId)
    .maybeSingle()
  if (existing) return Response.json({ conversationId: existing.id })

  // Create new conversation
  const { data: created, error: createErr } = await supabase
    .from('conversations')
    .insert({ match_id: matchId })
    .select('id')
    .single()
  if (createErr) return Response.json({ error: createErr.message }, { status: 500 })

  return Response.json({ conversationId: created.id })
}
