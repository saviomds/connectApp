import { createClient } from '@/lib/supabase/server'
import { getStripe, getPriceId, isProfessionalPlan, type PlanId } from '@/lib/stripe'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan_id } = await request.json() as { plan_id: PlanId }

  const VALID_PLANS = ['gold_monthly','gold_yearly','platinum_monthly','platinum_yearly','professional_monthly']
  if (!VALID_PLANS.includes(plan_id)) {
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
      success_url: isProfessionalPlan(plan_id)
        ? `${origin}/profile?professional_activated=1`
        : `${origin}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: isProfessionalPlan(plan_id) ? `${origin}/profile` : `${origin}/premium`,
      metadata: { user_id: user.id, plan_id },
      subscription_data: { metadata: { user_id: user.id, plan_id } },
      customer_email: user.email,
    })

    return Response.json({ url: session.url })
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : 'Stripe error'
    // Surface config errors as 503 so the client can show a clear message
    const isConfig = raw.includes('not set') || raw.includes('not configured')
    return Response.json(
      { error: isConfig ? 'Payment is not configured yet. Check Admin → Settings.' : raw },
      { status: isConfig ? 503 : 500 }
    )
  }
}
