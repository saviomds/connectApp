'use client'

import { useState, useEffect } from 'react'
import { ShieldBan, ChevronDown, ChevronUp, Loader2, CheckCircle } from 'lucide-react'

export default function SuspensionBanner() {
  const [suspended, setSuspended] = useState(false)
  const [expanded,  setExpanded]  = useState(false)
  const [reason,    setReason]    = useState('')
  const [sending,   setSending]   = useState(false)
  const [sent,      setSent]      = useState(false)
  const [err,       setErr]       = useState('')
  const [checked,   setChecked]   = useState(false)

  useEffect(() => {
    fetch('/api/profile/suspension-status')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.suspended) setSuspended(true) })
      .catch(() => {})
      .finally(() => setChecked(true))
  }, [])

  const submit = async () => {
    if (!reason.trim()) { setErr('Please explain why you believe this suspension is a mistake.'); return }
    setSending(true)
    setErr('')
    const res = await fetch('/api/admin/appeals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason.trim() }),
    })
    setSending(false)
    if (!res.ok) {
      const { error } = await res.json()
      setErr(error ?? 'Failed to submit')
      return
    }
    setSent(true)
    setReason('')
  }

  if (!checked || !suspended) return null

  return (
    <div
      className="fixed bottom-16 md:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 rounded-2xl overflow-hidden shadow-2xl"
      style={{ background: 'var(--app-modal)', border: '1px solid rgba(231,76,60,0.3)' }}
    >
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.25)' }}>
          <ShieldBan size={16} style={{ color: '#E74C3C' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#E74C3C' }}>Account suspended</p>
          <p className="text-xs" style={{ color: 'var(--app-text-3)' }}>Tap to appeal this decision</p>
        </div>
        {expanded ? <ChevronUp size={15} style={{ color: 'var(--app-text-3)' }} />
                  : <ChevronDown size={15} style={{ color: 'var(--app-text-3)' }} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: 'rgba(231,76,60,0.15)' }}>
          {sent ? (
            <div className="flex items-center gap-2 py-3 text-sm" style={{ color: '#2ECC71' }}>
              <CheckCircle size={16} /> Appeal submitted — we&apos;ll review it within 24 hours.
            </div>
          ) : (
            <>
              <p className="text-xs mt-3 mb-2" style={{ color: 'var(--app-text-3)' }}>
                Explain why you believe this suspension is a mistake:
              </p>
              <textarea
                value={reason}
                onChange={e => { setReason(e.target.value); setErr('') }}
                rows={3}
                placeholder="I was suspended because…"
                className="w-full px-3 py-2.5 rounded-xl text-xs resize-none mb-2"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--app-text)' }}
              />
              {err && <p className="text-[11px] text-red-400 mb-2">{err}</p>}
              <button
                onClick={submit}
                disabled={sending || !reason.trim()}
                className="w-full h-9 rounded-xl text-xs font-semibold text-black disabled:opacity-40 flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#E5C76B)' }}
              >
                {sending ? <Loader2 size={13} className="animate-spin" /> : 'Submit Appeal'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
