'use client'

import { useState, useEffect, useRef, use, useCallback, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, BadgeCheck, MoreVertical, Send, ImagePlus,
  X, Eye, Trash2, ShieldBan, UserMinus, Loader2, CheckCheck,
  AlertTriangle, Reply, CornerUpLeft, Crown, Mic, MicOff,
  Play, Pause, SmilePlus, Pencil,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

type MsgType = 'text' | 'image' | 'album' | 'view_once' | 'voice'

interface Message {
  id: string
  sender_id: string
  content: string
  type: MsgType
  media_urls: string[]
  is_view_once: boolean
  viewed_at: string | null
  is_deleted: boolean
  is_seen: boolean
  created_at: string
  reply_to_id: string | null
  reactions?: Record<string, string[]>
  edited_at?: string | null
}

interface OtherProfile {
  id: string
  full_name: string
  avatar_url: string | null
  is_online: boolean
  is_verified: boolean
}

// ─── helpers ──────────────────────────────────────────────────
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function fmtDay(d: string) {
  const date = new Date(d)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}
function fmtDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── Smart reply suggestions ──────────────────────────────────
const SMART_SETS: [RegExp, string[]][] = [
  [/\b(hi|hey|hello|hola|howdy)\b/i,      ["Hey! 👋", "Hi there!", "Hello! How are you?"]],
  [/how are you|how r u|how's it going/i,  ["I'm great, thanks! You?", "Doing well! 😊", "Can't complain! How about you?"]],
  [/thank|thanks|appreciate|grateful/i,   ["Of course! 😊", "Happy to help!", "Anytime! ✨"]],
  [/love|adore|obsessed|amazing|great/i,  ["That's so sweet! ❤️", "Same here! 😊", "Really? That's amazing!"]],
  [/what.*do|where.*go|when.*meet/i,      ["Let me think…", "Good question!", "How about this weekend?"]],
  [/\?/,                                   ["Yes!", "Definitely!", "Not sure yet 🤔", "Tell me more!"]],
  [/good morning|gm\b/i,                  ["Good morning! ☀️", "Morning! 😊", "Rise and shine! ✨"]],
  [/good night|gn\b/i,                    ["Good night! 🌙", "Sweet dreams! ✨", "Sleep well! 😊"]],
  [/haha|lol|lmao|😂/i,                   ["Haha! 😂", "You're funny! 😄", "I can't 😂"]],
]

function getSmartReplies(msg: Message | null): string[] {
  if (!msg || msg.type !== 'text' || msg.is_deleted) return []
  const text = msg.content
  for (const [pattern, replies] of SMART_SETS) {
    if (pattern.test(text)) return replies
  }
  return ["Sounds good! 👍", "Interesting!", "Tell me more 😊"]
}

// ─── Emoji picker ─────────────────────────────────────────────
const REACTION_EMOJIS = ['❤️', '😂', '🔥', '😮', '👏', '💯']

function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute z-50 bottom-full mb-2 left-0 flex gap-1.5 p-2 rounded-2xl border border-white/10 shadow-xl"
        style={{ background: 'rgba(18,18,24,0.97)' }}>
        {REACTION_EMOJIS.map(e => (
          <button key={e} onClick={() => { onPick(e); onClose() }}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-xl hover:scale-125 transition-transform active:scale-110"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            {e}
          </button>
        ))}
      </div>
    </>
  )
}

// ─── Typing indicator ─────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-end gap-2 px-4">
      <div className="w-7 h-7 rounded-full shrink-0 bg-white/10" />
      <div className="glass rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/50 inline-block animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '1s' }} />
        ))}
      </div>
    </div>
  )
}

