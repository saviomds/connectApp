'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BadgeCheck, Crown, Zap, ShieldCheck, Clock, ShieldX,
  CheckCircle2, Lock, Loader2, ExternalLink, Briefcase,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import VerificationRequestModal from './VerificationRequestModal'
import type { UserCategory, VerificationStatus } from '@/types/database'

interface Props {
  isVerified:          boolean
  verificationStatus:  VerificationStatus
  isPremium:           boolean
  premiumTier:         'gold' | 'platinum' | null
  isOpenToWork:        boolean
  boostedUntil:        string | null
  category:            UserCategory | null
}

// ── Countdown label for boost ──────────────────────────────────
function useBoostCountdown(boostedUntil: string | null) {
  const [label, setLabel] = useState<string | null>(null)
  useEffect(() => {
    if (!boostedUntil) return
    function tick() {
      const diff = new Date(boostedUntil!).getTime() - Date.now()
      if (diff <= 0) { setLabel(null); return }
      const m = Math.floor(diff / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setLabel(m > 0 ? `${m}m ${s}s left` : `${s}s left`)
    }
    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [boostedUntil])
  return label
}

// ── Single badge row ───────────────────────────────────────────
function BadgeRow({
  icon, iconBg, iconBorder, title, description,
  status, activeLabel,
  action,
}: {
  icon: React.ReactNode
  iconBg: string
  iconBorder: string
  title: string
  description: string
  status: 'active' | 'pending' | 'rejected' | 'locked'
  activeLabel?: string   // overrides the default chip label when status==='active'
  action?: React.ReactNode
}) {
  const statusChip = {
    active:   { label: activeLabel ?? 'Active', bg: 'rgba(46,204,113,0.13)', color: '#2ECC71', border: 'rgba(46,204,113,0.3)' },
    pending:  { label: 'Pending',  bg: 'rgba(243,156,18,0.13)', color: '#F39C12', border: 'rgba(243,156,18,0.3)' },
    rejected: { label: 'Rejected', bg: 'rgba(231,76,60,0.13)',  color: '#E74C3C', border: 'rgba(231,76,60,0.3)'  },
    locked:   { label: 'Locked',   bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)', border: 'rgba(255,255,255,0.1)' },
  }[status]

  return (
    <div className="flex items-center gap-3 px-4 py-3.5"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: status === 'locked' ? 0.55 : 1 }}>
      {/* Badge icon */}
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: iconBg, border: `1px solid ${iconBorder}` }}>
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight">{title}</p>
        <p className="text-[11px] text-white/40 mt-0.5 leading-snug">{description}</p>
      </div>

      {/* Status or action */}
      {action ?? (
        <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"
          style={{ background: statusChip.bg, color: statusChip.color, border: `1px solid ${statusChip.border}` }}>
          {status === 'active'   && <CheckCircle2 size={9} className="shrink-0" />}
          {status === 'pending'  && <Clock size={9} className="shrink-0" />}
          {status === 'rejected' && <ShieldX size={9} className="shrink-0" />}
          {status === 'locked'   && <Lock size={9} className="shrink-0" />}
          {statusChip.label}
        </span>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function BadgesPanel({
  isVerified, verificationStatus, isPremium, premiumTier,
  isOpenToWork, boostedUntil: initialBoosted, category,
}: Props) {
  const [boostedUntil, setBoostedUntil] = useState(initialBoosted)
  const [activating, setActivating]     = useState(false)
  const [boostError, setBoostError]     = useState('')
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [verifySubmitted, setVerifySubmitted] = useState(false)

  const boostLabel = useBoostCountdown(boostedUntil)
  const boostActive = !!boostedUntil && new Date(boostedUntil) > new Date()

  async function activateBoost() {
    setActivating(true)
    setBoostError('')
    const res = await fetch('/api/boost', { method: 'POST' })
    const data = await res.json()
    setActivating(false)
    if (!res.ok) { setBoostError(data.error ?? 'Failed'); return }
    setBoostedUntil(data.boostedUntil)
  }

  const catLabel: Record<string, string> = {
    professional: 'Professional', divorced: 'New Chapter',
  }

  return (
    <div className="glass rounded-3xl overflow-hidden border border-white/[0.07]">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-white/[0.07] flex items-center justify-between">
        <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Badges &amp; Membership</p>
        <span className="text-[10px] text-white/25">Shown on your profile</span>
      </div>

      {/* ── Verified badge ── */}
      {isVerified || verificationStatus === 'approved' ? (
        <BadgeRow
          icon={<BadgeCheck size={18} className="fill-blue-400 text-white" />}
          iconBg="rgba(74,144,226,0.15)"
          iconBorder="rgba(74,144,226,0.35)"
          title="Verified"
          description="Identity confirmed · trusted by the community"
          status="active"
          activeLabel="Verified"
        />
      ) : verificationStatus === 'pending' || verifySubmitted ? (
        <BadgeRow
          icon={<Clock size={18} style={{ color: '#F39C12' }} />}
          iconBg="rgba(243,156,18,0.12)"
          iconBorder="rgba(243,156,18,0.3)"
          title="Verified"
          description="Identity check under review · usually within 24 h"
          status="pending"
        />
      ) : verificationStatus === 'rejected' ? (
        <BadgeRow
          icon={<ShieldX size={18} style={{ color: '#E74C3C' }} />}
          iconBg="rgba(231,76,60,0.12)"
          iconBorder="rgba(231,76,60,0.3)"
          title="Verified"
          description="Documents rejected — please resubmit clearer photos"
          status="rejected"
          action={
            <button onClick={() => setShowVerifyModal(true)}
              className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all hover:opacity-80"
              style={{ background: 'rgba(231,76,60,0.18)', color: '#E74C3C', border: '1px solid rgba(231,76,60,0.35)' }}>
              <ShieldX size={9} /> Resubmit
            </button>
          }
        />
      ) : (
        <BadgeRow
          icon={<ShieldCheck size={18} style={{ color: 'rgba(255,255,255,0.25)' }} />}
          iconBg="rgba(255,255,255,0.05)"
          iconBorder="rgba(255,255,255,0.1)"
          title="Verified"
          description="Submit your ID to earn a blue verification badge"
          status="locked"
          action={
            <button onClick={() => setShowVerifyModal(true)}
              className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all hover:opacity-80"
              style={{ background: 'rgba(74,144,226,0.15)', color: '#93C5FD', border: '1px solid rgba(74,144,226,0.3)' }}>
              <ShieldCheck size={9} /> Get Verified
            </button>
          }
        />
      )}

      {/* ── Gold badge ── */}
      {isPremium && premiumTier === 'gold' ? (
        <BadgeRow
          icon={<Crown size={18} style={{ color: '#C9A84C' }} />}
          iconBg="rgba(201,168,76,0.15)"
          iconBorder="rgba(201,168,76,0.35)"
          title="Gold Member"
          description="Unlimited likes · see who liked you · boosts"
          status="active"
          activeLabel="Gold"
        />
      ) : (
        <BadgeRow
          icon={<Crown size={18} style={{ color: 'rgba(255,255,255,0.2)' }} />}
          iconBg="rgba(255,255,255,0.05)"
          iconBorder="rgba(255,255,255,0.1)"
          title="Gold Member"
          description="$29/mo · unlimited likes, boosts and more"
          status="locked"
          action={
            <Link href="/premium"
              className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all hover:opacity-80"
              style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)' }}>
              <Crown size={9} /> Upgrade
            </Link>
          }
        />
      )}

      {/* ── Platinum badge ── */}
      {isPremium && premiumTier === 'platinum' ? (
        <BadgeRow
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill="#9B6DFF" stroke="#9B6DFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          iconBg="rgba(155,109,255,0.15)"
          iconBorder="rgba(155,109,255,0.35)"
          title="Platinum Member"
          description="Unlimited super likes · daily boosts · platinum badge"
          status="active"
          activeLabel="Platinum"
        />
      ) : (
        <BadgeRow
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.25 }}>
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill="white" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          iconBg="rgba(255,255,255,0.05)"
          iconBorder="rgba(255,255,255,0.1)"
          title="Platinum Member"
          description="$49/mo · the ultimate plan with every feature"
          status="locked"
          action={
            <Link href="/premium"
              className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all hover:opacity-80"
              style={{ background: 'rgba(155,109,255,0.15)', color: '#C4B5FD', border: '1px solid rgba(155,109,255,0.3)' }}>
              <ExternalLink size={9} /> Upgrade
            </Link>
          }
        />
      )}

      {/* ── Profile Boost badge ── */}
      <BadgeRow
        icon={<Zap size={18} style={{ color: boostActive ? '#F97316' : 'rgba(255,255,255,0.2)' }}
          className={boostActive ? 'fill-orange-400' : ''} />}
        iconBg={boostActive ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)'}
        iconBorder={boostActive ? 'rgba(249,115,22,0.35)' : 'rgba(255,255,255,0.1)'}
        title="Profile Boost"
        description={boostActive
          ? `Your profile is at the top of discovery — ${boostLabel ?? '…'}`
          : 'Push your profile to the top of the feed for 30 minutes'}
        status={boostActive ? 'active' : isPremium ? 'locked' : 'locked'}
        action={
          boostActive ? (
            <span className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1"
              style={{ background: 'rgba(249,115,22,0.18)', color: '#FB923C', border: '1px solid rgba(249,115,22,0.35)' }}>
              <Zap size={9} className="fill-orange-400" /> {boostLabel ?? 'Active'}
            </span>
          ) : isPremium ? (
            <div className="flex flex-col items-end gap-1">
              <button onClick={activateBoost} disabled={activating}
                className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: 'rgba(249,115,22,0.18)', color: '#FB923C', border: '1px solid rgba(249,115,22,0.35)' }}>
                {activating
                  ? <Loader2 size={9} className="animate-spin" />
                  : <><Zap size={9} /> Activate</>}
              </button>
              {boostError && <p className="text-[9px] text-red-400">{boostError}</p>}
            </div>
          ) : (
            <Link href="/premium"
              className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Lock size={9} /> Premium only
            </Link>
          )
        }
      />

      {/* ── Open to Work badge ── */}
      <BadgeRow
        icon={<Briefcase size={18} style={{ color: isOpenToWork ? '#00D4AA' : 'rgba(255,255,255,0.2)' }} />}
        iconBg={isOpenToWork ? 'rgba(0,212,170,0.12)' : 'rgba(255,255,255,0.05)'}
        iconBorder={isOpenToWork ? 'rgba(0,212,170,0.3)' : 'rgba(255,255,255,0.1)'}
        title="Open to Work"
        description={isOpenToWork ? 'Visible on your profile · attracts recruiters' : 'Show employers you\'re available for opportunities'}
        status={isOpenToWork ? 'active' : 'locked'}
        action={
          !isOpenToWork ? (
            <Link href="/settings"
              className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all hover:opacity-80"
              style={{ background: 'rgba(0,212,170,0.12)', color: '#00D4AA', border: '1px solid rgba(0,212,170,0.25)' }}>
              Enable
            </Link>
          ) : undefined
        }
      />

      {/* Verification modal */}
      <AnimatePresence>
        {showVerifyModal && (
          <VerificationRequestModal
            category={category ?? 'professional'}
            categoryLabel={catLabel[category ?? ''] ?? 'Profile'}
            onClose={() => setShowVerifyModal(false)}
            onSubmitted={() => { setShowVerifyModal(false); setVerifySubmitted(true) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
