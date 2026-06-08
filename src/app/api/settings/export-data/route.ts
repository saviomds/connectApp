import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = user.id

  const [
    { data: profile },
    { data: matches },
    { data: messages },
    { data: swipes },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', uid).single(),
    supabase.from('matches').select('*').or(`user1_id.eq.${uid},user2_id.eq.${uid}`),
    supabase.from('messages').select('id, content, created_at, is_seen, safety_flag').eq('sender_id', uid).order('created_at'),
    supabase.from('swipes').select('target_id, direction, created_at').eq('swiper_id', uid),
  ])

  const export_data = {
    exported_at: new Date().toISOString(),
    account: {
      id: uid,
      email: user.email,
    },
    profile: profile ?? null,
    matches: matches ?? [],
    messages_sent: messages ?? [],
    swipes: swipes ?? [],
  }

  // Strip sensitive internal fields from profile
  if (export_data.profile) {
    const { is_suspended, admin_notes, ...safeProfile } = export_data.profile as Record<string, unknown> & {
      is_suspended?: unknown; admin_notes?: unknown
    }
    void is_suspended; void admin_notes
    export_data.profile = safeProfile as typeof export_data.profile
  }

  const json = JSON.stringify(export_data, null, 2)
  const filename = `vibro-data-export-${new Date().toISOString().slice(0, 10)}.json`

  return new Response(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
