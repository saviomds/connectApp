'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  MessageCircle, Heart, MapPin, BadgeCheck, MoreHorizontal,
  UserMinus, ShieldBan, Flag, Loader2, Star, X, Sparkles, ChevronRight,
  RefreshCw, Lock, Crown, ShieldCheck, Clock, Search, SlidersHorizontal,
  ArrowUpDown, Zap,
} from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────
interface ProfileMeta {
  id: string; full_name: string; avatar_url: string | null
  profession: string | null; company: string | null
  city: string | null; country: string | null
  is_verified: boolean; is_online: boolean
  is_premium: boolean; premium_tier: 'gold' | 'platinum' | null
}

interface MatchItem {
  id: string
  conversationId: string | null
  created_at: string
  expires_at: string | null
  profile: ProfileMeta
}

interface LikedYouItem {
  swipeId: string
  direction: 'like' | 'super_like'
  likedAt: string
  profile: ProfileMeta
  is_matched: boolean
  matchId: string | null
  conversationId: string | null
}

// ─── Helpers ──────────────────────────────────────────────────
function TierRing({ tier }: { tier: 'gold' | 'platinum' | null }) {
  if (!tier) return null
  return (
    <div className="absolute inset-0 rounded-full pointer-events-none"
      style={{
        boxShadow: tier === 'platinum'
          ? 'inset 0 0 0 2.5px rgba(232,232,232,0.65)'
          : 'inset 0 0 0 2.5px rgba(201,168,76,0.85)',
      }} />
  )
}

function TierCardGlow({ tier }: { tier: 'gold' | 'platinum' | null }) {
  if (!tier) return null
  return (
    <div className="absolute inset-0 rounded-3xl pointer-events-none z-10"
      style={{
        boxShadow: tier === 'platinum'
          ? 'inset 0 0 0 1.5px rgba(232,232,232,0.35)'
          : 'inset 0 0 0 1.5px rgba(201,168,76,0.45)',
      }} />
  )
}

// ─── Report modal ─────────────────────────────────────────────
const REPORT_REASONS = [
  { id: 'spam',          label: 'Spam or scam',         emoji: '🚫' },
  { id: 'inappropriate', label: 'Inappropriate content', emoji: '⚠️' },
  { id: 'harassment',    label: 'Harassment',            emoji: '😠' },
  { id: 'fake_profile',  label: 'Fake profile',          emoji: '🎭' },
  { id: 'other',         label: 'Other',                 emoji: '📝' },
] as const
type ReportReason = typeof REPORT_REASONS[number]['id']

