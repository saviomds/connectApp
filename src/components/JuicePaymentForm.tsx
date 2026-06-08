'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { DragEvent } from 'react'
import {
  ArrowLeft, Upload, CheckCircle, Copy, Check,
  Smartphone, X, Loader2, Image as ImageIcon,
} from 'lucide-react'

const PLAN_DISPLAY: Record<string, { name: string; amount: string; perMonth?: string }> = {
  gold_monthly:         { name: 'Gold',     amount: '$29',      },
  gold_yearly:          { name: 'Gold',     amount: '$243.60',  perMonth: '$20.30/month' },
  platinum_monthly:     { name: 'Platinum', amount: '$49',      },
  platinum_yearly:      { name: 'Platinum', amount: '$411.60',  perMonth: '$34.30/month' },
  professional_monthly: { name: 'Professional', amount: '$39',  },
}

const PLAN_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  gold_monthly:         { text: '#C9A84C', bg: 'rgba(201,168,76,0.12)',  border: 'rgba(201,168,76,0.3)'  },
  gold_yearly:          { text: '#C9A84C', bg: 'rgba(201,168,76,0.12)',  border: 'rgba(201,168,76,0.3)'  },
  platinum_monthly:     { text: '#E8E8E8', bg: 'rgba(232,232,232,0.08)', border: 'rgba(232,232,232,0.3)' },
  platinum_yearly:      { text: '#E8E8E8', bg: 'rgba(232,232,232,0.08)', border: 'rgba(232,232,232,0.3)' },
  professional_monthly: { text: '#4A90E2', bg: 'rgba(74,144,226,0.10)',  border: 'rgba(74,144,226,0.3)'  },
}

export interface JuiceConfig {
  phone: string
  accountName: string
  instructions: string
  qrUrl: string
}

interface Props {
  planId: string
  billing: 'monthly' | 'yearly'
  juiceConfig: JuiceConfig
  onSuccess: () => void
  onBack: () => void
}

