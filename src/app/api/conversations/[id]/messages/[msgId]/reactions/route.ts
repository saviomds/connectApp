import { createClient } from '@/lib/supabase/server'

const ALLOWED_EMOJIS = new Set(['❤️', '😂', '🔥', '😮', '👏', '💯'])

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  const { msgId } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { emoji?: string }
  const emoji = body.emoji?.trim()
  if (!emoji || !ALLOWED_EMOJIS.has(emoji)) {
    return Response.json({ error: 'Invalid emoji' }, { status: 400 })
  }

  // Fetch message + verify conversation participant
  const { data: msg, error: msgError } = await supabase
    .from('messages')
    .select('id, conversation_id, reactions')
    .eq('id', msgId)
    .single()

  if (msgError || !msg) return Response.json({ error: 'Not found' }, { status: 404 })

  const { data: conv } = await supabase
    .from('conversations')
    .select('match:matches!conversations_match_id_fkey(user1_id, user2_id)')
    .eq('id', msg.conversation_id)
    .single()

  const match = conv?.match as unknown as { user1_id: string; user2_id: string } | null
  if (!match || (match.user1_id !== user.id && match.user2_id !== user.id)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Toggle reaction: add if not present, remove if already there
  const current = (msg.reactions ?? {}) as Record<string, string[]>
  const users: string[] = current[emoji] ?? []
  const already = users.includes(user.id)

  let updated: Record<string, string[]>
  if (already) {
    const next = users.filter(id => id !== user.id)
    updated = { ...current }
    if (next.length === 0) delete updated[emoji]
    else updated[emoji] = next
  } else {
    updated = { ...current, [emoji]: [...users, user.id] }
  }

  const { data, error } = await supabase
    .from('messages')
    .update({ reactions: updated })
    .eq('id', msgId)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
