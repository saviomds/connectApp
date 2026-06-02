'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, BadgeCheck, Crown, Ban, Trash2, UserCheck, UserX,
  ChevronLeft, ChevronRight, Loader2, MoreHorizontal, ShieldCheck, ShieldOff,
} from 'lucide-react'
import { clsx } from 'clsx'
import ConfirmModal from '@/components/ConfirmModal'

interface AdminUser {
  id: string
  full_name: string
  avatar_url: string | null
  profession: string | null
  company: string | null
  city: string | null
  category: string | null
  is_premium: boolean
  premium_tier: 'gold' | 'platinum' | null
  is_verified: boolean
  is_online: boolean
  is_suspended: boolean
  is_admin: boolean
  created_at: string
  profile_completion: number
}

const FILTERS = [
  { id: 'all',       label: 'All' },
  { id: 'admin',     label: 'Admins' },
  { id: 'premium',   label: 'Premium' },
  { id: 'verified',  label: 'Verified' },
  { id: 'suspended', label: 'Suspended' },
]

export default function AdminUsersPage() {
  const [users, setUsers]           = useState<AdminUser[]>([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('all')
  const [loading, setLoading]       = useState(true)
  const [actionId, setActionId]     = useState<string | null>(null)
  const [menuId, setMenuId]         = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)

  const pageSize = 20

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), filter })
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/users?${params}`)
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users ?? [])
      setTotal(data.total ?? 0)
    }
    setLoading(false)
  }, [page, search, filter])

  useEffect(() => { fetchUsers() }, [fetchUsers])
  useEffect(() => { setPage(1) }, [search, filter])

  async function act(id: string, body: Record<string, unknown>) {
    setActionId(id)
    setMenuId(null)
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const updated = await res.json()
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updated } : u))
    }
    setActionId(null)
  }

  async function deleteUser() {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setActionId(id)
    setMenuId(null)
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== id))
      setTotal(t => t - 1)
    }
    setActionId(null)
    setDeleteTarget(null)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-white/40 text-sm mt-0.5">{total.toLocaleString()} total</p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, profession, company…"
            className="w-full h-11 pl-9 pr-4 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm input-focus"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(({ id, label }) => (
            <button key={id} onClick={() => setFilter(id)}
              className={clsx('px-3 py-2 rounded-xl text-sm font-medium transition-colors', filter === id ? 'text-black' : 'glass text-white/50 hover:text-white')}
              style={filter === id ? { background: '#C9A84C' } : {}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden mb-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-white/30" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-white/30 text-sm">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse">
              {/* Header */}
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-white/30 w-full">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/30 whitespace-nowrap w-[110px]">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/30 whitespace-nowrap w-[100px]">Joined</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-white/30 w-[60px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const busy = actionId === u.id
                  return (
                    <tr key={u.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">

                      {/* User info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden flex items-center justify-center text-sm font-bold"
                            style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>
                            {u.avatar_url
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                              : u.full_name?.[0] ?? '?'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-medium text-white truncate max-w-[200px]">{u.full_name || 'Unnamed'}</span>
                              {u.is_admin     && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ background: '#9B6DFF' }}>ADMIN</span>}
                              {u.is_verified  && <BadgeCheck size={12} className="fill-blue-400 text-white shrink-0" />}
                              {u.is_premium   && <Crown size={11} style={{ color: '#C9A84C' }} className="shrink-0" />}
                              {u.is_suspended && <Ban size={11} style={{ color: '#E74C3C' }} className="shrink-0" />}
                            </div>
                            <p className="text-xs text-white/40 truncate max-w-[260px]">
                              {[u.profession, u.company, u.city].filter(Boolean).join(' · ') || u.category || '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium w-fit whitespace-nowrap"
                            style={{
                              background: u.is_online ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.06)',
                              color: u.is_online ? '#2ECC71' : 'rgba(255,255,255,0.35)',
                            }}>
                            {u.is_online ? '● Online' : 'Offline'}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-white/[0.06] text-white/35 w-fit whitespace-nowrap">
                            {u.profile_completion}%
                          </span>
                        </div>
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-white/35 whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Action menu */}
                      <td className="px-5 py-3.5">
                        <div className="relative flex justify-center">
                          <button
                            onClick={() => setMenuId(menuId === u.id ? null : u.id)}
                            disabled={busy}
                            className="w-8 h-8 glass rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors disabled:opacity-40">
                            {busy ? <Loader2 size={14} className="animate-spin" /> : <MoreHorizontal size={14} />}
                          </button>

                          {menuId === u.id && (
                            <div className="absolute right-0 top-10 w-52 modal rounded-xl overflow-hidden z-50 shadow-xl">
                              {[
                                {
                                  icon: u.is_admin ? ShieldOff : ShieldCheck,
                                  label: u.is_admin ? 'Remove Admin' : 'Make Admin',
                                  color: '#9B6DFF',
                                  onClick: () => act(u.id, { action: 'make_admin', value: !u.is_admin }),
                                },
                                {
                                  icon: BadgeCheck,
                                  label: u.is_verified ? 'Remove Verification' : 'Verify User',
                                  color: '#4A90E2',
                                  onClick: () => act(u.id, { action: 'verify', value: !u.is_verified }),
                                },
                                {
                                  icon: Crown,
                                  label: u.is_premium ? `Revoke ${u.premium_tier ?? 'Premium'}` : 'Grant Gold',
                                  color: '#C9A84C',
                                  onClick: () => act(u.id, { action: 'premium', tier: u.is_premium ? null : 'gold' }),
                                },
                                {
                                  icon: Crown,
                                  label: 'Grant Platinum',
                                  color: '#E8E8E8',
                                  onClick: () => act(u.id, { action: 'premium', tier: 'platinum' }),
                                },
                                {
                                  icon: u.is_suspended ? UserCheck : UserX,
                                  label: u.is_suspended ? 'Unsuspend' : 'Suspend',
                                  color: '#F39C12',
                                  onClick: () => act(u.id, { action: 'suspend', value: !u.is_suspended }),
                                },
                                {
                                  icon: Trash2,
                                  label: 'Delete Account',
                                  color: '#E74C3C',
                                  onClick: () => { setMenuId(null); setDeleteTarget(u) },
                                  danger: true,
                                },
                              ].map(({ icon: Icon, label, color, onClick, danger }) => (
                                <button key={label} onClick={onClick}
                                  className={clsx(
                                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors border-b border-white/[0.05] last:border-0',
                                    danger ? 'hover:bg-red-500/10' : 'hover:bg-white/[0.05]'
                                  )}>
                                  <Icon size={14} style={{ color }} />
                                  <span style={{ color: danger ? '#E74C3C' : 'rgba(255,255,255,0.80)' }}>{label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/30">Page {page} of {totalPages} · {total.toLocaleString()} users</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-9 h-9 glass rounded-xl flex items-center justify-center text-white/40 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-9 h-9 glass rounded-xl flex items-center justify-center text-white/40 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {menuId && <div className="fixed inset-0 z-40" onClick={() => setMenuId(null)} />}

      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.full_name ?? 'this user'}?`}
        message="This permanently removes their account, profile, matches and all messages. This cannot be undone."
        confirmLabel="Delete Account"
        variant="danger"
        loading={!!actionId}
        onConfirm={deleteUser}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
