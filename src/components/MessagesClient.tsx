'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Search, BadgeCheck, Crown, MessageCircle, X, Loader2, Filter, PenSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AnimatePresence, motion } from 'framer-motion'
import { clsx } from 'clsx'

// ─── Types ────────────────────────────────────────────────────
interface OtherProfile {
  id: string; full_name: string; avatar_url: string | null
  is_online: boolean; is_verified: boolean; is_premium: boolean
  premium_tier: 'gold' | 'platinum' | null
}

export interface ConvRow {
  id: string
  match_id: string
  updated_at: string
  created_at: string
  other_profile: OtherProfile
  last_message: string | null
  last_message_at: string | null
  last_message_sender_id: string | null
  unread_count: number
}

interface MatchItem {
  id: string
  conversationId: string | null
  profile: { id: string; full_name: string; avatar_url: string | null; is_online: boolean; is_verified: boolean; premium_tier?: 'gold' | 'platinum' | null }
}

// ─── helpers ──────────────────────────────────────────────────
function timeAgo(date: string | null): string {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function TierRing({ tier }: { tier: 'gold' | 'platinum' | null }) {
  if (!tier) return null
  return (
    <div className="absolute inset-0 rounded-full pointer-events-none"
      style={{
        boxShadow: tier === 'platinum'
          ? 'inset 0 0 0 2px rgba(232,232,232,0.6)'
          : 'inset 0 0 0 2px rgba(201,168,76,0.8)',
      }} />
  )
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <motion.div 
      initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-black px-1"
      style={{ background: '#C9A84C', boxShadow: '0 0 8px rgba(201,168,76,0.4)' }}>
      {count}
    </motion.div>
  )
}

