import Image from 'next/image'
import Link from 'next/link'
import {
  BadgeCheck, MapPin, Settings, Crown, Briefcase,
  Globe, ExternalLink, Heart, Users,
  Sparkles, LogOut, Camera, ChevronRight,
} from 'lucide-react'
import { getCachedUser, createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import ProfilePageClient from '@/components/ProfilePageClient'
import VerificationGate from '@/components/VerificationGate'
import ShareProfileButton from '@/components/ShareProfileButton'
import type { DbProfile } from '@/types/database'

const CATEGORY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  professional:  { label: 'Professional',  color: '#4A90E2', bg: 'rgba(74,144,226,0.15)'  },
  entrepreneur:  { label: 'Entrepreneur',  color: '#9B6DFF', bg: 'rgba(155,109,255,0.15)' },
  creator:       { label: 'Creator',       color: '#F43F5E', bg: 'rgba(244,63,94,0.15)'   },
  young_youth:   { label: 'Young Youth',   color: '#00D4AA', bg: 'rgba(0,212,170,0.15)'   },
  divorced:      { label: 'New Chapter',   color: '#F97316', bg: 'rgba(249,115,22,0.15)'  },
  company:       { label: 'Company',       color: '#C9A84C', bg: 'rgba(201,168,76,0.15)'  },
}

function StatCard({ value, label, icon }: { value: number | string; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3 flex-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xl font-bold text-white">{value}</span>
      </div>
      <span className="text-[11px] text-white/40 font-medium uppercase tracking-wider">{label}</span>
    </div>
  )
}

