import { getAdminUser } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/send-push'
import { sendVerificationEmail } from '@/lib/send-email'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { action, note } = await request.json() as { action: 'approve' | 'reject'; note?: string }

  if (!['approve', 'reject'].includes(action)) {
    return Response.json({ error: 'action must be approve or reject' }, { status: 400 })
  }

  // Use regular server client (admin session) for reading + updating verification_requests
  const supabase = await createClient()

  const { data: req, error: fetchErr } = await supabase
    .from('verification_requests')
    .select('user_id, category')
    .eq('id', id)
    .single()

  if (fetchErr || !req) return Response.json({ error: 'Not found' }, { status: 404 })

  const newStatus = action === 'approve' ? 'approved' : 'rejected'

  await supabase
    .from('verification_requests')
    .update({
      status:       newStatus,
      admin_note:   note ?? null,
      reviewed_at:  new Date().toISOString(),
    })
    .eq('id', id)

  // For profile updates we prefer service role (bypasses RLS on profiles)
  // Fall back gracefully to regular client if service role key isn't configured
  let db: Awaited<ReturnType<typeof createClient>> | typeof adminSupabase
  try {
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (svcKey && svcKey !== 'your_supabase_service_role_key_here') {
      db = adminSupabase as unknown as typeof supabase
    } else {
      db = supabase
    }
  } catch {
    db = supabase
  }

  if (action === 'approve') {
    await supabase
      .from('profiles')
      .update({
        is_verified:         true,
        verification_status: 'approved',
        category:            req.category,
      })
      .eq('id', req.user_id)

    await supabase.from('notifications').insert({
      user_id: req.user_id,
      type:    'premium',
      data:    { kind: 'verification_approved', category: req.category },
    })
    sendPushToUser(req.user_id, {
      title: 'Verification Approved ✅',
      body:  'Your profile has been verified! You now have Level 3 access.',
      url:   '/profile',
    }).catch(() => {})
    sendVerificationEmail(req.user_id, true).catch(() => {})
  } else {
    await supabase
      .from('profiles')
      .update({ verification_status: 'rejected' })
      .eq('id', req.user_id)

    await supabase.from('notifications').insert({
      user_id: req.user_id,
      type:    'premium',
      data:    { kind: 'verification_rejected', note: note ?? '' },
    })
    sendPushToUser(req.user_id, {
      title: 'Verification Update',
      body:  note ? `Your verification was not approved: ${note}` : 'Your verification request was not approved.',
      url:   '/profile',
    }).catch(() => {})
    sendVerificationEmail(req.user_id, false, note).catch(() => {})
  }

  return Response.json({ ok: true, status: newStatus })
}
