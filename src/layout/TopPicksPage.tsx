'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, BadgeCheck, MapPin, Crown, Lock, Sparkles, ChevronRight, Loader2, RefreshCw } from 'lucide-react'

interface Pick {
  id: string
  full_name: string
  avatar_url: string | null
  photos: string[]
  profession: string | null
  company: string | null
  city: string | null
  country: string | null
  age: number | null
  is_verified: boolean
  is_online: boolean
  is_premium: boolean
  premium_tier: 'gold' | 'platinum' | null
  free_tonight: boolean
  interests: string[]
  bio: string | null
}

function PickCard({ pick, index, isPremium }: { pick: Pick; index: number; isPremium: boolean }) {
  const thumb = pick.photos[0] ?? pick.avatar_url
  const locked = !isPremium && index >= 3

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', damping: 22 }}
      className="relative rounded-3xl overflow-hidden group"
      style={{ background: '#111116' }}>
      {/* Photo */}
      <div className="relative aspect-[3/4]">
        {thumb
          ? <Image src={thumb} alt={pick.full_name} fill className={`object-cover transition-all duration-500 ${locked ? 'blur-md scale-105' : 'group-hover:scale-105'}`} />
          : <div className="h-full bg-gradient-to-br from-gold/20 to-purple/20 flex items-center justify-center">
              <span className="text-5xl font-bold text-white/20">{(pick.full_name?.[0] ?? '?')}</span>
            </div>
        }
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 40%, transparent 70%)' }} />

        {/* Rank badge */}
        <div className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: index === 0 ? '#C9A84C' : index === 1 ? '#9B9B9B' : index === 2 ? '#CD7F32' : 'rgba(255,255,255,0.12)', color: index < 3 ? '#000' : '#fff' }}>
          {index + 1}
        </div>

        {/* Premium lock overlay */}
        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ background: 'rgba(201,168,76,0.20)', border: '1px solid rgba(201,168,76,0.35)' }}>
              <Lock size={20} style={{ color: '#C9A84C' }} />
            </div>
            <p className="text-xs font-semibold text-white/70">Gold required</p>
          </div>
        )}

        {/* Online / free tonight */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
          {pick.is_online && <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#2ECC71', boxShadow: '0 0 0 2px #111116' }} />}
          {pick.free_tonight && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold text-black" style={{ background: '#2ECC71' }}>⚡ Free</span>}
        </div>

        {/* Name */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-bold text-white">{pick.full_name}{pick.age ? `, ${pick.age}` : ''}</h3>
            {pick.is_verified && <BadgeCheck size={15} style={{ color: '#4A90E2' }} />}
            {pick.is_premium && <Crown size={14} style={{ color: pick.premium_tier === 'platinum' ? '#E8E8E8' : '#C9A84C' }} />}
          </div>
          {(pick.profession || pick.company) && (
            <p className="text-xs text-white/60 mt-0.5 truncate">{[pick.profession, pick.company].filter(Boolean).join(' · ')}</p>
          )}
          {(pick.city || pick.country) && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={11} className="text-white/40" />
              <span className="text-[11px] text-white/40">{[pick.city, pick.country].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {/* Interests */}
          {!locked && pick.interests.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {pick.interests.slice(0, 3).map(i => (
                <span key={i} className="px-2 py-0.5 rounded-full text-[10px] text-white/50 bg-white/[0.08]">{i}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action row */}
      {!locked && (
        <Link href={`/discover?view=${pick.id}`}
          className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] hover:bg-white/[0.03] transition-colors">
          <span className="text-xs font-medium text-white/50">View profile</span>
          <ChevronRight size={14} className="text-white/30" />
        </Link>
      )}
      {locked && (
        <Link href="/premium"
          className="flex items-center justify-center gap-2 px-4 py-3 border-t text-xs font-semibold transition-colors"
          style={{ borderColor: 'rgba(201,168,76,0.25)', color: '#C9A84C' }}>
          <Crown size={13} /> Upgrade to see
        </Link>
      )}
    </motion.div>
  )
}

export default function TopPicksPage() {
  const [picks, setPicks]         = useState<Pick[]>([])
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    const res = await fetch('/api/top-picks')
    if (res.ok) {
      const data = await res.json()
      setPicks(data.picks ?? [])
      setIsPremium(data.isPremium ?? false)
    }
    setLoading(false); setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="min-h-screen pt-nav pb-nav-bottom px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={20} style={{ color: '#C9A84C' }} />
              <h1 className="text-2xl font-bold text-white">Top Picks</h1>
            </div>
            <p className="text-sm text-white/40">Your daily curated matches · refreshes at midnight</p>
          </div>
          <button onClick={() => load(true)} disabled={refreshing}
            className="w-9 h-9 glass rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
            <RefreshCw size={15} className={`text-white/50 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {!isPremium && (
          <div className="glass rounded-2xl p-4 mb-5 flex items-center gap-3"
            style={{ border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.06)' }}>
            <Crown size={20} style={{ color: '#C9A84C' }} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Gold unlocks all 10 picks</p>
              <p className="text-xs text-white/45 mt-0.5">Free members see the top 3 only</p>
            </div>
            <Link href="/premium" className="px-3 py-1.5 rounded-xl text-xs font-bold text-black"
              style={{ background: '#C9A84C' }}>Upgrade</Link>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 size={28} className="animate-spin text-white/30" />
            <p className="text-sm text-white/40">Finding your best matches…</p>
          </div>
        ) : picks.length === 0 ? (
          <div className="text-center py-24">
            <Star size={40} className="mx-auto mb-3 text-white/20" />
            <p className="font-medium text-white/50">No picks available today</p>
            <p className="text-sm text-white/30 mt-1">Check back after more users join</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {picks.map((pick, i) => (
                <PickCard key={pick.id} pick={pick} index={i} isPremium={isPremium} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
