'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Heart, Search, Plus, Trash2, RefreshCw, Loader2, X,
  Users, Building2, CalendarHeart, ChevronLeft, ChevronRight,
  CheckCircle2, UserPlus,
} from 'lucide-react'
import { clsx } from 'clsx'

// ── Types ─────────────────────────────────────────────────────
interface UserSnippet {
  id: string
  full_name: string
  avatar_url: string | null
  profession: string | null
  category: string | null
  is_premium: boolean
  premium_tier: 'gold' | 'platinum' | null
  is_verified: boolean
}

interface Match {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  user1: UserSnippet | null
  user2: UserSnippet | null
}

interface DoubleDateUser extends UserSnippet {
  company: string | null
  city: string | null
  country: string | null
  double_date_active: boolean
}

interface CompanyProfile extends UserSnippet {
  company: string | null
  website: string | null
  bio: string | null
}

const TABS = [
  { id: 'matches',      label: 'Matches',       icon: Heart },
  { id: 'double_dates', label: 'Double Dates',  icon: CalendarHeart },
  { id: 'company',      label: 'Company',        icon: Building2 },
]

// ── Avatar helper ─────────────────────────────────────────────
function Avatar({ src, name, size = 8 }: { src: string | null; name: string; size?: number }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold`}
      style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', minWidth: `${size * 4}px`, minHeight: `${size * 4}px` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : (name?.[0] ?? '?')}
    </div>
  )
}

// ── User search picker (for create match modal) ───────────────
function UserPicker({
  label,
  selected,
  onSelect,
  exclude,
}: {
  label: string
  selected: UserSnippet | null
  onSelect: (u: UserSnippet) => void
  exclude?: string
}) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<UserSnippet[]>([])
  const [open, setOpen]       = useState(false)
  const [busy, setBusy]       = useState(false)
  const debounce              = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setBusy(true)
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&page=1`)
      if (res.ok) {
        const data = await res.json()
        setResults((data.users ?? []).filter((u: UserSnippet) => u.id !== exclude))
      }
      setBusy(false)
    }, 300)
    return () => clearTimeout(debounce.current)
  }, [query, exclude])

  if (selected) {
    return (
      <div className="flex items-center gap-3 p-3 glass rounded-xl">
        <Avatar src={selected.avatar_url} name={selected.full_name} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{selected.full_name}</p>
          <p className="text-xs text-white/40 truncate">{selected.profession ?? selected.category ?? '—'}</p>
        </div>
        <button onClick={() => onSelect({ id: '', full_name: '', avatar_url: null, profession: null, category: null, is_premium: false, premium_tier: null, is_verified: false })}
          className="text-white/30 hover:text-white/60 transition-colors">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <p className="text-xs text-white/40 mb-1.5">{label}</p>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search by name…"
          className="w-full pl-8 pr-3 py-2 text-sm bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/20 outline-none focus:border-amber-400/40"
        />
        {busy && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-white/30" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl overflow-hidden border border-white/[0.08]" style={{ background: '#1a1a23' }}>
          {results.slice(0, 6).map(u => (
            <button
              key={u.id}
              onClick={() => { onSelect(u); setQuery(''); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.06] text-left transition-colors"
            >
              <Avatar src={u.avatar_url} name={u.full_name} size={7} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{u.full_name}</p>
                <p className="text-xs text-white/35 truncate">{u.profession ?? u.category ?? '—'}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Create Match Modal ────────────────────────────────────────
function CreateMatchModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [user1, setUser1]   = useState<UserSnippet | null>(null)
  const [user2, setUser2]   = useState<UserSnippet | null>(null)
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState('')
  const [done, setDone]     = useState(false)

  async function create() {
    if (!user1?.id || !user2?.id) return
    setBusy(true); setErr('')
    const res = await fetch('/api/admin/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user1_id: user1.id, user2_id: user2.id }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { setErr(data.error ?? 'Failed'); return }
    setDone(true)
    setTimeout(() => { onCreated(); onClose() }, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md glass rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">Create Manual Match</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><X size={18} /></button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 size={36} style={{ color: '#2ECC71' }} />
            <p className="text-white font-medium">Match created!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <UserPicker label="First user" selected={user1} onSelect={u => setUser1(u.id ? u : null)} exclude={user2?.id} />
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <Heart size={14} style={{ color: '#E8637A' }} />
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
            <UserPicker label="Second user" selected={user2} onSelect={u => setUser2(u.id ? u : null)} exclude={user1?.id} />

            {err && <p className="text-xs text-red-400">{err}</p>}

            <button
              onClick={create}
              disabled={!user1?.id || !user2?.id || busy}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-black transition-opacity disabled:opacity-40"
              style={{ background: '#C9A84C' }}
            >
              {busy ? <Loader2 size={15} className="animate-spin mx-auto" /> : 'Create Match'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Matches tab ───────────────────────────────────────────────
function MatchesTab() {
  const [matches, setMatches]     = useState<Match[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), tab: 'matches' })
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/matches?${params}`)
    if (res.ok) {
      const d = await res.json()
      setMatches(d.matches ?? [])
      setTotal(d.total ?? 0)
    }
    setLoading(false)
  }, [page, search])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search])

  async function deleteMatch(id: string) {
    setDeletingId(id)
    await fetch(`/api/admin/matches/${id}`, { method: 'DELETE' })
    setMatches(prev => prev.filter(m => m.id !== id))
    setTotal(t => t - 1)
    setDeletingId(null)
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by user name…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/20 outline-none focus:border-amber-400/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 glass rounded-xl text-white/40 hover:text-white transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black"
            style={{ background: '#C9A84C' }}
          >
            <Plus size={14} /> Create Match
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-white/30" /></div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 text-white/25 text-sm">No matches found</div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          {matches.map((m, i) => (
            <div key={m.id}
              className={clsx('flex items-center gap-3 px-5 py-3.5', i < matches.length - 1 && 'border-b border-white/[0.04]')}>
              {/* User 1 */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar src={m.user1?.avatar_url ?? null} name={m.user1?.full_name ?? '?'} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{m.user1?.full_name ?? '—'}</p>
                  <p className="text-xs text-white/35 truncate">{m.user1?.profession ?? '—'}</p>
                </div>
              </div>

              <Heart size={14} style={{ color: '#E8637A' }} className="shrink-0" />

              {/* User 2 */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar src={m.user2?.avatar_url ?? null} name={m.user2?.full_name ?? '?'} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{m.user2?.full_name ?? '—'}</p>
                  <p className="text-xs text-white/35 truncate">{m.user2?.profession ?? '—'}</p>
                </div>
              </div>

              <p className="text-xs text-white/25 shrink-0 hidden sm:block">
                {new Date(m.created_at).toLocaleDateString()}
              </p>

              <button
                onClick={() => deleteMatch(m.id)}
                disabled={deletingId === m.id}
                className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
              >
                {deletingId === m.id
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Trash2 size={13} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-white/30">{total.toLocaleString()} matches total</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 glass rounded-lg text-white/40 hover:text-white disabled:opacity-30"><ChevronLeft size={14} /></button>
            <span className="text-xs text-white/40">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 glass rounded-lg text-white/40 hover:text-white disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateMatchModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}
    </div>
  )
}

// ── Double Dates tab ──────────────────────────────────────────
function DoubleDatesTab() {
  const [users, setUsers]         = useState<DoubleDateUser[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), tab: 'double_dates' })
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/matches?${params}`)
    if (res.ok) {
      const d = await res.json()
      setUsers(d.users ?? [])
      setTotal(d.total ?? 0)
    }
    setLoading(false)
  }, [page, search])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search])

  async function toggleDoubleDate(userId: string, current: boolean) {
    setTogglingId(userId)
    await fetch('/api/admin/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_double_date', user_id: userId, value: !current }),
    })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, double_date_active: !current } : u))
    setTogglingId(null)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/20 outline-none focus:border-amber-400/40"
          />
        </div>
        <button onClick={load} className="p-2 glass rounded-xl text-white/40 hover:text-white transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="glass rounded-2xl p-4 mb-5" style={{ border: '1px solid rgba(201,168,76,0.15)', background: 'rgba(201,168,76,0.04)' }}>
        <p className="text-xs text-amber-400/80 font-medium mb-1">About Double Dates</p>
        <p className="text-xs text-white/40 leading-relaxed">
          Users with Double Date enabled are actively looking for group outings with another matched couple.
          You can toggle this status on behalf of any user, or search all users to enable it.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-white/30" /></div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-white/25 text-sm">No users with Double Date active</div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          {users.map((u, i) => (
            <div key={u.id}
              className={clsx('flex items-center gap-3 px-5 py-3.5', i < users.length - 1 && 'border-b border-white/[0.04]')}>
              <Avatar src={u.avatar_url} name={u.full_name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">{u.full_name}</p>
                  {u.is_verified && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(74,144,226,0.15)', color: '#4A90E2' }}>✓</span>
                  )}
                </div>
                <p className="text-xs text-white/40 truncate">{u.profession ?? u.category ?? '—'} {u.city ? `· ${u.city}` : ''}</p>
              </div>
              <button
                onClick={() => toggleDoubleDate(u.id, u.double_date_active)}
                disabled={togglingId === u.id}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0',
                  u.double_date_active
                    ? 'text-black'
                    : 'text-white/50 bg-white/[0.06] hover:bg-white/[0.10]'
                )}
                style={u.double_date_active ? { background: '#C9A84C' } : {}}
              >
                {togglingId === u.id ? <Loader2 size={11} className="animate-spin" /> : <CalendarHeart size={11} />}
                {u.double_date_active ? 'Active' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
      )}

      {total > 0 && (
        <p className="text-xs text-white/25 mt-3">{total} users actively looking for double dates</p>
      )}
    </div>
  )
}

