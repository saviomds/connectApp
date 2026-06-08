'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Crown, Zap, Star, Eye, Heart, TrendingUp, Shield, Loader2, BookOpen, BadgeCheck, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import type { PlanId } from '@/lib/stripe';
import JuicePaymentForm, { type JuiceConfig } from '@/components/JuicePaymentForm';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    color: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.1)',
    textColor: '#FFFFFF',
    features: ['10 likes per day', 'Basic matching', 'Limited messages', 'Standard profile'],
    missing: ['See who liked you', 'Unlimited likes', 'Profile boost', 'Super likes', 'Read receipts'],
  },
  {
    id: 'gold',
    name: 'Gold',
    monthlyPrice: 29,
    yearlyPrice: 243.60, // $20.30/mo
    color: 'rgba(201,168,76,0.12)',
    border: '#C9A84C',
    textColor: '#C9A84C',
    badge: 'Most Popular',
    features: ['Unlimited likes', 'See who liked you', '5 super likes/day', 'Read receipts', 'Profile boost (1×/week)', 'Advanced filters', 'Priority matching'],
    missing: ['Platinum badge', 'Unlimited boosts', 'Exclusive events'],
    monthlyPlanId: 'gold_monthly' as PlanId,
    yearlyPlanId: 'gold_yearly' as PlanId,
  },
  {
    id: 'platinum',
    name: 'Platinum',
    monthlyPrice: 49,
    yearlyPrice: 411.60, // $34.30/mo
    color: 'rgba(232,232,232,0.08)',
    border: 'rgba(232,232,232,0.4)',
    textColor: '#E8E8E8',
    badge: 'Best Value',
    features: ['Everything in Gold', 'Unlimited super likes', 'Daily profile boosts', 'Platinum badge', 'Exclusive events access', 'Concierge matching', 'Video profile (coming soon)'],
    missing: [],
    monthlyPlanId: 'platinum_monthly' as PlanId,
    yearlyPlanId: 'platinum_yearly' as PlanId,
  },
];

const FEATURES_COMPARE = [
  { label: 'Daily likes',       icon: Heart,      free: '10',    gold: '∞',    platinum: '∞' },
  { label: 'Super likes',       icon: Star,       free: '1/day', gold: '5/day', platinum: '∞' },
  { label: 'Profile boosts',    icon: TrendingUp, free: '–',     gold: '1/wk', platinum: 'Daily' },
  { label: 'See who liked you', icon: Eye,        free: '–',     gold: '✓',    platinum: '✓' },
  { label: 'Read receipts',     icon: Shield,     free: '–',     gold: '✓',    platinum: '✓' },
  { label: 'Verified badge',    icon: Crown,      free: '–',     gold: '–',    platinum: '✓' },
];

