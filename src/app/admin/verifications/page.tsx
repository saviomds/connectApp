'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck, ShieldX, CheckCircle, XCircle,
  Loader2, RefreshCw, User, ZoomIn, X,
} from 'lucide-react'

interface VerifRequest {
  id: string
  user_id: string
  category: string
  photo_selfie_url: string
  photo_id_url: string
  photo_portrait_url: string
  status: string
  admin_note: string | null
  created_at: string
  profile: {
    id: string
    full_name: string
    avatar_url: string | null
    profession: string | null
  } | null
}

const CATEGORY_LABELS: Record<string, string> = {
  professional: 'Professional',
  divorced: 'New Chapter',
}

const PHOTO_SLOTS = [
  { key: 'photo_portrait_url' as const, label: 'Portrait' },
  { key: 'photo_id_url'       as const, label: 'ID/Passport' },
  { key: 'photo_selfie_url'   as const, label: 'Selfie+ID' },
]

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}>
      <button onClick={onClose}
        className="absolute top-3 right-3 w-9 h-9 glass rounded-xl flex items-center justify-center text-white/60 hover:text-white">
        <X size={16} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="max-w-full max-h-[90vh] object-contain rounded-xl"
        onClick={e => e.stopPropagation()} />
    </div>
  )
}

export default function AdminVerificationsPage() {
  const [requests, setRequests] = useState<VerifRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [note, setNote]         = useState('')
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [zoom, setZoom]         = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/verifications')
    if (res.ok) setRequests(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function approve(id: string) {
    setActionId(id)
    await fetch(`/api/admin/verifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    })
    setActionId(null)
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  async function reject(id: string) {
    setActionId(id)
    await fetch(`/api/admin/verifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', note: note.trim() || undefined }),
    })
    setActionId(null)
    setRejectId(null)
    setNote('')
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={22} className="animate-spin text-white/30" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Verifications</h1>
          <p className="text-xs text-white/40 mt-0.5">
            {requests.length === 0 ? 'All caught up!' : `${requests.length} pending`}
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-xl text-xs text-white/50 hover:text-white transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center border border-white/5">
          <ShieldCheck size={32} className="mx-auto mb-3 text-white/15" />
          <p className="text-sm text-white/40">No pending verification requests</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map(r => {
            const p = r.profile
            const isActing = actionId === r.id
            const isRejecting = rejectId === r.id

            return (
              <div key={r.id} className="glass rounded-2xl overflow-hidden border border-white/[0.07]">

                {/* ── Top row: user + category + date ── */}
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.05]">
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C' }}>
                    {p?.avatar_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                      : (p?.full_name?.[0] ?? <User size={13} />)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate leading-tight">
                      {p?.full_name ?? 'Unknown'}
                    </p>
                    <p className="text-[10px] text-white/35 truncate">
                      {p?.profession ?? '—'}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                    {CATEGORY_LABELS[r.category] ?? r.category}
                  </span>
                  <span className="text-[10px] text-white/25 shrink-0 hidden sm:block">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* ── Photos: horizontal strip ── */}
                <div className="flex gap-2 p-3">
                  {PHOTO_SLOTS.map(({ key, label }) => {
                    const url = r[key]
                    return (
                      <button
                        key={key}
                        onClick={() => url ? setZoom(url) : undefined}
                        disabled={!url}
                        className="flex-1 flex flex-col gap-1 group disabled:opacity-40">
                        <div className="w-full aspect-square rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.08] relative">
                          {url ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={label}
                                className="w-full h-full object-cover"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <ZoomIn size={16} className="text-white" />
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">
                              No photo
                            </div>
                          )}
                        </div>
                        <p className="text-[9px] text-white/30 text-center leading-tight">{label}</p>
                      </button>
                    )
                  })}
                </div>

                {/* ── Reject note input ── */}
                {isRejecting && (
                  <div className="px-3 pb-2">
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Rejection reason (optional, shown to user)…"
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm placeholder-white/25 resize-none outline-none"
                    />
                  </div>
                )}

                {/* ── Action buttons ── */}
                <div className="flex gap-2 px-3 pb-3">
                  <button
                    onClick={() => approve(r.id)}
                    disabled={isActing}
                    className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
                    style={{ background: 'rgba(46,204,113,0.15)', color: '#2ECC71', border: '1px solid rgba(46,204,113,0.25)' }}>
                    {isActing && !isRejecting
                      ? <Loader2 size={13} className="animate-spin" />
                      : <><CheckCircle size={13} /> Approve</>}
                  </button>

                  {isRejecting ? (
                    <>
                      <button
                        onClick={() => reject(r.id)}
                        disabled={isActing}
                        className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                        style={{ background: 'rgba(231,76,60,0.15)', color: '#E74C3C', border: '1px solid rgba(231,76,60,0.25)' }}>
                        {isActing ? <Loader2 size={13} className="animate-spin" /> : <><XCircle size={13} /> Confirm</>}
                      </button>
                      <button
                        onClick={() => { setRejectId(null); setNote('') }}
                        className="h-9 px-3 rounded-xl text-xs text-white/40 hover:text-white glass transition-colors">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setRejectId(r.id); setNote('') }}
                      className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                      style={{ background: 'rgba(231,76,60,0.08)', color: '#E74C3C', border: '1px solid rgba(231,76,60,0.15)' }}>
                      <ShieldX size={13} /> Reject
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {zoom && <Lightbox url={zoom} onClose={() => setZoom(null)} />}
    </div>
  )
}