// ─── Compose sheet ────────────────────────────────────────────
function ComposeSheet({ onClose, existingConvIds }: { onClose: () => void; existingConvIds: Set<string> }) {
  const router = useRouter()
  const [matches, setMatches]   = useState<MatchItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [query, setQuery]       = useState('')
  const [creating, setCreating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/matches')
      .then(r => r.ok ? r.json() : [])
      .then((ms: MatchItem[]) => setMatches(Array.isArray(ms) ? ms : []))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false))
  }, [])

  const newMatches     = matches.filter(m => !m.conversationId)
  const chattingMatches = matches.filter(m => !!m.conversationId && existingConvIds.has(m.conversationId))

  const filtered = (list: MatchItem[]) => query.trim()
    ? list.filter(m => m.profile.full_name.toLowerCase().includes(query.toLowerCase()))
    : list

  async function openChat(match: MatchItem) {
    if (match.conversationId) {
      onClose()
      router.push(`/messages/${match.conversationId}`)
      return
    }
    setCreating(match.id)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id }),
      })
      if (res.ok) {
        const { conversationId } = await res.json()
        onClose()
        router.push(`/messages/${conversationId}`)
      }
    } catch { /* silent */ } finally {
      setCreating(null)
    }
  }

  function MatchRow({ m }: { m: MatchItem }) {
    const isBusy = creating === m.id
    return (
      <button onClick={() => openChat(m)} disabled={isBusy}
        className="flex items-center gap-3 py-3 w-full text-left hover:bg-white/[0.04] -mx-2 px-2 rounded-2xl transition-colors group">
        <div className="relative shrink-0">
          {m.profile.avatar_url ? (
            <Image src={m.profile.avatar_url} alt={m.profile.full_name} width={44} height={44}
              className="rounded-full object-cover" style={{ width: 44, height: 44 }} />
          ) : (
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-base"
              style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>
              {m.profile.full_name.charAt(0)}
            </div>
          )}
          <TierRing tier={m.profile.premium_tier ?? null} />
          {m.profile.is_online && (
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0A0A0B]"
              style={{ background: '#2ECC71' }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm text-white/90 truncate">{m.profile.full_name}</span>
            {m.profile.is_verified && <BadgeCheck size={13} className="fill-blue-400 text-blue-300 shrink-0" />}
          </div>
          <p className="text-xs text-white/40 mt-0.5">{m.conversationId ? 'Continue chat' : 'Say hello'}</p>
        </div>
        <div className="shrink-0">
          {isBusy
            ? <Loader2 size={16} className="animate-spin text-white/30" />
            : <MessageCircle size={16} className="text-white/20 group-hover:text-gold transition-colors" style={{ color: undefined }} />
          }
        </div>
      </button>
    )
  }

  return (
    <motion.div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full sm:max-w-sm overflow-hidden rounded-t-3xl sm:rounded-3xl"
        style={{ background: '#111114', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '85dvh', display: 'flex', flexDirection: 'column' }}
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}>

        {/* Drag handle indicator */}
        <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mt-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-4 shrink-0">
          <h2 className="text-base font-bold text-white">New Message</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.07] flex items-center justify-center text-white/40 hover:text-white transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Search */}
        <div className="relative px-5 pb-4 shrink-0">
          <Search size={14} className="absolute left-8 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search matches…" autoFocus
            className="w-full h-10 pl-8 pr-4 rounded-xl text-sm text-white placeholder-white/25 outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }} />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-white/30" />
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/40 text-sm">No matches yet.</p>
              <Link href="/discover" onClick={onClose}
                className="inline-flex mt-3 px-5 py-2.5 btn-gold rounded-2xl text-sm font-bold text-black">
                Go Discover
              </Link>
            </div>
          ) : (
            <>
              {filtered(newMatches).length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
                    Not yet messaged ({filtered(newMatches).length})
                  </p>
                  {filtered(newMatches).map(m => <MatchRow key={m.id} m={m} />)}
                </div>
              )}
              {filtered(chattingMatches).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2 mt-4">
                    Already chatting ({filtered(chattingMatches).length})
                  </p>
                  {filtered(chattingMatches).map(m => <MatchRow key={m.id} m={m} />)}
                </div>
              )}
              {filtered(newMatches).length === 0 && filtered(chattingMatches).length === 0 && (
                <p className="text-center text-white/30 text-sm py-6">No matches found</p>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────
interface Props {
  currentUserId: string
  initialConversations: ConvRow[]
}

export default function MessagesClient({ currentUserId, initialConversations }: Props) {
  const [conversations, setConversations] = useState<ConvRow[]>(initialConversations)
  const [query, setQuery]                 = useState('')
  const [unreadOnly, setUnreadOnly]       = useState(false)
  const [showCompose, setShowCompose]     = useState(false)
  const fetchingRef                       = useRef(false)

  const refetch = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const res = await fetch('/api/conversations')
      if (res.ok) setConversations(await res.json())
    } catch { /* silent */ } finally {
      fetchingRef.current = false
    }
  }, [])

  // Real-time: subscribe to message inserts + updates
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('messages-list-rt')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { conversation_id: string; content: string; sender_id: string; created_at: string }
          setConversations(prev => {
            const idx = prev.findIndex(c => c.id === msg.conversation_id)
            if (idx === -1) {
              // Unknown conversation — do a full refetch in background
              refetch()
              return prev
            }
            const updated = [...prev]
            const conv = {
              ...updated[idx],
              last_message:           msg.content,
              last_message_at:        msg.created_at,
              last_message_sender_id: msg.sender_id,
              unread_count: msg.sender_id !== currentUserId
                ? (updated[idx].unread_count || 0) + 1
                : updated[idx].unread_count,
            }
            updated.splice(idx, 1)
            updated.unshift(conv)
            return updated
          })
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { conversation_id: string; is_seen: boolean; sender_id: string }
          if (msg.is_seen && msg.sender_id !== currentUserId) {
            setConversations(prev => prev.map(c =>
              c.id === msg.conversation_id
                ? { ...c, unread_count: Math.max(0, (c.unread_count || 0) - 1) }
                : c
            ))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, refetch])

  // Filter logic
  const filtered = conversations.filter(c => {
    if (unreadOnly && c.unread_count === 0) return false
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      c.other_profile.full_name.toLowerCase().includes(q) ||
      (c.last_message ?? '').toLowerCase().includes(q)
    )
  })

  const existingConvIds = new Set(conversations.map(c => c.id))
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0)

  return (
    <div className="min-h-screen pt-nav pb-nav-bottom px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Messages</h1>
            {totalUnread > 0 && (
              <span className="h-6 min-w-[24px] px-1.5 rounded-full text-xs font-bold text-black flex items-center justify-center"
                style={{ background: '#C9A84C' }}>
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowCompose(true)}
            className="glass w-10 h-10 rounded-xl flex items-center justify-center text-white/50 hover:text-white transition-colors"
            title="New message">
            <PenSquare size={17} />
          </button>
        </div>

        {/* Search + filter row */}
        <div className="flex gap-2 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search conversations…"
              className="w-full h-11 pl-9 pr-4 rounded-xl text-white placeholder-white/25 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
            />
          </div>
          <button
            onClick={() => setUnreadOnly(v => !v)}
            className="h-11 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all"
            style={{
              background: unreadOnly ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${unreadOnly ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.09)'}`,
              color: unreadOnly ? '#C9A84C' : 'rgba(255,255,255,0.5)',
            }}>
            <Filter size={13} />
            Unread
          </button>
        </div>

        {/* Conversation list */}
        {filtered.length === 0 && conversations.length === 0 ? (
          /* True empty state */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <MessageCircle size={28} style={{ color: '#C9A84C' }} />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">No messages yet</h2>
            <p className="text-white/40 text-sm max-w-xs leading-relaxed mb-6">
              Match with someone and start a conversation. Your chats will appear here.
            </p>
            <Link href="/matches"
              className="btn-gold px-6 py-3 rounded-2xl font-bold text-black text-sm inline-flex items-center gap-2">
              <MessageCircle size={15} /> Go to Matches
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-white/30 py-10 text-sm">
            {unreadOnly ? 'No unread messages' : 'No conversations match your search'}
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-white/[0.05]">
            {filtered.map((conv) => {
              const p = conv.other_profile
              const isMine = conv.last_message_sender_id === currentUserId
              const preview = conv.last_message
                ? (isMine ? `You: ${conv.last_message}` : conv.last_message)
                : 'Say hello 👋'

              return (
                <Link key={conv.id} href={`/messages/${conv.id}`}
                  className="flex items-center gap-3.5 py-4 hover:bg-white/[0.03] -mx-2 px-2 rounded-2xl transition-colors group">

                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {p.avatar_url ? (
                      <Image src={p.avatar_url} alt={p.full_name} width={52} height={52}
                        className="rounded-full object-cover" style={{ width: 52, height: 52 }} />
                    ) : (
                      <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-lg font-bold"
                        style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>
                        {p.full_name.charAt(0)}
                      </div>
                    )}
                    <TierRing tier={p.premium_tier} />
                    {p.is_online && (
                      <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-[#0A0A0B]"
                        style={{ background: '#2ECC71' }} />
                    )}
                    <UnreadBadge count={conv.unread_count} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={clsx('font-semibold text-sm truncate', conv.unread_count > 0 ? 'text-white' : 'text-white/80')}>
                        {p.full_name}
                      </span>
                      {p.is_verified && <BadgeCheck size={13} className="fill-blue-400 text-blue-300 shrink-0" />}
                      {p.premium_tier === 'gold' && <Crown size={11} style={{ color: '#C9A84C' }} className="shrink-0" />}
                      {p.premium_tier === 'platinum' && <Crown size={11} className="text-white/60 shrink-0" />}
                      <span className="ml-auto text-xs text-white/30 shrink-0">{timeAgo(conv.last_message_at)}</span>
                    </div>
                    <p className={clsx('text-sm truncate', conv.unread_count > 0 ? 'text-white/70 font-medium' : 'text-white/40')}>
                      {preview}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Compose sheet */}
      <AnimatePresence>
        {showCompose && (
          <ComposeSheet onClose={() => setShowCompose(false)} existingConvIds={existingConvIds} />
        )}
      </AnimatePresence>
    </div>
  )
}
