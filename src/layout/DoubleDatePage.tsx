'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart, BadgeCheck, MapPin, Users, Sparkles, Crown, Loader2,
  ChevronRight, ArrowLeft, Check, X, MessageCircle, Search, Zap,
} from 'lucide-react'

/* ─── Types ──────────────────────────────────────────────────── */
interface MatchProfile {
  id: string
  full_name: string
  avatar_url: string | null
  photos?: string[]
  profession: string | null
  city: string | null
  country: string | null
  age?: number | null
  is_verified: boolean
  is_online: boolean
  is_premium: boolean
  premium_tier: 'gold' | 'platinum' | null
}

interface MyMatch {
  id: string          // match row id
  profile: MatchProfile
  conversationId: string | null
}

interface Couple {
  id: string
  user1: MatchProfile
  user2: MatchProfile
  isLooking: boolean
  bothLooking: boolean
}

/* ─── Small helpers ──────────────────────────────────────────── */
function Avatar({ p, size = 48 }: { p: MatchProfile; size?: number }) {
  const src = p.photos?.[0] ?? p.avatar_url
  if (src) return (
    <div className="relative shrink-0 rounded-full overflow-hidden" style={{ width: size, height: size }}>
      <Image src={src} alt={p.full_name} fill className="object-cover" />
    </div>
  )
  return (
    <div className="flex items-center justify-center rounded-full shrink-0 font-bold text-white/30"
      style={{ width: size, height: size, background: '#1A1A1F', fontSize: size * 0.35 }}>
      {p.full_name[0]}
    </div>
  )
}

function OnlineDot({ online }: { online: boolean }) {
  if (!online) return null
  return <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
    style={{ background: '#2ECC71', borderColor: 'var(--app-bg)' }} />
}

