import { getAdminUser } from '@/lib/admin'
import { adminSupabase } from '@/lib/supabase/admin'

export async function POST() {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  // Remove all 'pass' swipes — users who were passed on appear in discovery again
  const { error: passErr } = await adminSupabase
    .from('swipes')
    .delete()
    .eq('direction', 'pass')

  if (passErr) return Response.json({ error: passErr.message }, { status: 500 })

  // Remove all blocks — blocked users appear in discovery again
  const { error: blockErr } = await adminSupabase
    .from('blocks')
    .delete()
    .not('id', 'is', null)

  if (blockErr) return Response.json({ error: blockErr.message }, { status: 500 })

  return Response.json({ ok: true })
}