// ── Professional Benefits Section ─────────────────────────────────────
function ProfessionalBenefits({ isProfessional }: { isProfessional: boolean }) {
  const [claimed, setClaimed]   = useState(false)
  const [claiming, setClaiming] = useState(false)

  useEffect(() => {
    fetch('/api/profile').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.professional_reward_claimed) setClaimed(true) }).catch(() => {})
  }, [])

  const claim = useCallback(async () => {
    setClaiming(true)
    const res = await fetch('/api/boost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ duration: 24 * 60 }) })
    if (res.ok) {
      await fetch('/api/settings/preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ professional_reward_claimed: true }) })
      setClaimed(true)
    }
    setClaiming(false)
  }, [])

  if (!isProfessional) return (
    <div className="glass rounded-3xl p-6 flex items-start gap-4 mb-6"
      style={{ border: '1px solid rgba(201,168,76,0.18)' }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(201,168,76,0.12)' }}>
        <BookOpen size={22} style={{ color: '#C9A84C' }} />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-white mb-1">Professional Upgrade Benefits</p>
        <p className="text-sm text-white/50 mb-3">Get verified as a Professional and unlock exclusive rewards:</p>
        <div className="flex flex-col gap-2 mb-4">
          {[
            '📖 Free e-book: "The Art of Authentic Networking"',
            '⚡ One-time 24-hour profile boost (valued at $9.99)',
            '✅ Blue verified badge on your profile',
            '🎯 Priority placement in discover feed',
          ].map(item => (
            <div key={item} className="flex items-start gap-2 text-sm text-white/65">
              <span>{item}</span>
            </div>
          ))}
        </div>
        <Link href="/profile"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-black"
          style={{ background: '#C9A84C' }}>
          <BadgeCheck size={15} /> Apply for Professional Verification
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )

  return (
    <div className="glass rounded-3xl p-6 flex items-start gap-4 mb-6"
      style={{ border: claimed ? '1px solid rgba(46,204,113,0.30)' : '1px solid rgba(201,168,76,0.30)' }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: claimed ? 'rgba(46,204,113,0.12)' : 'rgba(201,168,76,0.12)' }}>
        {claimed ? <Check size={22} style={{ color: '#2ECC71' }} /> : <BookOpen size={22} style={{ color: '#C9A84C' }} />}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-white">Professional Rewards</p>
          <BadgeCheck size={15} style={{ color: '#4A90E2' }} />
        </div>
        {claimed ? (
          <div>
            <p className="text-sm text-white/50 mb-3">You&apos;ve already claimed your professional rewards.</p>
            <div className="flex flex-col gap-2">
              <a href="/books/authentic-networking.pdf" download
                className="inline-flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors">
                <BookOpen size={14} /> Download: The Art of Authentic Networking (PDF)
              </a>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-white/50 mb-3">You&apos;re verified! Claim your exclusive professional rewards:</p>
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-white/70"><BookOpen size={14} style={{ color: '#C9A84C' }} /> Free e-book: &quot;The Art of Authentic Networking&quot;</div>
              <div className="flex items-center gap-2 text-sm text-white/70"><Zap size={14} style={{ color: '#C9A84C' }} /> 24-hour profile boost (valued at $9.99)</div>
            </div>
            <button onClick={claim} disabled={claiming}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-black disabled:opacity-60"
              style={{ background: '#C9A84C' }}>
              {claiming ? <Loader2 size={14} className="animate-spin" /> : <><Zap size={14} /> Claim Rewards</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PremiumPage({
  isPremium = false,
  premiumTier = null,
  isProfessional = false,
}: {
  isPremium?: boolean
  premiumTier?: 'gold' | 'platinum' | null
  isProfessional?: boolean
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showProfessionalTab = searchParams.get('tab') === 'professional';
  const [billing, setBilling]           = useState<'monthly' | 'yearly'>('monthly');
  const [selected, setSelected]         = useState('gold');
  const [loadingPlan, setLoadingPlan]   = useState<string | null>(null);
  const [stripeError, setStripeError]   = useState('');
  const [juiceFlowPlan, setJuiceFlowPlan] = useState<string | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<{
    stripe_enabled: boolean
    juice_enabled: boolean
    juice_phone: string
    juice_account_name: string
    juice_instructions: string
    juice_qr_url: string
  } | null>(null);

  useEffect(() => {
    fetch('/api/payment-config')
      .then(r => r.ok ? r.json() : null)
      .then(d => setPaymentConfig(d ?? { stripe_enabled: true, juice_enabled: false, juice_phone: '', juice_account_name: '', juice_instructions: '', juice_qr_url: '' }))
      .catch(() => setPaymentConfig({ stripe_enabled: true, juice_enabled: false, juice_phone: '', juice_account_name: '', juice_instructions: '', juice_qr_url: '' }))
  }, []);

  const handleSubscribe = async (planId: PlanId) => {
    if (!paymentConfig) return;

    // No payment method configured
    if (!paymentConfig.stripe_enabled && !paymentConfig.juice_enabled) {
      setStripeError('No payment method is configured. Please contact the admin.');
      return;
    }

    // Juice-only fallback
    if (!paymentConfig.stripe_enabled && paymentConfig.juice_enabled) {
      setJuiceFlowPlan(planId);
      return;
    }

    // Stripe flow (default or both-enabled)
    setLoadingPlan(planId);
    setStripeError('');
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId }),
      });

      if (res.status === 401) {
        router.push('/login?next=/premium');
        return;
      }

      const { url, error } = await res.json();

      if (error) {
        setStripeError(error);
        return;
      }

      window.location.href = url;
    } catch {
      setStripeError('Something went wrong. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const getPrice = (plan: typeof PLANS[0]) => {
    if (plan.monthlyPrice === 0) return 0;
    return billing === 'yearly'
      ? Math.round(plan.yearlyPrice / 12)
      : plan.monthlyPrice;
  };

  // ── Juice payment flow ────────────────────────────────────────────────────
  if (juiceFlowPlan && paymentConfig) {
    const juiceConfig: JuiceConfig = {
      phone:       paymentConfig.juice_phone,
      accountName: paymentConfig.juice_account_name,
      instructions: paymentConfig.juice_instructions,
      qrUrl:       paymentConfig.juice_qr_url,
    };
    return (
      <div className="min-h-screen pt-nav pb-nav-bottom px-4">
        <div className="max-w-5xl mx-auto">
          <JuicePaymentForm
            planId={juiceFlowPlan}
            billing={billing}
            juiceConfig={juiceConfig}
            onBack={() => setJuiceFlowPlan(null)}
            onSuccess={() => setJuiceFlowPlan(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-nav pb-nav-bottom px-4">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm font-medium mb-5" style={{ color: '#C9A84C' }}>
            <Crown size={14} style={{ fill: '#C9A84C' }} />
            Unlock the full Vibro experience
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Premium Plans</h1>
          <p className="text-white/50 text-lg">Be seen. Get matches. Make real connections.</p>

          <div className="inline-flex items-center glass rounded-full p-1 mt-6">
            {(['monthly', 'yearly'] as const).map((b) => (
              <button key={b} onClick={() => setBilling(b)}
                className={clsx('px-5 py-2 rounded-full text-sm font-semibold transition-all capitalize', billing === b ? 'text-black' : 'text-white/50 hover:text-white')}
                style={billing === b ? { background: '#C9A84C' } : {}}>
                {b}
                {b === 'yearly' && <span className="ml-1.5 text-xs font-bold text-green-400">–30%</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Professional Benefits */}
        <ProfessionalBenefits isProfessional={isProfessional} />

        {stripeError && (
          <div className="flex items-center gap-3 glass rounded-2xl px-4 py-3 mb-6 max-w-lg mx-auto"
            style={{ border: '1px solid rgba(231,76,60,0.3)' }}>
            <span className="text-red-400 text-sm flex-1">{stripeError}</span>
            <button onClick={() => setStripeError('')} className="text-white/30 hover:text-white text-xs shrink-0">✕</button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {PLANS.map((plan) => {
            const price = getPrice(plan);
            const isSelected = selected === plan.id;
            const planId = billing === 'monthly' ? plan.monthlyPlanId : plan.yearlyPlanId;
            const isLoading = loadingPlan === planId;

            // Determine if the user already owns this plan
            const isCurrentPlan =
              (plan.id === 'free'     && !isPremium) ||
              (plan.id === 'gold'     && isPremium && premiumTier === 'gold') ||
              (plan.id === 'platinum' && isPremium && premiumTier === 'platinum');

            // Gold users can upgrade to Platinum but shouldn't re-buy Gold
            const isDowngrade = plan.id === 'gold' && isPremium && premiumTier === 'platinum';

            return (
              <div key={plan.id}
                onClick={() => setSelected(plan.id)}
                className={clsx('relative rounded-3xl p-6 cursor-pointer transition-all', isSelected && 'scale-[1.02]')}
                style={{
                  background: plan.color,
                  border: `1.5px solid ${isCurrentPlan ? '#2ECC71' : isSelected ? plan.border : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: isCurrentPlan
                    ? '0 0 28px rgba(46,204,113,0.2)'
                    : isSelected && plan.id !== 'free' ? `0 0 32px ${plan.border}40` : 'none',
                }}>

                {/* Current plan badge overrides the plan's own badge */}
                {isCurrentPlan ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-black whitespace-nowrap flex items-center gap-1.5"
                    style={{ background: '#2ECC71' }}>
                    <Check size={10} /> Current Plan
                  </div>
                ) : plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-black whitespace-nowrap" style={{ background: plan.textColor }}>
                    {plan.badge}
                  </div>
                )}

                <div className="mb-5">
                  <h2 className="text-xl font-bold mb-1" style={{ color: plan.textColor }}>{plan.name}</h2>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-white">${price}</span>
                    {plan.monthlyPrice > 0 && <span className="text-white/40 text-sm mb-1">/month</span>}
                  </div>
                  {billing === 'yearly' && plan.yearlyPrice > 0 && (
                    <p className="text-xs text-green-400 mt-1">
                      Billed ${plan.yearlyPrice.toFixed(2)}/year — save ${((plan.monthlyPrice * 12) - plan.yearlyPrice).toFixed(0)}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2.5 mb-6">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <Check size={14} className="shrink-0 mt-0.5" style={{ color: plan.textColor }} />
                      <span className="text-sm text-white/70">{f}</span>
                    </div>
                  ))}
                  {plan.missing.map((f) => (
                    <div key={f} className="flex items-start gap-2.5 opacity-30">
                      <span className="w-3.5 shrink-0 mt-0.5 text-center text-xs text-white/40">–</span>
                      <span className="text-sm text-white/40 line-through">{f}</span>
                    </div>
                  ))}
                </div>

                {isCurrentPlan ? (
                  /* User already on this plan */
                  <div className="w-full py-3 rounded-2xl font-semibold text-sm text-center flex items-center justify-center gap-2"
                    style={{ background: 'rgba(46,204,113,0.12)', color: '#2ECC71', border: '1px solid rgba(46,204,113,0.25)' }}>
                    <Check size={14} /> Active Plan
                  </div>
                ) : isDowngrade ? (
                  /* Already on a higher plan */
                  <div className="w-full py-3 rounded-2xl text-sm text-center text-white/30"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    Included in Platinum
                  </div>
                ) : plan.id !== 'free' && planId ? (
                  !paymentConfig ? (
                    <div className="w-full py-3 rounded-2xl flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <Loader2 size={14} className="animate-spin text-white/30" />
                    </div>
                  ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSubscribe(planId); }}
                    disabled={isLoading}
                    className="block w-full py-3 rounded-2xl font-semibold text-sm text-center transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ background: isSelected ? plan.textColor : 'rgba(255,255,255,0.08)', color: isSelected ? '#000' : '#fff' }}
                  >
                    {isLoading ? (
                      <><Loader2 size={16} className="animate-spin" /> Processing…</>
                    ) : !paymentConfig?.stripe_enabled && paymentConfig?.juice_enabled ? (
                      isSelected ? `Pay with Juice` : `Choose ${plan.name}`
                    ) : isPremium && plan.id === 'platinum' ? (
                      'Upgrade to Platinum'
                    ) : (
                      isSelected ? `Get ${plan.name}` : `Choose ${plan.name}`
                    )}
                  </button>
                  )
                ) : (
                  <Link href="/discover" className="block w-full py-3 rounded-2xl font-semibold text-sm text-center bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/10 transition-all">
                    Continue Free
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Feature comparison */}
        <div className="glass rounded-3xl overflow-hidden mb-8">
          <div className="grid grid-cols-4 px-3 sm:px-6 py-4 border-b border-white/[0.06]">
            <div className="text-xs sm:text-sm font-semibold text-white/40">Feature</div>
            {['Free', 'Gold', 'Platinum'].map((p) => (
              <div key={p} className="text-xs sm:text-sm font-semibold text-center" style={{ color: p === 'Gold' ? '#C9A84C' : p === 'Platinum' ? '#E8E8E8' : '#fff' }}>{p}</div>
            ))}
          </div>
          {FEATURES_COMPARE.map(({ label, icon: Icon, free, gold, platinum }) => (
            <div key={label} className="grid grid-cols-4 px-3 sm:px-6 py-3 sm:py-3.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-white/60">
                <Icon size={12} className="text-white/30 shrink-0" />
                <span className="truncate">{label}</span>
              </div>
              {[free, gold, platinum].map((val, i) => (
                <div key={i} className="text-xs sm:text-sm text-center font-medium"
                  style={{ color: val === '–' ? 'rgba(255,255,255,0.2)' : val === '✓' ? '#2ECC71' : i === 1 ? '#C9A84C' : i === 2 ? '#E8E8E8' : '#fff' }}>
                  {val}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Boost add-on */}
        <div className="glass rounded-3xl p-4 sm:p-6 flex items-center gap-3 sm:gap-4" style={{ border: '1px solid rgba(201,168,76,0.2)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
            <Zap size={22} style={{ color: '#C9A84C', fill: '#C9A84C' }} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">Profile Boost Add-on</p>
            <p className="text-white/50 text-sm mt-0.5">Be the top profile for 30 min. Get 10× more views.</p>
          </div>
          <button
            onClick={() => handleSubscribe('gold_monthly')}
            className="btn-gold px-5 py-2.5 rounded-xl text-sm font-bold text-black shadow-gold shrink-0">
            $4.99
          </button>
        </div>

        <p className="text-center text-xs text-white/25 mt-6">
          {paymentConfig?.juice_enabled && !paymentConfig?.stripe_enabled
            ? 'Payments verified manually within 24 hours via Juice mobile money.'
            : 'Payments are processed securely by Stripe. Cancel anytime from your account settings.'
          }
        </p>
      </div>
    </div>
  );
}