/* ─── Step 1: pick your date partner ────────────────────────── */
function ChooseDateStep({
  onPick,
}: { onPick: (m: MyMatch) => void }) {
  const [matches, setMatches]   = useState<MyMatch[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    fetch('/api/matches')
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        // API returns the array directly
        const arr: Array<{ id: string; conversationId: string | null; profile: MatchProfile }> =
          Array.isArray(d) ? d : []
        setMatches(arr)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = search.trim()
    ? matches.filter(m => m.profile.full_name.toLowerCase().includes(search.toLowerCase()))
    : matches

  return (
    <div>
      <div className="text-center mb-6 pt-2">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(232,99,122,0.12)', border: '1px solid rgba(232,99,122,0.25)' }}>
          <Heart size={28} fill="#E8637A" style={{ color: '#E8637A' }} />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Who&apos;s your date?</h2>
        <p className="text-sm text-white/45">Pick a match to join you on the double date</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search your matches…"
          className="w-full h-10 pl-9 pr-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-white/30" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/35">
          <Users size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No matches yet</p>
          <p className="text-sm mt-1 text-white/25">Make some matches first in Discover!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(m => (
            <button key={m.id} onClick={() => onPick(m)}
              className="w-full flex items-center gap-3 p-4 glass rounded-2xl hover:bg-white/[0.08] transition-all group text-left">
              <div className="relative">
                <Avatar p={m.profile} size={48} />
                <OnlineDot online={m.profile.is_online} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white truncate">{m.profile.full_name}</span>
                  {m.profile.is_verified && <BadgeCheck size={13} style={{ color: '#4A90E2' }} />}
                  {m.profile.is_premium && <Crown size={12} style={{ color: '#C9A84C' }} />}
                </div>
                <p className="text-xs text-white/40 mt-0.5 truncate">
                  {[m.profile.profession, m.profile.city].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {m.profile.is_online && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(46,204,113,0.12)', color: '#2ECC71' }}>Online</span>
                )}
                <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Step 2: browse groups ──────────────────────────────────── */
function BrowseGroupsStep({
  myDate,
  me,
  onChangeDate,
}: {
  myDate: MyMatch
  me: { id: string; full_name: string; avatar_url: string | null; photos?: string[] }
  onChangeDate: () => void
}) {
  const [couples, setCouples]   = useState<Couple[]>([])
  const [loading, setLoading]   = useState(true)
  const [invited, setInvited]   = useState<Set<string>>(new Set())
  const [filter, setFilter]     = useState<'all' | 'looking'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/double-date')
    if (res.ok) { const d = await res.json(); setCouples(d.couples ?? []) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function toggleInvite(coupleId: string) {
    setInvited(prev => {
      const next = new Set(prev)
      if (next.has(coupleId)) next.delete(coupleId); else next.add(coupleId)
      return next
    })
  }

  const visible = filter === 'looking'
    ? couples.filter(c => c.isLooking || c.bothLooking)
    : couples

  const meAsProfile: MatchProfile = {
    id: me.id, full_name: me.full_name, avatar_url: me.avatar_url,
    photos: me.photos, profession: null, city: null, country: null,
    is_verified: false, is_online: true, is_premium: false, premium_tier: null,
  }

  return (
    <div>
      {/* Our couple card */}
      <div className="glass rounded-2xl p-4 mb-5 flex items-center gap-3"
        style={{ border: '1px solid rgba(232,99,122,0.25)' }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative">
            <Avatar p={meAsProfile} size={40} />
          </div>
          <Heart size={14} fill="#E8637A" style={{ color: '#E8637A' }} className="shrink-0" />
          <div className="relative">
            <Avatar p={myDate.profile} size={40} />
            <OnlineDot online={myDate.profile.is_online} />
          </div>
          <div className="ml-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              You &amp; {myDate.profile.full_name.split(' ')[0]}
            </p>
            <p className="text-xs text-white/40">Your couple</p>
          </div>
        </div>
        <button onClick={onChangeDate}
          className="text-xs text-white/30 hover:text-white/70 transition-colors shrink-0 flex items-center gap-1">
          <X size={12} /> Change
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        {[
          { key: 'all', label: 'All couples' },
          { key: 'looking', label: '✓ Looking' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key as typeof filter)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={filter === tab.key
              ? { background: '#C9A84C', color: '#000' }
              : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-white/30">{visible.length} available</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-white/30" /></div>
      ) : visible.length === 0 ? (
        <div className="text-center py-12 text-white/35">
          <Sparkles size={28} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No couples here yet</p>
          <p className="text-sm mt-1 text-white/25">More join every day — check back soon!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((couple, i) => {
            const isInvited = invited.has(couple.id)
            const p1thumb = couple.user1.photos?.[0] ?? couple.user1.avatar_url
            const p2thumb = couple.user2.photos?.[0] ?? couple.user2.avatar_url

            return (
              <motion.div key={couple.id} layout
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass rounded-2xl overflow-hidden"
                style={{ border: isInvited ? '1px solid rgba(46,204,113,0.35)' : '1px solid rgba(255,255,255,0.06)' }}>

                {/* Photo strip */}
                <div className="relative h-36 grid grid-cols-2 gap-0.5">
                  {[{ profile: couple.user1, thumb: p1thumb }, { profile: couple.user2, thumb: p2thumb }].map(({ profile, thumb }, idx) => (
                    <div key={profile.id}
                      className={`relative overflow-hidden ${idx === 0 ? 'rounded-tl-2xl' : 'rounded-tr-2xl'}`}
                      style={{ background: '#1A1A1F' }}>
                      {thumb
                        ? <Image src={thumb} alt={profile.full_name} fill className="object-cover" />
                        : <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-white/15">{profile.full_name[0]}</div>}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 25%, transparent)' }} />
                      <div className="absolute bottom-2 left-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-white leading-none">{profile.full_name.split(' ')[0]}</span>
                          {profile.age && <span className="text-[10px] text-white/60">{profile.age}</span>}
                          {profile.is_verified && <BadgeCheck size={10} style={{ color: '#4A90E2' }} />}
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Divider heart */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--app-bg)', border: '1.5px solid rgba(255,255,255,0.10)' }}>
                      <Heart size={13} fill="#E8637A" style={{ color: '#E8637A' }} />
                    </div>
                  </div>
                  {/* Status badge */}
                  {couple.bothLooking && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold text-black z-10"
                      style={{ background: '#2ECC71' }}>✓ Looking</span>
                  )}
                </div>

                {/* Info + actions */}
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {couple.user1.full_name.split(' ')[0]} &amp; {couple.user2.full_name.split(' ')[0]}
                    </p>
                    {(couple.user1.city || couple.user2.city) && (
                      <div className="flex items-center gap-1 text-xs text-white/35 mt-0.5">
                        <MapPin size={10} />
                        {couple.user1.city ?? couple.user2.city}
                      </div>
                    )}
                  </div>

                  <button onClick={() => toggleInvite(couple.id)}
                    className="h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0"
                    style={isInvited
                      ? { background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.40)', color: '#2ECC71' }
                      : { background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.30)', color: '#C9A84C' }}>
                    {isInvited
                      ? <><Check size={12} /> Invited!</>
                      : <><Zap size={12} /> Invite</>}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {invited.size > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="mt-5 p-4 rounded-2xl flex items-center gap-3"
          style={{ background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.25)' }}>
          <MessageCircle size={16} style={{ color: '#2ECC71' }} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">
              {invited.size} couple{invited.size > 1 ? 's' : ''} invited!
            </p>
            <p className="text-xs text-white/45 mt-0.5">When they invite back, you&apos;ll both be notified to plan your date.</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function DoubleDatePage() {
  const [step, setStep]         = useState<'choose' | 'browse'>('choose')
  const [myDate, setMyDate]     = useState<MyMatch | null>(null)
  const [me, setMe]             = useState<{ id: string; full_name: string; avatar_url: string | null; photos?: string[] } | null>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMe({ id: d.id, full_name: d.full_name, avatar_url: d.avatar_url, photos: d.photos }) })
      .catch(() => {})
  }, [])

  function handlePickDate(m: MyMatch) {
    setMyDate(m)
    setStep('browse')
  }

  return (
    <div className="min-h-screen pt-nav pb-nav-bottom px-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 pt-2 mb-5">
          {step === 'browse' && (
            <button onClick={() => setStep('choose')} className="text-white/50 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Heart size={22} fill="#E8637A" style={{ color: '#E8637A' }} />
              Double Date
            </h1>
            <p className="text-xs text-white/35 mt-0.5">
              {step === 'choose' ? 'Step 1 of 2 — Choose your date partner' : 'Step 2 of 2 — Find another couple'}
            </p>
          </div>
        </div>

        {/* Step progress */}
        <div className="flex gap-2 mb-6">
          {[1, 2].map(n => (
            <div key={n} className="flex-1 h-1 rounded-full transition-all duration-500"
              style={{
                background: (n === 1 && (step === 'choose' || step === 'browse')) || (n === 2 && step === 'browse')
                  ? '#E8637A'
                  : 'rgba(255,255,255,0.10)',
              }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 'choose' && (
            <motion.div key="choose"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <ChooseDateStep onPick={handlePickDate} />
            </motion.div>
          )}

          {step === 'browse' && myDate && me && (
            <motion.div key="browse"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <BrowseGroupsStep
                myDate={myDate}
                me={me}
                onChangeDate={() => setStep('choose')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
