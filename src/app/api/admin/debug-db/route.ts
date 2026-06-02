import { getAdminUser } from '@/lib/admin'
import { adminSupabase } from '@/lib/supabase/admin'

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Not admin' }, { status: 403 })

  const results: Record<string, unknown> = {}

  // 1. Can we reach Supabase at all?
  try {
    const { error } = await adminSupabase.from('profiles').select('id').limit(1)
    results.profiles_query = error ? `ERROR: ${error.message}` : 'OK'
  } catch (e) {
    results.profiles_query = `EXCEPTION: ${e instanceof Error ? e.message : String(e)}`
  }

  // 2. Does app_settings exist?
  try {
    const { data, error } = await adminSupabase
      .from('app_settings')
      .select('key')
      .limit(1)
    results.app_settings_exists = error
      ? `ERROR: ${error.code} – ${error.message}`
      : `OK (row count sample: ${data?.length})`
  } catch (e) {
    results.app_settings_exists = `EXCEPTION: ${e instanceof Error ? e.message : String(e)}`
  }

  // 3. Row count
  try {
    const { count, error } = await adminSupabase
      .from('app_settings')
      .select('*', { count: 'exact', head: true })
    results.row_count = error ? `ERROR: ${error.message}` : count
  } catch (e) {
    results.row_count = `EXCEPTION: ${e instanceof Error ? e.message : String(e)}`
  }

  return Response.json(results)
}
