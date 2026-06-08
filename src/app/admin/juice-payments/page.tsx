'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle, XCircle, Loader2, RefreshCw,
  Clock, ZoomIn, X, CreditCard,
} from 'lucide-react'

interface Submission {
  id: string
  user_id: string
  plan_id: string
  full_name: string
  email: string
  phone: string
  txn_ref: string | null
  screenshot_path: string
  screenshot_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  reviewed_at: string | null
  created_at: string
}

const STATUS_CFG = {
  pending:  { label: 'Pending',  color: '#FFA800', bg: 'rgba(255,168,0,0.12)',  border: 'rgba(255,168,0,0.25)'  },
  approved: { label: 'Approved', color: '#2ECC71', bg: 'rgba(46,204,113,0.12)', border: 'rgba(46,204,113,0.25)' },
  rejected: { label: 'Rejected', color: '#E74C3C', bg: 'rgba(231,76,60,0.12)',  border: 'rgba(231,76,60,0.25)'  },
}

const PLAN_LABELS: Record<string, string> = {
  gold_monthly:         'Gold — Monthly ($29)',
  gold_yearly:          'Gold — Yearly ($243.60)',
  platinum_monthly:     'Platinum — Monthly ($49)',
  platinum_yearly:      'Platinum — Yearly ($411.60)',
  professional_monthly: 'Professional — Monthly',
}

const FILTERS = [
  { key: 'all',      label: 'All'      },
  { key: 'pending',  label: 'Pending'  },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
] as const

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}>
      <button onClick={onClose}
        className="absolute top-3 right-3 w-9 h-9 glass rounded-xl flex items-center justify-center text-white/60 hover:text-white">
        <X size={16} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Payment screenshot" className="max-w-full max-h-[90vh] object-contain rounded-xl"
        onClick={e => e.stopPropagation()} />
    </div>
  )
}