export default function JuicePaymentForm({ planId, billing, juiceConfig, onSuccess, onBack }: Props) {
  const plan   = PLAN_DISPLAY[planId] ?? { name: planId, amount: '?' }
  const colors = PLAN_COLORS[planId]  ?? PLAN_COLORS['gold_monthly']

  const [fullName,   setFullName]   = useState('')
  const [email,      setEmail]      = useState('')
  const [phone,      setPhone]      = useState('')
  const [txnRef,     setTxnRef]     = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [preview,    setPreview]    = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [error,      setError]      = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [drag,       setDrag]       = useState(false)
  const [copiedPhone, setCopiedPhone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/profile').then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.display_name) setFullName(d.display_name)
        if (d?.email) setEmail(d.email)
      }).catch(() => {})
  }, [])

  const handleFile = useCallback((file: File) => {
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setFieldErrors(prev => ({ ...prev, screenshot: 'Must be JPG, PNG, or WebP' }))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setFieldErrors(prev => ({ ...prev, screenshot: 'File must be under 10MB' }))
      return
    }
    setScreenshot(file)
    setFieldErrors(prev => ({ ...prev, screenshot: '' }))
    setPreview(URL.createObjectURL(file))
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const copyPhone = () => {
    navigator.clipboard.writeText(juiceConfig.phone).then(() => {
      setCopiedPhone(true)
      setTimeout(() => setCopiedPhone(false), 2000)
    })
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!fullName.trim()) errs.fullName = 'Required'
    if (!email.trim() || !email.includes('@')) errs.email = 'Valid email required'
    if (!phone.trim()) errs.phone = 'Required'
    if (!screenshot) errs.screenshot = 'Payment screenshot required'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    setError('')

    const form = new FormData()
    form.set('plan_id',    planId)
    form.set('full_name',  fullName.trim())
    form.set('email',      email.trim())
    form.set('phone',      phone.trim())
    form.set('txn_ref',    txnRef.trim())
    form.set('screenshot', screenshot!)

    try {
      const res  = await fetch('/api/juice-payment', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Submission failed'); return }
      setSubmitted(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-6 py-12 px-4 text-center max-w-md mx-auto">
        <div className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(46,204,113,0.12)', border: '2px solid rgba(46,204,113,0.3)' }}>
          <CheckCircle size={36} style={{ color: '#2ECC71' }} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Submitted!</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Your payment proof has been submitted successfully. Our team will verify it within
            24 hours and activate your <strong className="text-white">{plan.name}</strong> plan.
          </p>
        </div>
        <div className="glass rounded-2xl p-4 w-full text-left text-sm text-white/50 leading-relaxed"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="font-semibold text-white mb-2">What happens next?</p>
          <ul className="flex flex-col gap-1.5">
            <li>• Our team reviews your payment proof</li>
            <li>• You&apos;ll get a push notification when approved</li>
            <li>• Your {plan.name} benefits activate immediately on approval</li>
          </ul>
        </div>
        <button onClick={onSuccess}
          className="h-11 px-8 rounded-2xl font-semibold text-sm text-black"
          style={{ background: colors.text }}>
          Back to Plans
        </button>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto px-4 pb-12">
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-6">
        <ArrowLeft size={16} /> Back to Plans
      </button>

      {/* Plan summary */}
      <div className="rounded-2xl p-4 mb-5 flex items-center gap-3"
        style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wide mb-0.5">Selected Plan</p>
          <p className="font-bold text-lg leading-tight" style={{ color: colors.text }}>{plan.name}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold text-white">{plan.amount}</p>
          {plan.perMonth
            ? <p className="text-xs text-white/40">{plan.perMonth} billed yearly</p>
            : <p className="text-xs text-white/40">/{billing === 'yearly' ? 'year' : 'month'}</p>
          }
        </div>
      </div>

      {/* Payment instructions */}
      <div className="glass rounded-2xl p-5 mb-5"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Smartphone size={16} style={{ color: '#C9A84C' }} />
          <p className="font-semibold text-white text-sm">Pay via Juice Mobile Money</p>
        </div>

        <div className="flex items-start gap-4">
          <ol className="flex-1 flex flex-col gap-3 text-sm text-white/60">
            <li className="flex gap-2.5">
              <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'rgba(201,168,76,0.2)', color: '#C9A84C' }}>1</span>
              Open your <strong className="text-white/80 mx-1">Juice</strong> app
            </li>
            <li className="flex gap-2.5">
              <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'rgba(201,168,76,0.2)', color: '#C9A84C' }}>2</span>
              <div className="flex-1 min-w-0">
                <span>Send <strong className="text-white">{plan.amount}</strong> to:</span>
                <div className="mt-1.5 flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="font-mono font-bold text-white text-base flex-1 truncate">
                    {juiceConfig.phone || 'Not configured'}
                  </span>
                  {juiceConfig.phone && (
                    <button onClick={copyPhone} className="shrink-0 transition-colors"
                      style={{ color: copiedPhone ? '#2ECC71' : 'rgba(255,255,255,0.4)' }}>
                      {copiedPhone ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
                {juiceConfig.accountName && (
                  <p className="text-xs text-white/40 mt-1">
                    Account: <span className="text-white/60">{juiceConfig.accountName}</span>
                  </p>
                )}
              </div>
            </li>
            <li className="flex gap-2.5">
              <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'rgba(201,168,76,0.2)', color: '#C9A84C' }}>3</span>
              Take a screenshot of the confirmation screen
            </li>
            <li className="flex gap-2.5">
              <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'rgba(201,168,76,0.2)', color: '#C9A84C' }}>4</span>
              Upload the screenshot and fill in the form below
            </li>
          </ol>

          {juiceConfig.qrUrl && (
            <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={juiceConfig.qrUrl} alt="Juice QR code" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {juiceConfig.instructions && (
          <div className="mt-3 px-3 py-2.5 rounded-xl text-xs text-white/50 leading-relaxed"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {juiceConfig.instructions}
          </div>
        )}
      </div>

      {/* Your details */}
      <div className="flex flex-col gap-3 mb-5">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Your Details</p>

        <div>
          <label className="block text-xs text-white/50 mb-1">Full Name *</label>
          <input
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Your full name"
            className="w-full h-11 px-4 rounded-xl text-white text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${fieldErrors.fullName ? 'rgba(231,76,60,0.5)' : 'rgba(255,255,255,0.10)'}`,
            }}
          />
          {fieldErrors.fullName && <p className="text-xs text-red-400 mt-1">{fieldErrors.fullName}</p>}
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">Email *</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full h-11 px-4 rounded-xl text-white text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${fieldErrors.email ? 'rgba(231,76,60,0.5)' : 'rgba(255,255,255,0.10)'}`,
            }}
          />
          {fieldErrors.email && <p className="text-xs text-red-400 mt-1">{fieldErrors.email}</p>}
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">Your Phone Number *</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+230 5XXX XXXX"
            className="w-full h-11 px-4 rounded-xl text-white text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${fieldErrors.phone ? 'rgba(231,76,60,0.5)' : 'rgba(255,255,255,0.10)'}`,
            }}
          />
          {fieldErrors.phone && <p className="text-xs text-red-400 mt-1">{fieldErrors.phone}</p>}
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">
            Transaction Reference <span className="text-white/25">(optional)</span>
          </label>
          <input
            value={txnRef}
            onChange={e => setTxnRef(e.target.value)}
            placeholder="Reference from Juice confirmation"
            className="w-full h-11 px-4 rounded-xl text-white text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
          />
        </div>
      </div>

      {/* Screenshot upload */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
          Payment Screenshot *
        </p>

        {preview ? (
          <div className="relative rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="w-full max-h-52 object-cover" />
            <button
              onClick={() => {
                setScreenshot(null)
                setPreview(null)
                if (fileRef.current) fileRef.current.value = ''
              }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-colors"
              style={{ background: 'rgba(0,0,0,0.6)' }}>
              <X size={13} />
            </button>
            <div className="absolute bottom-0 left-0 right-0 px-3 py-2 text-xs text-white/60"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
              {screenshot?.name} — {screenshot ? Math.round(screenshot.size / 1024) : 0} KB
            </div>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onClick={() => fileRef.current?.click()}
            className="rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all"
            style={{
              border: `2px dashed ${fieldErrors.screenshot ? 'rgba(231,76,60,0.5)' : drag ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.12)'}`,
              background: drag ? 'rgba(201,168,76,0.04)' : 'rgba(255,255,255,0.02)',
            }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              <ImageIcon size={22} className="text-white/40" />
            </div>
            <div className="text-center">
              <p className="text-sm text-white/60 mb-0.5">
                <span className="text-white/80 font-semibold">Click to upload</span> or drag &amp; drop
              </p>
              <p className="text-xs text-white/30">JPG, PNG, or WebP — max 10 MB</p>
            </div>
          </div>
        )}
        {fieldErrors.screenshot && (
          <p className="text-xs text-red-400 mt-1.5">{fieldErrors.screenshot}</p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 mb-4 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)' }}>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-white/30 hover:text-white shrink-0">
            <X size={13} />
          </button>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full h-12 rounded-2xl font-semibold text-sm text-black flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
        style={{ background: colors.text }}>
        {submitting
          ? <><Loader2 size={16} className="animate-spin" /> Submitting…</>
          : <><Upload size={16} /> Submit Payment Proof</>
        }
      </button>

      <p className="text-center text-xs text-white/25 mt-4">
        Payments verified manually within 24 hours. Contact support if you need help.
      </p>
    </div>
  )
}
