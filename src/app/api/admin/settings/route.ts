import { getAdminUser } from '@/lib/admin'
import { adminSupabase } from '@/lib/supabase/admin'

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { data, error } = await adminSupabase
      .from('app_settings')
      .select('key, value, label, description, category, is_secret, updated_at')
      .order('category').order('key')

    if (error) {
      console.error('[admin/settings] DB error:', error.code, error.message)
      const isMissing =
        error.message.includes('does not exist') ||
        error.message.includes('relation') ||
        (error as { code?: string }).code === '42P01'

      return Response.json(
        { error: error.message, status: isMissing ? 'table_missing' : 'db_error' },
        { status: 503 }
      )
    }

    const masked = (data ?? []).map((row: {
      key: string; value: string; label: string; description: string | null;
      category: string; is_secret: boolean; updated_at: string
    }) => ({
      ...row,
      value: row.is_secret && row.value ? '••••••••' : row.value,
      is_set: row.value.length > 0,
    }))

    return Response.json(masked)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/settings] Exception:', message)
    const isNoServiceKey = message.includes('SERVICE_ROLE_KEY')
    return Response.json(
      {
        error: message,
        status: isNoServiceKey ? 'no_service_key' : 'exception',
      },
      { status: 503 }
    )
  }
}

export async function PUT(request: Request) {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json() as Record<string, string>

  const updates = Object.entries(body)
    .filter(([, v]) => v !== '' && v !== '••••••••')
    .map(([key, value]) => ({ key, value: value.trim() }))

  if (updates.length === 0) return Response.json({ ok: true, updated: 0 })

  const errors: string[] = []
  for (const row of updates) {
    const { error } = await adminSupabase
      .from('app_settings')
      .update({ value: row.value })
      .eq('key', row.key)
    if (error) errors.push(`${row.key}: ${error.message}`)
  }

  if (errors.length) {
    return Response.json({ error: errors.join('; ') }, { status: 500 })
  }

  return Response.json({ ok: true, updated: updates.length })
}
