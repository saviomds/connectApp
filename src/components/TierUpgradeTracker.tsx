'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, BadgeCheck, Star, Sparkles, Zap, Heart, Filter, Eye, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface TierState {
  is_premium: boolean
  premium_tier: 'gold' | 'platinum' | null
  is_verified: boolean
}

type UpgradeType =
  | { kind: 'verified' }
  | { kind: 'gold' }
  | { kind: 'platinum' }
  | { kind: 'platinum_from_gold' }

const GOLD_FEATURES = [
  { icon: <Heart size={14} />,    text: 'Unlimited likes every day' },
  { icon: <Star size={14} />,     text: '5 Super Likes per day' },
  { icon: <Eye size={14} />,      text: 'See who liked you' },
  { icon: <Filter size={14} />,   text: 'Gender filter in Discover' },
  { icon: <Zap size={14} />,      text: 'Profile Boost access' },
  { icon: <Sparkles size={14} />, text: 'Gold badge & border on profile' },
]

const PLATINUM_FEATURES = [
  { icon: <Sparkles size={14} />, text: 'Everything in Gold' },
  { icon: <Star size={14} />,     text: 'Unlimited Super Likes' },
  { icon: <Zap size={14} />,      text: 'Daily Profile Boosts' },
  { icon: <Crown size={14} />,    text: 'Priority in Discover feed' },
  { icon: <BadgeCheck size={14} />, text: 'Platinum badge & border' },
]

const VERIFIED_FEATURES = [
  { icon: <BadgeCheck size={14} />, text: 'Blue checkmark on your profile' },
  { icon: <Eye size={14} />,        text: 'Trusted badge visible to everyone' },
  { icon: <Heart size={14} />,      text: 'Higher match rate' },
  { icon: <Sparkles size={14} />,   text: 'Shown to more users in Discover' },
]

function UpgradeModal({ upgrade, onDismiss }: { upgrade: UpgradeType; onDismiss: () => void }) {
  const isGold       = upgrade.kind === 'gold'
  const isPlatinum   = upgrade.kind === 'platinum' || upgrade.kind === 'platinum_from_gold'
  const isVerified   = upgrade.kind === 'verified'

  const title = isGold       ? "You're now Gold!"
    : isPlatinum ? "Welcome to Platinum!"
    : "You're now Verified!"

  const subtitle = isGold       ? "Your account has been upgraded. New features are live now."
    : isPlatinum ? "The ultimate plan is yours. Every feature, unlocked."
    : "Your identity is confirmed. The blue badge is now on your profile."

  const features = isGold ? GOLD_FEATURES : isPlatinum ? PLATINUM_FEATURES : VERIFIED_FEATURES

  const accent   = isGold     ? { from: '#C9A84C', to: '#E2C068' }
    : isPlatinum ? { from: '#9B6DFF', to: '#C4B5FD' }
    : { from: '#4A90E2', to: '#93C5FD' }

  const glowColor = isGold     ? 'rgba(201,168,76,0.35)'
    : isPlatinum ? 'rgba(155,109,255,0.35)'
    : 'rgba(74,144,226,0.35)'

  const Icon = isGold ? Crown : isPlatinum ? Star : BadgeCheck

  return (
    <motion.div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
        onClick={onDismiss}
      />

      {/* Card */}
      <motion.div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg,rgba(20,20,22,0.98),rgba(12,12,14,0.98))',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05), 0 0 60px ${glowColor}`,
        }}
        initial={{ scale: 0.88, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      >
        {/* Glow bar at top */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg,${accent.from},${accent.to})` }} />

        {/* Close */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white/70 transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <X size={14} />
        </button>

        <div className="p-6 pt-7">
          {/* Icon */}
          <motion.div
            className="w-20 h-20 rounded-[24px] flex items-center justify-center mx-auto mb-5 relative"
            style={{ background: `linear-gradient(135deg,${accent.from}22,${accent.to}11)`, border: `1px solid ${accent.from}44` }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 20 }}
          >
            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-[24px]"
              style={{ border: `2px solid ${accent.from}` }}
              animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <Icon size={36} style={{ color: accent.from }} className={isPlatinum ? 'fill-purple-400' : isGold ? 'fill-yellow-400' : 'fill-blue-400'} />
          </motion.div>

          {/* Text */}
          <div className="text-center mb-5">
            <h2 className="text-2xl font-bold text-white mb-1.5">{title}</h2>
            <p className="text-white/45 text-sm leading-relaxed">{subtitle}</p>
          </div>

          {/* Features */}
          <div className="rounded-2xl overflow-hidden mb-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {features.map((f, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderBottom: i < features.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.07 }}
              >
                <span style={{ color: accent.from }}>{f.icon}</span>
                <span className="text-sm text-white/75">{f.text}</span>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.button
            onClick={onDismiss}
            className="w-full h-12 rounded-2xl font-bold text-sm text-black flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${accent.from},${accent.to})` }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Sparkles size={15} /> Explore Now
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function TierUpgradeTracker({ userId }: { userId: string }) {
  const [upgrade, setUpgrade] = useState<UpgradeType | null>(null)
  const tierRef = useRef<TierState | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Fetch initial tier to establish a baseline for diff detection
    supabase
      .from('profiles')
      .select('is_premium, premium_tier, is_verified')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) tierRef.current = data as TierState
      })

    const channel = supabase
      .channel(`tier-tracker-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const next = payload.new as TierState
          const prev = tierRef.current

          if (prev) {
            // Detect meaningful upgrades (not downgrades — admin can also revoke)
            if (!prev.is_verified && next.is_verified) {
              setUpgrade({ kind: 'verified' })
            } else if (!prev.is_premium && next.is_premium) {
              setUpgrade({ kind: next.premium_tier === 'platinum' ? 'platinum' : 'gold' })
            } else if (prev.premium_tier === 'gold' && next.premium_tier === 'platinum') {
              setUpgrade({ kind: 'platinum_from_gold' })
            }
          }

          tierRef.current = next
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  function handleDismiss() {
    setUpgrade(null)
    // Full reload ensures all feature gates (swipe limits, etc.) pick up new tier
    window.location.reload()
  }

  return (
    <AnimatePresence>
      {upgrade && <UpgradeModal upgrade={upgrade} onDismiss={handleDismiss} />}
    </AnimatePresence>
  )
}
