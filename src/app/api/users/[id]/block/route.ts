import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: blockedId } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.id === blockedId) {
    return Response.json({ error: 'Cannot block yourself' }, { status: 400 })
  }

  // Insert block
  const { error: blockError } = await supabase
    .from('blocks')
    .insert({ blocker_id: user.id, blocked_id: blockedId })

  if (blockError && blockError.code !== '23505') {
    return Response.json({ error: blockError.message }, { status: 500 })
  }

  // Delete any mutual match (both orderings)
  const uid1 = user.id < blockedId ? user.id : blockedId
  const uid2 = user.id < blockedId ? blockedId : user.id

  await supabase
    .from('matches')
    .delete()
    .eq('user1_id', uid1)
    .eq('user2_id', uid2)

  return Response.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: blockedId } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
