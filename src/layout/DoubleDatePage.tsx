'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, BadgeCheck, MapPin, Users, Sparkles, Crown, Loader2, Info, X } from 'lucide-react'

interface CoupleProfile {
  id: string
  full_name: string
  avatar_url: string | null
  photos: string[]
  city: string | null
  country: string | null
  age: number | null
  profession: string | null
  is_verified: boolean
  is_premium: boolean
  premium_tier: 'gold' | 'platinum' | null
}

interface Couple {
  id: string
  user1: CoupleProfile
  user2: CoupleProfile
}

function CoupleCard({ couple }: { couple: Couple }) {
  const [liked, setLiked] = useState(false)
  const p1thumb = couple.user1.photos[0] ?? couple.user1.avatar_url
  const p2thumb = couple.user2.photos[0] ?? couple.user2.avatar_url

  return (
    <motion.div layout
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="glass rounded-3xl overflow-hidden">
      {/* Couple photos - side by side */}
      <div className="grid grid-cols-2 gap-0.5 h-52">
        {[{ profile: couple.user1, thumb: p1thumb }, { profile: couple.user2, thumb: p2thumb }].map(({ profile, thumb }, i) => (
          <div key={profile.id} className={`relative ${i === 0 ? 'rounded-tl-3xl' : 'rounded-tr-3xl'} overflow-hidden`}
            style={{ background: '#1A1A1F' }}>
            {thumb
              ? <Image src={thumb} alt={profile.full_name} fill className="object-cover" />
              : <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white/20">{profile.full_name[0]}</span>
                </div>}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 30%, transparent)' }} />
            <div className="absolute bottom-2 left-2 right-2">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-white truncate">{profile.full_name.split(' ')[0]}{profile.age ? `, ${profile.age}` : ''}</span>
                {profile.is_verified && <BadgeCheck size={11} style={{ color: '#4A90E2' }} />}
                {profile.is_premium && <Crown size={11} style={{ color: '#C9A84C' }} />}
              </div>
              {profile.profession && <p className="text-[10px] text-white/50 truncate">{profile.profession}</p>}
            </div>
          </div>
        ))}
        {/* Heart overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg z-10"
            style={{ background: '#1A1A1F', border: '2px solid rgba(255,255,255,0.12)' }}>
            <Heart size={16} fill="#E8637A" style={{ color: '#E8637A' }} />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Users size={14} className="text-white/40 shrink-0" />
          <p className="text-sm font-semibold text-white truncate">
            {couple.user1.full_name.split(' ')[0]} &amp; {couple.user2.full_name.split(' ')[0]}
          </p>
        </div>
        {(couple.user1.city || couple.user2.city) && (
          <div className="flex items-center gap-1.5 text-xs text-white/40 mb-3">
            <MapPin size={11} />
            {couple.user1.city ?? couple.user2.city}{couple.user1.country ? `, ${couple.user1.country}` : ''}
          </div>
        )}
        <button onClick={() => setLiked(l => !l)}
          className="w-full h-10 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
          style={liked
            ? { background: 'rgba(232,99,122,0.15)', border: '1px solid rgba(232,99,122,0.4)', color: '#E8637A' }
            : { background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}>
          <Heart size={14} fill={liked ? '#E8637A' : 'none'} />
          {liked ? 'Interest sent!' : 'Express interest'}
        </button>
      </div>
    </motion.div>
  )
}

export default function DoubleDatePage() {
  const [couples, setCouples]       = useState<Couple[]>([])
  const [loading, setLoading]       = useState(true)
  const [myActive, setMyActive]     = useState(false)
  const [toggling, setToggling]     = useState(false)
  const [showInfo, setShowInfo]     = useState(false)

  useEffect(() => {
    fetch('/api/double-date')
      .then(r => r.ok ? r.json() : { couples: [] })
      .then(d => { setCouples(d.couples ?? []); setLoading(false); })
      .catch(() => setLoading(false))
    // Check own profile for double_date_active
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.double_date_active) setMyActive(true) })
      .catch(() => {})
  }, [])

  async function toggleActive() {
    setToggling(true)
    const next = !myActive
    const res = await fetch('/api/double-date', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: next }),
    })
    if (res.ok) setMyActive(next)
    setToggling(false)
    if (next) {
      // Refresh couples list after activating
      const r = await fetch('/api/double-date')
      if (r.ok) { const d = await r.json(); setCouples(d.couples ?? []) }
    }
  }

  return (
    <div className="min-h-screen pt-nav pb-nav-bottom px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between pt-2 mb-2">
          <div className="flex items-center gap-2">
            <Heart size={22} style={{ color: '#E8637A' }} fill="#E8637A" />
            <h1 className="text-2xl font-bold text-white">Double Date</h1>
          </div>
          <button onClick={() => setShowInfo(v => !v)} className="w-9 h-9 glass rounded-xl flex items-center justify-center">
            <Info size={15} className="text-white/50" />
          </button>
        </div>

        <AnimatePresence>
          {showInfo && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4">
              <div className="glass rounded-2xl p-4 text-sm text-white/60 leading-relaxed border border-white/[0.06] relative">
                <button onClick={() => setShowInfo(false)} className="absolute top-3 right-3 text-white/30 hover:text-white/60"><X size={14} /></button>
                <p className="font-semibold text-white/80 mb-1.5">How it works</p>
                <p>Activate Double Date mode to be matched with other couples who are also looking for a fun group experience. Both partners in a match need to activate to appear in the list.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My status toggle */}
        <div className="glass rounded-2xl p-4 mb-5 flex items-center gap-4"
          style={{ border: myActive ? '1px solid rgba(232,99,122,0.30)' : '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: myActive ? 'rgba(232,99,122,0.15)' : 'rgba(255,255,255,0.06)' }}>
            <Users size={18} style={{ color: myActive ? '#E8637A' : 'rgba(255,255,255,0.40)' }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">
              {myActive ? 'You\'re looking for a double date' : 'Join Double Date mode'}
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              {myActive ? 'Other couples can see you' : 'Both you and your match need to activate'}
            </p>
          </div>
          <button onClick={toggleActive} disabled={toggling}
            className="relative w-11 h-6 rounded-full transition-all duration-300 shrink-0"
            style={{ background: myActive ? '#E8637A' : 'rgba(255,255,255,0.10)' }}>
            {toggling
              ? <Loader2 size={10} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
              : <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300"
                  style={{ left: myActive ? '1.375rem' : '0.125rem' }} />}
          </button>
        </div>

        {/* Couples list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 size={28} className="animate-spin text-white/30" />
            <p className="text-sm text-white/40">Finding couples near you…</p>
          </div>
        ) : couples.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(232,99,122,0.12)', border: '1px solid rgba(232,99,122,0.25)' }}>
              <Sparkles size={28} style={{ color: '#E8637A' }} />
            </div>
            <p className="font-semibold text-white/60 mb-2">No couples available yet</p>
            <p className="text-sm text-white/35 max-w-xs mx-auto">Activate Double Date mode above, and encourage your match to do the same. More couples join every day!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {couples.map(couple => <CoupleCard key={couple.id} couple={couple} />)}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
