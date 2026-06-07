'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MessageCircle, Search, RefreshCw, Loader2, ShieldAlert,
  AlertTriangle, ChevronLeft, ChevronRight, X, Shield,
} from 'lucide-react'
import { clsx } from 'clsx'

// ── Types ─────────────────────────────────────────────────────
interface UserSnippet {
  id: string
  full_name: string
  avatar_url: string | null
  profession: string | null
}

interface ConvRow {
  id: string
  match_id: string
  updated_at: string
  user1: UserSnippet | null
  user2: UserSnippet | null
  last_message: string | null
  last_message_at: string | null
  flag_count: number
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_seen: boolean
  created_at: string
  sender: UserSnippet | null
  safety_flag: 'crisis' | 'threat' | null
}

interface ConvDetail {
  conversation: { id: string; match_id: string; updated_at: string }
  participants: (UserSnippet & { is_verified: boolean; is_premium: boolean; is_suspended: boolean })[]
  messages: Message[]
  flagged_count: number
}

// ── Helpers ───────────────────────────────────────────────────
function Avatar({ src, name, size = 8 }: { src: string | null; name: string; size?: number }) {
  return (
    <div
      className={`rounded-full shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold`}
      style={{
        width: size * 4, height: size * 4,
        background: 'rgba(201,168,76,0.12)', color: '#C9A84C',
        minWidth: size * 4, minHeight: size * 4,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : (name?.[0] ?? '?')}
    </div>
  )
}

function elapsed(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}

function SafetyBadge({ flag }: { flag: 'crisis' | 'threat' | null }) {
  if (!flag) return null
  const cfg = flag === 'crisis'
    ? { label: '⚠ Crisis', bg: 'rgba(231,76,60,0.15)', color: '#E74C3C', border: 'rgba(231,76,60,0.3)' }
    : { label: '⚠ Threat', bg: 'rgba(255,152,0,0.15)', color: '#FF9800', border: 'rgba(255,152,0,0.3)' }
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  )
}

// ── Conversation list ─────────────────────────────────────────
function ConvList({
  selected,
  onSelect,
}: {
  selected: string | null
  onSelect: (id: string) => void
}) {
  const [convs, setConvs]   = useState<ConvRow[]>([])
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')
  const [flagged, setFlagged] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (search)  params.set('search', search)
    if (flagged) params.set('flagged', 'true')
    const res = await fetch(`/api/admin/conversations?${params}`)
    if (res.ok) {
      const d = await res.json()
      setConvs(d.conversations ?? [])
      setTotal(d.total ?? 0)
    }
    setLoading(false)
  }, [page, search, flagged])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, flagged])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="flex flex-col h-full">
      {/* Search + filter */}
      <div className="p-3 border-b border-white/[0.06] flex flex-col gap-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full pl-8 pr-3 py-2 text-xs bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/20 outline-none focus:border-amber-400/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFlagged(false)}
            className={clsx('flex-1 py-1 text-[11px] font-medium rounded-lg transition-all',
              !flagged ? 'text-black' : 'text-white/40 hover:text-white')}
            style={!flagged ? { background: '#C9A84C' } : {}}
          >
            All
          </button>
          <button
            onClick={() => setFlagged(true)}
            className={clsx('flex-1 flex items-center justify-center gap-1 py-1 text-[11px] font-medium rounded-lg transition-all',
              flagged ? 'text-black' : 'text-white/40 hover:text-white')}
            style={flagged ? { background: '#E74C3C' } : {}}
          >
            <ShieldAlert size={11} /> Safety
          </button>
          <button onClick={load} className="p-1.5 glass rounded-lg text-white/30 hover:text-white">
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={18} className="animate-spin text-white/30" /></div>
        ) : convs.length === 0 ? (
          <p className="text-center py-12 text-xs text-white/25">
            {flagged ? 'No flagged conversations' : 'No conversations yet'}
          </p>
        ) : (
          convs.map(c => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={clsx(
                'w-full flex items-start gap-2.5 px-3 py-3 border-b border-white/[0.04] text-left transition-colors',
                selected === c.id ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
              )}
            >
              {/* Stacked avatars */}
              <div className="relative shrink-0 w-9 h-8 mt-0.5">
                <Avatar src={c.user1?.avatar_url ?? null} name={c.user1?.full_name ?? '?'} size={6} />
                <div className="absolute -bottom-0.5 -right-0.5">
                  <Avatar src={c.user2?.avatar_url ?? null} name={c.user2?.full_name ?? '?'} size={5} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-medium text-white truncate">
                    {c.user1?.full_name ?? '—'} & {c.user2?.full_name ?? '—'}
                  </span>
                  {c.flag_count > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: 'rgba(231,76,60,0.15)', color: '#E74C3C' }}>
                      {c.flag_count}⚠
                    </span>
                  )}
                </div>
                {c.last_message && (
                  <p className="text-[11px] text-white/35 truncate">{c.last_message}</p>
                )}
                {c.last_message_at && (
                  <p className="text-[10px] text-white/20 mt-0.5">{elapsed(c.last_message_at)}</p>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.06]">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-1 glass rounded-lg text-white/40 hover:text-white disabled:opacity-30"><ChevronLeft size={12} /></button>
          <span className="text-[10px] text-white/30">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-1 glass rounded-lg text-white/40 hover:text-white disabled:opacity-30"><ChevronRight size={12} /></button>
        </div>
      )}
    </div>
  )
}