function ReportModal({ targetId, targetName, onClose }: { targetId: string; targetName: string; onClose: () => void }) {
  const [reason, setReason]       = useState<ReportReason | ''>('')
  const [details, setDetails]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]           = useState(false)

  async function submit() {
    if (!reason) return
    setSubmitting(true)
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reported_id: targetId, reason, details: details.trim() || undefined }),
    })
    setDone(true)
    setTimeout(onClose, 1800)
  }

  return (
    <motion.div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center px-0 sm:px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full sm:max-w-sm glass rounded-t-3xl sm:rounded-3xl p-6"
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}>
        {done ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-white font-semibold">Report submitted</p>
            <p className="text-white/40 text-sm mt-1">Thank you for keeping the community safe.</p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-white mb-1">Report {targetName}</h2>
            <p className="text-white/40 text-sm mb-5">Why are you reporting this profile?</p>
            <div className="flex flex-col gap-2 mb-4">
              {REPORT_REASONS.map(({ id, label, emoji }) => (
                <button key={id} onClick={() => setReason(id)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all"
                  style={{
                    background: reason === id ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${reason === id ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: reason === id ? '#C9A84C' : 'rgba(255,255,255,0.7)',
                  }}>
                  <span className="text-base">{emoji}</span>{label}
                  {reason === id && <span className="ml-auto text-xs">✓</span>}
                </button>
              ))}
            </div>
            {reason === 'other' && (
              <textarea value={details} onChange={e => setDetails(e.target.value)}
                placeholder="Tell us more (optional)…" rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm resize-none mb-4 outline-none" />
            )}
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 h-11 glass rounded-xl text-white/50 hover:text-white text-sm font-medium transition-colors">
                Cancel
              </button>
              <button onClick={submit} disabled={!reason || submitting}
                className="flex-1 h-11 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                style={{ background: '#E74C3C', color: 'white' }}>
                {submitting ? <Loader2 size={15} className="animate-spin mx-auto" /> : 'Submit Report'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Expiry countdown ─────────────────────────────────────────
function useExpiry(expiresAt: string | null) {
  const [label, setLabel] = useState<string | null>(null)
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    if (!expiresAt) return
    function update() {
      const diff = new Date(expiresAt!).getTime() - Date.now()
      if (diff <= 0) { setLabel('Expired'); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      setUrgent(diff < 3_600_000)
      setLabel(h > 0 ? `${h}h ${m}m` : `${m}m`)
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [expiresAt])

  return { label, urgent }
}

// ─── Upgrade gate modal ───────────────────────────────────────
function UpgradeGateModal({ onClose, isPremium, isVerified }: {
  onClose: () => void
  isPremium: boolean
  isVerified: boolean
}) {
  // Only show requirements the user hasn't met yet
  const needsPremium  = !isPremium
  const needsVerified = !isVerified

  return (
    <motion.div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" />
      <motion.div
        className="relative w-full sm:max-w-sm mx-0 sm:mx-4 overflow-hidden rounded-t-[2rem] sm:rounded-[2rem] border border-white/10 p-6"
        style={{ background: 'rgba(15,15,20,0.98)' }}
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/[0.07] flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/10">
          <X size={16} />
        </button>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.2),rgba(155,109,255,0.15))', border: '1px solid rgba(201,168,76,0.3)' }}>
          <Lock size={28} style={{ color: '#C9A84C' }} />
        </div>
        <h2 className="text-xl font-bold text-white text-center mb-2">Unlock Who Liked You</h2>
        <p className="text-white/45 text-sm text-center leading-relaxed mb-6">
          See every profile that liked you — faces, names, and more.
          {needsPremium && needsVerified
            ? <> Requires <span className="text-white/70 font-semibold">Gold or Platinum</span> + <span className="text-white/70 font-semibold">Verified</span>.</>
            : needsVerified
            ? <> One step left: get <span className="text-white/70 font-semibold">Verified</span>.</>
            : <> One step left: upgrade to <span className="text-white/70 font-semibold">Gold or Platinum</span>.</>}
        </p>
        <div className="flex flex-col gap-2.5 mb-6">
          {/* Verified requirement — show with checkmark if already met */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{
              background: isVerified ? 'rgba(46,204,113,0.07)' : 'rgba(74,144,226,0.08)',
              border: `1px solid ${isVerified ? 'rgba(46,204,113,0.25)' : 'rgba(74,144,226,0.2)'}`,
            }}>
            {isVerified
              ? <BadgeCheck size={18} className="fill-green-400 text-white shrink-0" />
              : <ShieldCheck size={18} className="text-blue-400 shrink-0" />}
            <div>
              <p className="text-white text-sm font-semibold">
                {isVerified ? 'Verified ✓' : 'Get Verified'}
              </p>
              <p className="text-white/40 text-xs">
                {isVerified ? 'Your identity is confirmed' : 'Submit your ID for a blue verification badge'}
              </p>
            </div>
            {!isVerified && (
              <Link href="/verify" onClick={onClose}
                className="ml-auto shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-300"
                style={{ background: 'rgba(74,144,226,0.15)', border: '1px solid rgba(74,144,226,0.3)' }}>
                Verify
              </Link>
            )}
          </div>

          {/* Premium requirement — show with checkmark if already met */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{
              background: isPremium ? 'rgba(46,204,113,0.07)' : 'rgba(201,168,76,0.08)',
              border: `1px solid ${isPremium ? 'rgba(46,204,113,0.25)' : 'rgba(201,168,76,0.2)'}`,
            }}>
            {isPremium
              ? <BadgeCheck size={18} className="fill-green-400 text-white shrink-0" />
              : <Crown size={18} style={{ color: '#C9A84C' }} className="shrink-0" />}
            <div>
              <p className="text-white text-sm font-semibold">
                {isPremium ? 'Gold / Platinum ✓' : 'Gold or Platinum'}
              </p>
              <p className="text-white/40 text-xs">
                {isPremium ? 'Premium membership active' : 'Unlock full access to premium features'}
              </p>
            </div>
            {!isPremium && (
              <Link href="/premium" onClick={onClose}
                className="ml-auto shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-black"
                style={{ background: '#C9A84C' }}>
                Upgrade
              </Link>
            )}
          </div>
        </div>
        <button onClick={onClose}
          className="w-full h-11 rounded-2xl text-sm font-medium text-white/40 hover:text-white/60 transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          Maybe later
        </button>
      </motion.div>
    </motion.div>
  )
}

// ─── Extend match upsell modal ────────────────────────────────
function ExtendModal({ matchName, onClose }: { matchName: string; onClose: () => void }) {
  return (
    <motion.div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" />
      <motion.div
        className="relative w-full sm:max-w-sm mx-0 sm:mx-4 overflow-hidden rounded-t-[2rem] sm:rounded-[2rem] border border-white/10 p-6"
        style={{ background: 'rgba(15,15,20,0.98)' }}
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/[0.07] flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/10">
          <X size={16} />
        </button>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.25)' }}>
          <Clock size={28} style={{ color: '#E74C3C' }} />
        </div>
        <h2 className="text-xl font-bold text-white text-center mb-2">Extend Match</h2>
        <p className="text-white/45 text-sm text-center leading-relaxed mb-6">
          Your match with <span className="text-white/80 font-semibold">{matchName}</span> is expiring soon.
          Upgrade to <span className="text-white/70 font-semibold">Platinum</span> to keep all matches indefinitely.
        </p>
        <Link href="/premium" onClick={onClose}
          className="w-full h-12 btn-gold rounded-2xl font-bold text-black text-sm flex items-center justify-center gap-2 mb-3">
          <Crown size={16} /> Upgrade to Platinum
        </Link>
        <button onClick={onClose}
          className="w-full h-11 rounded-2xl text-sm font-medium text-white/40 hover:text-white/60 transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          Maybe later
        </button>
      </motion.div>
    </motion.div>
  )
}

// ─── Story circle ─────────────────────────────────────────────
function StoryCircle({ item, onClick, canSee }: { item: LikedYouItem; onClick: () => void; canSee: boolean }) {
  const firstName = canSee ? (item.profile.full_name ?? '').split(' ')[0].slice(0, 9) || '?' : '• • •'
  const isSuperLike = item.direction === 'super_like'

  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.93 }}
      className="flex flex-col items-center gap-2 flex-shrink-0 group outline-none">
      <div className="relative p-[2.5px] rounded-full transition-transform group-hover:scale-105"
        style={{ background: isSuperLike ? 'linear-gradient(135deg,#3B82F6,#8B5CF6,#EC4899)' : 'linear-gradient(135deg,#F43F5E,#EC4899,#F97316)' }}>
        <div className="w-[68px] h-[68px] rounded-full border-[3px] border-black overflow-hidden relative bg-white/10">
          {item.profile.avatar_url ? (
            <Image src={item.profile.avatar_url} alt="" fill className="object-cover transition-all duration-300"
              style={canSee ? {} : { filter: 'blur(10px)', transform: 'scale(1.15)' }} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xl font-bold"
              style={{ color: canSee ? 'rgba(255,255,255,0.4)' : 'transparent', filter: canSee ? 'none' : 'blur(6px)' }}>
              {(item.profile.full_name?.[0] ?? '?').toUpperCase()}
            </div>
          )}
          {!canSee && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Lock size={18} className="text-white/80" />
            </div>
          )}
        </div>
        {canSee && item.profile.is_online && (
          <span className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-black block" />
        )}
        {isSuperLike && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-black">
            <Star size={9} className="fill-white text-white" />
          </span>
        )}
        {item.is_matched && (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-black"
            style={{ background: '#C9A84C' }}>
            <Heart size={8} className="fill-white text-white" />
          </span>
        )}
      </div>
      <span className="text-[11px] font-medium transition-colors text-center leading-tight max-w-[72px] truncate"
        style={{ color: canSee ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)', letterSpacing: canSee ? 0 : '0.1em' }}>
        {firstName}
      </span>
    </motion.button>
  )
}

