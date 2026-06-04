'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, BadgeCheck, MapPin, Users, Sparkles, Crown, Loader2, Info, X, MessageCircle } from 'lucide-react'

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
  double_date_active?: boolean | null
}

interface Couple {
  id: string
  user1: CoupleProfile
  user2: CoupleProfile
  isLooking: boolean
  bothLooking: boolean
}

function CoupleCard({ couple }: { couple: Couple }) {
  const [liked, setLiked] = useState(false)
  const p1thumb = couple.user1.photos?.[0] ?? couple.user1.avatar_url
  const p2thumb = couple.user2.photos?.[0] ?? couple.user2.avatar_url

  return (
    <motion.div layout
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="glass rounded-3xl overflow-hidden">

      {/* Couple photos — side by side */}
      <div className="relative grid grid-cols-2 gap-0.5 h-52">
        {[{ profile: couple.user1, thumb: p1thumb }, { profile: couple.user2, thumb: p2thumb }].map(({ profile, thumb }, i) => (
          <div key={profile.id}
            className={`relative overflow-hidden ${i === 0 ? 'rounded-tl-3xl' : 'rounded-tr-3xl'}`}
            style={{ background: '#1A1A1F' }}>
            {thumb
              ? <Image src={thumb} alt={profile.full_name} fill className="object-cover" />
              : <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white/20">{profile.full_name[0]}</span>
                </div>}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 30%, transparent)' }} />
            <div className="absolute bottom-2 left-2 right-2">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-white truncate">
                  {profile.full_name.split(' ')[0]}{profile.age ? `, ${profile.age}` : ''}
                </span>
                {profile.is_verified && <BadgeCheck size={11} style={{ color: '#4A90E2' }} />}
                {profile.is_premium && <Crown size={11} style={{ color: '#C9A84C' }} />}
              </div>
              {profile.profession && <p className="text-[10px] text-white/50 truncate">{profile.profession}</p>}
            </div>
          </div>
        ))}

        {/* Heart divider in center */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: '#1A1A1F', border: '2px solid rgba(255,255,255,0.10)' }}>
            <Heart size={16} fill="#E8637A" style={{ color: '#E8637A' }} />
          </div>
        </div>

        {/* Status badge */}
        {couple.bothLooking && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-black z-10"
            style={{ background: '#2ECC71' }}>
            ✓ Looking for a double date
          </div>
        )}
        {couple.isLooking && !couple.bothLooking && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold z-10"
            style={{ background: 'rgba(201,168,76,0.90)', color: '#000' }}>
            Interested in meeting
          </div>
        )}
      </div>

      {/* Info row */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Users size={13} className="text-white/40 shrink-0" />
          <p className="text-sm font-semibold text-white truncate">
            {couple.user1.full_name.split(' ')[0]} &amp; {couple.user2.full_name.split(' ')[0]}
          </p>
        </div>
        {(couple.user1.city || couple.user2.city) && (
          <div className="flex items-center gap-1.5 text-xs text-white/40 mb-3">
            <MapPin size={11} />
            {couple.user1.city ?? couple.user2.city}
            {(couple.user1.country ?? couple.user2.country) ? `, ${couple.user1.country ?? couple.user2.country}` : ''}
          </div>
        )}
        <button onClick={() => setLiked(l => !l)}
          className="w-full h-10 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
          style={liked
            ? { background: 'rgba(232,99,122,0.15)', border: '1px solid rgba(232,99,122,0.40)', color: '#E8637A' }
            : { background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}>
          <Heart size={14} fill={liked ? '#E8637A' : 'none'} />
          {liked ? '💌 Interest sent!' : 'Send interest'}
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

  async function load() {
    setLoading(true)
    const res = await fetch('/api/double-date')
    if (res.ok) {
      const d = await res.json()
      setCouples(d.couples ?? [])
      setMyActive(d.myActive ?? false)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleActive() {
    setToggling(true)
    const next = !myActive
    const res = await fetch('/api/double-date', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: next }),
    })
    if (res.ok) setMyActive(next)
    setToggling(false)
  }

  const lookingCount = couples.filter(c => c.isLooking || c.bothLooking).length

  return (
    <div className="min-h-screen pt-nav pb-nav-bottom px-4">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between pt-2 mb-2">
          <div className="flex items-center gap-2">
            <Heart size={22} style={{ color: '#E8637A', fill: '#E8637A' }} />
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
              <div className="glass rounded-2xl p-4 text-sm text-white/60 leading-relaxed relative border border-white/[0.06]">
                <button onClick={() => setShowInfo(false)} className="absolute top-3 right-3 text-white/30 hover:text-white/60"><X size={14} /></button>
                <p className="font-semibold text-white/80 mb-1.5">How Double Date works</p>
                <p>Browse other matched couples below. Send interest to a couple — if they send interest back, you&apos;ll both be notified and can start planning a group outing! Couples with a green &quot;Looking&quot; badge have opted in specifically.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My status toggle */}
        <div className="glass rounded-2xl p-4 mb-5 flex items-center gap-4"
          style={{ border: myActive ? '1px solid rgba(46,204,113,0.30)' : '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: myActive ? 'rgba(46,204,113,0.12)' : 'rgba(255,255,255,0.06)' }}>
            <Users size={18} style={{ color: myActive ? '#2ECC71' : 'rgba(255,255,255,0.40)' }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">
              {myActive ? "You're looking for a double date!" : 'Activate Double Date mode'}
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              {myActive ? 'Your couple appears as "Looking" to others' : 'Let other couples know you want to meet up'}
            </p>
          </div>
          <button onClick={toggleActive} disabled={toggling}
            className="relative w-11 h-6 rounded-full transition-all duration-300 shrink-0"
            style={{ background: myActive ? '#2ECC71' : 'rgba(255,255,255,0.10)' }}>
            {toggling
              ? <Loader2 size={10} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
              : <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300"
                  style={{ left: myActive ? '1.375rem' : '0.125rem' }} />}
          </button>
        </div>

        {/* Stats bar */}
        {!loading && couples.length > 0 && (
          <div className="flex items-center gap-2 mb-4 text-xs text-white/40">
            <span className="px-2.5 py-1 rounded-full glass">{couples.length} couples nearby</span>
            {lookingCount > 0 && (
              <span className="px-2.5 py-1 rounded-full" style={{ background: 'rgba(46,204,113,0.10)', color: '#2ECC71' }}>
                {lookingCount} actively looking
              </span>
            )}
          </div>
        )}

        {/* Couples grid */}
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
            <p className="font-semibold text-white/60 mb-2">No couples yet</p>
            <p className="text-sm text-white/35 max-w-xs mx-auto">As more people join and make matches, couples will appear here. Check the <Link href="/discover" className="underline text-white/50">Discover</Link> page to make more matches first!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {couples.map(couple => <CoupleCard key={couple.id} couple={couple} />)}
            </AnimatePresence>
          </div>
        )}

        {!loading && couples.length > 0 && (
          <div className="mt-6 glass rounded-2xl p-4 flex items-center gap-3"
            style={{ border: '1px solid rgba(201,168,76,0.15)' }}>
            <MessageCircle size={16} style={{ color: '#C9A84C' }} />
            <p className="text-xs text-white/50">When both couples express interest, you&apos;ll both be notified to start planning!</p>
          </div>
        )}
      </div>
    </div>
  )
}