// ── Message thread ────────────────────────────────────────────
function MessageThread({ convId, onClose }: { convId: string; onClose: () => void }) {
  const [detail, setDetail]   = useState<ConvDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`/api/admin/conversations/${convId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setDetail(d)
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [convId])

  if (loading) return (
    <div className="flex flex-col h-full items-center justify-center">
      <Loader2 size={22} className="animate-spin text-white/30" />
    </div>
  )

  if (error || !detail) return (
    <div className="flex flex-col h-full items-center justify-center gap-2">
      <p className="text-sm text-red-400">{error || 'Not found'}</p>
    </div>
  )

  const { participants, messages, flagged_count } = detail
  const pById = Object.fromEntries(participants.map(p => [p.id, p]))

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
        <button onClick={onClose} className="md:hidden text-white/30 hover:text-white mr-1">
          <ChevronLeft size={16} />
        </button>
        <div className="flex -space-x-1.5">
          {participants.slice(0, 2).map(p => (
            <Avatar key={p.id} src={p.avatar_url} name={p.full_name} size={7} />
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {participants.map(p => p.full_name).join(' & ')}
          </p>
          <p className="text-xs text-white/35">{messages.length} messages</p>
        </div>
        {flagged_count > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl shrink-0"
            style={{ background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.25)' }}>
            <Shield size={12} style={{ color: '#E74C3C' }} />
            <span className="text-[11px] font-bold" style={{ color: '#E74C3C' }}>
              {flagged_count} safety alert{flagged_count > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Safety banner */}
      {flagged_count > 0 && (
        <div className="mx-3 mt-3 flex items-start gap-2.5 p-3 rounded-xl"
          style={{ background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)' }}>
          <AlertTriangle size={14} style={{ color: '#E74C3C' }} className="mt-0.5 shrink-0" />
          <p className="text-xs" style={{ color: '#E74C3C' }}>
            This conversation contains <strong>{flagged_count}</strong> message{flagged_count > 1 ? 's' : ''} flagged for potentially harmful content. Review carefully and take action in the Users section if needed.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {messages.length === 0 ? (
          <p className="text-center py-12 text-xs text-white/25">No messages yet</p>
        ) : (
          messages.map(msg => {
            const sender = pById[msg.sender_id] ?? msg.sender
            const isRight = sender?.id === participants[1]?.id
            const hasSafetyFlag = msg.safety_flag !== null

            return (
              <div key={msg.id}
                className={clsx('flex gap-2 max-w-[85%]', isRight ? 'self-end flex-row-reverse' : 'self-start')}
              >
                <Avatar src={sender?.avatar_url ?? null} name={sender?.full_name ?? '?'} size={6} />
                <div className="flex flex-col gap-1">
                  {hasSafetyFlag && (
                    <div className="flex items-center gap-1.5">
                      <SafetyBadge flag={msg.safety_flag} />
                    </div>
                  )}
                  <div
                    className={clsx('px-3 py-2 rounded-2xl text-sm')}
                    style={{
                      background: hasSafetyFlag
                        ? msg.safety_flag === 'crisis'
                          ? 'rgba(231,76,60,0.15)'
                          : 'rgba(255,152,0,0.12)'
                        : isRight
                          ? 'rgba(201,168,76,0.15)'
                          : 'rgba(255,255,255,0.07)',
                      border: hasSafetyFlag
                        ? msg.safety_flag === 'crisis'
                          ? '1px solid rgba(231,76,60,0.3)'
                          : '1px solid rgba(255,152,0,0.25)'
                        : '1px solid transparent',
                      color: hasSafetyFlag
                        ? msg.safety_flag === 'crisis' ? '#f87171' : '#fbbf24'
                        : 'rgba(255,255,255,0.85)',
                    }}
                  >
                    {msg.content}
                  </div>
                  <p className={clsx('text-[10px] text-white/20', isRight ? 'text-right' : '')}>
                    {sender?.full_name} · {elapsed(msg.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function AdminMessagesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const showThread = selectedId !== null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Message Monitor</h1>
        <p className="text-sm text-white/35">Read conversations between users · Safety alerts highlighted automatically</p>
      </div>

      {/* Safety info banner */}
      <div className="flex items-start gap-3 p-4 glass rounded-2xl mb-6"
        style={{ border: '1px solid rgba(231,76,60,0.15)' }}>
        <Shield size={16} style={{ color: '#E74C3C' }} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-white mb-0.5">Content safety monitoring is active</p>
          <p className="text-xs text-white/40 leading-relaxed">
            All messages are scanned for crisis signals (self-harm, suicidal ideation) and threats of violence.
            Flagged messages are highlighted in red (crisis) or amber (threat). Use the <strong className="text-white/60">Safety</strong> filter to see only conversations with alerts.
          </p>
        </div>
        <button
          className="shrink-0 text-white/20 hover:text-white/40"
          onClick={() => {}}
        >
          <X size={14} />
        </button>
      </div>

      {/* Split layout: list left, thread right */}
      <div
        className="glass rounded-2xl overflow-hidden"
        style={{ height: 'calc(100vh - 280px)', minHeight: 480 }}
      >
        <div className="flex h-full">
          {/* Left: conversation list — hidden on mobile when thread is open */}
          <div
            className={clsx(
              'border-r border-white/[0.06] flex flex-col',
              showThread ? 'hidden md:flex md:w-72 lg:w-80' : 'flex w-full md:w-72 lg:w-80'
            )}
          >
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
              <MessageCircle size={14} style={{ color: '#4A90E2' }} />
              <p className="text-sm font-semibold text-white">Conversations</p>
            </div>
            <ConvList selected={selectedId} onSelect={setSelectedId} />
          </div>

          {/* Right: message thread */}
          <div className={clsx('flex-1 flex flex-col', !showThread && 'hidden md:flex')}>
            {!showThread ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-white/20">
                <MessageCircle size={32} />
                <p className="text-sm">Select a conversation to read messages</p>
              </div>
            ) : (
              <MessageThread
                key={selectedId}
                convId={selectedId}
                onClose={() => setSelectedId(null)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
