'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Phone, ShieldCheck, RotateCcw, Loader2, CheckCircle2, MapPin } from 'lucide-react'

interface Props {
  onClose: () => void
  onVerified: (phone: string) => void
}

const CODE_LEN = 6

export default function PhoneVerifyModal({ onClose, onVerified }: Props) {
  const [step, setStep]           = useState<'phone' | 'code' | 'done'>('phone')
  const [phone, setPhone]         = useState('+230 ')
  const [code, setCode]           = useState<string[]>(Array(CODE_LEN).fill(''))
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [countdown, setCountdown] = useState(0)

  const codeRefs = useRef<(HTMLInputElement | null)[]>(Array(CODE_LEN).fill(null))

  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  useEffect(() => {
    if (step === 'code') {
      setTimeout(() => codeRefs.current[0]?.focus(), 100)
    }
  }, [step])

  async function sendCode() {
    setError('')
    setLoading(true)
    const res = await fetch('/api/verify/phone/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed to send'); return }
    setStep('code')
    setCountdown(60)
  }

  async function confirmCode() {
    const joined = code.join('')
    if (joined.length < CODE_LEN) return
    setError('')
    setLoading(true)
    const res = await fetch('/api/verify/phone/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code: joined }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Invalid code'); return }
    setStep('done')
    setTimeout(() => {
      onVerified(phone.replace(/[\s\-().]/g, ''))
      onClose()
    }, 1800)
  }

  function handleCodeChange(val: string, i: number) {
    const digits = val.replace(/\D/g, '')
    if (digits.length > 1) {
      const arr = digits.slice(0, CODE_LEN).split('')
      const next = Array(CODE_LEN).fill('')
      arr.forEach((d, idx) => { next[idx] = d })
      setCode(next)
      codeRefs.current[Math.min(arr.length, CODE_LEN - 1)]?.focus()
      return
    }
    const next = [...code]
    next[i] = digits.slice(0, 1)
    setCode(next)
    if (digits && i < CODE_LEN - 1) codeRefs.current[i + 1]?.focus()
  }

  function handleCodeKey(e: React.KeyboardEvent, i: number) {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      const next = [...code]
      next[i - 1] = ''
      setCode(next)
      codeRefs.current[i - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && i > 0) codeRefs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < CODE_LEN - 1) codeRefs.current[i + 1]?.focus()
    if (e.key === 'Enter') confirmCode()
  }

  async function resend() {
    setCode(Array(CODE_LEN).fill(''))
    setError('')
    setLoading(true)
    const res = await fetch('/api/verify/phone/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    setLoading(false)
    if (res.ok) setCountdown(60)
    else {
      const d = await res.json()
      setError(d.error ?? 'Failed to resend')
    }
  }

  const isFilled = code.every(c => c !== '')

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center px-0 sm:px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <motion.div
        className="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl overflow-hidden"
        style={{ background: '#0F0F14', border: '1px solid rgba(255,255,255,0.08)' }}
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Gold top line */}
        <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg,transparent,#C9A84C,transparent)' }} />
        <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mt-3 sm:hidden" />

        <div className="p-6 pt-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}>
                <Phone size={16} style={{ color: '#C9A84C' }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {step === 'done' ? 'Verified!' : 'Verify Mauritius Number'}
                </p>
                <p className="text-xs text-white/40">
                  {step === 'phone' && 'Prove you\'re from Mauritius (+230)'}
                  {step === 'code' && `Code sent to ${phone.replace(/[\s\-().]/g, '').slice(0, 8)}…`}
                  {step === 'done' && 'Your Mauritius number is confirmed'}
                </p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              <X size={14} />
            </button>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-xl mb-4 text-sm text-red-400"
                style={{ background: 'rgba(231,76,60,0.10)', border: '1px solid rgba(231,76,60,0.22)' }}>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step: phone input */}
          {step === 'phone' && (
            <div className="flex flex-col gap-4">
              {/* Mauritius badge */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
                style={{ background: 'rgba(19,136,8,0.08)', border: '1px solid rgba(19,136,8,0.22)' }}>
                <MapPin size={13} style={{ color: '#22c55e' }} className="shrink-0" />
                <p className="text-xs text-white/55 leading-tight">
                  Only <strong className="text-white/75">Mauritius (+230)</strong> numbers are accepted.
                  We send the code to your <strong className="text-white/75">email</strong> — no SMS needed.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => {
                    const val = e.target.value
                    if (!val.startsWith('+230')) return
                    setPhone(val)
                  }}
                  placeholder="+230 5XXX XXXX"
                  className="w-full h-12 px-4 rounded-xl text-white placeholder-white/25 text-base outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1.5px solid rgba(255,255,255,0.10)',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#C9A84C')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
                />
                <p className="text-xs text-white/30 mt-1.5">Format: +230 5XXX XXXX or +230 2XX XXXX</p>
              </div>

              <button
                onClick={sendCode}
                disabled={loading || phone.replace(/[\s\-().]/g, '').length < 10}
                className="w-full h-12 rounded-xl font-semibold text-black flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                style={{ background: '#C9A84C' }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <><ShieldCheck size={15} /> Send Verification Code</>}
              </button>
            </div>
          )}

          {/* Step: code input */}
          {step === 'code' && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-white/50 text-center">
                We sent a 6-digit code to your email.<br />
                <span className="text-white/75 font-medium">Check your inbox.</span>
              </p>

              <div className="flex items-center justify-center gap-2">
                {Array(CODE_LEN).fill(0).map((_, i) => (
                  <input
                    key={i}
                    ref={el => { codeRefs.current[i] = el }}
                    type="text" inputMode="numeric" pattern="[0-9]*" maxLength={CODE_LEN}
                    value={code[i]}
                    onChange={e => handleCodeChange(e.target.value, i)}
                    onKeyDown={e => handleCodeKey(e, i)}
                    onFocus={e => e.target.select()}
                    className="text-center font-bold text-xl text-white outline-none transition-all select-all"
                    style={{
                      flex: '1 1 0', maxWidth: 48, height: 52, borderRadius: 12,
                      background: code[i] ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.06)',
                      border: `1.5px solid ${code[i] ? '#C9A84C' : 'rgba(255,255,255,0.10)'}`,
                      caretColor: '#C9A84C',
                    }}
                  />
                ))}
              </div>

              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-xs text-white/35">Resend in <span style={{ color: '#C9A84C' }}>{countdown}s</span></p>
                ) : (
                  <button onClick={resend} disabled={loading}
                    className="flex items-center gap-1.5 text-xs font-semibold mx-auto hover:opacity-80 transition-opacity"
                    style={{ color: '#C9A84C' }}>
                    <RotateCcw size={11} /> Resend code
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setStep('phone'); setCode(Array(CODE_LEN).fill('')); setError('') }}
                  className="flex-1 h-11 rounded-xl text-sm font-semibold text-white/55 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  Change number
                </button>
                <button onClick={confirmCode} disabled={!isFilled || loading}
                  className="flex-1 h-11 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all"
                  style={{ background: '#C9A84C' }}>
                  {loading ? <Loader2 size={14} className="animate-spin" /> : 'Confirm'}
                </button>
              </div>
            </div>
          )}

          {/* Step: done */}
          {step === 'done' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(46,204,113,0.12)', border: '2px solid rgba(46,204,113,0.35)' }}>
                <CheckCircle2 size={32} style={{ color: '#2ECC71' }} />
              </div>
              <p className="text-white font-bold text-lg">Mauritius Verified!</p>
              <p className="text-white/45 text-sm mt-1">Your number and location are confirmed.</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
