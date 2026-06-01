import { getAdminUser } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

type Action =
  | { action: 'verify';     value: boolean }
  | { action: 'suspend';    value: boolean }
  | { action: 'premium';    tier: 'gold' | 'platinum' | null }
  | { action: 'make_admin'; value: boolean }

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json() as Action
  let update: Record<string, unknown> = {}

  switch (body.action) {
    case 'verify':
      update = { is_verified: body.value }
      break
    case 'suspend':
      update = { is_suspended: body.value }
      break
    case 'premium':
      update = body.tier
        ? { is_premium: true,  premium_tier: body.tier }
        : { is_premium: false, premium_tier: null }
      break
    case 'make_admin':
      if (!body.value && id === admin.id) {
        return Response.json({ error: 'Cannot remove your own admin access' }, { status: 400 })
      }
      update = { is_admin: body.value }
      break
    default:
      return Response.json({ error: 'Unknown action' }, { status: 400 })
  }

  // Use server-side client — admin's own UPDATE RLS allows this
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (id === admin.id) return Response.json({ error: 'Cannot delete your own account' }, { status: 400 })

  const supabase = await createClient()
  await supabase.from('profiles').delete().eq('id', id)

  // Hard-delete from auth.users — still needs service role (graceful fail if missing)
  try {
    await adminSupabase.auth.admin.deleteUser(id)
  } catch {
    // Service role not configured — profile row is deleted, auth row will cascade on next login
  }

  return Response.json({ ok: true })
}
