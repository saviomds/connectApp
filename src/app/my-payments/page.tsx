'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Clock, CheckCircle, XCircle, Loader2, RefreshCw,
  CreditCard, ArrowLeft, RotateCcw, Mail,
} from 'lucide-react'

const PLAN_LABELS: Record<string, { name: string; amount: string }> = {
  gold_monthly:         { name: 'Gold',        amount: '$29/mo'     },
  gold_yearly:          { name: 'Gold',         amount: '$243.60/yr' },
  platinum_monthly:     { name: 'Platinum',     amount: '$49/mo'     },
  platinum_yearly:      { name: 'Platinum',     amount: '$411.60/yr' },
  professional_monthly: { name: 'Professional', amount: '$39/mo'     },
}

const STATUS_CFG = {
  pending: {
    label: 'Under Review',
    Icon: Clock,
    color: '#FFA800',
    bg: 'rgba(255,168,0,0.08)',
    border: 'rgba(255,168,0,0.2)',
  },
  approved: {
    label: 'Approved',
    Icon: CheckCircle,
    color: '#2ECC71',
    bg: 'rgba(46,204,113,0.08)',
    border: 'rgba(46,204,113,0.2)',
  },
  rejected: {
    label: 'Not Approved',
    Icon: XCircle,
    color: '#E74C3C',
    bg: 'rgba(231,76,60,0.08)',
    border: 'rgba(231,76,60,0.2)',
  },
} as const

interface Submission {
  id: string
  plan_id: string
  status: keyof typeof STATUS_CFG
  admin_notes: string | null
  txn_ref: string | null
  created_at: string
  reviewed_at: string | null
}

export default function MyPaymentsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading,     setLoading]     = useState(true)
  const [fetchError,  setFetchError]  = useState('')

  const load = async () => {
    setLoading(true)
    setFetchError('')
    try {
      const res = await fetch('/api/user/juice-payments')
      if (res.ok) {
        setSubmissions(await res.json())
      } else {
        setFetchError('Could not load payment history.')
      }
    } catch {
      setFetchError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="min-h-screen pt-nav pb-24 px-4">
      <div className="max-w-xl mx-auto pt-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/premium" className="text-white/40 hover:text-white transition-colors p-1">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">My Payments</h1>
              <p className="text-xs text-white/40 mt-0.5">Juice mobile payment submissions</p>
            </div>
          </div>
          <button
            onClick={load}
            className="p-2.5 glass rounded-xl text-white/30 hover:text-white transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 size={22} className="animate-spin text-white/30" />
          </div>
        )}

        {/* Fetch error */}
        {!loading && fetchError && (
          <div className="glass rounded-2xl p-6 text-center border border-red-500/15">
            <p className="text-sm text-red-400 mb-3">{fetchError}</p>
            <button onClick={load}
              className="text-xs text-white/40 hover:text-white underline transition-colors">
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !fetchError && submissions.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center border border-white/[0.06]">
            <CreditCard size={32} className="mx-auto mb-3 text-white/15" />
            <p className="text-sm font-semibold text-white mb-1">No payment submissions yet</p>
            <p className="text-xs text-white/40 mb-5 leading-relaxed">
              When you submit a Juice payment proof, it will appear here so you can track its status.
            </p>
            <Link
              href="/premium"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black"
              style={{ background: '#C9A84C' }}
            >
              View Plans
            </Link>
          </div>
        )}

        {/* Submissions list */}
        {!loading && !fetchError && submissions.length > 0 && (
          <div className="flex flex-col gap-3">
            {submissions.map(s => {
              const plan = PLAN_LABELS[s.plan_id] ?? { name: s.plan_id, amount: '' }
              const sc   = STATUS_CFG[s.status] ?? STATUS_CFG.pending
              const { Icon } = sc

              return (
                <div
                  key={s.id}
                  className="glass rounded-2xl overflow-hidden border border-white/[0.07]"
                >
                  {/* Status banner */}
                  <div
                    className="flex items-center gap-2.5 px-4 py-2.5"
                    style={{ background: sc.bg, borderBottom: `1px solid ${sc.border}` }}
                  >
                    <Icon size={14} style={{ color: sc.color }} />
                    <span className="text-sm font-semibold" style={{ color: sc.color }}>
                      {sc.label}
                    </span>
                    {s.status === 'pending' && (
                      <span className="ml-auto text-[11px] text-white/25">Usually within 24h</span>
                    )}
                    {s.reviewed_at && (
                      <span className="ml-auto text-[11px] text-white/25">
                        {new Date(s.reviewed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Plan details */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{plan.name}</p>
                      <p className="text-xs text-white/40">{plan.amount}</p>
                    </div>
                    <p className="text-xs text-white/30">
                      {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Rejection note */}
                  {s.status === 'rejected' && s.admin_notes && (
                    <div
                      className="mx-4 mb-3 p-3 rounded-xl text-xs leading-relaxed"
                      style={{ background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.15)' }}
                    >
                      <span className="font-semibold text-white/50">Reason: </span>
                      <span className="text-white/60">{s.admin_notes}</span>
                    </div>
                  )}

                  {/* Rejected: no note */}
                  {s.status === 'rejected' && !s.admin_notes && (
                    <p className="px-4 pb-2 text-xs text-white/30">
                      No specific reason was provided. Please resubmit with a clear screenshot.
                    </p>
                  )}

                  {/* Rejected CTAs */}
                  {s.status === 'rejected' && (
                    <div className="flex gap-2 px-4 pb-4">
                      <Link
                        href="/premium"
                        className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                        style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.25)' }}
                      >
                        <RotateCcw size={12} /> Try Again
                      </Link>
                      <a
                        href="mailto:support@vibro.app?subject=Juice Payment Issue&body=Hi, I have an issue with my Juice payment submission."
                        className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <Mail size={12} /> Contact Us
                      </a>
                    </div>
                  )}

                  {/* Pending info */}
                  {s.status === 'pending' && (
                    <p className="px-4 pb-4 text-xs text-white/30 leading-relaxed">
                      Our team is reviewing your payment proof. You&apos;ll receive a notification once it&apos;s verified.{' '}
                      <a
                        href="mailto:support@vibro.app?subject=Juice Payment Question"
                        className="text-white/50 underline"
                      >
                        Need help?
                      </a>
                    </p>
                  )}

                  {/* Approved: brief confirmation */}
                  {s.status === 'approved' && (
                    <p className="px-4 pb-4 text-xs text-white/40">
                      Your plan is active. Thank you for your payment!
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Footer help */}
        {!loading && submissions.length > 0 && (
          <p className="text-center text-xs text-white/20 mt-6 leading-relaxed">
            Having trouble?{' '}
            <a href="mailto:support@vibro.app" className="underline text-white/35">
              support@vibro.app
            </a>
          </p>
        )}

      </div>
    </div>
  )
}
