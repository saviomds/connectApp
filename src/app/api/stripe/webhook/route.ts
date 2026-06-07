import { getStripe, getWebhookSecret, tierFromPlanId, isProfessionalPlan, type PlanId } from '@/lib/stripe'
import { adminSupabase } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/send-push'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'

// Webhook runs without a user session, so we use the service role directly.
// If SUPABASE_SERVICE_ROLE_KEY is not set we fall back to a plain anon client
// (profiles UPDATE will fail unless RLS is open, but at least it won't crash).
function getWebhookClient() {
  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const key    = svcKey && svcKey !== 'your_supabase_service_role_key_here'
    ? svcKey
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(request: Request) {
  const body = await request.text()
  const sig  = request.headers.get('stripe-signature')
  if (!sig) return Response.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    const stripe        = await getStripe()
    const webhookSecret = await getWebhookSecret()
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    return Response.json({ error: `Webhook error: ${message}` }, { status: 400 })
  }

  const db = getWebhookClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId  = session.metadata?.user_id
    const planId  = session.metadata?.plan_id as PlanId | undefined
    if (!userId || !planId) return Response.json({ error: 'Missing metadata' }, { status: 400 })

    if (isProfessionalPlan(planId)) {
      await db.from('profiles').update({ is_professional: true }).eq('id', userId)
    } else {
      const tier = tierFromPlanId(planId)
      await db.from('profiles').update({ is_premium: true, premium_tier: tier }).eq('id', userId)
    }
    await db.from('notifications').insert({
      user_id: userId, type: 'premium', data: { plan_id: planId },
    })
    sendPushToUser(userId, {
      title: 'Premium Activated! 👑',
      body:  'Your premium subscription is now active. Enjoy your benefits!',
      url:   '/premium',
    }).catch(() => {})
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub    = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.user_id
    const planId = sub.metadata?.plan_id as PlanId | undefined
    if (userId) {
      if (planId && isProfessionalPlan(planId)) {
        await db.from('profiles').update({ is_professional: false }).eq('id', userId)
      } else {
        // Clear unlocked_levels when premium lapses so cross-level visibility is revoked
        await db.from('profiles')
          .update({ is_premium: false, premium_tier: null, unlocked_levels: [] })
          .eq('id', userId)
      }
    }
  }

  return Response.json({ received: true })
}
