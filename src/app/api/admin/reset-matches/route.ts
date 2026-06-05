import { getAdminUser } from '@/lib/admin'
import { adminSupabase } from '@/lib/supabase/admin'

export async function POST() {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  // Delete all swipes — this restores full discovery for every user
  const { error: swipeErr } = await adminSupabase
    .from('swipes')
    .delete()
    .not('id', 'is', null)

  if (swipeErr) return Response.json({ error: swipeErr.message }, { status: 500 })

  // Delete all matches — cascades into conversations then messages via FK
  const { error: matchErr } = await adminSupabase
    .from('matches')
    .delete()
    .not('id', 'is', null)

  if (matchErr) return Response.json({ error: matchErr.message }, { status: 500 })

  // Clean up stale match notifications
  await adminSupabase.from('notifications').delete().eq('type', 'match')

  return Response.json({ ok: true })
}
