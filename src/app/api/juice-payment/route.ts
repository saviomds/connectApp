import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const VALID_PLANS = [
  'gold_monthly', 'gold_yearly',
  'platinum_monthly', 'platinum_yearly',
  'professional_monthly',
]

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await request.formData()
  const planId    = form.get('plan_id') as string | null
  const fullName  = (form.get('full_name') as string | null)?.trim()
  const email     = (form.get('email') as string | null)?.trim()
  const phone     = (form.get('phone') as string | null)?.trim()
  const txnRef    = (form.get('txn_ref') as string | null)?.trim() || null
  const screenshot = form.get('screenshot') as File | null

  if (!planId || !fullName || !email || !phone || !screenshot) {
    return Response.json({ error: 'All required fields must be filled' }, { status: 400 })
  }
  if (!VALID_PLANS.includes(planId)) {
    return Response.json({ error: 'Invalid plan' }, { status: 400 })
  }
  if (screenshot.size > 10 * 1024 * 1024) {
    return Response.json({ error: 'Screenshot must be under 10MB' }, { status: 400 })
  }
  const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!validMimes.includes(screenshot.type)) {
    return Response.json({ error: 'Screenshot must be JPG, PNG, or WebP' }, { status: 400 })
  }

  const ext = screenshot.type === 'image/png' ? 'png' : screenshot.type === 'image/webp' ? 'webp' : 'jpg'
  const storagePath = `${user.id}/${Date.now()}.${ext}`
  const bytes = await screenshot.arrayBuffer()

  const { data: upload, error: uploadErr } = await adminSupabase.storage
    .from('juice-screenshots')
    .upload(storagePath, Buffer.from(bytes), { contentType: screenshot.type })

  if (uploadErr) {
    console.error('[juice-payment] upload:', uploadErr)
    return Response.json({ error: 'Failed to upload screenshot. Please try again.' }, { status: 500 })
  }

  const { data: submission, error: dbErr } = await adminSupabase
    .from('juice_payment_submissions')
    .insert({
      user_id: user.id,
      plan_id: planId,
      full_name: fullName,
      email,
      phone,
      txn_ref: txnRef,
      screenshot_path: upload.path,
      status: 'pending',
    })
    .select('id')
    .single()

  if (dbErr) {
    console.error('[juice-payment] db:', dbErr)
    return Response.json({ error: 'Failed to save submission' }, { status: 500 })
  }

  return Response.json({ ok: true, id: submission.id })
}