export default function AdminJuicePaymentsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading,     setLoading]     = useState(true)
  const [tableError,  setTableError]  = useState(false)
  const [filter, setFilter]           = useState<typeof FILTERS[number]['key']>('all')
  const [actionId,    setActionId]    = useState<string | null>(null)
  const [rejectId,    setRejectId]    = useState<string | null>(null)
  const [rejectNote,  setRejectNote]  = useState('')
  const [zoom,        setZoom]        = useState<string | null>(null)

  const load = useCallback(async (status: string) => {
    setLoading(true)
    setTableError(false)
    const endpoint = status === 'all'
      ? '/api/admin/juice-payments'
      : `/api/admin/juice-payments?status=${status}`
    const res = await fetch(endpoint)
    if (res.ok) {
      setSubmissions(await res.json())
    } else {
      const json = await res.json().catch(() => ({ error: '' }))
      if (
        json.error?.includes('does not exist') ||
        json.error?.includes('relation') ||
        json.error?.includes('42P01')
      ) {
        setTableError(true)
      }
      setSubmissions([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(filter) }, [load, filter])

  async function handleApprove(id: string) {
    setActionId(id)
    await fetch(`/api/admin/juice-payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    })
    setActionId(null)
    setSubmissions(prev =>
      prev.map(s => s.id === id ? { ...s, status: 'approved' as const } : s)
    )
  }

  async function handleReject(id: string) {
    setActionId(id)
    await fetch(`/api/admin/juice-payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', admin_notes: rejectNote.trim() || undefined }),
    })
    setActionId(null)
    setRejectId(null)
    setRejectNote('')
    setSubmissions(prev =>
      prev.map(s => s.id === id
        ? { ...s, status: 'rejected' as const, admin_notes: rejectNote.trim() || null }
        : s
      )
    )
  }

  const pendingCount = submissions.filter(s => s.status === 'pending').length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Juice Payments</h1>
          <p className="text-xs text-white/40 mt-0.5">
            {loading
              ? 'Loading…'
              : tableError
                ? 'Table not set up'
                : `${submissions.length} submission${submissions.length !== 1 ? 's' : ''}${pendingCount > 0 && filter !== 'pending' ? ` · ${pendingCount} pending` : ''}`
            }
          </p>
        </div>
        <button onClick={() => load(filter)}
          className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-xl text-xs text-white/50 hover:text-white transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={filter === f.key
              ? { background: '#C9A84C', color: '#000' }
              : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }
            }>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table not set up */}
      {tableError && (
        <div className="glass rounded-2xl p-8 text-center border border-white/[0.07]">
          <CreditCard size={28} className="mx-auto mb-3 text-white/20" />
          <p className="text-sm font-semibold text-white mb-1">Juice payments table not set up</p>
          <p className="text-xs text-white/40 max-w-sm mx-auto leading-relaxed">
            Run the Juice payment SQL in <strong className="text-white/60">Admin → Settings</strong> to
            create the <code className="text-white/50">juice_payment_submissions</code> table and the{' '}
            <code className="text-white/50">juice-screenshots</code> storage bucket.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && !tableError && (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={22} className="animate-spin text-white/30" />
        </div>
      )}

      {/* Empty */}
      {!loading && !tableError && submissions.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center border border-white/5">
          <Clock size={32} className="mx-auto mb-3 text-white/15" />
          <p className="text-sm text-white/40">No submissions yet</p>
        </div>
      )}

      {/* List */}
      {!loading && !tableError && submissions.length > 0 && (
        <div className="flex flex-col gap-3">
          {submissions.map(s => {
            const sc          = STATUS_CFG[s.status]
            const isActing    = actionId === s.id
            const isRejecting = rejectId  === s.id

            return (
              <div key={s.id} className="glass rounded-2xl overflow-hidden border border-white/[0.07]">

                {/* Header row */}
                <div className="flex items-start gap-3 px-4 py-3 border-b border-white/[0.05]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">{s.full_name}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                        {sc.label}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 truncate mt-0.5">{s.email} · {s.phone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-white/70">{PLAN_LABELS[s.plan_id] ?? s.plan_id}</p>
                    <p className="text-[10px] text-white/30">{new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Body */}
                <div className="px-4 py-3 flex items-start gap-3">
                  {s.screenshot_url && (
                    <button onClick={() => setZoom(s.screenshot_url!)}
                      className="w-20 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0 relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.screenshot_url} alt="Screenshot" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ZoomIn size={14} className="text-white" />
                      </div>
                    </button>
                  )}
                  <div className="flex-1 min-w-0 text-xs text-white/40 space-y-0.5">
                    {s.txn_ref && (
                      <p>Ref: <span className="font-mono text-white/60">{s.txn_ref}</span></p>
                    )}
                    {s.admin_notes && (
                      <p>Note: <span className="text-white/60">{s.admin_notes}</span></p>
                    )}
                    {s.reviewed_at && (
                      <p>Reviewed: {new Date(s.reviewed_at).toLocaleDateString()}</p>
                    )}
                    {!s.txn_ref && !s.admin_notes && !s.reviewed_at && (
                      <p className="text-white/25 italic">No reference provided</p>
                    )}
                  </div>
                </div>

                {/* Reject note textarea */}
                {isRejecting && (
                  <div className="px-3 pb-2">
                    <textarea
                      value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                      placeholder="Rejection reason (optional, shown to user)…"
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl text-white text-sm resize-none outline-none placeholder-white/25"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                )}

                {/* Action buttons — pending only */}
                {s.status === 'pending' && (
                  <div className="flex gap-2 px-3 pb-3">
                    <button
                      onClick={() => handleApprove(s.id)}
                      disabled={isActing}
                      className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
                      style={{ background: 'rgba(46,204,113,0.15)', color: '#2ECC71', border: '1px solid rgba(46,204,113,0.25)' }}>
                      {isActing && !isRejecting
                        ? <Loader2 size={13} className="animate-spin" />
                        : <><CheckCircle size={13} /> Approve</>
                      }
                    </button>

                    {isRejecting ? (
                      <>
                        <button
                          onClick={() => handleReject(s.id)}
                          disabled={isActing}
                          className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                          style={{ background: 'rgba(231,76,60,0.15)', color: '#E74C3C', border: '1px solid rgba(231,76,60,0.25)' }}>
                          {isActing ? <Loader2 size={13} className="animate-spin" /> : <><XCircle size={13} /> Confirm</>}
                        </button>
                        <button
                          onClick={() => { setRejectId(null); setRejectNote('') }}
                          className="h-9 px-3 rounded-xl text-xs text-white/40 hover:text-white glass transition-colors">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => { setRejectId(s.id); setRejectNote('') }}
                        className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                        style={{ background: 'rgba(231,76,60,0.08)', color: '#E74C3C', border: '1px solid rgba(231,76,60,0.15)' }}>
                        <XCircle size={13} /> Reject
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {zoom && <Lightbox url={zoom} onClose={() => setZoom(null)} />}
    </div>
  )
}
