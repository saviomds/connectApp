import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!svcKey || svcKey === 'your_supabase_service_role_key_here') return null
  return createServiceClient(url, svcKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

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

  const { user1_id, user2_id } = conv.match
  const db = getServiceClient() ?? supabase

  // Delete the match — cascades to conversation and all messages
  const { error } = await db
    .from('matches')
    .delete()
    .eq('id', conv.match_id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Clear swipes so both users can rediscover each other
  await db
    .from('swipes')
    .delete()
    .or(
      `and(swiper_id.eq.${user1_id},target_id.eq.${user2_id}),` +
      `and(swiper_id.eq.${user2_id},target_id.eq.${user1_id})`
    )

  return Response.json({ ok: true })
}
