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
      // Table not yet created — return empty array so the UI renders without crashing
      console.warn('[admin/settings] app_settings not ready:', error.message)
      return Response.json([])
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
  } catch {
    return Response.json([])
  }
}

export async function PUT(request: Request) {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json() as Record<string, string>

  const updates = Object.entries(body)
    .filter(([, v]) => v !== '••••••••')
    .map(([key, value]) => ({ key, value: value.trim() }))

  if (updates.length === 0) return Response.json({ ok: true, updated: 0 })

  for (const row of updates) {
    await adminSupabase
      .from('app_settings')
      .update({ value: row.value })
      .eq('key', row.key)
  }

  return Response.json({ ok: true, updated: updates.length })
}
