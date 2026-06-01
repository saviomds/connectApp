import 'server-only'
import Stripe from 'stripe'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export type PlanId = 'gold_monthly' | 'gold_yearly' | 'platinum_monthly' | 'platinum_yearly'

// Anonymous Supabase client — used ONLY to call the get_setting() SECURITY DEFINER
// function, which bypasses RLS and returns app_settings values without the
// service role key. Works even when SUPABASE_SERVICE_ROLE_KEY is the placeholder.
function anonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Read a setting: DB first (via RPC) → env fallback → empty string
async function getSetting(key: string, envFallback?: string): Promise<string> {
  try {
    const { data } = await anonClient().rpc('get_setting', { p_key: key })
    if (data) return data as string
  } catch { /* table or function not yet created */ }
  return envFallback ?? ''
}

export async function getStripe(): Promise<Stripe> {
  const key = await getSetting('stripe_secret_key', process.env.STRIPE_SECRET_KEY)
  if (!key) throw new Error('Stripe secret key is not set. Go to Admin → Settings → Stripe.')
  return new Stripe(key, { apiVersion: '2026-05-27.dahlia' })
}

export async function getWebhookSecret(): Promise<string> {
  const secret = await getSetting('stripe_webhook_secret', process.env.STRIPE_WEBHOOK_SECRET)
  if (!secret) throw new Error('Stripe webhook secret not set. Go to Admin → Settings → Stripe.')
  return secret
}

export async function getPriceId(planId: PlanId): Promise<string> {
  const envMap: Record<PlanId, string | undefined> = {
    gold_monthly:      process.env.STRIPE_GOLD_MONTHLY_PRICE_ID,
    gold_yearly:       process.env.STRIPE_GOLD_YEARLY_PRICE_ID,
    platinum_monthly:  process.env.STRIPE_PLATINUM_MONTHLY_PRICE_ID,
    platinum_yearly:   process.env.STRIPE_PLATINUM_YEARLY_PRICE_ID,
  }
  const id = await getSetting(`stripe_${planId}_price_id`, envMap[planId])
  if (!id) throw new Error(`Price ID for "${planId}" not set. Go to Admin → Settings → Stripe.`)
  return id
}

export function tierFromPlanId(planId: PlanId): 'gold' | 'platinum' {
  return planId.startsWith('gold') ? 'gold' : 'platinum'
}
