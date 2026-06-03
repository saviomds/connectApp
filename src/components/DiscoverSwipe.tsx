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
  Filter, MoreHorizontal, ShieldBan, Flag, Loader2, Zap, MessageSquareQuote,
  Crown, Info, ChevronLeft, ChevronRight, Globe, Briefcase,
} from 'lucide-react';
import type { DbProfile } from '@/types/database';

const SWIPE_THRESHOLD = 80;
const FLY_DISTANCE    = 600;

// ─── Tier helpers ─────────────────────────────────────────────
function TierBadge({ tier }: { tier: 'gold' | 'platinum' | null }) {
  if (!tier) return null;
  if (tier === 'platinum') return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(232,232,232,0.15)', border: '1px solid rgba(232,232,232,0.35)', color: '#E8E8E8' }}>
      <Crown size={9} /> Platinum
    </span>
  );
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(201,168,76,0.18)', border: '1px solid rgba(201,168,76,0.4)', color: '#C9A84C' }}>
      <Crown size={9} /> Gold
    </span>
  );
}

function tierCardStyle(tier: 'gold' | 'platinum' | null): string {
  if (tier === 'platinum') return '0 20px 60px rgba(0,0,0,0.6), 0 0 0 2px rgba(232,232,232,0.45)';
  if (tier === 'gold')     return '0 20px 60px rgba(0,0,0,0.6), 0 0 0 2px rgba(201,168,76,0.55)';
  return '0 20px 60px rgba(0,0,0,0.6)';
}

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
  const [reason, setReason]       = useState<ReportReason | ''>('');
  const [details, setDetails]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);

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
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
      <motion.div
        className="relative w-full sm:max-w-sm modal rounded-t-3xl sm:rounded-2xl overflow-hidden"
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}>
        <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg,transparent,rgba(231,76,60,0.55),transparent)' }} />
        {done ? (
          <div className="text-center py-10 px-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(46,204,113,0.13)', border: '2px solid rgba(46,204,113,0.35)' }}>
              <span className="text-3xl">✅</span>
            </div>
            <p className="text-white font-bold text-lg">Report submitted</p>
            <p className="text-white/60 text-sm mt-2">Thank you for keeping the community safe.</p>
          </div>
        ) : (
          <div className="p-6">
            <h2 className="text-lg font-bold text-white mb-1">Report {targetName}</h2>
            <p className="text-white/60 text-sm mb-5">Why are you reporting this profile?</p>
            <div className="flex flex-col gap-2 mb-4">
              {REPORT_REASONS.map(({ id, label, emoji }) => (
                <button key={id} onClick={() => setReason(id)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all"
                  style={{
                    background: reason === id ? 'rgba(201,168,76,0.14)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${reason === id ? 'rgba(201,168,76,0.45)' : 'rgba(255,255,255,0.09)'}`,
                    color: reason === id ? '#C9A84C' : 'rgba(255,255,255,0.75)',
                  }}>
                  <span className="text-base">{emoji}</span>{label}
                  {reason === id && <span className="ml-auto text-xs font-bold" style={{ color: '#C9A84C' }}>✓</span>}
                </button>
              ))}
            </div>
            {reason === 'other' && (
              <textarea value={details} onChange={e => setDetails(e.target.value)}
                placeholder="Tell us more (optional)…" rows={2}
                className="w-full px-4 py-2.5 rounded-xl text-white placeholder-white/30 text-sm resize-none mb-4 outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)' }} />
            )}
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 h-11 rounded-xl text-white/65 hover:text-white text-sm font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                Cancel
              </button>
              <button onClick={submit} disabled={!reason || submitting}
                className="flex-1 h-11 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 flex items-center justify-center"
                style={{ background: '#E74C3C', boxShadow: reason ? '0 4px 16px rgba(231,76,60,0.35)' : 'none' }}>
                {submitting ? <Loader2 size={15} className="animate-spin" /> : 'Submit Report'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Profile expand sheet ─────────────────────────────────────
function ProfileSheet({ profile, onClose, onSwipe }: {
  profile: DbProfile;
  onClose: () => void;
  onSwipe: (dir: 'like' | 'pass' | 'super_like') => void;
}) {
  const allPhotos = [profile.avatar_url, ...(profile.photos ?? [])].filter(Boolean) as string[];
  const [photoIdx, setPhotoIdx] = useState(0);

  function prevPhoto() { setPhotoIdx(i => Math.max(0, i - 1)); }
  function nextPhoto() { setPhotoIdx(i => Math.min(allPhotos.length - 1, i + 1)); }

  function act(dir: 'like' | 'pass' | 'super_like') {
    onSwipe(dir);
    onClose();
  }

  return (
    <motion.div className="fixed inset-0 z-[60] flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full sm:max-w-sm mx-auto overflow-hidden rounded-t-3xl"
        style={{ background: '#0F0F14', maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={e => e.stopPropagation()}>

        {/* Photo section */}
        <div className="relative h-72 shrink-0 overflow-hidden">
          {allPhotos[photoIdx] ? (
            <Image src={allPhotos[photoIdx]} alt={profile.full_name} fill className="object-cover object-top"
              sizes="(max-width:640px) 100vw, 448px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)' }}>
              <span className="font-black text-white/10" style={{ fontSize: 120 }}>{profile.full_name.charAt(0)}</span>
            </div>
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,#0F0F14 0%,transparent 55%)' }} />

          {/* Progress bars */}
          {allPhotos.length > 1 && (
            <div className="absolute top-3 left-4 right-14 flex gap-1 z-10">
              {allPhotos.map((_, i) => (
                <div key={i} className="flex-1 h-[2.5px] rounded-full transition-all duration-300"
                  style={{ background: i === photoIdx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.25)' }} />
              ))}
            </div>
          )}

          {/* Nav arrows */}
          {photoIdx > 0 && (
            <button onClick={prevPhoto}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center z-10 text-white/80">
              <ChevronLeft size={18} />
            </button>
          )}
          {photoIdx < allPhotos.length - 1 && (
            <button onClick={nextPhoto}
              className="absolute right-12 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center z-10 text-white/80">
              <ChevronRight size={18} />
            </button>
          )}

          {/* Close */}
          <button onClick={onClose}
            className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white border border-white/10 transition-colors">
            <X size={16} />
          </button>

          {/* Name + badges overlay */}
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-2xl font-bold text-white">
                {profile.full_name}{profile.age ? `, ${profile.age}` : ''}
              </h2>
              {profile.is_verified && <BadgeCheck size={18} className="fill-blue-400 text-blue-300 shrink-0" />}
              <TierBadge tier={profile.premium_tier} />
            </div>
            {profile.is_online && (
              <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> Online now
              </span>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-28">
          {/* Quick info row */}
          {(profile.profession || profile.city) && (
            <div className="flex flex-wrap gap-3 mb-5">
              {profile.profession && (
                <div className="flex items-center gap-1.5 text-sm text-white/65">
                  <Briefcase size={13} className="text-white/30 shrink-0" />
                  {profile.profession}{profile.company ? ` · ${profile.company}` : ''}
                </div>
              )}
              {profile.city && (
                <div className="flex items-center gap-1.5 text-sm text-white/45">
                  <MapPin size={13} className="text-white/30 shrink-0" />
                  {[profile.city, profile.country].filter(Boolean).join(', ')}
                </div>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-white/45 hover:text-gold transition-colors">
                  <Globe size={13} className="text-white/30 shrink-0" />
                  Website
                </a>
              )}
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">About</p>
              <p className="text-white/75 text-sm leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Prompts */}
          {profile.prompts && profile.prompts.length > 0 && (
            <div className="flex flex-col gap-3 mb-5">
              {profile.prompts.map((p, i) => (
                <div key={i} className="rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.18)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
                    style={{ color: 'rgba(201,168,76,0.65)' }}>{p.question}</p>
                  <p className="text-white/80 text-sm leading-relaxed italic">&ldquo;{p.answer}&rdquo;</p>
                </div>
              ))}
            </div>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Interests</p>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map(tag => (
                  <span key={tag} className="px-3 py-1.5 rounded-full text-xs font-medium border text-white/75"
                    style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.1)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fixed action bar */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-8"
          style={{ background: 'linear-gradient(to top, #0F0F14 65%, transparent)' }}>
          <div className="flex items-center justify-center gap-4">
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => act('pass')}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: '#16161A', border: '2px solid rgba(231,76,60,0.4)', color: '#E74C3C' }}>
              <X size={24} strokeWidth={2.5} />
            </motion.button>
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => act('super_like')}
              className="flex-1 h-14 rounded-full flex items-center justify-center font-bold text-black gap-2"
              style={{ background: '#C9A84C', boxShadow: '0 4px 20px rgba(201,168,76,0.4)' }}>
              <Star size={18} className="fill-black" /> Super Like
            </motion.button>
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => act('like')}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: '#16161A', border: '2px solid rgba(46,204,113,0.4)', color: '#2ECC71' }}>
              <Heart size={24} strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Card photo ───────────────────────────────────────────────
function CardPhoto({ photo, name, priority }: { photo: string | null; name: string; priority: boolean }) {
  if (photo) {
    return <Image src={photo} alt={name} fill className="object-cover pointer-events-none"
      priority={priority} draggable={false}
      sizes="(max-width:768px) 100vw,(max-width:1200px) 50vw,33vw" />;
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center select-none"
      style={{ background: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)' }}>
      <span className="font-black text-white/10" style={{ fontSize: 160 }}>{name.charAt(0).toUpperCase()}</span>
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

  const allPhotos = [profile.avatar_url, ...(profile.photos ?? [])].filter(Boolean) as string[];
  const [photoIdx, setPhotoIdx] = useState(0);
  const draggedRef = useRef(false);

  function handleDragEnd(_: unknown, info: PanInfo) {
    draggedRef.current = Math.abs(info.offset.x) > 5 || Math.abs(info.offset.y) > 5;
    if (info.offset.x >  SWIPE_THRESHOLD) { onSwipe?.('like');  return; }
    if (info.offset.x < -SWIPE_THRESHOLD) { onSwipe?.('pass');  return; }
  }

  function handlePhotoTap(e: React.MouseEvent<HTMLDivElement>) {
    if (!isTop || draggedRef.current) { draggedRef.current = false; return; }
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width / 2) setPhotoIdx(i => Math.max(0, i - 1));
    else setPhotoIdx(i => Math.min(allPhotos.length - 1, i + 1));
  }

  const tier = profile.premium_tier;

  return (
    <motion.div
      className="absolute inset-0 rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
      style={{
        x: isTop ? x : 0, rotate: isTop ? rotate : 0,
        scale: 1 - stackOffset * 0.05, y: stackOffset * 14,
        opacity: stackOffset > 2 ? 0 : 1, zIndex: 10 - stackOffset,
        touchAction: 'none',
        boxShadow: tierCardStyle(tier),
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={isTop ? handleDragEnd : undefined}
    >
      <div className="absolute inset-0 z-10" onClick={handlePhotoTap} />
      <CardPhoto photo={allPhotos[photoIdx] ?? null} name={profile.full_name} priority={stackOffset === 0} />

      {/* Progress bars */}
      {allPhotos.length > 1 && (
        <div className="absolute top-0 left-0 right-0 z-20 px-3 pt-2.5 flex gap-1 pointer-events-none">
          {allPhotos.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-full transition-all duration-300"
              style={{ background: i < photoIdx ? 'rgba(255,255,255,0.6)' : i === photoIdx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)' }} />
          ))}
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom,rgba(10,10,11,0.25) 0%,transparent 30%,rgba(10,10,11,0.97) 100%)' }} />

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
        <div className="flex items-center justify-between mb-2">
          {profile.is_online ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-white/80">
              <span className="w-2 h-2 rounded-full" style={{ background: '#2ECC71', display: 'inline-block' }} />
              Online
            </span>
          ) : <span />}
          {allPhotos.length > 1 && (
            <span className="text-[10px] font-semibold text-white/60 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
              {photoIdx + 1} / {allPhotos.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h2 className="text-2xl font-bold text-white">
            {profile.full_name}{profile.age ? `, ${profile.age}` : ''}
          </h2>
          {profile.is_verified && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0"
              style={{ background: 'rgba(74,144,226,0.25)', border: '1px solid rgba(74,144,226,0.5)' }}>
              <BadgeCheck size={12} className="fill-blue-400 text-blue-300 shrink-0" />
              <span className="text-[10px] font-bold text-blue-300">Verified</span>
            </div>
          )}
          <TierBadge tier={tier} />
          {profile.boosted_until && new Date(profile.boosted_until) > new Date() && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0"
              style={{ background: 'rgba(249,115,22,0.25)', border: '1px solid rgba(249,115,22,0.5)' }}>
              <Zap size={10} className="text-orange-300 fill-orange-300 shrink-0" />
              <span className="text-[10px] font-bold text-orange-300">Boosted</span>
            </div>
          )}
        </div>

        <p className="text-white/70 text-sm mb-1.5">
          {profile.profession}{profile.company ? ` · ${profile.company}` : ''}
        </p>
        {profile.city && (
          <div className="flex items-center gap-1 text-white/40 text-xs mb-3">
            <MapPin size={11} />{[profile.city, profile.country].filter(Boolean).join(', ')}
          </div>
        )}

        {profile.prompts && profile.prompts.length > 0 ? (
          <div className="mb-3 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.22)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(201,168,76,0.7)' }}>
              {profile.prompts[0].question}
            </p>
            <p className="text-white/80 text-xs leading-relaxed line-clamp-2 italic">
              &ldquo;{profile.prompts[0].answer}&rdquo;
            </p>
          </div>
        ) : profile.bio ? (
          <p className="text-white/60 text-xs mb-3 line-clamp-2 leading-relaxed italic">
            &quot;{profile.bio}&quot;
          </p>
        ) : null}

        {profile.interests && profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.interests.slice(0, 3).map(tag => (
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
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
      <motion.div
        className="relative modal rounded-2xl w-full max-w-sm overflow-hidden"
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        style={{ border: '1px solid rgba(201,168,76,0.25)' }}>
        <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.65),transparent)' }} />
        <div className="p-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-20 h-20 rounded-full overflow-hidden shrink-0"
              style={{ border: '2.5px solid #C9A84C', boxShadow: '0 0 20px rgba(201,168,76,0.35)' }}>
              {profile.avatar_url
                ? <Image src={profile.avatar_url} alt={profile.full_name} width={80} height={80} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-2xl font-bold"
                    style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>{profile.full_name.charAt(0)}</div>
              }
            </div>
            <div className="text-3xl animate-pulse">💛</div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">It&apos;s a Match!</h2>
          <p className="text-white/60 text-sm mb-7">
            You and <span className="text-white font-semibold">{profile.full_name}</span> liked each other
          </p>
          <div className="h-px bg-white/[0.07] -mx-8 mb-6" />
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 h-11 rounded-xl text-white/65 hover:text-white text-sm font-semibold transition-colors"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
              Keep swiping
            </button>
            <button onClick={onMessage}
              className="flex-1 h-11 rounded-xl font-bold text-black text-sm transition-all active:scale-[0.98]"
              style={{ background: '#C9A84C', boxShadow: '0 4px 20px rgba(201,168,76,0.40)' }}>
              Send message
            </button>
          </div>
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

const GENDERS = [
  { id: 'any',    label: 'Anyone' },
  { id: 'male',   label: 'Men' },
  { id: 'female', label: 'Women' },
];

interface Filters { onlineOnly: boolean; categories: string[]; minAge: number; maxAge: number; gender: string }

function FilterPanel({ filters, onChange, onClose, isGold }: {
  filters: Filters; onChange: (f: Filters) => void; onClose: () => void; isGold: boolean;
}) {
  const [local, setLocal] = useState(filters);
  const toggleCat = (id: string) =>
    setLocal(f => ({ ...f, categories: f.categories.includes(id) ? f.categories.filter(c => c !== id) : [...f.categories, id] }));

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
      <motion.div
        className="relative w-full sm:max-w-sm modal rounded-t-3xl sm:rounded-2xl overflow-hidden"
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}>
        <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.55),transparent)' }} />
        <div className="modal-header flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(201,168,76,0.14)', border: '1px solid rgba(201,168,76,0.25)' }}>
              <Filter size={15} style={{ color: '#C9A84C' }} />
            </div>
            <h2 className="text-base font-bold text-white">Filters</h2>
          </div>
          <button onClick={() => setLocal({ onlineOnly: false, categories: [], minAge: 18, maxAge: 80, gender: 'any' })}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:text-white text-white/50"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            Clear all
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6 max-h-[70dvh] overflow-y-auto">
          {/* Online only */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Online only</p>
              <p className="text-xs text-white/50 mt-0.5">Show only users currently online</p>
            </div>
            <button onClick={() => setLocal(f => ({ ...f, onlineOnly: !f.onlineOnly }))}
              className="w-12 h-6 rounded-full transition-all relative shrink-0"
              style={{ background: local.onlineOnly ? '#C9A84C' : 'rgba(255,255,255,0.12)', boxShadow: local.onlineOnly ? '0 0 10px rgba(201,168,76,0.4)' : 'none' }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm"
                style={{ left: local.onlineOnly ? 'calc(100% - 22px)' : 2 }} />
            </button>
          </div>

          {/* Age range */}
          <div>
            <div className="flex justify-between text-sm mb-3">
              <span className="font-semibold text-white">Age range</span>
              <span className="font-bold" style={{ color: '#C9A84C' }}>{local.minAge} – {local.maxAge}</span>
            </div>
            <div className="flex gap-3">
              <input type="range" min={18} max={local.maxAge - 1} value={local.minAge}
                onChange={e => setLocal(f => ({ ...f, minAge: +e.target.value }))} className="flex-1 accent-[#C9A84C]" />
              <input type="range" min={local.minAge + 1} max={80} value={local.maxAge}
                onChange={e => setLocal(f => ({ ...f, maxAge: +e.target.value }))} className="flex-1 accent-[#C9A84C]" />
            </div>
          </div>

          {/* Gender — Gold+ feature */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Gender</p>
              {!isGold && (
                <Link href="/premium" onClick={onClose}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                  style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}>
                  <Crown size={9} /> Gold+
                </Link>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {GENDERS.map(({ id, label }) => {
                const active = local.gender === id;
                return (
                  <button key={id}
                    disabled={!isGold}
                    onClick={() => isGold && setLocal(f => ({ ...f, gender: id }))}
                    className="py-2.5 rounded-xl text-xs font-semibold transition-all text-center disabled:opacity-40"
                    style={{
                      background: active ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${active ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.09)'}`,
                      color: active ? '#C9A84C' : 'rgba(255,255,255,0.65)',
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
            {!isGold && <p className="text-[10px] text-white/30 mt-2 text-center">Upgrade to Gold to filter by gender</p>}
          </div>

          {/* Category */}
          <div>
            <p className="text-sm font-semibold text-white mb-3">Category</p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(({ id, label, emoji }) => (
                <button key={id} onClick={() => toggleCat(id)}
                  className="py-2.5 px-2 rounded-xl text-xs font-semibold transition-all text-center"
                  style={{
                    background: local.categories.includes(id) ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${local.categories.includes(id) ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.09)'}`,
                    color: local.categories.includes(id) ? '#C9A84C' : 'rgba(255,255,255,0.65)',
                    boxShadow: local.categories.includes(id) ? '0 0 10px rgba(201,168,76,0.15)' : 'none',
                  }}>
                  {emoji}<br />{label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => { onChange(local); onClose(); }}
            className="w-full h-12 rounded-xl font-bold text-black text-sm transition-all active:scale-[0.98]"
            style={{ background: '#C9A84C', boxShadow: '0 4px 20px rgba(201,168,76,0.35)' }}>
            Apply Filters
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Limit modals ─────────────────────────────────────────────
function DailyLimitModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" onClick={onClose} />
      <motion.div className="relative w-full sm:max-w-sm mx-0 sm:mx-4 overflow-hidden rounded-t-[2rem] sm:rounded-[2rem] border border-white/10 p-6"
        style={{ background: 'rgba(15,15,20,0.98)' }}
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/[0.07] flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/10">
          <X size={16} />
        </button>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.2),rgba(249,115,22,0.15))', border: '1px solid rgba(201,168,76,0.3)' }}>
          <Heart size={28} style={{ color: '#C9A84C' }} />
        </div>
        <h2 className="text-xl font-bold text-white text-center mb-2">Daily Likes Used Up</h2>
        <p className="text-white/45 text-sm text-center leading-relaxed mb-6">
          Free members get <span className="text-white/70 font-semibold">10 likes per day</span>. Upgrade for unlimited swiping.
        </p>
        <div className="flex flex-col gap-2.5 mb-6">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <Crown size={18} style={{ color: '#C9A84C' }} className="shrink-0" />
            <div>
              <p className="text-white text-sm font-semibold">Gold – $29/mo</p>
              <p className="text-white/40 text-xs">Unlimited likes + who liked you</p>
            </div>
            <Link href="/premium" onClick={onClose}
              className="ml-auto shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-black"
              style={{ background: '#C9A84C' }}>
              Upgrade
            </Link>
          </div>
        </div>
        <p className="text-center text-white/25 text-xs">Resets at midnight UTC</p>
      </motion.div>
    </motion.div>
  );
}

function SuperLikeModal({ premiumTier, onClose }: { premiumTier: 'gold' | 'platinum' | null; onClose: () => void }) {
  const limit = premiumTier === 'gold' ? 5 : 1;
  return (
    <motion.div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" onClick={onClose} />
      <motion.div className="relative w-full sm:max-w-sm mx-0 sm:mx-4 overflow-hidden rounded-t-[2rem] sm:rounded-[2rem] border border-white/10 p-6"
        style={{ background: 'rgba(15,15,20,0.98)' }}
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/[0.07] flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/10">
          <X size={16} />
        </button>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)' }}>
          <Star size={28} className="fill-gold text-gold" style={{ color: '#C9A84C' }} />
        </div>
        <h2 className="text-xl font-bold text-white text-center mb-2">No Super Likes Left</h2>
        <p className="text-white/45 text-sm text-center leading-relaxed mb-6">
          You&apos;ve used all <span className="text-white/70 font-semibold">{limit} super like{limit > 1 ? 's' : ''} for today</span>.
          {premiumTier === 'gold' ? ' Upgrade to Platinum for unlimited.' : ' Gold members get 5 per day.'}
        </p>
        <Link href="/premium" onClick={onClose}
          className="w-full h-12 btn-gold rounded-2xl font-bold text-black text-sm flex items-center justify-center gap-2">
          <Crown size={16} /> {premiumTier === 'gold' ? 'Upgrade to Platinum' : 'Upgrade to Gold'}
        </Link>
        <button onClick={onClose}
          className="w-full mt-3 h-11 rounded-2xl text-sm font-medium text-white/40 hover:text-white/60 transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          Maybe later
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
interface Props { initialProfiles: DbProfile[]; currentUserId: string }

export default function DiscoverSwipe({ initialProfiles, currentUserId }: Props) {
  const router = useRouter();
  const [profiles, setProfiles]   = useState<DbProfile[]>(initialProfiles);
  const [filters, setFilters]     = useState<Filters>({ onlineOnly: false, categories: [], minAge: 18, maxAge: 80, gender: 'any' });
  const [showFilters, setShowFilters]   = useState(false);
  const [lastSwiped, setLastSwiped]     = useState<{ profile: DbProfile; dir: string } | null>(null);
  const [flash, setFlash]               = useState<'like' | 'pass' | 'super_like' | null>(null);
  const [matchedProfile, setMatchedProfile] = useState<DbProfile | null>(null);
  const [swiped, setSwiped]             = useState<Set<string>>(new Set());
  const [fetching, setFetching]         = useState(false);
  const [expandedProfile, setExpandedProfile] = useState<DbProfile | null>(null);

  // Limits
  const [remainingSwipes, setRemainingSwipes]         = useState<number | null>(null);
  const [remainingSuperLikes, setRemainingSuperLikes] = useState<number | null>(null);
  const [isPremium, setIsPremium]                     = useState(false);
  const [premiumTier, setPremiumTier]                 = useState<'gold' | 'platinum' | null>(null);
  const [showLimit, setShowLimit]                     = useState(false);
  const [showSuperLimit, setShowSuperLimit]           = useState(false);

  useEffect(() => {
    fetch('/api/swipes')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setIsPremium(d.isPremium);
        setPremiumTier(d.premiumTier ?? null);
        setRemainingSwipes(d.isPremium ? null : d.remainingSwipes);
        setRemainingSuperLikes(d.remainingSuperLikes);
      })
      .catch(() => {});
  }, []);

  const isGold = premiumTier === 'gold' || premiumTier === 'platinum';

  const prevFiltersRef = useRef(filters);
  useEffect(() => {
    if (prevFiltersRef.current === filters) return;
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
    if (isGold && filters.gender !== 'any') params.set('gender', filters.gender);
    fetch(`/api/profiles?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: DbProfile[]) => setProfiles(data))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [filters, isGold]);

  const [cardMenu, setCardMenu]       = useState(false);
  const [reportTarget, setReportTarget] = useState<DbProfile | null>(null);
  const [blocking, setBlocking]       = useState(false);

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
      const params = new URLSearchParams({
        online_only: String(filters.onlineOnly),
        min_age:     String(filters.minAge),
        max_age:     String(filters.maxAge),
        limit:       '20',
      });
      if (filters.categories.length > 0) params.set('categories', filters.categories.join(','));
      if (isGold && filters.gender !== 'any') params.set('gender', filters.gender);
      const res = await fetch(`/api/profiles?${params}`);
      if (res.ok) {
        const newProfiles: DbProfile[] = await res.json();
        setProfiles(prev => { const ids = new Set(prev.map(p => p.id)); return [...prev, ...newProfiles.filter(p => !ids.has(p.id))]; });
      }
    } finally { setFetching(false); }
  }, [fetching, filters, isGold]);

  const swipe = useCallback(async (dir: 'like' | 'pass' | 'super_like') => {
    if (!top) return;

    if ((dir === 'like' || dir === 'super_like') && !isPremium && remainingSwipes === 0) {
      setShowLimit(true); return;
    }
    if (dir === 'super_like' && premiumTier !== 'platinum' && remainingSuperLikes === 0) {
      setShowSuperLimit(true); return;
    }

    setFlash(dir); setLastSwiped({ profile: top, dir }); setSwiped(prev => new Set([...prev, top.id]));
    setTimeout(() => setFlash(null), 400);

    try {
      const res = await fetch('/api/swipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_id: top.id, direction: dir }),
      });

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        if (body.superLimitReached) { setRemainingSuperLikes(0); setShowSuperLimit(true); }
        else { setRemainingSwipes(0); setShowLimit(true); }
        setSwiped(prev => { const n = new Set(prev); n.delete(top.id); return n; });
        return;
      }

      if (res.ok) {
        const { matched, remainingSwipes: rem, remainingSuperLikes: remSuper } = await res.json();
        if (matched) setMatchedProfile(top);
        if (rem !== null && rem !== undefined) setRemainingSwipes(rem);
        if (remSuper !== null && remSuper !== undefined) setRemainingSuperLikes(remSuper);
      }
    } catch { /* silent */ }

    if (deck.length <= 3) fetchMore();
  }, [top, deck.length, fetchMore, isPremium, premiumTier, remainingSwipes, remainingSuperLikes]);

  async function blockTopCard() {
    if (!top) return;
    setCardMenu(false); setBlocking(true);
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

  const activeFilterCount = (filters.onlineOnly ? 1 : 0) + filters.categories.length +
    (filters.gender !== 'any' && isGold ? 1 : 0);

  return (
    <div className="h-dvh flex flex-col pt-nav-flush pb-14 md:pb-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white">Discover</h1>
          <p className="text-white/35 text-xs">
            {deck.length} profile{deck.length !== 1 ? 's' : ''}{activeFilterCount > 0 ? ' (filtered)' : ' nearby'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isPremium && remainingSwipes !== null && (
            <button onClick={() => remainingSwipes === 0 ? setShowLimit(true) : undefined}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all"
              style={{
                background: remainingSwipes <= 2 ? 'rgba(231,76,60,0.15)' : 'rgba(46,204,113,0.12)',
                border: `1px solid ${remainingSwipes <= 2 ? 'rgba(231,76,60,0.35)' : 'rgba(46,204,113,0.3)'}`,
                color: remainingSwipes <= 2 ? '#E74C3C' : '#2ECC71',
              }}>
              <Heart size={10} className={remainingSwipes <= 2 ? 'fill-red-400' : 'fill-green-400'} />
              {remainingSwipes === 0 ? 'No likes left' : `${remainingSwipes} left`}
            </button>
          )}
          <Link href="/profile" className="flex items-center gap-2 glass px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0"
              style={{ background: '#C9A84C' }}>
              {currentUserId.charAt(0).toUpperCase()}
            </div>
          </Link>
          <button onClick={undo} disabled={!lastSwiped}
            className="glass w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
            <RotateCcw size={16} />
          </button>
          <button onClick={() => setShowFilters(true)}
            className="glass w-9 h-9 rounded-xl flex items-center justify-center transition-colors relative"
            style={{ color: activeFilterCount > 0 ? '#C9A84C' : 'rgba(255,255,255,0.5)' }}>
            <SlidersHorizontal size={16} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-black flex items-center justify-center"
                style={{ background: '#C9A84C' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center px-4 py-2 relative min-h-0">
        {deck.length === 0 ? (
          <div className="text-center animate-fade-up px-6">
            <div className="text-6xl mb-4">💫</div>
            <h2 className="text-xl font-semibold text-white mb-2">You&apos;re all caught up!</h2>
            <p className="text-white/40 mb-6 text-sm">
              {activeFilterCount > 0 ? 'Try removing some filters.' : 'New profiles drop daily — check back soon.'}
            </p>
            <div className="flex gap-3 justify-center">
              {activeFilterCount > 0 && (
                <button onClick={() => setFilters({ onlineOnly: false, categories: [], minAge: 18, maxAge: 80, gender: 'any' })}
                  className="glass px-5 py-3 rounded-2xl text-white/70 text-sm font-medium hover:bg-white/10">
                  Clear filters
                </button>
              )}
              <button onClick={() => { setProfiles([]); setSwiped(new Set()); fetchMore(); }}
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
                    <SwipeCard profile={profile} isTop={stackOffset === 0} stackOffset={stackOffset}
                      onSwipe={stackOffset === 0 ? swipe : undefined} />
                  </motion.div>
                </AnimatePresence>
              );
            })}

            {/* ⋮ context menu — outside drag area */}
            {top && (
              <div className="absolute top-3 right-3 z-20" onClick={e => e.stopPropagation()}>
                <button onClick={() => setCardMenu(v => !v)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-black/40 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/60 transition-colors">
                  {blocking ? <Loader2 size={14} className="animate-spin" /> : <MoreHorizontal size={14} />}
                </button>
                <AnimatePresence>
                  {cardMenu && (
                    <>
                      <motion.div className="fixed inset-0 z-30" onClick={() => setCardMenu(false)} />
                      <motion.div className="absolute right-0 top-10 w-44 modal rounded-xl overflow-hidden z-40"
                        initial={{ opacity: 0, scale: 0.9, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -8 }}>
                        <button onClick={blockTopCard}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/[0.06] transition-colors border-b border-white/[0.06]">
                          <ShieldBan size={14} style={{ color: '#F39C12' }} />
                          <span className="text-white/75">Block</span>
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

            {/* Info button — opens profile sheet */}
            {top && (
              <button
                className="absolute bottom-[96px] right-3 z-20 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white border border-white/10 transition-all hover:bg-black/70"
                onClick={() => setExpandedProfile(top)}>
                <Info size={16} />
              </button>
            )}

            {/* Swipe flash */}
            <AnimatePresence>
              {flash && (
                <motion.div className="absolute inset-0 rounded-3xl pointer-events-none z-50"
                  initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
                  style={{ background: flash === 'like' ? 'rgba(46,204,113,0.25)' : flash === 'super_like' ? 'rgba(201,168,76,0.35)' : 'rgba(231,76,60,0.25)' }} />
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {deck.length > 0 && (
        <div className="flex items-center justify-center gap-5 px-4 py-3 shrink-0">
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }} onClick={() => swipe('pass')}
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: '#16161A', border: '2px solid rgba(231,76,60,0.4)', color: '#E74C3C' }}>
            <X size={28} strokeWidth={2.5} />
          </motion.button>

          {/* Super like with counter */}
          <div className="flex flex-col items-center gap-1">
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
              onClick={() => swipe('super_like')}
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(201,168,76,0.12)', border: '1.5px solid rgba(201,168,76,0.4)', color: '#C9A84C' }}>
              <Star size={20} />
            </motion.button>
            {remainingSuperLikes !== null && (
              <span className="text-[9px] font-bold leading-none"
                style={{ color: remainingSuperLikes === 0 ? '#E74C3C' : 'rgba(201,168,76,0.7)' }}>
                {remainingSuperLikes === 0 ? 'None left' : `${remainingSuperLikes} left`}
              </span>
            )}
          </div>

          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }} onClick={() => swipe('like')}
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: '#16161A', border: '2px solid rgba(46,204,113,0.4)', color: '#2ECC71' }}>
            <Heart size={28} strokeWidth={2.5} />
          </motion.button>
        </div>
      )}

      {deck.length > 0 && (
        <p className="text-center text-xs text-white/20 pb-3 shrink-0">
          Drag left to pass · right to like · tap ⭐ for super like · <button className="underline" onClick={() => top && setExpandedProfile(top)}>ⓘ view profile</button>
        </p>
      )}

      {/* Modals */}
      <AnimatePresence>
        {matchedProfile && <MatchModal profile={matchedProfile} onClose={() => setMatchedProfile(null)} onMessage={() => { setMatchedProfile(null); router.push('/messages'); }} />}
      </AnimatePresence>
      <AnimatePresence>
        {showFilters && <FilterPanel filters={filters} onChange={setFilters} onClose={() => setShowFilters(false)} isGold={isGold} />}
      </AnimatePresence>
      <AnimatePresence>
        {reportTarget && <ReportModal targetId={reportTarget.id} targetName={reportTarget.full_name} onClose={() => setReportTarget(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showLimit && <DailyLimitModal onClose={() => setShowLimit(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showSuperLimit && <SuperLikeModal premiumTier={premiumTier} onClose={() => setShowSuperLimit(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {expandedProfile && (
          <ProfileSheet profile={expandedProfile} onClose={() => setExpandedProfile(null)} onSwipe={swipe} />
        )}
      </AnimatePresence>
    </div>
  );
}
