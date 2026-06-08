'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ChevronLeft, Shield, AlertTriangle, Loader2, RefreshCw,
  CheckCircle, ShieldOff, Crown, ExternalLink,
} from 'lucide-react'
import { clsx } from 'clsx'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  profession: string | null
  category: string | null
  is_premium: boolean
  premium_tier: string | null
  is_verified: boolean
  is_suspended: boolean
}

interface Message {
  id: string
  sender_id: string
  content: string
  is_seen: boolean
  created_at: string
  sender: Profile | null
  safety_flag: 'crisis' | 'threat' | null
}

interface ConvData {
  conversation: { id: string; match_id: string; created_at: string; updated_at: string }
  match: { id: string; user1_id: string; user2_id: string; created_at: string } | null
  participants: Profile[]
  messages: Message[]
  flagged_count: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function elapsed(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}

function Avatar({ src, name, size = 40 }: { src: string | null; name: string; size?: number }) {
  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center font-bold text-sm shrink-0"
      style={{
        width: size, height: size, minWidth: size, minHeight: size,
        background: 'rgba(201,168,76,0.12)', color: '#C9A84C',
      }}
    >
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt="" className="w-full h-full object-cover" />
        : (name?.[0]?.toUpperCase() ?? '?')
      }
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminConversationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data,    setData]    = useState<ConvData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`/api/admin/conversations/${id}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to load'); return }
      setData(json)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  // Scroll to latest message once loaded
  useEffect(() => {
    if (data) bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [data])

  const pById = Object.fromEntries((data?.participants ?? []).map(p => [p.id, p]))

  return (
    <div>
      {/* Breadcrumb + refresh */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/admin/messages"
            className="flex items-center gap-1 text-white/40 hover:text-white transition-colors"
          >
            <ChevronLeft size={15} /> Messages
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white/50">Conversation</span>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-xl text-xs text-white/50 hover:text-white transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && !data && (
        <div className="flex justify-center py-24">
          <Loader2 size={24} className="animate-spin text-white/30" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="glass rounded-2xl p-8 text-center border border-red-500/20">
          <p className="text-sm text-red-400 mb-3">{error}</p>
          <button onClick={load} className="text-xs text-white/40 hover:text-white underline">
            Try again
          </button>
        </div>
      )}

      {data && (
        <>
          {/* Participants */}
          <div className="mb-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/25 mb-3">
              Participants
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.participants.map(p => (
                <div
                  key={p.id}
                  className="glass rounded-2xl p-4 flex items-center gap-3 border border-white/[0.07]"
                >
                  <Avatar src={p.avatar_url} name={p.full_name} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <p className="text-sm font-semibold text-white truncate">{p.full_name}</p>
                      {p.is_verified  && <CheckCircle size={12} style={{ color: '#4A90E2' }} className="shrink-0" />}
                      {p.is_premium   && <Crown       size={12} style={{ color: '#C9A84C' }} className="shrink-0" />}
                      {p.is_suspended && <ShieldOff   size={12} style={{ color: '#E74C3C' }} className="shrink-0" />}
                    </div>
                    <p className="text-xs text-white/35 truncate">
                      {p.profession ?? p.category ?? '—'}
                      {p.is_premium && p.premium_tier ? ` · ${p.premium_tier}` : ''}
                    </p>
                  </div>
                  <Link
                    href={`/admin/users?search=${encodeURIComponent(p.full_name)}`}
                    className="shrink-0 p-2 glass rounded-xl text-white/30 hover:text-white transition-colors"
                    title="Find user in admin"
                  >
                    <ExternalLink size={13} />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Safety banner */}
          {data.flagged_count > 0 && (
            <div
              className="flex items-start gap-3 p-4 rounded-2xl mb-5"
              style={{ background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)' }}
            >
              <AlertTriangle size={15} style={{ color: '#E74C3C' }} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: '#E74C3C' }}>
                  {data.flagged_count} safety alert{data.flagged_count > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-white/50 leading-relaxed">
                  Messages flagged for crisis or threat content are highlighted below.
                  If action is needed, use <Link href="/admin/users" className="underline text-white/60">Admin → Users</Link> to suspend an account.
                </p>
              </div>
            </div>
          )}

          {/* Stats bar */}
          <div className="flex items-center gap-4 mb-3 text-xs text-white/25">
            <span>{data.messages.length} message{data.messages.length !== 1 ? 's' : ''}</span>
            {data.flagged_count > 0 && (
              <span className="flex items-center gap-1" style={{ color: '#E74C3C' }}>
                <Shield size={11} /> {data.flagged_count} flagged
              </span>
            )}
            <span className="ml-auto">
              Started {new Date(data.conversation.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Message thread */}
          <div
            className="glass rounded-2xl p-4 flex flex-col gap-2.5 overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 440px)', minHeight: 280 }}
          >
            {data.messages.length === 0 ? (
              <p className="text-center text-xs text-white/20 py-12">No messages in this conversation</p>
            ) : (
              data.messages.map(msg => {
                const sender      = pById[msg.sender_id] ?? msg.sender
                const isRight     = sender?.id === data.participants[1]?.id
                const hasSafetyFlag = msg.safety_flag !== null

                return (
                  <div
                    key={msg.id}
                    className={clsx(
                      'flex gap-2.5 max-w-[80%]',
                      isRight ? 'self-end flex-row-reverse' : 'self-start'
                    )}
                  >
                    <Avatar src={sender?.avatar_url ?? null} name={sender?.full_name ?? '?'} size={30} />
                    <div className="flex flex-col gap-1">
                      {hasSafetyFlag && (
                        <span
                          className="text-[9px] font-bold px-2 py-0.5 rounded-full w-fit"
                          style={msg.safety_flag === 'crisis'
                            ? { background: 'rgba(231,76,60,0.18)', color: '#E74C3C', border: '1px solid rgba(231,76,60,0.3)' }
                            : { background: 'rgba(255,152,0,0.15)', color: '#FF9800', border: '1px solid rgba(255,152,0,0.25)' }
                          }
                        >
                          {msg.safety_flag === 'crisis' ? '⚠ Crisis' : '⚠ Threat'}
                        </span>
                      )}
                      <div
                        className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                        style={
                          hasSafetyFlag
                            ? msg.safety_flag === 'crisis'
                              ? { background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.25)', color: '#fca5a5' }
                              : { background: 'rgba(255,152,0,0.1)',  border: '1px solid rgba(255,152,0,0.2)',  color: '#fcd34d' }
                            : isRight
                              ? { background: 'rgba(201,168,76,0.13)', border: '1px solid rgba(201,168,76,0.2)', color: 'rgba(255,255,255,0.85)' }
                              : { background: 'rgba(255,255,255,0.06)', border: '1px solid transparent',         color: 'rgba(255,255,255,0.75)' }
                        }
                      >
                        {msg.content}
                      </div>
                      <p className={clsx('text-[10px] text-white/20', isRight && 'text-right')}>
                        {sender?.full_name ?? 'Unknown'} · {elapsed(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>
        </>
      )}
    </div>
  )
}
