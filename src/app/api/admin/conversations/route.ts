import { getAdminUser } from '@/lib/admin'
import { adminSupabase } from '@/lib/supabase/admin'

// Keywords that trigger a safety flag — checked server-side so the list
// never leaks to the client bundle.
const CRISIS_WORDS  = ['kill myself', 'suicide', 'end my life', 'want to die', 'kms', 'self harm', 'cut myself', 'overdose', 'hurt myself', 'dont want to live']
const THREAT_WORDS  = ['kill you', 'hurt you', "i'll kill", 'going to kill', 'gonna kill', 'will hurt you', 'gonna hurt']

function safetyFlag(content: string): 'crisis' | 'threat' | null {
  const lc = content.toLowerCase()
  if (CRISIS_WORDS.some(w => lc.includes(w))) return 'crisis'
  if (THREAT_WORDS.some(w => lc.includes(w))) return 'threat'
  return null
}

export async function GET(request: Request) {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const page      = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit     = 20
  const search    = searchParams.get('search') ?? ''
  const flagged   = searchParams.get('flagged') === 'true'

  // Get conversations with their last message + match details
  const { data: convs, count, error } = await adminSupabase
    .from('conversations')
    .select('id, match_id, created_at, updated_at', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!convs || convs.length === 0) {
    return Response.json({ conversations: [], total: count ?? 0, page })
  }

  // Get match participants
  const matchIds = convs.map(c => c.match_id)
  const { data: matches } = await adminSupabase
    .from('matches')
    .select('id, user1_id, user2_id')
    .in('id', matchIds)

  const matchById = Object.fromEntries((matches ?? []).map(m => [m.id, m]))

  const userIds = [...new Set((matches ?? []).flatMap(m => [m.user1_id, m.user2_id]))]
  const { data: profiles } = await adminSupabase
    .from('profiles')
    .select('id, full_name, avatar_url, profession')
    .in('id', userIds)

  const profileById = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  // Get last message per conversation + check for safety flags
  const convIds = convs.map(c => c.id)
  const { data: allMessages } = await adminSupabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, created_at')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false })

  // Group messages by conversation: last message + flag counts
  const msgMap: Record<string, { last: string; lastAt: string; flagCount: number }> = {}
  for (const msg of allMessages ?? []) {
    const flag = safetyFlag(msg.content)
    if (!msgMap[msg.conversation_id]) {
      msgMap[msg.conversation_id] = { last: msg.content, lastAt: msg.created_at, flagCount: 0 }
    }
    if (flag) msgMap[msg.conversation_id].flagCount++
  }

  let enriched = convs.map(c => {
    const match   = matchById[c.match_id]
    const user1   = match ? profileById[match.user1_id] ?? null : null
    const user2   = match ? profileById[match.user2_id] ?? null : null
    const msgData = msgMap[c.id] ?? { last: null, lastAt: null, flagCount: 0 }

    // Apply search filter
    if (search) {
      const s  = search.toLowerCase()
      const n1 = user1?.full_name?.toLowerCase() ?? ''
      const n2 = user2?.full_name?.toLowerCase() ?? ''
      if (!n1.includes(s) && !n2.includes(s)) return null
    }

    return {
      id:        c.id,
      match_id:  c.match_id,
      updated_at: c.updated_at,
      user1,
      user2,
      last_message:    msgData.last,
      last_message_at: msgData.lastAt,
      flag_count:      msgData.flagCount,
    }
  }).filter(Boolean)

  if (flagged) {
    enriched = enriched.filter(c => (c?.flag_count ?? 0) > 0)
  }

  return Response.json({ conversations: enriched, total: flagged ? enriched.length : (count ?? 0), page })
}
