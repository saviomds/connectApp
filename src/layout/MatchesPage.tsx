'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  MessageCircle, Heart, MapPin, BadgeCheck, MoreHorizontal,
  UserMinus, ShieldBan, Flag, Loader2,
} from 'lucide-react'

// ─── Report modal (same as Discover) ─────────────────────────
const REPORT_REASONS = [
  { id: 'spam',          label: 'Spam or scam',         emoji: '🚫' },
  { id: 'inappropriate', label: 'Inappropriate content', emoji: '⚠️' },
  { id: 'harassment',    label: 'Harassment',            emoji: '😠' },
  { id: 'fake_profile',  label: 'Fake profile',          emoji: '🎭' },
  { id: 'other',         label: 'Other',                 emoji: '📝' },
] as const

type ReportReason = typeof REPORT_REASONS[number]['id']

function ReportModal({ targetId, targetName, onClose }: { targetId: string; targetName: string; onClose: () => void }) {
  const [reason, setReason]     = useState<ReportReason | ''>('')
  const [details, setDetails]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]         = useState(false)

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
                  <span className="text-base">{emoji}</span>
                  {label}
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

// ─── Match card ───────────────────────────────────────────────
interface MatchItem {
  id: string
  conversationId: string | null
  profile: {
    id: string; full_name: string; avatar_url: string | null
    profession: string | null; company: string | null
    city: string | null; country: string | null
    is_verified: boolean; is_online: boolean
  }
}

function MatchCard({ match, onRemove }: { match: MatchItem; onRemove: (id: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  async function unmatch() {
    if (!confirm(`Unmatch with ${match.profile.full_name}? This cannot be undone.`)) return
    setMenuOpen(false)
    setLoading(true)
    if (match.conversationId) {
      await fetch(`/api/conversations/${match.conversationId}`, { method: 'DELETE' })
    }
    setLoading(false)
    onRemove(match.id)
  }

  async function block() {
    if (!confirm(`Block ${match.profile.full_name}? This will also remove the match.`)) return
    setMenuOpen(false)
    setLoading(true)
    await fetch(`/api/users/${match.profile.id}/block`, { method: 'POST' })
    setLoading(false)
    onRemove(match.id)
  }

  const p = match.profile

  return (
    <>
      <div className="glass rounded-3xl overflow-hidden border border-white/10 group hover:border-gold/30 transition-all relative">
        {/* Avatar */}
        <div className="aspect-[4/5] relative">
          {p.avatar_url ? (
            <Image src={p.avatar_url} alt={p.full_name} fill className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
          ) : (
            <div className="absolute inset-0 bg-white/5 flex items-center justify-center text-4xl font-bold text-white/10 uppercase">
              {p.full_name[0]}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

          {/* Online indicator */}
          {p.is_online && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] text-white/80 font-medium">Online</span>
            </div>
          )}

          {/* ⋮ menu */}
          <div className="absolute top-3 right-3">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-8 h-8 rounded-xl bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-colors">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <MoreHorizontal size={14} />}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <>
                  <motion.div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    className="absolute right-0 top-10 w-44 glass rounded-2xl overflow-hidden z-40 shadow-xl border border-white/10"
                    initial={{ opacity: 0, scale: 0.9, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -8 }}>
                    <button onClick={unmatch}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/[0.06] transition-colors">
                      <UserMinus size={13} style={{ color: '#F39C12' }} />
                      <span className="text-white/70">Unmatch</span>
                    </button>
                    <button onClick={block}
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

          {/* Name overlay */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="text-lg font-bold truncate">{p.full_name}</h3>
              {p.is_verified && <BadgeCheck size={16} className="fill-blue-400 text-white shrink-0" />}
            </div>
            <p className="text-white/60 text-xs truncate mb-1.5">{p.profession}{p.company ? ` · ${p.company}` : ''}</p>
            {p.city && (
              <div className="flex items-center gap-1 text-[10px] text-white/40 uppercase tracking-tighter">
                <MapPin size={10} /> {[p.city, p.country].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* Chat button */}
        <div className="p-4 bg-white/[0.02]">
          <Link href={match.conversationId ? `/messages/${match.conversationId}` : `/messages`}
            className="w-full h-11 btn-gold rounded-2xl font-bold text-black text-sm flex items-center justify-center gap-2">
            <MessageCircle size={16} /> Chat Now
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {reportOpen && (
          <ReportModal targetId={p.id} targetName={p.full_name} onClose={() => setReportOpen(false)} />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────
export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/matches')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setMatches(data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function removeMatch(id: string) {
    setMatches(prev => prev.filter(m => m.id !== id))
  }

  return (
    <main className="min-h-screen pt-24 pb-12 px-6 max-w-5xl mx-auto">
      <header className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Heart size={20} className="text-gold fill-gold" />
          <span className="text-sm font-semibold uppercase tracking-widest text-gold">Your Connections</span>
        </div>
        <h1 className="text-4xl font-bold text-white">Matches</h1>
        <p className="text-white/40 mt-2">People who liked you back. Start a conversation!</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-3xl overflow-hidden animate-pulse">
              <div className="aspect-[4/5] bg-white/[0.04]" />
              <div className="p-4"><div className="h-11 bg-white/[0.04] rounded-2xl" /></div>
            </div>
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="glass rounded-3xl p-16 text-center border border-white/5">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart size={32} className="text-white/20" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No matches yet</h2>
          <p className="text-white/40 mb-8 max-w-sm mx-auto">Keep exploring and liking profiles in the Discover tab.</p>
          <Link href="/discover" className="btn-gold px-8 py-3 rounded-2xl font-bold text-black inline-block">
            Go Discover
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map(match => (
            <MatchCard key={match.id} match={match} onRemove={removeMatch} />
          ))}
        </div>
      )}
    </main>
  )
}
