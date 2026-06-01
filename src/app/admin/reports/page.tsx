'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ShieldAlert, ShieldBan, UserX, Flag, Loader2,
  RefreshCw, UserCheck, BadgeCheck, CheckCircle, XCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

type Tab = 'activity' | 'reports' | 'blocked' | 'suspended'

interface ActivityEvent {
  id: string; type: string; data: Record<string, unknown>; created_at: string; is_read: boolean
  user?: { id: string; full_name: string; avatar_url: string | null }
}

interface Report {
  id: string; reason: string; details: string | null; status: string; created_at: string
  reporter?: { id: string; full_name: string; avatar_url: string | null }
  reported?: { id: string; full_name: string; avatar_url: string | null; profession: string | null }
}

interface BlockRow {
  id: string; created_at: string
  blocker: { id: string; full_name: string; avatar_url: string | null; profession: string | null }
  blocked: { id: string; full_name: string; avatar_url: string | null; profession: string | null }
}

interface SuspendedUser {
  id: string; full_name: string; avatar_url: string | null; profession: string | null; updated_at: string
}

const EVENT_COLORS: Record<string, string> = {
  match: '#E8637A', message: '#4A90E2', super_like: '#C9A84C', premium: '#9B6DFF', profile_boost: '#2ECC71',
}

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam', inappropriate: 'Inappropriate', harassment: 'Harassment', fake_profile: 'Fake profile', other: 'Other',
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function Avatar({ url, name, color = '#C9A84C' }: { url: string | null; name: string; color?: string }) {
  return (
    <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold"
      style={{ background: `${color}18`, color }}>
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt="" className="w-full h-full object-cover" />
        : name?.[0] ?? '?'}
    </div>
  )
}

