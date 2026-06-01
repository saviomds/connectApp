import { createClient } from '@/lib/supabase/server'
import { getStripe, getPriceId, type PlanId } from '@/lib/stripe'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan_id } = await request.json() as { plan_id: PlanId }

  if (!['gold_monthly', 'gold_yearly', 'platinum_monthly', 'platinum_yearly'].includes(plan_id)) {
    return Response.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const origin = new URL(request.url).origin

  try {
    const stripe = await getStripe()
    const priceId = await getPriceId(plan_id)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/premium`,
      metadata: { user_id: user.id, plan_id },
      subscription_data: { metadata: { user_id: user.id, plan_id } },
      customer_email: user.email,
    })

    return Response.json({ url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe error'
    return Response.json({ error: message }, { status: 500 })
  }
}
