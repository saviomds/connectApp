import { createClient } from '@/lib/supabase/server'

// Core columns that always exist (shipped in original schema).
const CORE_COLS  = new Set(['notify_matches', 'notify_messages', 'show_read_receipts'])
// Extended columns added in new_features.sql migration — may not exist yet.
const EXT_COLS   = new Set([
  'notify_sms', 'free_tonight', 'show_gender', 'discovery_city', 'discovery_country',
  // v2 columns (added in discovery_prefs.sql)
  'is_hidden', 'min_age_pref', 'max_age_pref', 'looking_for',
])
const ALLOWED_GENDER    = new Set(['everyone', 'men', 'women'])
const ALLOWED_LOOKING   = new Set(['relationship', 'dating', 'friendship', 'networking', 'casual', 'not_sure'])

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Attempt 1: full query including new columns.
  const { data, error: queryErr } = await supabase
    .from('profiles')
    .select('notify_matches, notify_messages, show_read_receipts, notify_sms, free_tonight, show_gender, discovery_city, discovery_country, is_hidden, min_age_pref, max_age_pref, looking_for')
    .eq('id', user.id)
    .single()

  // Attempt 2: if new columns don't exist yet (migration not run), fall back to core only.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let row: any = data
  if (queryErr && !row) {
    const { data: coreData } = await supabase
      .from('profiles')
      .select('notify_matches, notify_messages, show_read_receipts')
      .eq('id', user.id)
      .single()
    row = coreData
  }

  return Response.json({
    notify_matches:     row?.notify_matches     ?? true,
    notify_messages:    row?.notify_messages    ?? true,
    show_read_receipts: row?.show_read_receipts ?? true,
    notify_sms:         row?.notify_sms         ?? false,
    free_tonight:       row?.free_tonight        ?? false,
    show_gender:        row?.show_gender         ?? 'everyone',
    discovery_city:     row?.discovery_city      ?? '',
    discovery_country:  row?.discovery_country   ?? '',
    is_hidden:          row?.is_hidden           ?? false,
    min_age_pref:       row?.min_age_pref        ?? null,
    max_age_pref:       row?.max_age_pref        ?? null,
    looking_for:        row?.looking_for         ?? null,
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const fullUpdate: Record<string, unknown> = {}

  for (const key of [...CORE_COLS, ...EXT_COLS]) {
    const val = body[key]
    if (EXT_COLS.has(key as string)) {
      if (typeof val === 'boolean') fullUpdate[key] = val
      if (typeof val === 'number' && (key === 'min_age_pref' || key === 'max_age_pref')) {
        const n = Math.floor(val)
        if (n >= 18 && n <= 99) fullUpdate[key] = n
      }
      if (val === null && (key === 'min_age_pref' || key === 'max_age_pref' || key === 'looking_for')) {
        fullUpdate[key] = null
      }
      if (typeof val === 'string') {
        if (key === 'show_gender' && !ALLOWED_GENDER.has(val)) continue
        if (key === 'looking_for' && !ALLOWED_LOOKING.has(val)) continue
        fullUpdate[key] = val
      }
    } else if (CORE_COLS.has(key as string) && typeof val === 'boolean') {
      fullUpdate[key] = val
    }
  }

  if (Object.keys(fullUpdate).length === 0) {
    return Response.json({ error: 'Nothing to update' }, { status: 400 })
  }

  // Attempt 1: update everything.
  const { error: updateErr } = await supabase
    .from('profiles').update(fullUpdate).eq('id', user.id)

  if (!updateErr) return Response.json({ ok: true })

  // Attempt 2: migration not yet run — retry with only the core columns.
  const coreUpdate = Object.fromEntries(
    Object.entries(fullUpdate).filter(([k]) => CORE_COLS.has(k))
  )
  if (Object.keys(coreUpdate).length > 0) {
    const { error: coreErr } = await supabase
      .from('profiles').update(coreUpdate).eq('id', user.id)
    if (coreErr) return Response.json({ error: coreErr.message }, { status: 500 })
  }

  return Response.json({ ok: true, note: 'Extended columns pending migration' })
}