export default function AdminReportsPage() {
  const [tab, setTab]             = useState<Tab>('reports')
  const [loading, setLoading]     = useState(true)
  const [activity, setActivity]   = useState<ActivityEvent[]>([])
  const [reports, setReports]     = useState<Report[]>([])
  const [blocked, setBlocked]     = useState<BlockRow[]>([])
  const [suspended, setSuspended] = useState<SuspendedUser[]>([])
  const [actionId, setActionId]   = useState<string | null>(null)
  const [newIds, setNewIds]       = useState<Set<string>>(new Set())
  const [typeFilter, setTypeFilter] = useState('all')
  const channelRef                = useRef<RealtimeChannel | null>(null)

  const fetchTab = useCallback(async (t: Tab, quiet = false) => {
    if (!quiet) setLoading(true)
    const res = await fetch(`/api/admin/reports?tab=${t}`)
    if (res.ok) {
      const { data } = await res.json()
      if (t === 'activity')  setActivity(data ?? [])
      if (t === 'reports')   setReports(data ?? [])
      if (t === 'blocked')   setBlocked(data ?? [])
      if (t === 'suspended') setSuspended(data ?? [])
    }
    if (!quiet) setLoading(false)
  }, [])

  useEffect(() => { fetchTab(tab) }, [tab, fetchTab])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('admin:reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, async payload => {
        const ev = payload.new as ActivityEvent & { user_id?: string }
        let p: { id: string; full_name: string; avatar_url: string | null } | null = null
        try {
          const res = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', ev.user_id ?? '').single()
          p = res.data
        } catch { /* ignore */ }
        const enriched: ActivityEvent = { ...ev, user: p ?? undefined }
        setActivity(prev => [enriched, ...prev].slice(0, 60))
        setNewIds(prev => new Set([...prev, ev.id]))
        setTimeout(() => setNewIds(prev => { const n = new Set(prev); n.delete(ev.id); return n }), 4000)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, () => {
        fetchTab('reports', true)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blocks' }, () => {
        fetchTab('blocked', true)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, payload => {
        const p = payload.new as { is_suspended?: boolean }
        if (p.is_suspended !== undefined) fetchTab('suspended', true)
      })
      .subscribe()
    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function unsuspend(id: string) {
    setActionId(id)
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'suspend', value: false }),
    })
    setSuspended(prev => prev.filter(u => u.id !== id))
    setActionId(null)
  }

  async function resolveReport(id: string, status: 'reviewed' | 'dismissed') {
    setActionId(id)
    await fetch('/api/admin/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setActionId(null)
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'reports',   label: 'Reports',   icon: Flag },
    { id: 'activity',  label: 'Activity',  icon: ShieldAlert },
    { id: 'blocked',   label: 'Blocked',   icon: ShieldBan },
    { id: 'suspended', label: 'Suspended', icon: UserX },
  ]

  const EVENT_LABELS: Record<string, string> = {
    match: 'Match', message: 'Message', super_like: 'Super Like', premium: 'Premium', profile_boost: 'Boost',
  }

  const pendingReports = reports.filter(r => r.status === 'pending')
  const filteredActivity = typeFilter === 'all' ? activity : activity.filter(e => e.type === typeFilter)

  const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    pending:   { bg: 'rgba(201,168,76,0.15)',  color: '#C9A84C',  label: 'Pending' },
    reviewed:  { bg: 'rgba(46,204,113,0.15)', color: '#2ECC71', label: 'Reviewed' },
    dismissed: { bg: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)', label: 'Dismissed' },
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Moderation</h1>
          <p className="text-white/40 text-sm mt-1">Real-time platform events and user moderation</p>
        </div>
        <button onClick={() => fetchTab(tab)} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-sm text-white/50 hover:text-white transition-colors disabled:opacity-40">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => {
          const on = tab === id
          const badge = id === 'reports' ? pendingReports.length : 0
          return (
            <button key={id} onClick={() => setTab(id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={on ? { background: '#C9A84C', color: 'black' } : { color: 'rgba(255,255,255,0.5)' }}>
              <Icon size={14} style={on ? { color: 'black' } : {}} />
              {label}
              {badge > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={on ? { background: 'rgba(0,0,0,0.2)', color: 'black' } : { background: 'rgba(231,76,60,0.2)', color: '#E74C3C' }}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={22} className="animate-spin text-white/30" />
        </div>
      ) : (
        <>
          {/* ── Reports tab ── */}
          {tab === 'reports' && (
            <div className="glass rounded-2xl overflow-hidden">
              {reports.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-12">No reports yet</p>
              ) : reports.map((r, i) => {
                const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending
                const busy = actionId === r.id
                return (
                  <div key={r.id}
                    className={`flex items-start gap-3 px-5 py-4 ${i < reports.length - 1 ? 'border-b border-white/[0.05]' : ''}`}>
                    <Avatar url={r.reporter?.avatar_url ?? null} name={r.reporter?.full_name ?? '?'} color="#4A90E2" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-medium text-white truncate">{r.reporter?.full_name ?? 'Unknown'}</span>
                        <span className="text-white/30 text-xs">reported</span>
                        <span className="text-sm font-medium text-white truncate">{r.reported?.full_name ?? 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(231,76,60,0.15)', color: '#E74C3C' }}>
                          {REASON_LABELS[r.reason] ?? r.reason}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                        {r.reported?.profession && (
                          <span className="text-xs text-white/30 truncate">{r.reported.profession}</span>
                        )}
                      </div>
                      {r.details && <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{r.details}</p>}
                      <p className="text-[10px] text-white/20 mt-1">{timeAgo(r.created_at)}</p>
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => resolveReport(r.id, 'reviewed')} disabled={busy}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium glass hover:bg-green-500/10 text-white/50 hover:text-green-400 transition-colors disabled:opacity-40">
                          {busy ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                          Review
                        </button>
                        <button onClick={() => resolveReport(r.id, 'dismissed')} disabled={busy}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium glass hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors disabled:opacity-40">
                          <XCircle size={11} /> Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Activity tab ── */}
          {tab === 'activity' && (
            <div>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {['all', 'match', 'message', 'super_like', 'premium'].map(t => (
                  <button key={t} onClick={() => setTypeFilter(t)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={typeFilter === t ? { background: '#C9A84C', color: 'black' } : { color: 'rgba(255,255,255,0.4)' }}>
                    {t === 'all' ? 'All' : EVENT_LABELS[t] ?? t}
                  </button>
                ))}
              </div>
              <div className="glass rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                  <p className="text-sm font-medium text-white/60">{filteredActivity.length} events</p>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(46,204,113,0.12)', color: '#2ECC71' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Real-time
                  </span>
                </div>
                {filteredActivity.length === 0 ? (
                  <p className="text-white/30 text-sm text-center py-12">No events yet</p>
                ) : (
                  <div className="max-h-[520px] overflow-y-auto">
                    {filteredActivity.map((ev, i) => {
                      const color = EVENT_COLORS[ev.type] ?? '#888'
                      const isNew = newIds.has(ev.id)
                      return (
                        <div key={ev.id}
                          className={`flex items-center gap-3 px-5 py-3 transition-all duration-500 ${i < filteredActivity.length - 1 ? 'border-b border-white/[0.04]' : ''} ${isNew ? 'bg-white/[0.04]' : ''}`}>
                          <Avatar url={ev.user?.avatar_url ?? null} name={ev.user?.full_name ?? '?'} color={color} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                                style={{ background: `${color}20`, color }}>
                                {EVENT_LABELS[ev.type] ?? ev.type}
                              </span>
                              <p className="text-sm text-white/70 truncate">{ev.user?.full_name ?? 'Unknown'}</p>
                            </div>
                            {!!ev.data?.preview && (
                              <p className="text-xs text-white/30 truncate mt-0.5">{String(ev.data.preview)}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-white/25 shrink-0 tabular-nums">{timeAgo(ev.created_at)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Blocked tab ── */}
          {tab === 'blocked' && (
            <div className="glass rounded-2xl overflow-hidden">
              {blocked.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-12">No blocks recorded</p>
              ) : blocked.map((b, i) => (
                <div key={b.id}
                  className={`flex items-center gap-3 px-5 py-3.5 ${i < blocked.length - 1 ? 'border-b border-white/[0.05]' : ''}`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar url={b.blocker.avatar_url} name={b.blocker.full_name} color="#E74C3C" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{b.blocker.full_name}</p>
                      <p className="text-xs text-white/35">blocked</p>
                    </div>
                  </div>
                  <span className="text-white/20 text-xs shrink-0">→</span>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar url={b.blocked.avatar_url} name={b.blocked.full_name} color="#9B6DFF" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{b.blocked.full_name}</p>
                      <p className="text-xs text-white/35">{b.blocked.profession ?? '—'}</p>
                    </div>
                  </div>
                  <p className="text-xs text-white/25 hidden sm:block shrink-0">{new Date(b.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Suspended tab ── */}
          {tab === 'suspended' && (
            <div className="glass rounded-2xl overflow-hidden">
              {suspended.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-12">No suspended users</p>
              ) : suspended.map((u, i) => (
                <div key={u.id}
                  className={`flex items-center gap-3 px-5 py-3.5 ${i < suspended.length - 1 ? 'border-b border-white/[0.05]' : ''}`}>
                  <Avatar url={u.avatar_url} name={u.full_name} color="#E74C3C" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{u.full_name}</p>
                    <p className="text-xs text-white/40">{u.profession ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-xs text-white/25 hidden sm:block">Since {new Date(u.updated_at).toLocaleDateString()}</p>
                    <button onClick={() => unsuspend(u.id)} disabled={actionId === u.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium glass hover:bg-green-500/10 text-white/50 hover:text-green-400 transition-colors disabled:opacity-40">
                      {actionId === u.id ? <Loader2 size={11} className="animate-spin" /> : <UserCheck size={11} />}
                      Unsuspend
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
