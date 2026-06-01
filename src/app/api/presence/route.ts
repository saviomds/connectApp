import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { online } = await request.json() as { online: boolean }

  // Use the upsert_presence DB function instead of a raw upsert.
  // Benefits:
  //   - Only updates is_online + last_seen_at (never touches name/bio/etc.)
  //   - Only fires a Realtime event when online state actually flips (not every 45s)
  const { error } = await supabase.rpc('upsert_presence', {
    p_user_id: user.id,
    p_online:  online,
  })

  if (error) {
    // Fallback: direct update if the RPC doesn't exist yet (before presence.sql is run)
    await supabase
      .from('profiles')
      .update({ is_online: online, last_seen_at: new Date().toISOString() })
      .eq('id', user.id)
  }

  return Response.json({ ok: true })
}
