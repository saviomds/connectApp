import { createClient } from '@/lib/supabase/server'

interface ConvRow {
  match_id: string
  match: { user1_id: string; user2_id: string }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve conversation (by conv id or match_id)
  let result = await supabase
    .from('conversations')
    .select('match_id, match:matches!conversations_match_id_fkey(user1_id, user2_id)')
    .eq('id', id)
    .single()

  if (result.error || !result.data) {
    result = await supabase
      .from('conversations')
      .select('match_id, match:matches!conversations_match_id_fkey(user1_id, user2_id)')
      .eq('match_id', id)
      .single()
  }

  if (result.error || !result.data) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const conv = result.data as unknown as ConvRow
  if (conv.match.user1_id !== user.id && conv.match.user2_id !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete the match – cascades to conversation and all messages
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', conv.match_id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
