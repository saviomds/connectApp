import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('profiles')
    .select('notify_matches, notify_messages, show_read_receipts')
    .eq('id', user.id)
    .single()

  return Response.json({
    notify_matches:     data?.notify_matches     ?? true,
    notify_messages:    data?.notify_messages    ?? true,
    show_read_receipts: data?.show_read_receipts ?? true,
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as Partial<{
    notify_matches: boolean
    notify_messages: boolean
    show_read_receipts: boolean
  }>

  const allowed = ['notify_matches', 'notify_messages', 'show_read_receipts'] as const
  const update: Record<string, boolean> = {}
  for (const key of allowed) {
    if (typeof body[key] === 'boolean') update[key] = body[key] as boolean
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
