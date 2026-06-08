import { getAdminUser } from '@/lib/admin'
import { adminSupabase } from '@/lib/supabase/admin'

const CRISIS_WORDS = ['kill myself', 'suicide', 'end my life', 'want to die', 'kms', 'self harm', 'cut myself', 'overdose', 'hurt myself', 'dont want to live']
const THREAT_WORDS = ['kill you', 'hurt you', "i'll kill", 'going to kill', 'gonna kill', 'will hurt you', 'gonna hurt']

function safetyFlag(content: string): 'crisis' | 'threat' | null {
  const lc = content.toLowerCase()
  if (CRISIS_WORDS.some(w => lc.includes(w))) return 'crisis'
  if (THREAT_WORDS.some(w => lc.includes(w))) return 'threat'
  return null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await params

  type ConvRow = { id: string; match_id: string; created_at: string; updated_at: string }

  // Verify conversation exists and get match participants
  const { data: conv, error: convError } = await (adminSupabase
    .from('conversations')
    .select('id, match_id, created_at, updated_at')
    .eq('id', id)
    .single() as unknown as Promise<{ data: ConvRow | null; error: unknown }>)

  if (convError || !conv) return Response.json({ error: 'Conversation not found' }, { status: 404 })

  const { data: match } = await adminSupabase
    .from('matches')
    .select('id, user1_id, user2_id, created_at')
    .eq('id', conv.match_id)
    .single()

  // Get participant profiles
  const participantIds = match ? [match.user1_id, match.user2_id] : []
  const { data: participants } = participantIds.length
    ? await adminSupabase
        .from('profiles')
        .select('id, full_name, avatar_url, profession, category, is_premium, premium_tier, is_verified, is_suspended')
        .in('id', participantIds)
    : { data: [] }

  const profileById = Object.fromEntries((participants ?? []).map(p => [p.id, p]))

  // Fetch all messages, oldest first for thread display
  const { data: messages, error: msgError } = await adminSupabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, is_seen, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  if (msgError) return Response.json({ error: msgError.message }, { status: 500 })

  const enrichedMessages = (messages ?? []).map(msg => ({
    ...msg,
    sender:     profileById[msg.sender_id] ?? null,
    safety_flag: safetyFlag(msg.content),
  }))

  const flaggedCount = enrichedMessages.filter(m => m.safety_flag !== null).length

  return Response.json({
    conversation: conv,
    match,
    participants: participants ?? [],
    messages: enrichedMessages,
    flagged_count: flaggedCount,
  })
}
