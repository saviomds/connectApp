import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('juice_payment_submissions')
    .select('id, plan_id, status, admin_notes, txn_ref, created_at, reviewed_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    // Table not yet created — return empty array gracefully
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return Response.json([])
    }
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data ?? [])
}
