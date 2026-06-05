'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { BadgeCheck, MapPin, Zap, Star, Search, Filter, X, Crown, Loader2, ChevronDown } from 'lucide-react'

interface ExploreProfile {
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
  category: string | null
}

interface ProfileCardProps {
  profile: ExploreProfile
  onClose: () => void
}

function ProfileSheet({ profile, onClose }: ProfileCardProps) {
  const thumb = profile.photos[0] ?? profile.avatar_url
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28 }}
        className="modal rounded-3xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* Photo */}
        <div className="relative h-72">
          {thumb
            ? <Image src={thumb} alt={profile.full_name} fill className="object-cover" />
            : <div className="h-full flex items-center justify-center" style={{ background: '#1A1A1F' }}>
                <span className="text-6xl font-bold text-white/20">{(profile.full_name?.[0] ?? '?')}</span>
              </div>}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 30%, transparent)' }} />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full glass flex items-center justify-center">
            <X size={16} className="text-white" />
          </button>
          {profile.free_tonight && (
            <span className="absolute top-4 left-4 px-2.5 py-1 rounded-full text-xs font-bold text-black"
              style={{ background: '#2ECC71' }}>⚡ Free Tonight</span>
          )}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-bold text-white">{profile.full_name}</h2>
              {profile.age && <span className="text-white/60 text-base">{profile.age}</span>}
              {profile.is_verified && <BadgeCheck size={18} style={{ color: '#4A90E2' }} />}
            </div>
            {(profile.profession || profile.company) && (
              <p className="text-sm text-white/70 mt-0.5">{[profile.profession, profile.company].filter(Boolean).join(' at ')}</p>
            )}
          </div>
        </div>
        {/* Body */}
        <div className="p-4 flex flex-col gap-3">
          {(profile.city || profile.country) && (
            <div className="flex items-center gap-1.5 text-sm text-white/50">
              <MapPin size={14} /> {[profile.city, profile.country].filter(Boolean).join(', ')}
            </div>
          )}
          {profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.interests.slice(0, 6).map(i => (
                <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium text-white/60 bg-white/[0.06] border border-white/[0.08]">{i}</span>
              ))}
            </div>
          )}
          <Link href={`/discover?view=${profile.id}`}
            className="btn-gold h-11 rounded-xl font-semibold text-black flex items-center justify-center text-sm mt-1">
            View Full Profile
          </Link>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function ExplorePage() {
  const [profiles, setProfiles]   = useState<ExploreProfile[]>([])
  const [loading, setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage]           = useState(0)
  const [hasMore, setHasMore]     = useState(true)
  const [selected, setSelected]   = useState<ExploreProfile | null>(null)
  const [search, setSearch]       = useState('')
  const [freeOnly, setFreeOnly]   = useState(false)
  const [gender, setGender]       = useState<'everyone' | 'men' | 'women'>('everyone')
  const [showFilters, setShowFilters] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)

  const fetchProfiles = useCallback(async (pg: number, replace = false) => {
    if (pg === 0) setLoading(true); else setLoadingMore(true)
    const params = new URLSearchParams({ page: String(pg) })
    if (freeOnly) params.set('free_tonight', 'true')
    if (gender !== 'everyone') params.set('gender', gender)
    const res = await fetch(`/api/explore?${params}`)
    if (res.ok) {
      const data = await res.json()
      setProfiles(prev => replace ? data.profiles : [...prev, ...data.profiles])
      setHasMore(data.hasMore)
      setPage(pg)
    }
    setLoading(false); setLoadingMore(false)
  }, [freeOnly, gender])

  useEffect(() => { fetchProfiles(0, true) }, [fetchProfiles])

  // Infinite scroll observer
  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) fetchProfiles(page + 1)
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, page, fetchProfiles])

  const filtered = search.trim()
    ? profiles.filter(p =>
        p.full_name.toLowerCase().includes(search.toLowerCase()) ||
        p.city?.toLowerCase().includes(search.toLowerCase()) ||
        p.profession?.toLowerCase().includes(search.toLowerCase()) ||
        p.interests.some(i => i.toLowerCase().includes(search.toLowerCase()))
      )
    : profiles

  return (
    <div className="min-h-screen pt-nav pb-nav-bottom">
      {/* ── Header ── */}
      <div className="sticky top-[var(--nav-h)] z-30 glass border-b border-white/[0.06] px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-lg font-bold text-white flex-1">Explore</h1>
            <button onClick={() => setShowFilters(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-xl text-xs font-medium text-white/60 hover:text-white transition-colors">
              <Filter size={13} /> Filters
              <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, city, profession, interest…"
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white placeholder-white/25 text-sm input-focus" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"><X size={14} /></button>}
          </div>
          {/* Filter row */}
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-3 flex flex-wrap gap-2">
                <button onClick={() => setFreeOnly(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={freeOnly ? { background: '#2ECC71', color: '#000' } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.50)' }}>
                  <Zap size={12} /> Free Tonight
                </button>
                {(['everyone', 'women', 'men'] as const).map(g => (
                  <button key={g} onClick={() => setGender(g)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
                    style={gender === g ? { background: '#C9A84C', color: '#000' } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.50)' }}>
                    {g}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl animate-shimmer" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-white/40">
            <Search size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No profiles found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map(profile => {
              const thumb = profile.photos[0] ?? profile.avatar_url
              return (
                <motion.button key={profile.id} layout
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setSelected(profile)}
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden group cursor-pointer"
                  style={{ background: '#1A1A1F' }}>
                  {thumb
                    ? <Image src={thumb} alt={profile.full_name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold text-white/20">{(profile.full_name?.[0] ?? '?')}</span>
                      </div>
                  }
                  {/* Gradient overlay */}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.80) 35%, transparent 65%)' }} />

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    {profile.is_online && (
                      <span className="w-2 h-2 rounded-full" style={{ background: '#2ECC71', boxShadow: '0 0 0 2px #0A0A0B' }} />
                    )}
                    {profile.free_tonight && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold text-black" style={{ background: '#2ECC71' }}>⚡</span>
                    )}
                  </div>
                  {profile.is_premium && (
                    <div className="absolute top-2 right-2">
                      <Crown size={12} style={{ color: profile.premium_tier === 'platinum' ? '#E8E8E8' : '#C9A84C' }} />
                    </div>
                  )}

                  {/* Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-semibold text-white leading-tight truncate">{profile.full_name}{profile.age ? `, ${profile.age}` : ''}</p>
                      {profile.is_verified && <BadgeCheck size={12} style={{ color: '#4A90E2' }} className="shrink-0" />}
                    </div>
                    {profile.city && <p className="text-[10px] text-white/50 leading-tight truncate mt-0.5">{profile.city}</p>}
                  </div>

                  {/* Star on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full glass flex items-center justify-center">
                      <Star size={18} style={{ color: '#C9A84C' }} />
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}

        {/* Infinite scroll loader */}
        <div ref={loaderRef} className="flex justify-center py-6">
          {loadingMore && <Loader2 size={20} className="animate-spin text-white/30" />}
        </div>
      </div>

      {/* ── Profile sheet modal ── */}
      <AnimatePresence>
        {selected && <ProfileSheet profile={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  )
}