// ─── Voice note player ────────────────────────────────────────
function VoicePlayer({ url, isMe }: { url: string; isMe: boolean }) {
  const [playing, setPlaying]   = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [elapsed, setElapsed]   = useState(0)
  const [loadErr, setLoadErr]   = useState(false)
  const audioRef   = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef('')

  // Fetch blob + force correct MIME — Supabase may serve audio/webm as
  // application/octet-stream which the <audio> element refuses to decode.
  useEffect(() => {
    if (!url) return
    let cancelled = false

    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob() })
      .then(rawBlob => {
        if (cancelled) return
        const ext  = url.split('?')[0].split('.').pop()?.toLowerCase() ?? 'webm'
        const mime = (rawBlob.type && rawBlob.type !== 'application/octet-stream')
          ? rawBlob.type
          : ext === 'ogg' ? 'audio/ogg' : ext === 'mp4' ? 'audio/mp4' : 'audio/webm'
        const bu = URL.createObjectURL(new Blob([rawBlob], { type: mime }))
        blobUrlRef.current = bu
        const el = audioRef.current
        if (el) { el.src = bu; el.load() }
      })
      .catch(() => { if (!cancelled) setLoadErr(true) })

    return () => {
      cancelled = true
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = '' }
    }
  }, [url])

  function toggle() {
    const el = audioRef.current
    if (!el || !blobUrlRef.current) return
    if (el.paused) {
      el.volume = 1
      el.muted  = false
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    } else {
      el.pause()
      setPlaying(false)
    }
  }

  const accent = isMe ? 'rgba(0,0,0,0.5)' : '#C9A84C'

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 min-w-[160px]">
      <audio
        ref={audioRef}
        preload="none"
        onLoadedMetadata={() => setDuration(Math.round(audioRef.current?.duration ?? 0))}
        onTimeUpdate={() => {
          const el = audioRef.current
          if (!el) return
          setElapsed(Math.round(el.currentTime))
          setProgress(el.currentTime / (el.duration || 1))
        }}
        onEnded={() => { setPlaying(false); setProgress(0); setElapsed(0) }}
        onPause={() => setPlaying(false)}
        onError={() => { setLoadErr(true); setPlaying(false) }}
      />

      <button onClick={toggle} disabled={loadErr}
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 disabled:opacity-40"
        style={{ background: isMe ? 'rgba(0,0,0,0.2)' : 'rgba(201,168,76,0.18)' }}>
        {loadErr
          ? <span style={{ fontSize: 12, color: accent }}>✕</span>
          : playing
            ? <Pause size={14} style={{ color: accent }} />
            : <Play  size={14} style={{ color: accent }} className="ml-0.5" />}
      </button>

      {/* Waveform bars */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-end gap-[2px] h-5">
          {Array.from({ length: 20 }).map((_, i) => {
            const h      = 4 + Math.round(Math.sin(i * 0.9) * 6 + Math.cos(i * 0.4) * 4)
            const filled = i / 20 <= progress
            return (
              <div key={i} className="flex-1 rounded-full transition-colors"
                style={{
                  height: h,
                  background: filled
                    ? (isMe ? 'rgba(0,0,0,0.55)' : '#C9A84C')
                    : (isMe ? 'rgba(0,0,0,0.2)' : 'rgba(201,168,76,0.25)'),
                }} />
            )
          })}
        </div>
        <span className="text-[10px] font-medium leading-none"
          style={{ color: isMe ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.45)' }}>
          {loadErr ? 'unavailable' : playing ? fmtDuration(elapsed) : fmtDuration(duration)}
        </span>
      </div>
    </div>
  )
}

