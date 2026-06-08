'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle, ShieldCheck, MessageSquare, RefreshCw,
  Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp,
} from 'lucide-react'

type Tab = 'warnings' | 'appeals'

interface Warning {
  id: string
  user_id: string
  level: 1 | 2 | 3 | 4
  reason: string
  created_at: string
  expires_at: string | null
  is_active: boolean
  profiles: { full_name: string; avatar_url: string | null } | null
}

interface Appeal {
  id: string
  user_id: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  admin_response: string | null
  created_at: string
  reviewed_at: string | null
  profiles: { full_name: string; avatar_url: string | null; is_suspended: boolean } | null
}

const LEVEL_META: Record<number, { label: string; color: string; bg: string; desc: string }> = {
  1: { label: 'Warning',     color: '#C9A84C', bg: 'rgba(201,168,76,0.12)',  desc: 'Educational notice' },
  2: { label: 'Restriction', color: '#F39C12', bg: 'rgba(243,156,18,0.12)',  desc: '24h action restriction' },
  3: { label: 'Suspension',  color: '#E74C3C', bg: 'rgba(231,76,60,0.12)',   desc: '7-day suspension' },
  4: { label: 'Permanent ban', color: '#9B0000', bg: 'rgba(155,0,0,0.15)',   desc: 'Permanent ban review' },
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function Avatar({ url, name, color = '#C9A84C' }: { url: string | null; name: string; color?: string }) {
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold shrink-0"
      style={{ background: `${color}18`, color }}>
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt="" className="w-full h-full object-cover" />
        : name?.[0] ?? '?'}
    </div>
  )
}

