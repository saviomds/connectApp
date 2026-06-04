import { createClient } from '@/lib/supabase/server'

const BOOLEAN_PREFS = ['notify_matches', 'notify_messages', 'show_read_receipts', 'notify_sms', 'free_tonight'] as const
const STRING_PREFS  = ['show_gender', 'discovery_city', 'discovery_country'] as const
const ALLOWED_GENDER = new Set(['everyone', 'men', 'women'])

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('profiles')
    .select('notify_matches, notify_messages, show_read_receipts, notify_sms, free_tonight, show_gender, discovery_city, discovery_country')
    .eq('id', user.id)
    .single()

  return Response.json({
    notify_matches:     data?.notify_matches     ?? true,
    notify_messages:    data?.notify_messages    ?? true,
    show_read_receipts: data?.show_read_receipts ?? true,
    notify_sms:         data?.notify_sms         ?? false,
    free_tonight:       data?.free_tonight        ?? false,
    show_gender:        data?.show_gender         ?? 'everyone',
    discovery_city:     data?.discovery_city      ?? '',
    discovery_country:  data?.discovery_country   ?? '',
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as Record<string, unknown>
  const update: Record<string, unknown> = {}

  for (const key of BOOLEAN_PREFS) {
    if (typeof body[key] === 'boolean') update[key] = body[key]
  }
  for (const key of STRING_PREFS) {
    if (typeof body[key] === 'string') {
      if (key === 'show_gender' && !ALLOWED_GENDER.has(body[key] as string)) continue
      update[key] = body[key]
    }
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', user.id)

  if (updateError) return Response.json({ error: updateError.message }, { status: 500 })
  return Response.json({ ok: true, updated: update })
}