// ─── Story preview modal ──────────────────────────────────────
function StoryPreviewModal({ item, onClose, onLikedBack, canSee }: {
  item: LikedYouItem; onClose: () => void; onLikedBack: (profileId: string) => void; canSee: boolean;
}) {
  const [liking, setLiking]           = useState(false)
  const [justMatched, setJustMatched] = useState(false)
  const [newConvId, setNewConvId]     = useState<string | null>(null)
  const p = item.profile
  const isSuperLike = item.direction === 'super_like'

  // Track profile view when canSee (fire-and-forget)
  useEffect(() => {
    if (canSee) fetch(`/api/profiles/${p.id}/view`, { method: 'POST' }).catch(() => {})
  }, [p.id, canSee])

  async function likeBack() {
    setLiking(true)
    const res = await fetch('/api/swipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_id: p.id, direction: 'like' }),
    })
    setLiking(false)
    if (!res.ok) return
    setJustMatched(true)
    onLikedBack(p.id)
    setTimeout(() => {
      fetch('/api/matches').then(r => r.json()).then((ms: unknown) => {
        if (!Array.isArray(ms)) return
        const m = (ms as MatchItem[]).find(m => m.profile.id === p.id)
        if (m?.conversationId) setNewConvId(m.conversationId)
      })
    }, 600)
  }

  return (
    <motion.div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-lg" />
      <motion.div
        className="relative w-full sm:max-w-[360px] mx-0 sm:mx-4 overflow-hidden rounded-t-[2rem] sm:rounded-[2rem] border border-white/10"
        style={{ background: 'rgba(15,15,20,0.97)' }}
        initial={{ y: 100, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={e => e.stopPropagation()}>
        <div className="relative h-[52vh] sm:h-72 w-full overflow-hidden">
          {p.avatar_url ? (
            <Image src={p.avatar_url} alt="" fill
              className="object-cover object-top transition-all duration-500"
              style={canSee ? {} : { filter: 'blur(22px)', transform: 'scale(1.15)' }}
              sizes="(max-width:640px) 100vw, 360px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-7xl font-bold text-white/10"
              style={{ background: 'rgba(255,255,255,0.03)', filter: canSee ? 'none' : 'blur(12px)' }}>
              {(p.full_name?.[0] ?? '?').toUpperCase()}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,15,20,0.98)] via-[rgba(15,15,20,0.15)] to-transparent" />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white border border-white/10 transition-all">
            <X size={16} />
          </button>
          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md font-bold text-xs"
            style={{
              background: isSuperLike ? 'rgba(59,130,246,0.45)' : 'rgba(244,63,94,0.45)',
              border: `1px solid ${isSuperLike ? 'rgba(59,130,246,0.7)' : 'rgba(244,63,94,0.7)'}`,
              color: isSuperLike ? '#93c5fd' : '#fda4af',
            }}>
            {isSuperLike ? <Star size={11} className="fill-blue-300 text-blue-300" /> : <Heart size={11} className="fill-rose-300 text-rose-300" />}
            {isSuperLike ? 'Super Liked you!' : 'Liked you!'}
          </div>
          <div className="absolute bottom-5 left-5 right-5">
            {!canSee ? (
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
                  <Lock size={22} style={{ color: '#C9A84C' }} />
                </div>
                <h2 className="text-lg font-bold text-white mb-1">Profile Hidden</h2>
                <p className="text-white/40 text-xs leading-relaxed">Get Gold + Verified to reveal who liked you</p>
              </div>
            ) : justMatched ? (
              <motion.div className="text-center" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <div className="text-5xl mb-2">🎉</div>
                <div className="text-2xl font-bold text-white">It&apos;s a Match!</div>
                <div className="text-white/50 text-sm mt-1">You and {(p.full_name ?? '').split(' ')[0] || 'them'} liked each other</div>
              </motion.div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold text-white">{p.full_name}</h2>
                  {p.is_verified && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-blue-300"
                      style={{ background: 'rgba(74,144,226,0.2)', border: '1px solid rgba(74,144,226,0.4)' }}>
                      <BadgeCheck size={10} className="fill-blue-400" /> Verified
                    </span>
                  )}
                  {p.premium_tier === 'gold' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: 'rgba(201,168,76,0.18)', border: '1px solid rgba(201,168,76,0.4)', color: '#C9A84C' }}>
                      <Crown size={8} /> Gold
                    </span>
                  )}
                  {p.premium_tier === 'platinum' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: 'rgba(232,232,232,0.12)', border: '1px solid rgba(232,232,232,0.3)', color: '#E8E8E8' }}>
                      <Crown size={8} /> Platinum
                    </span>
                  )}
                  {item.is_matched && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-gold"
                      style={{ background: 'rgba(201,168,76,0.2)', border: '1px solid rgba(201,168,76,0.4)' }}>
                      <Heart size={9} className="fill-gold" /> Matched
                    </span>
                  )}
                </div>
                {p.profession && <p className="text-white/55 text-sm mt-1">{p.profession}{p.company ? ` · ${p.company}` : ''}</p>}
                {p.city && (
                  <p className="flex items-center gap-1 text-white/35 text-xs mt-1.5">
                    <MapPin size={11} /> {[p.city, p.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        <div className="p-5 flex gap-3">
          {!canSee ? (
            <>
              <Link href="/verify" onClick={onClose}
                className="flex-1 h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                style={{ background: 'rgba(74,144,226,0.15)', border: '1px solid rgba(74,144,226,0.35)', color: '#93c5fd' }}>
                <ShieldCheck size={16} /> Get Verified
              </Link>
              <Link href="/premium" onClick={onClose}
                className="flex-1 h-12 btn-gold rounded-2xl font-bold text-black text-sm flex items-center justify-center gap-2">
                <Crown size={16} /> Go Gold
              </Link>
            </>
          ) : justMatched ? (
            <>
              <button onClick={onClose}
                className="flex-1 h-12 rounded-2xl text-sm font-semibold text-white/50 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Keep browsing
              </button>
              <Link href={item.conversationId || newConvId ? `/messages/${item.conversationId || newConvId}` : '/messages'}
                className="flex-1 h-12 btn-gold rounded-2xl font-bold text-black text-sm flex items-center justify-center gap-2">
                <MessageCircle size={16} /> Say Hi!
              </Link>
            </>
          ) : item.is_matched ? (
            <>
              <button onClick={onClose}
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-colors shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <X size={18} />
              </button>
              <Link href={item.conversationId ? `/messages/${item.conversationId}` : '/messages'}
                className="flex-1 h-12 btn-gold rounded-2xl font-bold text-black text-sm flex items-center justify-center gap-2">
                <MessageCircle size={16} /> Chat Now
              </Link>
            </>
          ) : (
            <>
              <button onClick={onClose}
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-colors shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <X size={18} />
              </button>
              <button onClick={likeBack} disabled={liking}
                className="flex-1 h-12 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#F43F5E,#EC4899)' }}>
                {liking ? <Loader2 size={16} className="animate-spin" /> : <><Heart size={16} className="fill-white" /> Like Back</>}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Match card ───────────────────────────────────────────────
function MatchCard({ match, onRemove, onExtend }: {
  match: MatchItem; onRemove: (id: string) => void; onExtend: (name: string) => void
}) {
  const [menuOpen, setMenuOpen]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [confirm, setConfirm]       = useState<'unmatch' | 'block' | null>(null)
  const p = match.profile
  const isNew = !match.conversationId
  const { label: expiryLabel, urgent: expiryUrgent } = useExpiry(match.expires_at)
  const tier = p.premium_tier

  async function unmatch() {
    setLoading(true)
    const res = await fetch(`/api/matches/${match.id}`, { method: 'DELETE' })
    setLoading(false); setConfirm(null)
    if (res.ok) onRemove(match.id)
  }

  async function block() {
    setLoading(true)
    const res = await fetch(`/api/users/${match.profile.id}/block`, { method: 'POST' })
    setLoading(false); setConfirm(null)
    if (res.ok) onRemove(match.id)
  }

  return (
    <>
      <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        className="glass rounded-3xl overflow-hidden group hover:border-white/20 transition-all relative"
        style={{
          border: tier === 'platinum' ? '1px solid rgba(232,232,232,0.3)'
                : tier === 'gold'     ? '1px solid rgba(201,168,76,0.35)'
                : '1px solid rgba(255,255,255,0.1)',
        }}>
        <TierCardGlow tier={tier} />
        <div className="aspect-[3/4] relative">
          {p.avatar_url ? (
            <Image src={p.avatar_url} alt={p.full_name} fill className="object-cover"
              sizes="(max-width:768px) 100vw,(max-width:1200px) 50vw,33vw" />
          ) : (
            <div className="absolute inset-0 bg-white/5 flex items-center justify-center text-5xl font-bold text-white/10 uppercase">
              {(p.full_name?.[0] ?? '?')}
            </div>
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.1) 55%,transparent 100%)' }} />

          {/* Top row */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              {p.is_online && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold text-green-300 bg-black/50 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> Online
                </span>
              )}
              {isNew && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm"
                  style={{ background: 'rgba(201,168,76,0.35)', color: '#fde68a', border: '1px solid rgba(201,168,76,0.5)' }}>
                  <Sparkles size={9} /> New
                </span>
              )}
              {expiryLabel && expiryLabel !== 'Expired' && (
                <button
                  onClick={() => expiryUrgent && onExtend(p.full_name)}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm transition-all"
                  style={{
                    background: expiryUrgent ? 'rgba(231,76,60,0.40)' : 'rgba(0,0,0,0.45)',
                    color: expiryUrgent ? '#fca5a5' : 'rgba(255,255,255,0.55)',
                    border: `1px solid ${expiryUrgent ? 'rgba(231,76,60,0.6)' : 'rgba(255,255,255,0.15)'}`,
                  }}>
                  <Clock size={9} /> {expiryLabel}
                  {expiryUrgent && <span className="ml-0.5 opacity-70">· Extend</span>}
                </button>
              )}
              {tier && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm"
                  style={tier === 'platinum'
                    ? { background: 'rgba(232,232,232,0.15)', color: '#E8E8E8', border: '1px solid rgba(232,232,232,0.3)' }
                    : { background: 'rgba(201,168,76,0.2)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.4)' }}>
                  <Crown size={8} /> {tier === 'platinum' ? 'Platinum' : 'Gold'}
                </span>
              )}
            </div>

            {/* ⋮ menu */}
            <div className="relative">
              <button onClick={() => setMenuOpen(v => !v)}
                className="w-8 h-8 rounded-xl bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white transition-colors border border-white/10">
                {loading ? <Loader2 size={13} className="animate-spin" /> : <MoreHorizontal size={14} />}
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <>
                    <motion.div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                    <motion.div className="absolute right-0 top-10 w-44 glass rounded-2xl overflow-hidden z-40 shadow-xl border border-white/10"
                      initial={{ opacity: 0, scale: 0.9, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -8 }}>
                      <button onClick={() => { setMenuOpen(false); setConfirm('unmatch') }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/[0.06] transition-colors">
                        <UserMinus size={13} style={{ color: '#F39C12' }} />
                        <span className="text-white/70">Unmatch</span>
                      </button>
                      <button onClick={() => { setMenuOpen(false); setConfirm('block') }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/[0.06] transition-colors">
                        <ShieldBan size={13} style={{ color: '#F39C12' }} />
                        <span className="text-white/70">Block</span>
                      </button>
                      <button onClick={() => { setMenuOpen(false); setReportOpen(true) }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-red-500/10 transition-colors">
                        <Flag size={13} style={{ color: '#E74C3C' }} />
                        <span className="text-red-400">Report</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Name */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <h3 className="text-base font-bold text-white truncate">{p.full_name}</h3>
              {p.is_verified && <BadgeCheck size={14} className="fill-blue-400 text-blue-300 shrink-0" />}
            </div>
            <p className="text-white/50 text-xs truncate">{p.profession}{p.company ? ` · ${p.company}` : ''}</p>
            {p.city && (
              <p className="flex items-center gap-1 text-[10px] text-white/30 mt-1">
                <MapPin size={9} /> {[p.city, p.country].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Chat button */}
        <div className="p-3">
          <Link href={match.conversationId ? `/messages/${match.conversationId}` : '/messages'}
            className="w-full h-10 btn-gold rounded-2xl font-bold text-black text-sm flex items-center justify-center gap-2">
            <MessageCircle size={15} />
            {isNew ? 'Start Chat' : 'Continue Chat'}
          </Link>
        </div>
      </motion.div>

      <AnimatePresence>
        {reportOpen && <ReportModal targetId={p.id} targetName={p.full_name} onClose={() => setReportOpen(false)} />}
      </AnimatePresence>
      <ConfirmModal open={confirm === 'unmatch'} title={`Unmatch with ${p.full_name}?`}
        message="This will remove the match and all messages permanently."
        confirmLabel="Unmatch" variant="warning" loading={loading}
        onConfirm={unmatch} onCancel={() => setConfirm(null)} />
      <ConfirmModal open={confirm === 'block'} title={`Block ${p.full_name}?`}
        message="They won't be able to contact you. This also removes the match."
        confirmLabel="Block" variant="danger" loading={loading}
        onConfirm={block} onCancel={() => setConfirm(null)} />
    </>
  )
}

// ─── Sort options ─────────────────────────────────────────────
type SortKey = 'newest' | 'online' | 'new_only'

// ─── Page ─────────────────────────────────────────────────────
export default function MatchesPage({ canSeeProfiles, isPremium, isVerified }: {
  canSeeProfiles: boolean
  isPremium: boolean
  isVerified: boolean
}) {
  const [matches,      setMatches]      = useState<MatchItem[]>([])
  const [likedYou,     setLikedYou]     = useState<LikedYouItem[]>([])
  const [loading,      setLoading]      = useState(true)
  const [loadingLikes, setLoadingLikes] = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [activeStory,  setActiveStory]  = useState<LikedYouItem | null>(null)
  const [showUpgrade,  setShowUpgrade]  = useState(false)
  const [extendTarget, setExtendTarget] = useState<string | null>(null)

  // Sort + search
  const [sort, setSort]     = useState<SortKey>('newest')
  const [search, setSearch] = useState('')
  const [showSort, setShowSort] = useState(false)

  // Story lazy load
  const STORIES_PAGE = 10
  const [storiesVisible, setStoriesVisible] = useState(STORIES_PAGE)

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setLoadingLikes(true) }
    const [matchRes, likesRes] = await Promise.all([
      fetch('/api/matches').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/matches/likes-you').then(r => r.ok ? r.json() : []).catch(() => []),
    ])
    setMatches(Array.isArray(matchRes) ? matchRes : [])
    setLikedYou(Array.isArray(likesRes) ? likesRes : [])
    if (!silent) { setLoading(false); setLoadingLikes(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Real-time: new matches
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('matches-rt')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        () => fetchAll(true)
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchAll])

  async function refresh() {
    setRefreshing(true)
    await fetchAll(true)
    setRefreshing(false)
  }

  function removeMatch(id: string) { setMatches(prev => prev.filter(m => m.id !== id)) }
  function handleLikedBack() { setTimeout(() => fetchAll(true), 900) }

  // Sort + filter matches
  const sortedMatches = useMemo(() => {
    let list = matches.filter(m =>
      !search.trim() || m.profile.full_name.toLowerCase().includes(search.toLowerCase())
    )
    if (sort === 'online')   list = list.filter(m => m.profile.is_online)
    if (sort === 'new_only') list = list.filter(m => !m.conversationId)
    if (sort === 'newest')   list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return list
  }, [matches, sort, search])

  const visibleStories = likedYou.slice(0, storiesVisible)
  const hiddenCount    = likedYou.length - visibleStories.length
  const newMatches     = matches.filter(m => !m.conversationId).length

  const SORT_LABELS: Record<SortKey, string> = {
    newest:   'Newest first',
    online:   'Online now',
    new_only: 'Not chatted',
  }

  return (
    <main className="min-h-screen pt-nav pb-nav-bottom max-w-5xl mx-auto px-4 sm:px-6">

      {/* Stats bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Heart size={18} className="text-gold fill-gold" />
            <span className="text-sm font-bold uppercase tracking-widest text-gold">Connections</span>
          </div>
          <button onClick={refresh} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-xl text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-40">
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Liked You', value: loadingLikes ? '…' : likedYou.length, color: '#F43F5E', sub: 'total' },
            { label: 'Matches',   value: loading ? '…' : matches.length,        color: '#C9A84C', sub: 'mutual' },
            { label: 'New',       value: loading ? '…' : newMatches,            color: '#34D399', sub: 'unread' },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl p-4 text-center border border-white/[0.07]">
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-white/50 text-xs mt-0.5 font-medium">{s.label}</div>
              <div className="text-white/20 text-[10px]">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Liked You stories strip */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Heart size={16} className="fill-rose-400 text-rose-400" />
              Liked You
              {!loadingLikes && likedYou.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(244,63,94,0.18)', color: '#fda4af', border: '1px solid rgba(244,63,94,0.3)' }}>
                  {likedYou.length}
                </span>
              )}
            </h2>
            <p className="text-white/35 text-xs mt-0.5">Tap a circle to view &amp; respond</p>
          </div>
        </div>

        {!loadingLikes && likedYou.length > 0 && !canSeeProfiles && (
          <div className="mb-3 flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.18)' }}>
            <Lock size={14} style={{ color: '#C9A84C' }} className="shrink-0" />
            <p className="text-xs text-white/50 flex-1">
              Profiles hidden. <button onClick={() => setShowUpgrade(true)} className="text-gold underline underline-offset-2 font-semibold">Unlock with Gold + Verified</button>
            </p>
          </div>
        )}

        {loadingLikes ? (
          <div className="flex gap-4 -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto no-scrollbar pb-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0 animate-pulse">
                <div className="w-[68px] h-[68px] rounded-full bg-white/[0.07]" />
                <div className="w-12 h-2.5 rounded-full bg-white/[0.05]" />
              </div>
            ))}
          </div>
        ) : likedYou.length === 0 ? (
          <div className="glass rounded-2xl px-6 py-5 flex items-center gap-4 border border-white/[0.06]">
            <div className="w-12 h-12 rounded-full bg-white/[0.05] flex items-center justify-center shrink-0">
              <Heart size={20} className="text-white/20" />
            </div>
            <div>
              <p className="text-white/60 text-sm font-semibold">No likes yet</p>
              <p className="text-white/30 text-xs mt-0.5">Profiles that like you will appear here as stories.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-4 -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto no-scrollbar pb-2" style={{ scrollbarWidth: 'none' }}>
              {visibleStories.map((item, i) => (
                <motion.div key={item.swipeId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <StoryCircle item={item} canSee={canSeeProfiles}
                    onClick={() => canSeeProfiles ? setActiveStory(item) : setShowUpgrade(true)} />
                </motion.div>
              ))}
              {/* "Show X more" circle */}
              {hiddenCount > 0 && (
                <motion.button
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={() => setStoriesVisible(v => v + STORIES_PAGE)}
                  className="flex flex-col items-center gap-2 flex-shrink-0 group outline-none">
                  <div className="w-[68px] h-[68px] rounded-full border-2 border-dashed border-white/20 flex items-center justify-center transition-all group-hover:border-white/40">
                    <span className="text-white/50 text-xs font-bold group-hover:text-white/70">+{hiddenCount}</span>
                  </div>
                  <span className="text-[11px] text-white/30">more</span>
                </motion.button>
              )}
            </div>
          </>
        )}
      </section>

      {/* Matches section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-gold" />
              Your Matches
              {!loading && matches.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(201,168,76,0.15)', color: '#fde68a', border: '1px solid rgba(201,168,76,0.3)' }}>
                  {matches.length}
                </span>
              )}
            </h2>
            <p className="text-white/35 text-xs mt-0.5">People who liked you back</p>
          </div>

          {/* Sort button */}
          <div className="relative">
            <button onClick={() => setShowSort(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-xl text-xs font-semibold transition-all"
              style={{ color: sort !== 'newest' ? '#C9A84C' : 'rgba(255,255,255,0.5)' }}>
              <ArrowUpDown size={12} />
              {SORT_LABELS[sort]}
            </button>
            <AnimatePresence>
              {showSort && (
                <>
                  <motion.div className="fixed inset-0 z-30" onClick={() => setShowSort(false)} />
                  <motion.div
                    className="absolute right-0 top-10 w-44 glass rounded-2xl overflow-hidden z-40 shadow-xl border border-white/10"
                    initial={{ opacity: 0, scale: 0.9, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -8 }}>
                    {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => (
                      <button key={key}
                        onClick={() => { setSort(key); setShowSort(false) }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/[0.06] transition-colors"
                        style={{ color: sort === key ? '#C9A84C' : 'rgba(255,255,255,0.7)' }}>
                        {sort === key && <span className="text-xs">✓</span>}
                        {label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Search */}
        {matches.length > 3 && (
          <div className="relative mb-5">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search matches by name…"
              className="w-full h-10 pl-9 pr-4 rounded-xl text-sm text-white placeholder-white/25 outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }} />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass rounded-3xl overflow-hidden animate-pulse">
                <div className="aspect-[3/4] bg-white/[0.04]" />
                <div className="p-3"><div className="h-9 bg-white/[0.04] rounded-2xl" /></div>
              </div>
            ))}
          </div>
        ) : sortedMatches.length === 0 && matches.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center border border-white/[0.06]">
            <div className="w-16 h-16 bg-white/[0.05] rounded-full flex items-center justify-center mx-auto mb-5">
              <Heart size={28} className="text-white/15" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No matches yet</h3>
            <p className="text-white/35 text-sm max-w-xs mx-auto mb-7">Keep exploring and liking profiles. Your matches will show up here.</p>
            <Link href="/discover" className="btn-gold px-8 py-3 rounded-2xl font-bold text-black text-sm inline-flex items-center gap-2">
              <Sparkles size={15} /> Go Discover
            </Link>
          </div>
        ) : sortedMatches.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center border border-white/[0.06]">
            <p className="text-white/50 text-sm">No matches found{search ? ` for "${search}"` : ` ${sort === 'online' ? 'online right now' : 'that haven\'t chatted'}`}</p>
            <button onClick={() => { setSearch(''); setSort('newest') }}
              className="mt-3 text-gold text-sm underline underline-offset-2">Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {sortedMatches.map(match => (
                <MatchCard key={match.id} match={match} onRemove={removeMatch}
                  onExtend={name => setExtendTarget(name)} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Modals */}
      <AnimatePresence>
        {activeStory && (
          <StoryPreviewModal item={activeStory} canSee={canSeeProfiles}
            onClose={() => setActiveStory(null)} onLikedBack={handleLikedBack} />
        )}
        {showUpgrade && <UpgradeGateModal onClose={() => setShowUpgrade(false)} isPremium={isPremium} isVerified={isVerified} />}
        {extendTarget && <ExtendModal matchName={extendTarget} onClose={() => setExtendTarget(null)} />}
      </AnimatePresence>
    </main>
  )
}
