import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  const { id, msgId } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { action: 'delete' | 'view_once' | 'edit'; content?: string }

  // Fetch the message with conversation participant check
  const { data: msg, error: msgError } = await supabase
    .from('messages')
    .select('id, sender_id, is_view_once, viewed_at, conversation_id')
    .eq('id', msgId)
    .single()

  if (msgError || !msg) return Response.json({ error: 'Not found' }, { status: 404 })

  // Verify user is a participant in this conversation
  const { data: conv } = await supabase
    .from('conversations')
    .select('match:matches!conversations_match_id_fkey(user1_id, user2_id)')
    .eq('id', msg.conversation_id)
    .single()

  const match = conv?.match as unknown as { user1_id: string; user2_id: string } | null
  if (!match || (match.user1_id !== user.id && match.user2_id !== user.id)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (body.action === 'delete') {
    // Only sender can soft-delete their own message
    if (msg.sender_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { data, error } = await supabase
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', msgId)
      .select()
      .single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  }

  if (body.action === 'view_once') {
    // Only receiver can mark as viewed; only once
    if (msg.sender_id === user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!msg.is_view_once) {
      return Response.json({ error: 'Not a view-once message' }, { status: 400 })
    }
    if (msg.viewed_at) {
      return Response.json({ error: 'Already viewed' }, { status: 409 })
    }
    const { data, error } = await supabase
      .from('messages')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', msgId)
      .select()
      .single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  }

  if (body.action === 'edit') {
    if (msg.sender_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })
    const content = (body.content ?? '').trim()
    if (!content || content.length > 4000) return Response.json({ error: 'Invalid content' }, { status: 400 })
    const { data, error } = await supabase
      .from('messages')
      .update({ content, edited_at: new Date().toISOString() })
      .eq('id', msgId)
      .select()
      .single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 })
}
