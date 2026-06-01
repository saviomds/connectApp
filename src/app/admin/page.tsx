'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Users, Heart, MessageCircle, Crown, WifiOff, TrendingUp,
  UserCheck, ShieldOff, RefreshCw, Loader2, BadgeCheck, Ban,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Stats {
  total_users: number
  new_users_24h: number
  premium_users: number
  suspended_users: number
  total_matches: number
  total_messages: number
  online_now: number
  active_now: number
  verified_users: number
  total_blocked: number
  new_matches_24h: number
  new_messages_24h: number
  daily_signups: { date: string; label: string; count: number; isToday: boolean }[]
  recent_users: RecentUser[]
}

interface RecentUser {
  id: string
  full_name: string
  avatar_url: string | null
  profession: string | null
  category: string | null
  is_premium: boolean
  premium_tier: 'gold' | 'platinum' | null
  created_at: string
}

interface ActivityEvent {
  id: string
  type: string
  data: Record<string, unknown>
  created_at: string
  user?: { id: string; full_name: string; avatar_url: string | null }
}

// ── Stat card ────────────────────────────────────────────────
function Stat({
  icon: Icon, label, value, sub, color = '#C9A84C', pulse = false,
}: {
  icon: React.ElementType; label: string; value: number | string
  sub?: string; color?: string; pulse?: boolean
}) {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-2">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        {pulse
          ? <span className="w-3 h-3 rounded-full animate-pulse" style={{ background: color }} />
          : <Icon size={18} style={{ color }} />}
      </div>
      <div>
        <p className="text-2xl font-bold text-white tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="text-sm text-white/50 mt-0.5 leading-tight">{label}</p>
        {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Mini bar chart ────────────────────────────────────────────
function BarChart({ data }: { data: Stats['daily_signups'] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <span className="text-[9px] text-white/30">{d.count > 0 ? d.count : ''}</span>
          <div className="w-full flex-1 flex items-end">
            <div
              className="w-full rounded-t-sm transition-all duration-500"
              style={{
                height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 3)}%`,
                background: d.isToday ? '#C9A84C' : 'rgba(201,168,76,0.3)',
              }}
            />
          </div>
          <span className="text-[9px] text-white/40">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Activity event ────────────────────────────────────────────
const EVENT_COLORS: Record<string, string> = {
  match:         '#E8637A',
  message:       '#4A90E2',
  super_like:    '#C9A84C',
  premium:       '#9B6DFF',
  profile_boost: '#2ECC71',
}

function EventRow({ ev, isNew }: { ev: ActivityEvent; isNew: boolean }) {
  const color = EVENT_COLORS[ev.type] ?? '#888'
  const labels: Record<string, string> = {
    match:         'Match',
    message:       'Message',
    super_like:    'Super Like',
    premium:       'Premium',
    profile_boost: 'Boost',
  }
  const elapsed = (() => {
    const s = Math.floor((Date.now() - new Date(ev.created_at).getTime()) / 1000)
    if (s < 60) return `${s}s ago`
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    return `${Math.floor(s / 86400)}d ago`
  })()

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04] last:border-0 transition-all duration-500 ${isNew ? 'bg-white/[0.04]' : ''}`}>
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
        style={{ background: `${color}20`, color }}>
        {labels[ev.type] ?? ev.type}
      </span>
      <p className="flex-1 text-sm text-white/60 truncate">
        {ev.user?.full_name ?? 'Unknown user'}
      </p>
      <span className="text-[10px] text-white/25 shrink-0 tabular-nums">{elapsed}</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function AdminOverviewPage() {
  const [stats, setStats]           = useState<Partial<Stats>>({})
  const [activity, setActivity]     = useState<ActivityEvent[]>([])
  const [newIds, setNewIds]         = useState<Set<string>>(new Set())
  const [loading, setLoading]       = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const pollRef    = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const loadStats = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true)
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data: Stats = await res.json()
        setStats(data)
        setLastUpdated(new Date())
      }
    } finally {
      if (!quiet) { setRefreshing(false) }
      setLoading(false)
    }
  }, [])

  const loadActivity = useCallback(async () => {
    const res = await fetch('/api/admin/reports?tab=activity')
    if (res.ok) {
      const { data } = await res.json()
      setActivity((data ?? []).slice(0, 30))
    }
  }, [])

  useEffect(() => {
    loadStats()
    loadActivity()

    // Realtime subscriptions
    const supabase = createClient()
    const channel = supabase
      .channel('admin:overview')
      // New user signed up
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
        setStats(s => ({
          ...s,
          total_users:  (s.total_users ?? 0) + 1,
          new_users_24h:(s.new_users_24h ?? 0) + 1,
        }))
      })
      // New match
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, () => {
        setStats(s => ({
          ...s,
          total_matches:  (s.total_matches ?? 0) + 1,
          new_matches_24h:(s.new_matches_24h ?? 0) + 1,
        }))
      })
      // New message
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        setStats(s => ({
          ...s,
          total_messages:  (s.total_messages ?? 0) + 1,
          new_messages_24h:(s.new_messages_24h ?? 0) + 1,
        }))
      })
      // Activity feed
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        async payload => {
          const raw = payload.new as ActivityEvent & { user_id?: string }
          // Fetch user name for this event
          let p: { id: string; full_name: string; avatar_url: string | null } | null = null
          try {
            const res = await supabase.from('profiles').select('id, full_name, avatar_url')
              .eq('id', raw.user_id ?? '').single()
            p = res.data
          } catch { /* ignore */ }
          const ev = raw as ActivityEvent

          const enriched = { ...ev, user: p ?? undefined }
          setActivity(prev => [enriched, ...prev].slice(0, 30))
          setNewIds(prev => new Set([...prev, ev.id]))
          setTimeout(() => setNewIds(prev => { const n = new Set(prev); n.delete(ev.id); return n }), 3000)

          // Refresh full stats silently
          loadStats(true)
        }
      )
      // Profile online status changes
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, payload => {
        const p = payload.new as { is_online?: boolean; is_suspended?: boolean }
        if (p.is_online !== undefined) {
          // Re-poll rather than guessing direction
          loadStats(true)
        }
      })
      .subscribe()

    channelRef.current = channel

    // Auto-refresh stats every 30s as fallback
    pollRef.current = setInterval(() => loadStats(true), 30_000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={22} className="animate-spin text-white/30" />
      </div>
    )
  }

  const s = stats
  const dailySignups = s.daily_signups ?? []
  const recentUsers  = s.recent_users ?? []

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold text-white">Overview</h1>
            <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(46,204,113,0.12)', color: '#2ECC71', border: '1px solid rgba(46,204,113,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </span>
          </div>
          {lastUpdated && (
            <p className="text-xs text-white/30">
              Last updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={() => { loadStats(); loadActivity() }}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-sm text-white/50 hover:text-white transition-colors disabled:opacity-40">
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat icon={Users}         label="Total Users"    value={s.total_users     ?? 0} sub={`+${s.new_users_24h  ?? 0} today`} />
        <Stat icon={Crown}         label="Premium"        value={s.premium_users   ?? 0} color="#C9A84C" sub={`${s.total_users ? Math.round(((s.premium_users ?? 0) / s.total_users) * 100) : 0}% of users`} />
        <Stat icon={Heart}         label="Matches"        value={s.total_matches   ?? 0} color="#E8637A" sub={`+${s.new_matches_24h ?? 0} today`} />
        <Stat icon={MessageCircle} label="Messages"       value={s.total_messages  ?? 0} color="#4A90E2" sub={`+${s.new_messages_24h ?? 0} today`} />
        <Stat icon={Users}         label="Online Now"     value={s.online_now      ?? 0} color="#2ECC71" pulse sub="currently active" />
        <Stat icon={BadgeCheck}    label="Verified"       value={s.verified_users  ?? 0} color="#4A90E2" />
        <Stat icon={WifiOff}       label="Suspended"      value={s.suspended_users ?? 0} color="#E74C3C" />
        <Stat icon={ShieldOff}     label="Blocked"        value={s.total_blocked   ?? 0} color="#9B6DFF" />
      </div>

      {/* Chart + Live Feed */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Daily Signups */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-semibold text-white">Daily Sign-ups</p>
              <p className="text-xs text-white/35 mt-0.5">Last 7 days</p>
            </div>
            <span className="text-2xl font-bold text-white tabular-nums">
              {s.new_users_24h ?? 0}
              <span className="text-sm font-normal text-white/35 ml-1">today</span>
            </span>
          </div>
          {dailySignups.length > 0
            ? <BarChart data={dailySignups} />
            : <div className="h-28 flex items-center justify-center text-white/20 text-sm">No data yet</div>}
        </div>

        {/* Live Activity Feed */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <p className="text-sm font-semibold text-white">Live Activity</p>
            <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(46,204,113,0.12)', color: '#2ECC71' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Real-time
            </span>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {activity.length === 0
              ? <p className="text-white/30 text-sm text-center py-8">Waiting for events…</p>
              : activity.map(ev => (
                  <EventRow key={ev.id} ev={ev} isNew={newIds.has(ev.id)} />
                ))}
          </div>
        </div>
      </div>

      {/* Recent sign-ups */}
      {recentUsers.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-white mb-4">Recent Sign-ups</h2>
          <div className="glass rounded-2xl overflow-hidden">
            {recentUsers.map((u, i) => (
              <div key={u.id}
                className={`flex items-center gap-3 px-5 py-3.5 ${i < recentUsers.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden flex items-center justify-center text-sm font-bold"
                  style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C' }}>
                  {u.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    : u.full_name?.[0] ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{u.full_name || 'Unknown'}</span>
                    {u.is_premium && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-black shrink-0"
                        style={{ background: u.premium_tier === 'platinum' ? '#E8E8E8' : '#C9A84C' }}>
                        {u.premium_tier?.toUpperCase() ?? 'PRO'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 truncate">{u.profession ?? u.category ?? '—'}</p>
                </div>
                <p className="text-xs text-white/25 shrink-0">
                  {new Date(u.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
