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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Read match to verify participation (SELECT RLS policy allows this)
  const { data: match, error: fetchErr } = await supabase
    .from('matches')
    .select('id, user1_id, user2_id')
    .eq('id', id)
    .single()

  if (fetchErr || !match) return Response.json({ error: 'Match not found' }, { status: 404 })
  if (match.user1_id !== user.id && match.user2_id !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { user1_id, user2_id } = match

  // Delete the match using the auth client — the participant-delete RLS policy
  // allows user1 or user2 to delete. Conversation cascades via FK.
  const { error: matchErr } = await supabase
    .from('matches')
    .delete()
    .eq('id', id)

  if (matchErr) {
    console.error('[unmatch] match delete failed:', matchErr.message)

    // If the auth client failed (RLS not applied yet in the DB), try service role
    const svc = getServiceClient()
    if (!svc) return Response.json({ error: matchErr.message }, { status: 500 })

    const { error: svcErr } = await svc.from('matches').delete().eq('id', id)
    if (svcErr) {
      console.error('[unmatch] service-role delete also failed:', svcErr.message)
      return Response.json({ error: svcErr.message }, { status: 500 })
    }
  }

  // Delete swipes in both directions using service role (needs cross-user access)
  // Falls back to auth client if service role unavailable — will only delete own swipe.
  const db = getServiceClient() ?? supabase

  await db.from('swipes').delete()
    .eq('swiper_id', user1_id)
    .eq('target_id', user2_id)

  await db.from('swipes').delete()
    .eq('swiper_id', user2_id)
    .eq('target_id', user1_id)

  return Response.json({ ok: true })
}