// ─── Album / image grid ───────────────────────────────────────
function MediaGrid({ urls, onOpen }: { urls: string[]; onOpen: (url: string) => void }) {
  const n = urls.length
  if (n === 0) return null
  if (n === 1) {
    return (
      <button onClick={() => onOpen(urls[0])} className="block rounded-xl overflow-hidden">
        <img src={urls[0]} alt="" className="max-w-[220px] max-h-[280px] object-cover w-full rounded-xl" />
      </button>
    )
  }
  const shown = urls.slice(0, 4)
  const extra = n - 4
  return (
    <div className="grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden w-[220px]">
      {shown.map((url, i) => (
        <button key={i} onClick={() => onOpen(url)} className="relative aspect-square block">
          <img src={url} alt="" className="w-full h-full object-cover" />
          {i === 3 && extra > 0 && (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white text-lg font-bold">
              +{extra + 1}
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Single message bubble ────────────────────────────────────
function Bubble({
  msg, isMe, other, currentUserId, onDelete, onEdit, onViewOnce, onImageOpen,
  onReply, onReact, replyToMsg, isLastInGroup, isLastSeen, convId,
}: {
  msg: Message
  isMe: boolean
  other: OtherProfile | null
  currentUserId: string
  onDelete: (id: string) => void
  onEdit: (msg: Message) => void
  onViewOnce: (id: string) => void
  onImageOpen: (url: string) => void
  onReply: (msg: Message) => void
  onReact: (msg: Message, emoji: string) => void
  replyToMsg: Message | null
  isLastInGroup: boolean
  isLastSeen: boolean
  convId: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [viewing, setViewing] = useState(false)
  const pressRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function startLongPress() {
    pressRef.current = setTimeout(() => setMenuOpen(true), 480)
  }
  function cancelLongPress() { clearTimeout(pressRef.current) }

  if (msg.is_deleted) {
    return (
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
        <span className="text-[11px] text-white/25 italic px-3 py-1.5">Message deleted</span>
      </div>
    )
  }

  const viewed = !!msg.viewed_at
  const reactions = msg.reactions ?? {}
  const hasReactions = Object.keys(reactions).length > 0

  function bubbleContent() {
    if (msg.type === 'voice') {
      return <VoicePlayer url={msg.media_urls[0]} isMe={isMe} />
    }

    if (msg.is_view_once) {
      if (isMe) {
        return (
          <div className="flex items-center gap-2 px-3 py-2.5 text-sm" style={{ color: viewed ? 'rgba(255,255,255,0.4)' : '#C9A84C' }}>
            <Eye size={14} />
            <span>{viewed ? 'Opened' : 'Sent · tap to view'}</span>
          </div>
        )
      }
      if (viewed && !viewing) {
        return (
          <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-white/35">
            <Eye size={14} /> Viewed
          </div>
        )
      }
      if (viewing) {
        return (
          <div className="relative">
            <img src={msg.media_urls[0]} alt="" className="max-w-[220px] max-h-[280px] object-cover rounded-xl" />
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/60 rounded-full px-2 py-0.5 text-[10px] text-white">
              <Eye size={9} /> View once
            </div>
          </div>
        )
      }
      return (
        <button onClick={() => { setViewing(true); onViewOnce(msg.id) }}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium" style={{ color: '#C9A84C' }}>
          <Eye size={15} /> Tap to view photo
        </button>
      )
    }

    if (msg.type === 'image' || msg.type === 'album') {
      return (
        <div>
          <MediaGrid urls={msg.media_urls ?? []} onOpen={onImageOpen} />
          {msg.content ? <p className="text-sm mt-1.5 px-1 max-w-[220px]">{msg.content}</p> : null}
        </div>
      )
    }

    return <p className="text-sm leading-relaxed break-words max-w-[240px]">{msg.content}</p>
  }

  const isMedia = msg.type !== 'text' || msg.is_view_once
  const baseRounded = isMe ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'

  return (
    <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} group relative`}>
      {/* Other avatar */}
      {!isMe && (
        isLastInGroup ? (
          <div className="w-7 h-7 rounded-full shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold mb-1"
            style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', minWidth: '1.75rem' }}>
            {other?.avatar_url
              ? <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />
              : (other?.full_name?.[0] ?? '?')}
          </div>
        ) : <div className="w-7 shrink-0" />
      )}

      <div className="max-w-[72%] flex flex-col">
        {/* Bubble */}
        <div
          className={`${baseRounded} ${isMedia && msg.type !== 'voice' ? 'overflow-hidden' : ''} relative cursor-default select-none`}
          style={
            isMe
              ? isMedia ? { background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.25)' } : { background: '#C9A84C' }
              : isMedia ? { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' } : { background: 'rgba(255,255,255,0.07)' }
          }
          onMouseDown={startLongPress}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
          onTouchStart={startLongPress}
          onTouchEnd={cancelLongPress}
          onContextMenu={e => { e.preventDefault(); setMenuOpen(true) }}
        >
          {/* Reply preview */}
          {replyToMsg && !replyToMsg.is_deleted && (
            <div className="mx-2 mt-2 mb-0 px-3 py-2 rounded-xl text-xs border-l-2 truncate max-w-[220px]"
              style={{
                borderLeftColor: isMe ? 'rgba(0,0,0,0.3)' : 'rgba(201,168,76,0.6)',
                background: isMe ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.06)',
                color: isMe ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)',
              }}>
              <span className="font-semibold block truncate" style={{ color: isMe ? 'rgba(0,0,0,0.7)' : '#C9A84C' }}>
                {replyToMsg.sender_id === currentUserId ? 'You' : (other?.full_name?.split(' ')[0] ?? 'Them')}
              </span>
              <span className="truncate block">
                {replyToMsg.type === 'voice' ? '🎤 Voice note' : replyToMsg.type !== 'text' ? '📷 Photo' : replyToMsg.content}
              </span>
            </div>
          )}

          {/* Content */}
          <div className={isMedia && msg.type !== 'voice' ? '' : isMe ? 'px-4 py-2.5 text-black' : 'px-4 py-2.5 text-white/90'}>
            {bubbleContent()}
          </div>

          {/* Long-press context menu */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className={`absolute z-50 top-full mt-1.5 ${isMe ? 'right-0' : 'left-0'} glass rounded-xl border border-white/10 shadow-xl overflow-visible min-w-[140px]`}>
                {/* React option */}
                <div className="relative">
                  <button onClick={() => setEmojiOpen(v => !v)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.06] whitespace-nowrap w-full transition-colors border-b border-white/[0.05]">
                    <SmilePlus size={13} style={{ color: '#C9A84C' }} /> React
                  </button>
                  {emojiOpen && (
                    <EmojiPicker
                      onPick={e => { onReact(msg, e); setMenuOpen(false) }}
                      onClose={() => setEmojiOpen(false)}
                    />
                  )}
                </div>
                <button onClick={() => { onReply(msg); setMenuOpen(false) }}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.06] whitespace-nowrap w-full transition-colors">
                  <Reply size={13} /> Reply
                </button>
                {isMe && !msg.is_deleted && msg.type === 'text' && (
                  <button onClick={() => { onEdit(msg); setMenuOpen(false) }}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.06] whitespace-nowrap w-full transition-colors">
                    <Pencil size={13} /> Edit
                  </button>
                )}
                {isMe && (
                  <button onClick={() => { onDelete(msg.id); setMenuOpen(false) }}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 whitespace-nowrap w-full transition-colors">
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Reaction badges */}
        {hasReactions && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(reactions).map(([emoji, users]) => {
              const iMine = users.includes(currentUserId)
              return (
                <button key={emoji}
                  onClick={() => onReact(msg, emoji)}
                  className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold transition-all active:scale-90"
                  style={{
                    background: iMine ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${iMine ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    color: iMine ? '#C9A84C' : 'rgba(255,255,255,0.6)',
                  }}>
                  {emoji} {users.length > 1 ? users.length : ''}
                </button>
              )
            })}
          </div>
        )}

        {/* Time + seen */}
        <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
          {msg.edited_at && <span className="text-[10px] text-white/25">edited ·</span>}
          <span className="text-[10px] text-white/25">{fmtTime(msg.created_at)}</span>
          {isMe && isLastSeen && msg.is_seen && (
            <CheckCheck size={10} style={{ color: '#C9A84C' }} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Lightbox ─────────────────────────────────────────────────
function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button className="absolute top-4 right-4 w-9 h-9 glass rounded-xl flex items-center justify-center text-white/60 hover:text-white" onClick={onClose}>
        <X size={18} />
      </button>
      <img src={url} alt="" className="max-w-full max-h-full object-contain rounded-xl" onClick={e => e.stopPropagation()} />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────
export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const urlId = use(params).id
  const router = useRouter()
  const supabase = createClient()

  const [convId, setConvId]           = useState('')
  const [matchId, setMatchId]         = useState('')
  const [otherId, setOtherId]         = useState('')
  const [otherProfile, setOtherProfile] = useState<OtherProfile | null>(null)
  const [currentUserId, setCurrentUserId] = useState('')
  const [messages, setMessages]       = useState<Message[]>([])
  const [hasMore, setHasMore]         = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [input, setInput]             = useState('')
  const [sending, setSending]         = useState(false)
  const [msgLimitReached, setMsgLimitReached] = useState(false)
  const [loading, setLoading]         = useState(true)
  const [otherTyping, setOtherTyping] = useState(false)

  // Image staging
  const [pendingFiles, setPendingFiles]       = useState<File[]>([])
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([])
  const [viewOnceMode, setViewOnceMode]       = useState(false)
  const [uploading, setUploading]             = useState(false)

  // Voice recording
  const [recording, setRecording]       = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [sendingVoice, setSendingVoice] = useState(false)
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null)
  const audioChunksRef    = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  // Reply + Edit + UI state
  const [replyingTo, setReplyingTo]       = useState<Message | null>(null)
  const [editingMsg, setEditingMsg]       = useState<Message | null>(null)
  const [lightboxUrl, setLightboxUrl]     = useState<string | null>(null)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<'unmatch' | 'block' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Refs
  const bottomRef     = useRef<HTMLDivElement>(null)
  const channelRef    = useRef<RealtimeChannel | null>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const typingClear   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const isTypingRef   = useRef(false)

  // ── Initial load ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      setCurrentUserId(user.id)

      const sel = `
        id, match_id,
        match:matches!conversations_match_id_fkey(
          user1_id, user2_id,
          user1:profiles!matches_user1_id_fkey(id,full_name,avatar_url,is_online,is_verified),
          user2:profiles!matches_user2_id_fkey(id,full_name,avatar_url,is_online,is_verified)
        )
      `
      let res = await supabase.from('conversations').select(sel).eq('id', urlId).single()
      if (res.error || !res.data) {
        res = await supabase.from('conversations').select(sel).eq('match_id', urlId).single()
      }
      if (cancelled || !res.data) { setLoading(false); return }

      type ConvLoaded = {
        id: string; match_id: string
        match: { user1_id: string; user2_id: string; user1: OtherProfile; user2: OtherProfile }
      }
      const c = res.data as unknown as ConvLoaded
      const other = c.match.user1_id === user.id ? c.match.user2 : c.match.user1
      const oId   = c.match.user1_id === user.id ? c.match.user2_id : c.match.user1_id

      if (!cancelled) {
        setConvId(c.id); setMatchId(c.match_id); setOtherId(oId); setOtherProfile(other)
      }

      const msgRes = await fetch(`/api/conversations/${c.id}/messages`)
      if (!cancelled && msgRes.ok) {
        const { messages: msgs, hasMore: more } = await msgRes.json()
        setMessages(msgs ?? [])
        setHasMore(!!more)
        setLoading(false)
      } else if (!cancelled) { setLoading(false) }
    }
    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlId])

  // ── Load older messages ───────────────────────────────────────
  async function loadOlderMessages() {
    if (!convId || loadingOlder || !hasMore) return
    const oldest = messages[0]?.created_at
    if (!oldest) return
    setLoadingOlder(true)
    const res = await fetch(`/api/conversations/${convId}/messages?before=${encodeURIComponent(oldest)}`)
    if (res.ok) {
      const { messages: older, hasMore: more } = await res.json()
      setMessages(prev => [...(older ?? []), ...prev])
      setHasMore(!!more)
    }
    setLoadingOlder(false)
  }

  // ── Realtime subscriptions ─────────────────────────────────────
  useEffect(() => {
    if (!convId || !currentUserId || !otherId) return

    const channel = supabase
      .channel(`chat:${convId}`, { config: { broadcast: { self: false } } })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        payload => {
          const m = payload.new as Message
          setMessages(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m])
          if (m.sender_id !== currentUserId) {
            supabase.from('messages').update({ is_seen: true }).eq('id', m.id).then(() => {})
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        payload => {
          const updated = payload.new as Message
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${otherId}` },
        payload => {
          const p = payload.new as { id: string; is_online: boolean }
          setOtherProfile(prev => prev?.id === p.id ? { ...prev, is_online: p.is_online } : prev)
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== currentUserId) {
          setOtherTyping(payload.isTyping)
          if (payload.isTyping) {
            clearTimeout(typingClear.current)
            typingClear.current = setTimeout(() => setOtherTyping(false), 3500)
          }
        }
      })
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convId, currentUserId, otherId])

  // ── Auto-scroll ────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, otherTyping])

  // ── Typing broadcast ───────────────────────────────────────────
  function broadcastTyping(isTyping: boolean) {
    channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUserId, isTyping } })
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    if (!isTypingRef.current) { isTypingRef.current = true; broadcastTyping(true) }
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => { isTypingRef.current = false; broadcastTyping(false) }, 2000)
  }

  // ── Voice recording ────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) ?? ''
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      audioChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch {
      alert('Microphone access denied.')
    }
  }

  async function stopRecording(send: boolean) {
    clearInterval(recordingTimerRef.current)
    const mr = mediaRecorderRef.current
    if (!mr) { setRecording(false); return }

    await new Promise<void>(res => {
      mr.onstop = () => res()
      mr.stop()
      mr.stream.getTracks().forEach(t => t.stop())
    })
    setRecording(false)
    if (!send || audioChunksRef.current.length === 0) return

    const recMime = mediaRecorderRef.current?.mimeType || 'audio/webm'
    const ext = recMime.includes('ogg') ? 'ogg' : recMime.includes('mp4') ? 'mp4' : 'webm'
    const blob = new Blob(audioChunksRef.current, { type: recMime })
    console.log('[voice] recorded — size:', blob.size, 'bytes, mime:', recMime, 'chunks:', audioChunksRef.current.length)
    if (blob.size < 1000) {
      alert('Recording seems empty (mic may be muted or wrong device selected). Check your browser microphone settings.')
      return
    }
    setSendingVoice(true)
    const path = `${currentUserId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('message-media').upload(path, blob, {
      contentType: recMime,
    })
    if (error) {
      console.error('[voice] upload failed:', error.message)
      alert(`Voice upload failed: ${error.message}`)
      setSendingVoice(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('message-media').getPublicUrl(path)
    console.log('[voice] uploaded OK →', publicUrl)
    const res = await fetch(`/api/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'voice', media_urls: [publicUrl] }),
    })
    if (res.ok) {
      const m: Message = await res.json()
      setMessages(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m])
    } else {
      console.error('[voice] message insert failed:', res.status, await res.text())
    }
    setSendingVoice(false)
  }

  // ── File picker ────────────────────────────────────────────────
  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setPendingFiles(prev => [...prev, ...files])
    const previews = files.map(f => URL.createObjectURL(f))
    setPendingPreviews(prev => [...prev, ...previews])
    if (e.target) e.target.value = ''
  }

  function removePending(i: number) {
    URL.revokeObjectURL(pendingPreviews[i])
    setPendingFiles(prev => prev.filter((_, idx) => idx !== i))
    setPendingPreviews(prev => prev.filter((_, idx) => idx !== i))
    if (pendingFiles.length <= 1) setViewOnceMode(false)
  }

  // ── Upload images ──────────────────────────────────────────────
  async function uploadImages(files: File[]): Promise<string[]> {
    const urls: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('message-media').upload(path, file)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('message-media').getPublicUrl(path)
        urls.push(publicUrl)
      }
    }
    return urls
  }

  // ── Send ───────────────────────────────────────────────────────
  async function send() {
    if (sending || uploading) return

    // Edit mode — patch existing message instead of creating new
    if (editingMsg) {
      const trimmed = input.trim()
      if (!trimmed) return
      setInput(''); setEditingMsg(null)
      await editMessage(editingMsg.id, trimmed)
      return
    }

    const hasText  = !!input.trim()
    const hasMedia = pendingFiles.length > 0
    if (!hasText && !hasMedia) return

    broadcastTyping(false); clearTimeout(typingTimeout.current); isTypingRef.current = false

    if (hasMedia) {
      setUploading(true)
      const mediaUrls = await uploadImages(pendingFiles)
      setUploading(false)
      if (mediaUrls.length === 0) return
      const type: MsgType = viewOnceMode ? 'view_once' : mediaUrls.length === 1 ? 'image' : 'album'
      pendingPreviews.forEach(p => URL.revokeObjectURL(p))
      setPendingFiles([]); setPendingPreviews([]); setViewOnceMode(false)
      setSending(true)
      const replyId = replyingTo?.id ?? null; setReplyingTo(null)
      await fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, media_urls: mediaUrls, content: input.trim(), is_view_once: viewOnceMode, reply_to_id: replyId }),
      })
      setSending(false); setInput('')
      return
    }

    setSending(true); setInput('')
    const replyId = replyingTo?.id ?? null; setReplyingTo(null)
    const res = await fetch(`/api/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input.trim(), reply_to_id: replyId }),
    })
    if (res.status === 429) {
      const body = await res.json()
      if (body.limitReached) { setInput(input.trim()); setMsgLimitReached(true) }
    } else if (res.ok) {
      const m: Message = await res.json()
      setMessages(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m])
    }
    setSending(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // ── React to message ───────────────────────────────────────────
  const handleReact = useCallback(async (msg: Message, emoji: string) => {
    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (m.id !== msg.id) return m
      const curr = { ...(m.reactions ?? {}) }
      const users: string[] = curr[emoji] ?? []
      const already = users.includes(currentUserId)
      if (already) {
        const next = users.filter(id => id !== currentUserId)
        if (next.length === 0) delete curr[emoji]
        else curr[emoji] = next
      } else {
        curr[emoji] = [...users, currentUserId]
      }
      return { ...m, reactions: curr }
    }))

    const res = await fetch(`/api/conversations/${convId}/messages/${msg.id}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    })
    if (res.ok) {
      const updated: Message = await res.json()
      setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, reactions: updated.reactions } : m))
    } else {
      // Revert optimistic update on error
      setMessages(prev => prev.map(m => m.id === msg.id ? msg : m))
    }
  }, [convId, currentUserId])

  // ── Per-message actions ────────────────────────────────────────
  async function deleteMessage(msgId: string) {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_deleted: true } : m))
    await fetch(`/api/conversations/${convId}/messages/${msgId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete' }),
    })
  }

  async function editMessage(msgId: string, content: string) {
    const trimmed = content.trim()
    if (!trimmed) return
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: trimmed, edited_at: new Date().toISOString() } : m))
    await fetch(`/api/conversations/${convId}/messages/${msgId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit', content: trimmed }),
    })
  }

  function startEdit(msg: Message) {
    setEditingMsg(msg)
    setReplyingTo(null)
    setInput(msg.content)
  }

  async function markViewOnce(msgId: string) {
    await fetch(`/api/conversations/${convId}/messages/${msgId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'view_once' }),
    })
  }

  // ── Unmatch / Block ────────────────────────────────────────────
  async function unmatch() {
    setActionLoading(true)
    const res = await fetch(`/api/matches/${matchId}`, { method: 'DELETE' })
    setActionLoading(false); setConfirmDialog(null)
    if (res.ok) router.push('/matches')
  }

  async function blockUser() {
    setActionLoading(true)
    const res = await fetch(`/api/users/${otherId}/block`, { method: 'POST' })
    setActionLoading(false); setConfirmDialog(null)
    if (res.ok) router.push('/discover')
  }

  // ── Derived ────────────────────────────────────────────────────
  const lastSeenMsgId = useMemo(
    () => messages.reduce<string | null>(
      (acc, m) => (m.sender_id === currentUserId && m.is_seen ? m.id : acc), null
    ), [messages, currentUserId]
  )
  const msgMap = useMemo(() => new Map(messages.map(m => [m.id, m])), [messages])
  const groups = messages.map((m, i) => ({
    ...m, isLastInGroup: i === messages.length - 1 || messages[i + 1]?.sender_id !== m.sender_id,
  }))

  // Smart replies: last message from the other person
  const smartReplies = useMemo(() => {
    const lastFromOther = [...messages].reverse().find(m => m.sender_id !== currentUserId && !m.is_deleted)
    return getSmartReplies(lastFromOther ?? null)
  }, [messages, currentUserId])

  type DayGroup = { day: string; msgs: typeof groups }
  const dayGroups: DayGroup[] = []
  groups.forEach(m => {
    const day = fmtDay(m.created_at)
    const last = dayGroups[dayGroups.length - 1]
    if (!last || last.day !== day) dayGroups.push({ day, msgs: [m] })
    else last.msgs.push(m)
  })

  if (loading) {
    return (
      <div className="flex flex-col h-dvh pt-nav-flush items-center justify-center">
        <Loader2 size={22} className="animate-spin text-white/30" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh pt-nav-flush pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:pb-0"
      onClick={() => setHeaderMenuOpen(false)}>

      {/* ── Header ── */}
      <div className="glass border-b border-white/[0.06] px-4 py-3 flex items-center gap-3 shrink-0 z-10">
        <Link href="/messages"
          className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.06] hover:bg-white/10 text-white/60 hover:text-white transition-colors mr-0.5">
          <ArrowLeft size={16} />
        </Link>

        {otherProfile?.avatar_url ? (
          <Image src={otherProfile.avatar_url} alt={otherProfile.full_name} width={40} height={40}
            priority className="w-10 h-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>
            {otherProfile?.full_name?.[0] ?? '?'}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white text-sm truncate">{otherProfile?.full_name ?? 'Unknown'}</span>
            {otherProfile?.is_verified && <BadgeCheck size={13} className="fill-blue-400 text-white shrink-0" />}
          </div>
          <p className="text-[11px]" style={{ color: otherProfile?.is_online ? '#2ECC71' : 'rgba(255,255,255,0.35)' }}>
            {otherTyping ? '✏️ typing…' : otherProfile?.is_online ? '● Online now' : 'Last seen recently'}
          </p>
        </div>

        <div className="relative" onClick={e => e.stopPropagation()}>
          <button onClick={() => setHeaderMenuOpen(v => !v)}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.06] hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <MoreVertical size={15} />
          </button>
          {headerMenuOpen && (
            <div className="absolute right-0 top-10 w-44 modal rounded-xl overflow-hidden z-50">
              <button onClick={() => { setHeaderMenuOpen(false); setConfirmDialog('unmatch') }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/[0.05] transition-colors border-b border-white/[0.05]">
                <UserMinus size={13} style={{ color: '#F39C12' }} />
                <span className="text-white/75">Unmatch</span>
              </button>
              <button onClick={() => { setHeaderMenuOpen(false); setConfirmDialog('block') }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-red-500/10 transition-colors">
                <ShieldBan size={13} style={{ color: '#E74C3C' }} />
                <span className="text-red-400">Block</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
        {hasMore && (
          <div className="flex justify-center pb-2">
            <button onClick={loadOlderMessages} disabled={loadingOlder}
              className="flex items-center gap-2 px-4 py-1.5 glass rounded-full text-xs text-white/40 hover:text-white transition-colors disabled:opacity-40">
              {loadingOlder ? <Loader2 size={11} className="animate-spin" /> : null}
              {loadingOlder ? 'Loading…' : 'Load older messages'}
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-white/30">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.12)' }}>
              {otherProfile?.avatar_url
                ? <img src={otherProfile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                : <span className="text-lg font-bold" style={{ color: '#C9A84C' }}>{otherProfile?.full_name?.[0]}</span>}
            </div>
            <p className="text-sm">Say hello to <span className="text-white/60">{otherProfile?.full_name ?? 'your match'}</span> 👋</p>
          </div>
        )}

        {dayGroups.map(({ day, msgs: dayMsgs }) => (
          <div key={day}>
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[10px] text-white/25 uppercase tracking-widest">{day}</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
            <div className="flex flex-col gap-1">
              {dayMsgs.map(m => (
                <Bubble key={m.id} msg={m}
                  isMe={m.sender_id === currentUserId}
                  other={otherProfile}
                  currentUserId={currentUserId}
                  onDelete={deleteMessage}
                  onEdit={startEdit}
                  onViewOnce={markViewOnce}
                  onImageOpen={setLightboxUrl}
                  onReply={setReplyingTo}
                  onReact={handleReact}
                  replyToMsg={m.reply_to_id ? (msgMap.get(m.reply_to_id) ?? null) : null}
                  isLastInGroup={m.isLastInGroup}
                  isLastSeen={m.id === lastSeenMsgId}
                  convId={convId}
                />
              ))}
            </div>
          </div>
        ))}

        {otherTyping && <TypingDots />}
        <div ref={bottomRef} />
      </div>

      {/* ── Smart reply chips ── */}
      {smartReplies.length > 0 && !input && !recording && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {smartReplies.map(reply => (
            <button key={reply}
              onClick={() => { setInput(reply); setTimeout(send, 50) }}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95"
              style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}>
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* ── Reply preview strip ── */}
      {replyingTo && (
        <div className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-3 bg-white/[0.03]">
          <CornerUpLeft size={14} style={{ color: '#C9A84C' }} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold" style={{ color: '#C9A84C' }}>
              {replyingTo.sender_id === currentUserId ? 'You' : (otherProfile?.full_name?.split(' ')[0] ?? 'Them')}
            </p>
            <p className="text-xs text-white/40 truncate">
              {replyingTo.type === 'voice' ? '🎤 Voice note' : replyingTo.type !== 'text' ? '📷 Photo' : replyingTo.content}
            </p>
          </div>
          <button onClick={() => setReplyingTo(null)}
            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/40 hover:text-white shrink-0 transition-colors">
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Edit indicator strip ── */}
      {editingMsg && (
        <div className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-3 bg-white/[0.03]">
          <Pencil size={14} style={{ color: '#C9A84C' }} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold" style={{ color: '#C9A84C' }}>Editing message</p>
            <p className="text-xs text-white/40 truncate">{editingMsg.content}</p>
          </div>
          <button onClick={() => { setEditingMsg(null); setInput('') }}
            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/40 hover:text-white shrink-0 transition-colors">
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Image staging strip ── */}
      {pendingPreviews.length > 0 && (
        <div className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-2 overflow-x-auto bg-black/20">
          {pendingPreviews.map((src, i) => (
            <div key={i} className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button onClick={() => removePending(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center">
                <X size={9} className="text-white" />
              </button>
            </div>
          ))}
          <button onClick={() => setViewOnceMode(v => !v)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={viewOnceMode
              ? { background: 'rgba(201,168,76,0.2)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)' }
              : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
            <Eye size={12} /> View once
          </button>
        </div>
      )}

      {/* ── Recording UI ── */}
      {recording && (
        <div className="px-4 py-3 border-t border-white/[0.06] flex items-center gap-3 shrink-0"
          style={{ background: 'rgba(231,76,60,0.07)' }}>
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-sm font-semibold text-red-400">{fmtDuration(recordingTime)}</span>
          <span className="text-xs text-white/40 flex-1">Recording voice note…</span>
          <button onClick={() => stopRecording(false)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white/50 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)' }}>
            Cancel
          </button>
          <button onClick={() => stopRecording(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-black"
            style={{ background: '#C9A84C' }}>
            Send
          </button>
        </div>
      )}

      {/* ── Free user limit banner ── */}
      {msgLimitReached && (
        <div className="px-4 py-2.5 flex items-center gap-3 shrink-0"
          style={{ background: 'rgba(201,168,76,0.08)', borderTop: '1px solid rgba(201,168,76,0.2)' }}>
          <Crown size={14} style={{ color: '#C9A84C' }} className="shrink-0" />
          <p className="text-xs text-white/60 flex-1">Daily message limit reached.</p>
          <a href="/premium" className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-xl text-black"
            style={{ background: '#C9A84C' }}>
            Upgrade
          </a>
        </div>
      )}

      {/* ── Input bar ── */}
      {!recording && (
        <div className="glass border-t border-white/[0.06] px-3 py-3 flex items-end gap-2 shrink-0">
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilePick} />

          {/* Image picker */}
          <button onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
            <ImagePlus size={17} />
          </button>

          {/* Text area */}
          <textarea value={input} onChange={handleInputChange} onKeyDown={onKeyDown}
            placeholder="Message…" rows={1}
            className="flex-1 min-h-[40px] max-h-32 px-4 py-2.5 rounded-xl resize-none text-sm text-white placeholder-white/25 outline-none transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }} />

          {/* Mic button — only visible when no text input */}
          {!input.trim() && pendingFiles.length === 0 && (
            <button
              onMouseDown={startRecording}
              onTouchStart={startRecording}
              disabled={sendingVoice}
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
              {sendingVoice ? <Loader2 size={16} className="animate-spin" /> : <Mic size={17} />}
            </button>
          )}

          {/* Send */}
          <button onClick={send}
            disabled={(!input.trim() && pendingFiles.length === 0) || sending || uploading}
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-30"
            style={{ background: (input.trim() || pendingFiles.length > 0) ? '#C9A84C' : 'rgba(255,255,255,0.06)' }}>
            {sending || uploading
              ? <Loader2 size={16} className="animate-spin text-black" />
              : <Send size={16} className={(input.trim() || pendingFiles.length > 0) ? 'text-black' : 'text-white/40'} />}
          </button>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      {/* ── Confirm dialogs ── */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-6 bg-black/60">
          <div className="glass rounded-3xl p-6 max-w-sm w-full border border-white/10 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mx-auto"
              style={{ background: confirmDialog === 'block' ? 'rgba(231,76,60,0.15)' : 'rgba(243,156,18,0.15)' }}>
              {confirmDialog === 'block'
                ? <ShieldBan size={22} style={{ color: '#E74C3C' }} />
                : <AlertTriangle size={22} style={{ color: '#F39C12' }} />}
            </div>
            <h3 className="text-lg font-bold text-white text-center mb-1">
              {confirmDialog === 'block' ? `Block ${otherProfile?.full_name}?` : 'Unmatch?'}
            </h3>
            <p className="text-sm text-white/40 text-center mb-6">
              {confirmDialog === 'block'
                ? "They won't be able to contact you. This also removes the match."
                : 'This will remove the match and all messages permanently.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDialog(null)}
                className="flex-1 h-11 glass rounded-2xl text-sm font-medium text-white/60 hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={confirmDialog === 'block' ? blockUser : unmatch} disabled={actionLoading}
                className="flex-1 h-11 rounded-2xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: confirmDialog === 'block' ? '#E74C3C' : '#F39C12', color: 'white' }}>
                {actionLoading
                  ? <Loader2 size={16} className="animate-spin mx-auto" />
                  : confirmDialog === 'block' ? 'Block' : 'Unmatch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
