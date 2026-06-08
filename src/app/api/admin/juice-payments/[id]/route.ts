import { getAdminUser } from '@/lib/admin'
import { adminSupabase } from '@/lib/supabase/admin'
import { tierFromPlanId, isProfessionalPlan, type PlanId } from '@/lib/stripe'
import { sendPushToUser } from '@/lib/send-push'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { status, admin_notes } = await request.json() as {
    status: 'approved' | 'rejected'
    admin_notes?: string
  }

  if (!['approved', 'rejected'].includes(status)) {
    return Response.json({ error: 'status must be approved or rejected' }, { status: 400 })
  }

  const { data: submission, error: fetchErr } = await adminSupabase
    .from('juice_payment_submissions')
    .select('user_id, plan_id, status')
    .eq('id', id)
    .single()

  if (fetchErr || !submission) {
    return Response.json({ error: 'Submission not found' }, { status: 404 })
  }

  if (submission.status !== 'pending') {
    return Response.json({ error: 'Submission already reviewed' }, { status: 400 })
  }

  const { error: updateErr } = await adminSupabase
    .from('juice_payment_submissions')
    .update({
      status,
      admin_notes: admin_notes ?? null,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateErr) {
    return Response.json({ error: updateErr.message }, { status: 500 })
  }

  const planId = submission.plan_id as PlanId

  if (status === 'approved') {
    if (isProfessionalPlan(planId)) {
      await adminSupabase
        .from('profiles')
        .update({ is_professional: true })
        .eq('id', submission.user_id)
    } else {
      const tier = tierFromPlanId(planId)
      await adminSupabase
        .from('profiles')
        .update({ is_premium: true, premium_tier: tier })
        .eq('id', submission.user_id)
    }

    await adminSupabase.from('notifications').insert({
      user_id: submission.user_id,
      type: 'premium',
      data: { plan_id: planId, source: 'juice_payment' },
    })

    sendPushToUser(submission.user_id, {
      title: 'Payment Approved! 👑',
      body: 'Your Juice payment has been verified. Your plan is now active!',
      url: '/premium',
    }).catch(() => {})
  } else {
    await adminSupabase.from('notifications').insert({
      user_id: submission.user_id,
      type: 'info',
      data: { kind: 'juice_payment_rejected', plan_id: planId, notes: admin_notes ?? '' },
    })

    sendPushToUser(submission.user_id, {
      title: 'Payment Verification Update',
      body: admin_notes || 'Your payment proof was not approved. Please resubmit or contact support.',
      url: '/premium',
    }).catch(() => {})
  }

  return Response.json({ ok: true })
}
