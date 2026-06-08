import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

let _anonClient: ReturnType<typeof createClient> | null = null
function anonClient() {
  if (_anonClient) return _anonClient
  _anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  return _anonClient
}

const FALLBACK = {
  stripe_enabled: false,
  juice_enabled: false,
  juice_phone: '',
  juice_account_name: '',
  juice_instructions: '',
  juice_qr_url: '',
}

export async function GET() {
  try {
    const { data } = await anonClient()
      .from('app_settings')
      .select('key, value')
      .in('key', [
        'stripe_publishable_key',
        'juice_enabled',
        'juice_phone',
        'juice_account_name',
        'juice_instructions',
        'juice_qr_url',
      ])

    const s = Object.fromEntries((data ?? []).map(r => [r.key, r.value as string]))

    return Response.json({
      stripe_enabled: Boolean(s['stripe_publishable_key']),
      juice_enabled: s['juice_enabled'] === 'true',
      juice_phone: s['juice_phone'] ?? '',
      juice_account_name: s['juice_account_name'] ?? '',
      juice_instructions: s['juice_instructions'] ?? '',
      juice_qr_url: s['juice_qr_url'] ?? '',
    })
  } catch {
    return Response.json(FALLBACK)
  }
}
