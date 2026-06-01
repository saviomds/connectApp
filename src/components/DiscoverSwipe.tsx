'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  motion, useMotionValue, useTransform, AnimatePresence, type PanInfo,
} from 'framer-motion';
import {
  MapPin, BadgeCheck, Heart, X, Star, SlidersHorizontal, RotateCcw,
  Filter, MoreHorizontal, ShieldBan, Flag, Loader2,
} from 'lucide-react';
import type { DbProfile } from '@/types/database';

const SWIPE_THRESHOLD = 80;
const FLY_DISTANCE    = 600;

// ─── Report modal ─────────────────────────────────────────────
const REPORT_REASONS = [
  { id: 'spam',          label: 'Spam or scam',         emoji: '🚫' },
  { id: 'inappropriate', label: 'Inappropriate content', emoji: '⚠️' },
  { id: 'harassment',    label: 'Harassment',            emoji: '😠' },
  { id: 'fake_profile',  label: 'Fake profile',          emoji: '🎭' },
  { id: 'other',         label: 'Other',                 emoji: '📝' },
] as const;

type ReportReason = typeof REPORT_REASONS[number]['id'];

function ReportModal({ targetId, targetName, onClose }: {
  targetId: string; targetName: string; onClose: () => void;
}) {
  const [reason, setReason]     = useState<ReportReason | ''>('');
  const [details, setDetails]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]         = useState(false);

  async function submit() {
    if (!reason) return;
    setSubmitting(true);
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reported_id: targetId, reason, details: details.trim() || undefined }),
    });
    setDone(true);
    setTimeout(onClose, 1800);
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
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Tell us more (optional)…"
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm resize-none mb-4 outline-none"
              />
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
  );
}

