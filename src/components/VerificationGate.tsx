'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ShieldCheck, Clock, ShieldX, Crown, Loader2, Lock } from 'lucide-react'
import VerificationRequestModal from './VerificationRequestModal'
import { GATED_CATEGORIES, type UserCategory, type VerificationStatus } from '@/types/database'

interface Props {
  status: VerificationStatus
  category: UserCategory | null
  isProfessional: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  professional: 'Professional',
  divorced:     'New Chapter',
}

export default function VerificationGate({ status, category, isProfessional }: Props) {
  const [showModal, setShowModal]       = useState(false)
  const [submitted, setSubmitted]       = useState(false)
  const [payLoading, setPayLoading]     = useState(false)
  const [payError, setPayError]         = useState('')

  const isGated = category && GATED_CATEGORIES.includes(category as UserCategory)

  // Already verified — show badge
  if (status === 'approved') {
    return (
      <div className="glass rounded-2xl p-4 mb-4 flex items-center gap-3"
        style={{ border: '1px solid rgba(74,144,226,0.25)' }}>
        <ShieldCheck size={20} style={{ color: '#4A90E2' }} className="shrink-0" />
        <div>
          <p className="text-sm font-semibold text-white">Identity Verified</p>
          <p className="text-xs text-white/40">Your profile is verified and trusted by the community.</p>
        </div>
      </div>
    )
  }

  // Pending review
  if (status === 'pending' || submitted) {
    return (
      <div className="glass rounded-2xl p-5 mb-4"
        style={{ border: '1px solid rgba(243,156,18,0.3)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(243,156,18,0.12)', border: '1px solid rgba(243,156,18,0.25)' }}>
            <Clock size={20} style={{ color: '#F39C12' }} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Verification Under Review</p>
            <p className="text-xs text-white/45 mt-0.5">You'll be notified once approved — usually within 24 hours.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(243,156,18,0.07)', border: '1px solid rgba(243,156,18,0.15)' }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: '#F39C12' }} />
          <span className="text-xs text-white/50">Documents submitted · pending admin review</span>
        </div>
      </div>
    )
  }

  // Rejected
  if (status === 'rejected') {
    return (
      <div className="glass rounded-2xl p-4 mb-4"
        style={{ border: '1px solid rgba(231,76,60,0.25)' }}>
        <div className="flex items-center gap-3 mb-3">
          <ShieldX size={20} style={{ color: '#E74C3C' }} className="shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">Verification rejected</p>
            <p className="text-xs text-white/40">Your documents were unclear or didn't match requirements.</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)}
          className="w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: 'rgba(231,76,60,0.15)', color: '#E74C3C', border: '1px solid rgba(231,76,60,0.3)' }}>
          Resubmit Verification
        </button>
        <AnimatePresence>
          {showModal && (
            <VerificationRequestModal
              category={category ?? 'professional'}
              categoryLabel={CATEGORY_LABELS[category ?? ''] ?? 'Professional'}
              onClose={() => setShowModal(false)}
              onSubmitted={() => { setShowModal(false); setSubmitted(true) }}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Not verified + gated category — show the CTA
  if (isGated) {
    const catLabel = CATEGORY_LABELS[category!] ?? category!

    async function payForProfessional() {
      setPayLoading(true)
      try {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan_id: 'professional_monthly' }),
        })
        const { url, error: err } = await res.json()
        if (err) { setPayError(err); return }
        if (url) window.location.href = url
      } finally {
        setPayLoading(false)
      }
    }

    return (
      <div className="glass rounded-2xl p-4 mb-4"
        style={{ border: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="flex items-start gap-3 mb-4">
          <Lock size={18} style={{ color: '#C9A84C' }} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-white">
              Unlock <span style={{ color: '#C9A84C' }}>{catLabel}</span> features
            </p>
            <p className="text-xs text-white/45 mt-0.5 leading-relaxed">
              {isProfessional
                ? 'Your plan is active. Submit identity verification to complete your professional profile.'
                : 'Requires Professional Plan ($19.99/mo) + identity verification.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {!isProfessional && (
            <>
              <button onClick={payForProfessional} disabled={payLoading}
                className="w-full h-10 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: '#C9A84C' }}>
                {payLoading
                  ? <Loader2 size={14} className="animate-spin" />
                  : <><Crown size={14} /> Get Professional Plan</>}
              </button>
              {payError && (
                <p className="text-xs text-red-400 text-center mt-1">{payError}</p>
              )}
            </>
          )}
          <button onClick={() => setShowModal(true)}
            className="w-full h-10 glass rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
            style={{ color: 'rgba(255,255,255,0.6)' }}>
            <ShieldCheck size={14} /> Submit ID Verification
          </button>
        </div>

        <AnimatePresence>
          {showModal && (
            <VerificationRequestModal
              category={category!}
              categoryLabel={catLabel}
              onClose={() => setShowModal(false)}
              onSubmitted={() => { setShowModal(false); setSubmitted(true) }}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Non-gated category or no category — optional verification CTA
  return (
    <div className="glass rounded-2xl p-4 mb-4 flex items-center gap-3"
      style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <ShieldCheck size={18} style={{ color: 'rgba(255,255,255,0.25)' }} className="shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-white/70">Get verified</p>
        <p className="text-xs text-white/35">Build trust with a verified badge on your profile.</p>
      </div>
      <button onClick={() => setShowModal(true)}
        className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold glass hover:bg-white/10 transition-colors"
        style={{ color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
        Verify
      </button>
      <AnimatePresence>
        {showModal && (
          <VerificationRequestModal
            category={category ?? 'professional'}
            categoryLabel="Profile"
            onClose={() => setShowModal(false)}
            onSubmitted={() => { setShowModal(false); setSubmitted(true) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