export default async function ProfilePage() {
  const user = await getCachedUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  // Fetch profile + match count in parallel
  const [{ data: profile, error }, { count: matchCount }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('matches').select('id', { count: 'exact', head: true })
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
  ])

  if (error || !profile) redirect('/onboarding')

  // Liked-you count via service role (RLS only allows reading own swipes)
  let likedYouCount = 0
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (svcKey && svcKey !== 'your_supabase_service_role_key_here') {
    const svc = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, svcKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { count } = await svc.from('swipes').select('id', { count: 'exact', head: true })
      .eq('target_id', user.id).in('direction', ['like', 'super_like'])
    likedYouCount = count ?? 0
  }

  const p = profile as DbProfile
  const completion = p.profile_completion
  const catMeta = p.category ? CATEGORY_LABELS[p.category] : null
  const displayUser = {
    id:             user.id,
    name:           p.full_name,
    profession:     p.profession ?? '',
    company:        p.company ?? '',
    city:           p.city ?? '',
    country:        p.country ?? '',
    bio:            p.bio ?? '',
    interests:      p.interests,
    age:            p.age ?? 0,
    category:       p.category ?? 'professional',
    linkedin_url:   p.linkedin_url ?? '',
    website:        p.website ?? '',
    is_open_to_work: p.is_open_to_work,
    avatar_url:     p.avatar_url ?? '',
    photos:         p.photos ?? [],
  }

  return (
    <div className="min-h-screen pt-16 pb-28 md:pb-12">

      {/* ── Cover banner — starts below the fixed navbar (pt-16) ── */}
      <div className="relative h-36 sm:h-44 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.4) 0%, rgba(155,109,255,0.3) 40%, rgba(74,144,226,0.35) 80%, rgba(0,212,170,0.2) 100%)' }}>
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-25"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.4\'/%3E%3C/svg%3E")', backgroundSize: '200px' }} />
        {/* Grid */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* ── Avatar row — avatar overlaps cover, actions on the right ── */}
        <div className="flex items-end justify-between -mt-12 sm:-mt-14 mb-5 relative z-10">

          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="rounded-[22px]"
              style={{ background: 'linear-gradient(135deg, #C9A84C, #E2C068, #C9A84C)', padding: '3px' }}>
              <div className="rounded-[20px] overflow-hidden border-4 border-[#0A0A0B] w-24 h-24 sm:w-28 sm:h-28 relative bg-white/5">
                {p.avatar_url ? (
                  <Image src={p.avatar_url} alt={p.full_name} fill
                    className="object-cover" sizes="112px" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold"
                    style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>
                    {p.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            {p.is_online && (
              <span className="absolute bottom-1.5 right-1.5 w-4 h-4 bg-green-400 rounded-full border-2 border-[#0A0A0B] block" />
            )}
          </div>

          {/* Settings + Edit — clearly separated, no overlap */}
          <div className="flex items-center gap-2 mb-2">
            <Link href="/settings"
              className="w-9 h-9 rounded-xl glass flex items-center justify-center text-white/60 hover:text-white transition-colors border border-white/10"
              title="Settings">
              <Settings size={15} />
            </Link>
            <ProfilePageClient displayUser={displayUser} />
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 lg:items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-4">

            {/* Name + Identity */}
            <div className="glass rounded-3xl p-5 border border-white/[0.07]">
              {/* Name row */}
              <div className="flex items-start gap-3 flex-wrap mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{p.full_name}</h1>
                    {p.is_verified && (
                      <BadgeCheck size={22} className="fill-blue-400 text-white shrink-0" />
                    )}
                    {p.age ? (
                      <span className="text-white/35 text-base font-light">{p.age}</span>
                    ) : null}
                    {p.is_premium && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-black shrink-0"
                        style={{ background: 'linear-gradient(135deg,#C9A84C,#E2C068)' }}>
                        <Crown size={10} />
                        {p.premium_tier === 'platinum' ? 'Platinum' : 'Gold'}
                      </span>
                    )}
                  </div>

                  {/* Headline */}
                  {(p.profession || p.company) && (
                    <p className="text-white/65 text-sm font-medium mb-2">
                      {p.profession}
                      {p.company && <span className="text-white/40"> · {p.company}</span>}
                    </p>
                  )}

                  {/* Meta chips */}
                  <div className="flex flex-wrap gap-2">
                    {p.city && (
                      <span className="flex items-center gap-1 text-xs text-white/40 font-medium">
                        <MapPin size={11} /> {[p.city, p.country].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {catMeta && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: catMeta.bg, color: catMeta.color, border: `1px solid ${catMeta.color}33` }}>
                        {catMeta.label}
                      </span>
                    )}
                    {p.is_open_to_work && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: 'rgba(0,212,170,0.12)', color: '#00D4AA', border: '1px solid rgba(0,212,170,0.25)' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-teal inline-block" />
                        Open to opportunities
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Stats bar ── */}
              <div className="flex items-center divide-x divide-white/[0.07] rounded-2xl overflow-hidden mt-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <StatCard value={matchCount ?? 0} label="Matches" icon={<Heart size={14} className="text-rose-400 fill-rose-400" />} />
                <StatCard value={likedYouCount} label="Liked You" icon={<Sparkles size={14} className="text-gold" />} />
                <StatCard value={`${completion}%`} label="Complete" icon={<Users size={14} className="text-blue-400" />} />
              </div>
            </div>

            {/* About */}
            {p.bio && (
              <div className="glass rounded-3xl p-5 border border-white/[0.07]">
                <h2 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-3">About</h2>
                <p className="text-white/75 text-sm leading-relaxed">{p.bio}</p>
              </div>
            )}

            {/* Experience */}
            {p.profession && (
              <div className="glass rounded-3xl p-5 border border-white/[0.07]">
                <h2 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-4">Experience</h2>
                <div className="flex gap-4">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                    <Briefcase size={18} style={{ color: '#C9A84C' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">{p.profession}</p>
                    {p.company && <p className="text-white/50 text-xs mt-0.5">{p.company}</p>}
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(0,212,170,0.1)', color: '#00D4AA' }}>
                      <span className="w-1 h-1 rounded-full bg-teal inline-block" /> Current
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Interests */}
            {p.interests.length > 0 && (
              <div className="glass rounded-3xl p-5 border border-white/[0.07]">
                <h2 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-4">Interests</h2>
                <div className="flex flex-wrap gap-2">
                  {p.interests.map((tag) => (
                    <span key={tag}
                      className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.72)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Photos gallery */}
            {p.photos.length > 0 && (
              <div className="glass rounded-3xl p-5 border border-white/[0.07]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-white/50 uppercase tracking-widest">Photos</h2>
                  <span className="flex items-center gap-1 text-xs text-white/30">
                    <Camera size={11} /> {p.photos.length} photo{p.photos.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {p.photos.map((url, i) => (
                    <div key={i} className="aspect-square rounded-2xl overflow-hidden relative bg-white/[0.04]">
                      <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="160px" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social / Links */}
            {(p.linkedin_url || p.website) && (
              <div className="glass rounded-3xl p-5 border border-white/[0.07]">
                <h2 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-4">Links</h2>
                <div className="flex flex-col gap-2">
                  {p.linkedin_url && (
                    <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl group hover:bg-white/[0.05] transition-colors"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(10,102,194,0.15)', border: '1px solid rgba(10,102,194,0.3)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">LinkedIn</p>
                        <p className="text-white/35 text-xs truncate">{p.linkedin_url.replace(/^https?:\/\/(www\.)?/, '')}</p>
                      </div>
                      <ExternalLink size={13} className="text-white/25 group-hover:text-white/50 transition-colors shrink-0" />
                    </a>
                  )}
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl group hover:bg-white/[0.05] transition-colors"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}>
                        <Globe size={16} style={{ color: '#C9A84C' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">Website</p>
                        <p className="text-white/35 text-xs truncate">{p.website.replace(/^https?:\/\/(www\.)?/, '')}</p>
                      </div>
                      <ExternalLink size={13} className="text-white/25 group-hover:text-white/50 transition-colors shrink-0" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-4 mt-4 lg:mt-0 lg:sticky lg:top-24">

            {/* Profile completion */}
            <div className="glass rounded-3xl p-5 border border-white/[0.07]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-white">Profile Strength</h2>
                <span className="text-sm font-bold" style={{ color: completion >= 80 ? '#00D4AA' : completion >= 50 ? '#C9A84C' : '#E74C3C' }}>
                  {completion}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${completion}%`,
                    background: completion >= 80
                      ? 'linear-gradient(90deg,#00D4AA,#4A90E2)'
                      : completion >= 50
                      ? 'linear-gradient(90deg,#C9A84C,#E2C068)'
                      : 'linear-gradient(90deg,#E74C3C,#F39C12)',
                  }} />
              </div>
              <p className="text-xs text-white/35 leading-relaxed">
                {completion === 100
                  ? '✨ Your profile is 100% complete!'
                  : completion >= 80
                  ? 'Almost there! A few more details will help you stand out.'
                  : 'Complete your profile to get more matches and visibility.'}
              </p>

              {/* Missing fields hints */}
              {completion < 100 && (
                <div className="mt-3 flex flex-col gap-1.5">
                  {!p.avatar_url && <Hint text="Add a profile photo" />}
                  {!p.bio && <Hint text="Write a short bio" />}
                  {!p.profession && <Hint text="Add your profession" />}
                  {!p.city && <Hint text="Add your city" />}
                  {p.interests.length < 3 && <Hint text="Add at least 3 interests" />}
                </div>
              )}
            </div>

            {/* Verification */}
            <VerificationGate
              status={p.verification_status ?? 'none'}
              category={p.category ?? null}
              isProfessional={p.is_professional ?? false}
            />

            {/* Premium CTA */}
            {!p.is_premium && (
              <Link href="/premium"
                className="block glass rounded-3xl p-5 border relative overflow-hidden group"
                style={{ borderColor: 'rgba(201,168,76,0.2)' }}>
                <div className="absolute inset-0 pointer-events-none transition-opacity group-hover:opacity-100 opacity-70"
                  style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.07),transparent)' }} />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown size={18} style={{ color: '#C9A84C' }} />
                    <span className="font-bold text-white text-sm">Go Premium</span>
                  </div>
                  <p className="text-white/40 text-xs leading-relaxed mb-3">
                    See who liked you, boost your profile, send unlimited likes, and more.
                  </p>
                  <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#C9A84C' }}>
                    View plans <ChevronRight size={13} />
                  </div>
                </div>
              </Link>
            )}

            {/* Quick actions */}
            <div className="glass rounded-3xl overflow-hidden border border-white/[0.07]">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Account</p>
              </div>
              <Link href="/settings"
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.04] transition-colors border-b border-white/[0.05]">
                <Settings size={15} className="text-white/40 shrink-0" />
                <span className="text-sm text-white/70 flex-1">Settings</span>
                <ChevronRight size={14} className="text-white/20" />
              </Link>
              <ShareProfileButton />
              <Link href="/api/auth/logout"
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-red-500/[0.07] transition-colors group">
                <LogOut size={15} className="text-white/30 group-hover:text-red-400 shrink-0 transition-colors" />
                <span className="text-sm text-white/50 group-hover:text-red-400 transition-colors">Sign out</span>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

function Hint({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-white/35">
      <span className="w-1 h-1 rounded-full bg-white/25 shrink-0" />
      {text}
    </div>
  )
}