// ─── Card photo ───────────────────────────────────────────────
function CardPhoto({ photo, name, priority }: { photo: string | null; name: string; priority: boolean }) {
  if (photo) {
    return (
      <Image src={photo} alt={name} fill className="object-cover pointer-events-none"
        priority={priority} draggable={false}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
    );
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center select-none"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      <span className="font-black text-white/10" style={{ fontSize: 160 }}>
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

// ─── Swipe card ───────────────────────────────────────────────
function SwipeCard({ profile, isTop, stackOffset, onSwipe }: {
  profile: DbProfile; isTop: boolean; stackOffset: number;
  onSwipe?: (dir: 'like' | 'pass' | 'super_like') => void;
}) {
  const x           = useMotionValue(0);
  const rotate      = useTransform(x, [-300, 300], [-18, 18]);
  const likeOpacity = useTransform(x, [10, SWIPE_THRESHOLD],  [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_THRESHOLD, -10], [1, 0]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x >  SWIPE_THRESHOLD) { onSwipe?.('like');  return; }
    if (info.offset.x < -SWIPE_THRESHOLD) { onSwipe?.('pass');  return; }
  }

  return (
    <motion.div
      className="absolute inset-0 rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
      style={{
        x: isTop ? x : 0, rotate: isTop ? rotate : 0,
        scale: 1 - stackOffset * 0.05, y: stackOffset * 14,
        opacity: stackOffset > 2 ? 0 : 1, zIndex: 10 - stackOffset,
        touchAction: 'none', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={isTop ? handleDragEnd : undefined}
    >
      <CardPhoto photo={profile.avatar_url} name={profile.full_name} priority={stackOffset === 0} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(10,10,11,0.1) 0%, transparent 35%, rgba(10,10,11,0.97) 100%)' }} />

      {isTop && (
        <motion.div className="absolute top-10 left-6 border-4 rounded-xl px-4 py-2 rotate-[-20deg] pointer-events-none"
          style={{ borderColor: '#2ECC71', opacity: likeOpacity }}>
          <span className="text-3xl font-black tracking-widest" style={{ color: '#2ECC71' }}>LIKE</span>
        </motion.div>
      )}
      {isTop && (
        <motion.div className="absolute top-10 right-6 border-4 rounded-xl px-4 py-2 rotate-[20deg] pointer-events-none"
          style={{ borderColor: '#E74C3C', opacity: passOpacity }}>
          <span className="text-3xl font-black tracking-widest" style={{ color: '#E74C3C' }}>NOPE</span>
        </motion.div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-5 pointer-events-none">
        {profile.is_online && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-white/80 mb-3">
            <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#2ECC71', display: 'inline-block' }} />
            Online
          </span>
        )}
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-2xl font-bold text-white">
            {profile.full_name}{profile.age ? `, ${profile.age}` : ''}
          </h2>
          {profile.is_verified && <BadgeCheck size={20} className="fill-blue-400 text-white shrink-0" />}
        </div>
        <p className="text-white/70 text-sm mb-1.5">
          {profile.profession}{profile.company ? ` · ${profile.company}` : ''}
        </p>
        {profile.city && (
          <div className="flex items-center gap-1 text-white/40 text-xs mb-3">
            <MapPin size={11} />
            {[profile.city, profile.country].filter(Boolean).join(', ')}
          </div>
        )}
        {profile.bio && (
          <p className="text-white/60 text-xs mb-3 line-clamp-2 leading-relaxed italic">
            &quot;{profile.bio}&quot;
          </p>
        )}
        {profile.interests && profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.interests.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/[0.12] text-white/80 border border-white/[0.1]">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Match modal ──────────────────────────────────────────────
function MatchModal({ profile, onClose, onMessage }: { profile: DbProfile; onClose: () => void; onMessage: () => void }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative glass rounded-3xl p-8 text-center max-w-xs w-full"
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        style={{ border: '1px solid rgba(201,168,76,0.3)' }}>
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#C9A84C]">
            {profile.avatar_url
              ? <Image src={profile.avatar_url} alt={profile.full_name} width={64} height={64} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-xl font-bold" style={{ background: 'rgba(201,168,76,0.2)', color: '#C9A84C' }}>{profile.full_name.charAt(0)}</div>
            }
          </div>
          <div className="text-3xl">💛</div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">It&apos;s a Match!</h2>
        <p className="text-white/50 text-sm mb-6">You and {profile.full_name} liked each other</p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-white/20 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors">
            Keep swiping
          </button>
          <button onClick={onMessage}
            className="flex-1 h-11 rounded-xl font-semibold text-black text-sm" style={{ background: '#C9A84C' }}>
            Send message
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Filter panel ─────────────────────────────────────────────
const CATEGORIES = [
  { id: 'professional', label: 'Professional', emoji: '💼' },
  { id: 'entrepreneur', label: 'Entrepreneur', emoji: '🚀' },
  { id: 'creator',      label: 'Creator',      emoji: '🎨' },
  { id: 'young_youth',  label: 'Young Youth',  emoji: '⚡' },
  { id: 'divorced',     label: 'New Chapter',  emoji: '🌿' },
  { id: 'company',      label: 'Company',      emoji: '🏢' },
];

interface Filters { onlineOnly: boolean; categories: string[]; minAge: number; maxAge: number }

function FilterPanel({ filters, onChange, onClose }: { filters: Filters; onChange: (f: Filters) => void; onClose: () => void }) {
  const [local, setLocal] = useState(filters);
  const toggleCat = (id: string) =>
    setLocal(f => ({ ...f, categories: f.categories.includes(id) ? f.categories.filter(c => c !== id) : [...f.categories, id] }));

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full sm:max-w-sm glass rounded-t-3xl sm:rounded-3xl p-6"
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Filter size={18} style={{ color: '#C9A84C' }} /> Filters</h2>
          <button onClick={() => setLocal({ onlineOnly: false, categories: [], minAge: 18, maxAge: 80 })} className="text-white/40 hover:text-white text-sm">Clear all</button>
        </div>
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm font-medium text-white">Online only</span>
          <button onClick={() => setLocal(f => ({ ...f, onlineOnly: !f.onlineOnly }))}
            className="w-12 h-6 rounded-full transition-colors relative"
            style={{ background: local.onlineOnly ? '#C9A84C' : 'rgba(255,255,255,0.1)' }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: local.onlineOnly ? 'calc(100% - 22px)' : 2 }} />
          </button>
        </div>
        <div className="mb-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-white">Age range</span>
            <span className="text-white/50">{local.minAge}–{local.maxAge}</span>
          </div>
          <div className="flex gap-3">
            <input type="range" min={18} max={local.maxAge - 1} value={local.minAge}
              onChange={e => setLocal(f => ({ ...f, minAge: +e.target.value }))} className="flex-1 accent-[#C9A84C]" />
            <input type="range" min={local.minAge + 1} max={80} value={local.maxAge}
              onChange={e => setLocal(f => ({ ...f, maxAge: +e.target.value }))} className="flex-1 accent-[#C9A84C]" />
          </div>
        </div>
        <div className="mb-6">
          <p className="text-sm font-medium text-white mb-3">Category</p>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(({ id, label, emoji }) => (
              <button key={id} onClick={() => toggleCat(id)}
                className="p-2.5 rounded-xl text-xs font-medium transition-all border text-center"
                style={{
                  background: local.categories.includes(id) ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                  borderColor: local.categories.includes(id) ? '#C9A84C' : 'rgba(255,255,255,0.08)',
                  color: local.categories.includes(id) ? '#C9A84C' : 'rgba(255,255,255,0.6)',
                }}>
                {emoji} {label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => { onChange(local); onClose(); }}
          className="w-full h-12 rounded-2xl font-semibold text-black" style={{ background: '#C9A84C' }}>
          Apply Filters
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
interface Props { initialProfiles: DbProfile[]; currentUserId: string }

export default function DiscoverSwipe({ initialProfiles, currentUserId }: Props) {
  const router = useRouter();
  const [profiles, setProfiles]       = useState<DbProfile[]>(initialProfiles);
  const [filters, setFilters]         = useState<Filters>({ onlineOnly: false, categories: [], minAge: 18, maxAge: 80 });
  const [showFilters, setShowFilters] = useState(false);
  const [lastSwiped, setLastSwiped]   = useState<{ profile: DbProfile; dir: string } | null>(null);
  const [flash, setFlash]             = useState<'like' | 'pass' | 'super_like' | null>(null);
  const [matchedProfile, setMatchedProfile] = useState<DbProfile | null>(null);
  const [swiped, setSwiped]           = useState<Set<string>>(new Set());
  const [fetching, setFetching]       = useState(false);

  // Re-fetch profiles whenever filters change
  const prevFiltersRef = useRef(filters);
  useEffect(() => {
    if (prevFiltersRef.current === filters) return; // skip initial mount
    prevFiltersRef.current = filters;
    setProfiles([]);
    setSwiped(new Set());
    setFetching(true);
    const params = new URLSearchParams({
      online_only: String(filters.onlineOnly),
      min_age:     String(filters.minAge),
      max_age:     String(filters.maxAge),
      limit:       '20',
    });
    if (filters.categories.length > 0) params.set('categories', filters.categories.join(','));
    fetch(`/api/profiles?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: DbProfile[]) => setProfiles(data))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [filters]);

  // Card action menu
  const [cardMenu, setCardMenu]         = useState(false);
  const [reportTarget, setReportTarget] = useState<DbProfile | null>(null);
  const [blocking, setBlocking]         = useState(false);

  const deck = profiles.filter(p => {
    if (swiped.has(p.id)) return false;
    if (filters.onlineOnly && !p.is_online) return false;
    if (filters.categories.length > 0 && !filters.categories.includes(p.category ?? '')) return false;
    if (p.age && (p.age < filters.minAge || p.age > filters.maxAge)) return false;
    return true;
  });

  const top = deck[0];

  const fetchMore = useCallback(async () => {
    if (fetching) return;
    setFetching(true);
    try {
      const params = new URLSearchParams({ online_only: String(filters.onlineOnly), min_age: String(filters.minAge), max_age: String(filters.maxAge), limit: '20' });
      if (filters.categories.length > 0) params.set('categories', filters.categories.join(','));
      const res = await fetch(`/api/profiles?${params}`);
      if (res.ok) {
        const newProfiles: DbProfile[] = await res.json();
        setProfiles(prev => { const ids = new Set(prev.map(p => p.id)); return [...prev, ...newProfiles.filter(p => !ids.has(p.id))]; });
      }
    } finally { setFetching(false); }
  }, [fetching, filters]);

  const swipe = useCallback(async (dir: 'like' | 'pass' | 'super_like') => {
    if (!top) return;
    setFlash(dir); setLastSwiped({ profile: top, dir }); setSwiped(prev => new Set([...prev, top.id]));
    setTimeout(() => setFlash(null), 400);
    try {
      const res = await fetch('/api/swipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_id: top.id, direction: dir }) });
      if (res.ok) { const { matched } = await res.json(); if (matched) setMatchedProfile(top); }
    } catch { /* silent */ }
    if (deck.length <= 3) fetchMore();
  }, [top, deck.length, fetchMore]);

  async function blockTopCard() {
    if (!top) return;
    setCardMenu(false);
    setBlocking(true);
    setSwiped(prev => new Set([...prev, top.id]));
    await fetch(`/api/users/${top.id}/block`, { method: 'POST' }).catch(() => {});
    setBlocking(false);
    if (deck.length <= 3) fetchMore();
  }

  function undo() {
    if (!lastSwiped) return;
    setSwiped(prev => { const next = new Set(prev); next.delete(lastSwiped.profile.id); return next; });
    setLastSwiped(null);
  }

  return (
    <div className="h-screen flex flex-col pt-16 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white">Discover</h1>
          <p className="text-white/35 text-xs">{deck.length} profiles{filters.onlineOnly || filters.categories.length > 0 ? ' (filtered)' : ' nearby'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/profile" className="flex items-center gap-2 glass px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0" style={{ background: '#C9A84C' }}>
              {currentUserId.charAt(0).toUpperCase()}
            </div>
          </Link>
          <button onClick={undo} disabled={!lastSwiped}
            className="glass w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
            <RotateCcw size={16} />
          </button>
          <button onClick={() => setShowFilters(true)}
            className="glass w-9 h-9 rounded-xl flex items-center justify-center transition-colors relative"
            style={{ color: (filters.onlineOnly || filters.categories.length > 0) ? '#C9A84C' : 'rgba(255,255,255,0.5)' }}>
            <SlidersHorizontal size={16} />
            {(filters.onlineOnly || filters.categories.length > 0) && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: '#C9A84C' }} />
            )}
          </button>
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center px-4 py-2 relative min-h-0">
        {deck.length === 0 ? (
          <div className="text-center animate-fade-up">
            <div className="text-6xl mb-4">💫</div>
            <h2 className="text-xl font-semibold text-white mb-2">You&apos;re all caught up!</h2>
            <p className="text-white/40 mb-6 text-sm">
              {filters.onlineOnly || filters.categories.length > 0 ? 'Try removing some filters.' : 'New profiles drop daily — check back soon.'}
            </p>
            <div className="flex gap-3 justify-center">
              {(filters.onlineOnly || filters.categories.length > 0) && (
                <button onClick={() => setFilters({ onlineOnly: false, categories: [], minAge: 18, maxAge: 80 })}
                  className="glass px-5 py-3 rounded-2xl text-white/70 text-sm font-medium hover:bg-white/10">
                  Clear filters
                </button>
              )}
              <button
                onClick={() => {
                  setProfiles([]);
                  setSwiped(new Set());
                  fetchMore();
                }}
                disabled={fetching}
                className="btn-gold px-6 py-3 rounded-2xl font-semibold text-black text-sm disabled:opacity-60">
                {fetching ? 'Loading…' : 'Refresh'}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full max-w-sm h-full max-h-[560px]">
            {deck.slice(0, 3).reverse().map((profile, reversedIdx) => {
              const stackOffset = (Math.min(deck.length, 3) - 1) - reversedIdx;
              return (
                <AnimatePresence key={profile.id} mode="popLayout">
                  <motion.div key={profile.id} className="absolute inset-0"
                    initial={stackOffset === 0 ? { scale: 0.95, opacity: 0 } : false}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ x: lastSwiped?.dir === 'like' || lastSwiped?.dir === 'super_like' ? FLY_DISTANCE : -FLY_DISTANCE, rotate: lastSwiped?.dir === 'like' || lastSwiped?.dir === 'super_like' ? 20 : -20, opacity: 0, transition: { duration: 0.35, ease: 'easeOut' } }}>
                    <SwipeCard profile={profile} isTop={stackOffset === 0} stackOffset={stackOffset} onSwipe={stackOffset === 0 ? swipe : undefined} />
                  </motion.div>
                </AnimatePresence>
              );
            })}

            {/* ⋮ action button — only on top card, outside drag area */}
            {top && (
              <div className="absolute top-3 right-3 z-20" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setCardMenu(v => !v)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-black/40 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/60 transition-colors">
                  {blocking ? <Loader2 size={14} className="animate-spin" /> : <MoreHorizontal size={14} />}
                </button>

                <AnimatePresence>
                  {cardMenu && (
                    <>
                      <motion.div className="fixed inset-0 z-30" onClick={() => setCardMenu(false)} />
                      <motion.div
                        className="absolute right-0 top-10 w-44 glass rounded-2xl overflow-hidden z-40 shadow-xl border border-white/10"
                        initial={{ opacity: 0, scale: 0.9, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -8 }}>
                        <button onClick={blockTopCard}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/[0.06] transition-colors">
                          <ShieldBan size={14} style={{ color: '#F39C12' }} />
                          <span className="text-white/70">Block</span>
                        </button>
                        <button onClick={() => { setCardMenu(false); setReportTarget(top); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-red-500/10 transition-colors">
                          <Flag size={14} style={{ color: '#E74C3C' }} />
                          <span className="text-red-400">Report</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Swipe flash overlay */}
            <AnimatePresence>
              {flash && (
                <motion.div className="absolute inset-0 rounded-3xl pointer-events-none z-50"
                  initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
                  style={{ background: flash === 'like' ? 'rgba(46,204,113,0.25)' : flash === 'super_like' ? 'rgba(201,168,76,0.35)' : 'rgba(231,76,60,0.25)' }}
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {deck.length > 0 && (
        <div className="flex items-center justify-center gap-4 px-4 py-4 shrink-0">
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }} onClick={() => swipe('pass')}
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: '#16161A', border: '2px solid rgba(231,76,60,0.4)', color: '#E74C3C' }}>
            <X size={28} strokeWidth={2.5} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }} onClick={() => swipe('super_like')}
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(201,168,76,0.12)', border: '1.5px solid rgba(201,168,76,0.4)', color: '#C9A84C' }}>
            <Star size={20} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }} onClick={() => swipe('like')}
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: '#16161A', border: '2px solid rgba(46,204,113,0.4)', color: '#2ECC71' }}>
            <Heart size={28} strokeWidth={2.5} />
          </motion.button>
        </div>
      )}

      {deck.length > 0 && (
        <p className="text-center text-xs text-white/25 pb-4 shrink-0">
          Drag left to pass · Drag right to like · ⭐ for super like
        </p>
      )}

      {/* Modals */}
      <AnimatePresence>
        {matchedProfile && <MatchModal profile={matchedProfile} onClose={() => setMatchedProfile(null)} onMessage={() => { setMatchedProfile(null); router.push('/messages'); }} />}
      </AnimatePresence>
      <AnimatePresence>
        {showFilters && <FilterPanel filters={filters} onChange={setFilters} onClose={() => setShowFilters(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {reportTarget && <ReportModal targetId={reportTarget.id} targetName={reportTarget.full_name} onClose={() => setReportTarget(null)} />}
      </AnimatePresence>
    </div>
  );
}