export default function ModerationPage() {
  const [tab,      setTab]      = useState<Tab>('warnings')
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [appeals,  setAppeals]  = useState<Appeal[]>([])
  const [loading,  setLoading]  = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [response, setResponse] = useState('')

  const load = useCallback(async (t: Tab) => {
    setLoading(true)
    const url = t === 'warnings' ? '/api/admin/warnings' : '/api/admin/appeals'
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      if (t === 'warnings') setWarnings(Array.isArray(data) ? data : [])
      else setAppeals(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(tab) }, [tab, load])

  const resolveAppeal = async (id: string, status: 'approved' | 'rejected') => {
    setActionId(id)
    await fetch(`/api/admin/appeals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, admin_response: response.trim() || null }),
    })
    setAppeals(prev => prev.map(a => a.id === id ? { ...a, status, reviewed_at: new Date().toISOString() } : a))
    setExpanded(null)
    setResponse('')
    setActionId(null)
  }

  const pendingAppeals = appeals.filter(a => a.status === 'pending').length

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-white">Moderation</h1>
          <p className="text-white/40 text-sm mt-1">Warnings issued and suspension appeals</p>
        </div>
        <button onClick={() => load(tab)} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-sm text-white/50 hover:text-white transition-colors disabled:opacity-40">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {([
          { id: 'warnings' as Tab, label: 'Warnings', icon: AlertTriangle },
          { id: 'appeals'  as Tab, label: 'Appeals',  icon: MessageSquare, badge: pendingAppeals },
        ]).map(({ id, label, icon: Icon, badge }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={tab === id ? { background: '#C9A84C', color: 'black' } : { color: 'rgba(255,255,255,0.5)' }}>
            <Icon size={14} style={tab === id ? { color: 'black' } : {}} />
            {label}
            {!!badge && badge > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(231,76,60,0.2)', color: '#E74C3C' }}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={22} className="animate-spin text-white/30" />
        </div>
      ) : (
        <>
          {/* ── Warnings ── */}
          {tab === 'warnings' && (
            <div className="glass rounded-2xl overflow-hidden">
              {warnings.length === 0 ? (
                <div className="py-16 text-center">
                  <ShieldCheck size={32} className="mx-auto mb-3 text-white/15" />
                  <p className="text-white/30 text-sm">No warnings issued yet</p>
                  <p className="text-white/20 text-xs mt-1">Issue warnings from the Users admin page</p>
                </div>
              ) : warnings.map((w, i) => {
                const meta = LEVEL_META[w.level] ?? LEVEL_META[1]
                return (
                  <div key={w.id}
                    className={`flex items-start gap-3 px-5 py-4 ${i < warnings.length - 1 ? 'border-b border-white/[0.05]' : ''}`}>
                    <Avatar url={w.profiles?.avatar_url ?? null} name={w.profiles?.full_name ?? '?'} color={meta.color} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-white truncate">
                          {w.profiles?.full_name ?? 'Unknown user'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: meta.bg, color: meta.color }}>
                          Level {w.level}: {meta.label}
                        </span>
                        {!w.is_active && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
                            Expired
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/55 mb-0.5">{w.reason}</p>
                      <div className="flex items-center gap-3 text-[10px] text-white/25">
                        <span>{timeAgo(w.created_at)}</span>
                        {w.expires_at && <span>Expires {new Date(w.expires_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Appeals ── */}
          {tab === 'appeals' && (
            <div className="flex flex-col gap-3">
              {appeals.length === 0 ? (
                <div className="glass rounded-2xl py-16 text-center">
                  <MessageSquare size={32} className="mx-auto mb-3 text-white/15" />
                  <p className="text-white/30 text-sm">No suspension appeals yet</p>
                </div>
              ) : appeals.map(a => {
                const isOpen = expanded === a.id
                const STATUS = {
                  pending:  { bg: 'rgba(201,168,76,0.15)',  color: '#C9A84C',  label: 'Pending' },
                  approved: { bg: 'rgba(46,204,113,0.15)', color: '#2ECC71', label: 'Approved' },
                  rejected: { bg: 'rgba(231,76,60,0.15)',  color: '#E74C3C', label: 'Rejected' },
                }[a.status]

                return (
                  <div key={a.id} className="glass rounded-2xl overflow-hidden border border-white/[0.07]">
                    <button
                      className="w-full flex items-start gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
                      onClick={() => setExpanded(isOpen ? null : a.id)}>
                      <Avatar url={a.profiles?.avatar_url ?? null} name={a.profiles?.full_name ?? '?'} color="#E74C3C" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-white">{a.profiles?.full_name ?? 'Unknown'}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: STATUS.bg, color: STATUS.color }}>
                            {STATUS.label}
                          </span>
                          {a.profiles?.is_suspended && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(231,76,60,0.12)', color: '#E74C3C' }}>
                              Still suspended
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/50 line-clamp-2">{a.reason}</p>
                        <p className="text-[10px] text-white/20 mt-1">{timeAgo(a.created_at)}</p>
                      </div>
                      {a.status === 'pending'
                        ? isOpen ? <ChevronUp size={15} className="text-white/30 mt-0.5 shrink-0" />
                                 : <ChevronDown size={15} className="text-white/30 mt-0.5 shrink-0" />
                        : null}
                    </button>

                    {isOpen && a.status === 'pending' && (
                      <div className="px-4 pb-4 border-t border-white/[0.06] pt-3 space-y-3">
                        <p className="text-xs text-white/50 leading-relaxed">{a.reason}</p>
                        <textarea
                          value={response}
                          onChange={e => setResponse(e.target.value)}
                          placeholder="Admin response (optional)…"
                          rows={2}
                          className="w-full px-3 py-2.5 rounded-xl text-xs resize-none"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => resolveAppeal(a.id, 'approved')} disabled={!!actionId}
                            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold disabled:opacity-40 transition-colors"
                            style={{ background: 'rgba(46,204,113,0.15)', color: '#2ECC71', border: '1px solid rgba(46,204,113,0.25)' }}>
                            {actionId === a.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                            Approve (lift ban)
                          </button>
                          <button onClick={() => resolveAppeal(a.id, 'rejected')} disabled={!!actionId}
                            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold disabled:opacity-40 transition-colors"
                            style={{ background: 'rgba(231,76,60,0.12)', color: '#E74C3C', border: '1px solid rgba(231,76,60,0.2)' }}>
                            {actionId === a.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                            Reject
                          </button>
                        </div>
                      </div>
                    )}

                    {a.admin_response && (
                      <div className="px-4 pb-3 border-t border-white/[0.04]">
                        <p className="text-[10px] text-white/30 mt-2.5 mb-0.5 uppercase tracking-wide font-bold">Admin response</p>
                        <p className="text-xs text-white/50">{a.admin_response}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
