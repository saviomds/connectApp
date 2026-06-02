import { getAdminUser } from '@/lib/admin'
import { adminSupabase } from '@/lib/supabase/admin'

const SEED_ROWS = [
  { key: 'stripe_publishable_key',          value: '', label: 'Stripe Publishable Key',      description: 'Your pk_live_ or pk_test_ key (safe to expose)',     category: 'stripe', is_secret: false },
  { key: 'stripe_secret_key',               value: '', label: 'Stripe Secret Key',           description: 'Your sk_live_ or sk_test_ key',                      category: 'stripe', is_secret: true  },
  { key: 'stripe_webhook_secret',           value: '', label: 'Stripe Webhook Secret',       description: 'whsec_... from Stripe Dashboard → Webhooks',         category: 'stripe', is_secret: true  },
  { key: 'stripe_gold_monthly_price_id',    value: '', label: 'Gold Monthly Price ID',       description: 'price_... – $29/month recurring price in Stripe',    category: 'stripe', is_secret: false },
  { key: 'stripe_gold_yearly_price_id',     value: '', label: 'Gold Yearly Price ID',        description: 'price_... – $243.60/year recurring price in Stripe', category: 'stripe', is_secret: false },
  { key: 'stripe_platinum_monthly_price_id',value: '', label: 'Platinum Monthly Price ID',   description: 'price_... – $49/month recurring price in Stripe',    category: 'stripe', is_secret: false },
  { key: 'stripe_platinum_yearly_price_id', value: '', label: 'Platinum Yearly Price ID',    description: 'price_... – $411.60/year recurring price in Stripe', category: 'stripe', is_secret: false },
]

export async function POST() {
  const admin = await getAdminUser()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  try {
    // Try upserting seed rows — succeeds if table exists, fails with postgres error if not
    const { error } = await adminSupabase
      .from('app_settings')
      .upsert(SEED_ROWS, { onConflict: 'key', ignoreDuplicates: true })

    if (error) {
      const tableNotFound =
        error.message.includes('does not exist') ||
        error.code === '42P01' ||
        error.message.includes('relation')

      if (tableNotFound) {
        return Response.json({ status: 'table_missing' })
      }
      throw error
    }

    return Response.json({ status: 'ok' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
