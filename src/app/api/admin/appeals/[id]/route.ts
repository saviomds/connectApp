import { getAdminUser } from '@/lib/admin'
import { adminSupabase } from '@/lib/supabase/admin'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  let body: { status: 'approved' | 'rejected'; admin_response?: string }
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!['approved', 'rejected'].includes(body.status)) {
    return Response.json({ error: 'status must be approved or rejected' }, { status: 400 })
  }

  const { data: appeal, error: fetchErr } = await adminSupabase
    .from('suspension_appeals')
    .select('user_id')
    .eq('id', id)
    .single()

  if (fetchErr || !appeal) return Response.json({ error: 'Appeal not found' }, { status: 404 })

  const { error: updateErr } = await adminSupabase
    .from('suspension_appeals')
    .update({
      status: body.status,
      admin_response: body.admin_response ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 })

  // If approved, lift the suspension
  if (body.status === 'approved') {
    await adminSupabase.from('profiles').update({ is_suspended: false }).eq('id', appeal.user_id)
  }

  return Response.json({ ok: true })
}
