import { getAdminUser } from '@/lib/admin'
import { adminSupabase } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const url    = new URL(request.url)
  const status = url.searchParams.get('status')

  let query = adminSupabase
    .from('juice_payment_submissions')
    .select(
      'id, user_id, plan_id, full_name, email, phone, txn_ref, screenshot_path, status, admin_notes, reviewed_at, created_at'
    )
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Attach signed screenshot URLs (1-hour expiry)
  const withUrls = await Promise.all(
    (data ?? []).map(async (row) => {
      const { data: signed } = await adminSupabase.storage
        .from('juice-screenshots')
        .createSignedUrl(row.screenshot_path, 3600)
      return { ...row, screenshot_url: signed?.signedUrl ?? null }
    })
  )

  return Response.json(withUrls)
}