// ── Company Profiles tab ──────────────────────────────────────
function CompanyTab() {
  const [companies, setCompanies] = useState<CompanyProfile[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [promoting, setPromoting] = useState(false)
  const [promoteSearch, setPromoteSearch] = useState('')
  const [promoteResults, setPromoteResults] = useState<UserSnippet[]>([])
  const [promoteBusy, setPromoteBusy]       = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), tab: 'company' })
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/matches?${params}`)
    if (res.ok) {
      const d = await res.json()
      setCompanies(d.companies ?? [])
      setTotal(d.total ?? 0)
    }
    setLoading(false)
  }, [page, search])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search])

  useEffect(() => {
    if (!promoteSearch.trim()) { setPromoteResults([]); return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setPromoteBusy(true)
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(promoteSearch)}&page=1`)
      if (res.ok) {
        const d = await res.json()
        setPromoteResults((d.users ?? []).filter((u: UserSnippet) => u.category !== 'company'))
      }
      setPromoteBusy(false)
    }, 300)
    return () => clearTimeout(debounce.current)
  }, [promoteSearch])

  async function promoteToCompany(userId: string) {
    await fetch('/api/admin/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_company', user_id: userId, category: 'company' }),
    })
    setPromoting(false)
    setPromoteSearch('')
    setPromoteResults([])
    load()
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search company profiles…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/20 outline-none focus:border-amber-400/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 glass rounded-xl text-white/40 hover:text-white">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setPromoting(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black"
            style={{ background: '#C9A84C' }}
          >
            <UserPlus size={14} /> Promote User
          </button>
        </div>
      </div>

      {/* Promote-to-company panel */}
      {promoting && (
        <div className="glass rounded-2xl p-4 mb-5" style={{ border: '1px solid rgba(201,168,76,0.2)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">Promote user to Company profile</p>
            <button onClick={() => { setPromoting(false); setPromoteSearch('') }}
              className="text-white/30 hover:text-white/60"><X size={14} /></button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={promoteSearch}
              onChange={e => setPromoteSearch(e.target.value)}
              placeholder="Search user to promote…"
              className="w-full pl-8 pr-3 py-2 text-sm bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/20 outline-none focus:border-amber-400/40"
            />
            {promoteBusy && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-white/30" />}
          </div>
          {promoteResults.length > 0 && (
            <div className="mt-2 rounded-xl overflow-hidden border border-white/[0.06]" style={{ background: '#1a1a23' }}>
              {promoteResults.slice(0, 5).map(u => (
                <button key={u.id} onClick={() => promoteToCompany(u.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.06] text-left transition-colors">
                  <Avatar src={u.avatar_url} name={u.full_name} size={7} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{u.full_name}</p>
                    <p className="text-xs text-white/35">{u.profession ?? u.category ?? '—'}</p>
                  </div>
                  <span className="text-xs text-amber-400/70 shrink-0">→ Company</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-white/30" /></div>
      ) : companies.length === 0 ? (
        <div className="text-center py-16 text-white/25 text-sm">No company profiles yet</div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          {companies.map((c, i) => (
            <div key={c.id}
              className={clsx('flex items-center gap-3 px-5 py-3.5', i < companies.length - 1 && 'border-b border-white/[0.04]')}>
              <Avatar src={c.avatar_url} name={c.full_name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-white truncate">{c.full_name}</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-black shrink-0" style={{ background: '#C9A84C' }}>COMPANY</span>
                  {c.is_verified && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(74,144,226,0.15)', color: '#4A90E2' }}>VERIFIED</span>
                  )}
                </div>
                <p className="text-xs text-white/40 truncate">{c.company ?? c.profession ?? '—'} {c.website ? `· ${c.website}` : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-white/30">{total} company profiles</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 glass rounded-lg text-white/40 hover:text-white disabled:opacity-30"><ChevronLeft size={14} /></button>
            <span className="text-xs text-white/40">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 glass rounded-lg text-white/40 hover:text-white disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function AdminMatchesPage() {
  const [tab, setTab] = useState<'matches' | 'double_dates' | 'company'>('matches')

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Matches & Connections</h1>
          <p className="text-sm text-white/35">Manually pair users, manage double dates, and company profiles</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 p-1 glass rounded-2xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => {
          const on = tab === id
          return (
            <button
              key={id}
              onClick={() => setTab(id as typeof tab)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                on ? 'text-black' : 'text-white/50 hover:text-white'
              )}
              style={on ? { background: '#C9A84C' } : {}}
            >
              <Icon size={14} style={on ? { color: 'black' } : {}} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          )
        })}
      </div>

      {tab === 'matches'      && <MatchesTab />}
      {tab === 'double_dates' && <DoubleDatesTab />}
      {tab === 'company'      && <CompanyTab />}
    </div>
  )
}
